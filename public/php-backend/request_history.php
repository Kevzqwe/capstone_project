<?php
require_once __DIR__ . '/config.php';

// === ERROR & SESSION SETUP ===
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    ini_set('display_errors', 0);
}
session_start();

// === CORS ===
$allowed_origin = Config::get('REACT_APP_URL', 'http://localhost:3000');
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Cache-Control, Authorization, X-Requested-With");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// === AUTH CHECK ===
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'student') {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    exit();
}

$student_id = $_SESSION['student_id'] ?? null;
if (!$student_id) {
    echo json_encode(['status' => 'error', 'message' => 'Student ID missing in session']);
    exit();
}

// === DB CONNECTION ===
$db = Config::database();
$conn = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed: ' . $conn->connect_error]);
    exit();
}
$conn->set_charset("utf8mb4");

// === ROUTING ===
$action = $_GET['action'] ?? '';
switch ($action) {
    case 'getRequestHistory':
        getRequestHistory($conn, $student_id);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
}

$conn->close();

// === FUNCTION ===
function getRequestHistory($conn, $student_id)
{
    try {
        error_log("🎯 Fetching request history for student ID: " . $student_id);
        
        // Use the correct stored procedure: GetStudentDocumentRequest
        $stmt = $conn->prepare("CALL GetStudentDocumentRequest(?)");
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        $stmt->bind_param("i", $student_id);

        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }

        $result = $stmt->get_result();
        $requests = [];

        if ($result) {
            while ($row = $result->fetch_assoc()) {
                $requests[] = $row;
            }
            error_log("✅ Stored procedure returned " . count($requests) . " rows");
            
            // Log sample data for debugging
            if (count($requests) > 0) {
                error_log("📊 Sample record: " . json_encode($requests[0]));
                error_log("📋 Available columns: " . implode(', ', array_keys($requests[0])));
            }
        } else {
            error_log("❌ Stored procedure returned no result set");
        }

        $stmt->close();
        
        // Clear additional results
        while ($conn->more_results()) {
            $conn->next_result();
            if ($result = $conn->store_result()) {
                $result->free();
            }
        }

        if (empty($requests)) {
            error_log("📭 No requests found for student ID: " . $student_id);
            echo json_encode([
                'status' => 'success', 
                'data' => [],
                'message' => 'No document requests found'
            ]);
        } else {
            echo json_encode([
                'status' => 'success', 
                'data' => $requests,
                'message' => 'Request history loaded successfully',
                'debug' => [
                    'total_records' => count($requests),
                    'sample_columns' => !empty($requests[0]) ? array_keys($requests[0]) : []
                ]
            ]);
        }

    } catch (Exception $e) {
        error_log("💥 GetStudentDocumentRequest error: " . $e->getMessage());
        
        // Try alternative stored procedure names
        try {
            error_log("🔄 Trying alternative stored procedure: GetStudentRequestHistory");
            $stmt = $conn->prepare("CALL GetStudentRequestHistory(?)");
            if ($stmt) {
                $stmt->bind_param("i", $student_id);
                if ($stmt->execute()) {
                    $result = $stmt->get_result();
                    $requests = [];
                    while ($row = $result->fetch_assoc()) {
                        $requests[] = $row;
                    }
                    $stmt->close();
                    
                    if (!empty($requests)) {
                        echo json_encode([
                            'status' => 'success', 
                            'data' => $requests,
                            'message' => 'Request history loaded successfully (fallback)'
                        ]);
                        return;
                    }
                }
                $stmt->close();
            }
        } catch (Exception $e2) {
            error_log("💥 Fallback also failed: " . $e2->getMessage());
        }
        
        echo json_encode([
            'status' => 'error', 
            'message' => 'Failed to fetch request history: ' . $e->getMessage()
        ]);
    }
}
?>