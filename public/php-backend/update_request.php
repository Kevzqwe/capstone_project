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
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    exit();
}

// Check if admin role
if ($_SESSION['role'] !== 'admin') {
    echo json_encode(['status' => 'error', 'message' => 'Unauthorized access']);
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
    case 'updateRequest':
        updateRequest($conn);
        break;
    default:
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
}

$conn->close();

// === FUNCTION ===
function updateRequest($conn)
{
    try {
        // Get JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            throw new Exception('Invalid input data');
        }
        
        // Validate required fields
        if (!isset($input['request_id'])) {
            throw new Exception('Request ID is required');
        }
        
        $requestId = intval($input['request_id']);
        $scheduledPickup = $input['scheduled_pickup'] ?? null;
        $rescheduledPickup = $input['rescheduled_pickup'] ?? null;
        $status = $input['status'] ?? null;
        
        error_log("🔄 Updating request ID: $requestId with scheduled_pickup: $scheduledPickup, rescheduled_pickup: $rescheduledPickup, status: $status");
        
        // Prepare the stored procedure call (matching your procedure: request_id, scheduled_pickup, rescheduled_pickup, status)
        $stmt = $conn->prepare("CALL UpdateStudentRequest(?, ?, ?, ?)");
        if (!$stmt) {
            throw new Exception("Prepare failed: " . $conn->error);
        }
        
        // Bind parameters (request_id, scheduled_pickup, rescheduled_pickup, status)
        $stmt->bind_param("isss", $requestId, $scheduledPickup, $rescheduledPickup, $status);
        
        if (!$stmt->execute()) {
            throw new Exception("Execute failed: " . $stmt->error);
        }
        
        error_log("✅ Request updated successfully");
        
        $stmt->close();
        
        // Clear additional results
        while ($conn->more_results()) {
            $conn->next_result();
            if ($result = $conn->store_result()) {
                $result->free();
            }
        }
        
        echo json_encode([
            'status' => 'success',
            'message' => 'Request updated successfully',
            'data' => [
                'request_id' => $requestId,
                'status' => $status,
                'rescheduled_pickup' => $rescheduledPickup
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("💥 UpdateStudentRequest error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to update request: ' . $e->getMessage()
        ]);
    }
}
?>