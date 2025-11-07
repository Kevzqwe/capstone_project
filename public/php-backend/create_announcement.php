<?php
// ============================================================================
// CORS HEADERS — must be at the top before any other output
// ============================================================================
header("Access-Control-Allow-Origin: http://localhost:3000");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization, Cache-Control, X-Requested-With");
header('Content-Type: application/json');

// Handle preflight request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// ============================================================================
// Load configuration
// ============================================================================
require_once __DIR__ . '/config.php';

// Error reporting
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
    ini_set('log_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

// ============================================================================
// Session setup
// ============================================================================
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', Config::isProduction() ? 1 : 0);
ini_set('session.cookie_samesite', 'Lax');
session_start();

// ============================================================================
// Authentication check
// ============================================================================
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'admin') {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    exit();
}

$admin_email = $_SESSION['email'] ?? null;
if (!$admin_email) {
    echo json_encode(['status' => 'error', 'message' => 'Email missing in session']);
    exit();
}

// ============================================================================
// Only POST requests allowed
// ============================================================================
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit();
}

// ============================================================================
// Database connection
// ============================================================================
$dbConfig = Config::database();

try {
    $conn = new mysqli(
        $dbConfig['host'],
        $dbConfig['user'],
        $dbConfig['pass'],
        $dbConfig['name']
    );

    if ($conn->connect_error) {
        throw new Exception('Database connection failed: ' . $conn->connect_error);
    }

    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    error_log("Database connection error: " . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    exit();
}

// ============================================================================
// MAIN LOGIC — Create Announcement
// ============================================================================
try {
    createAnnouncement($conn, $admin_email);
} catch (Exception $e) {
    error_log('Create Announcement Error: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Server error occurred']);
}

$conn->close();

// ============================================================================
// FUNCTION — Create Announcement (Using Stored Procedure)
// ============================================================================
function createAnnouncement($conn, $admin_email)
{
    try {
        $input = json_decode(file_get_contents('php://input'), true);

        if (!$input) {
            echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
            return;
        }

        // Check for both possible field names
        $title = isset($input['title']) ? trim($input['title']) : (isset($input['Title']) ? trim($input['Title']) : '');
        $content = isset($input['content']) ? trim($input['content']) : (isset($input['Content']) ? trim($input['Content']) : '');
        
        if (!$title) {
            echo json_encode(['status' => 'error', 'message' => 'Title is required']);
            return;
        }

        if (!$content) {
            echo json_encode(['status' => 'error', 'message' => 'Content is required']);
            return;
        }

        // Check if this is an update (has announcement_id or Announcement_ID)
        $announcementId = isset($input['announcement_id']) ? $input['announcement_id'] : 
                         (isset($input['Announcement_ID']) ? $input['Announcement_ID'] : null);

        if ($announcementId) {
            // UPDATE existing announcement - manual update, not stored procedure
            // We want to preserve the Is_Active state for updates
            $isActive = isset($input['is_active']) ? (bool)$input['is_active'] : (isset($input['Is_Active']) ? (bool)$input['Is_Active'] : true);
            $startDate = isset($input['start_date']) ? $input['start_date'] : (isset($input['Start_Date']) ? $input['Start_Date'] : date('Y-m-d'));
            $endDate = isset($input['end_date']) ? $input['end_date'] : (isset($input['End_Date']) ? $input['End_Date'] : date('Y-m-d', strtotime('+30 days')));

            $stmt = $conn->prepare("UPDATE announcements SET Title = ?, Content = ?, Is_Active = ?, Start_Date = ?, End_Date = ?, Updated_By = ?, Updated_At = NOW() WHERE Announcement_ID = ?");
            if (!$stmt) {
                throw new Exception('Failed to prepare update statement: ' . $conn->error);
            }
            $stmt->bind_param("ssisssi", $title, $content, $isActive, $startDate, $endDate, $admin_email, $announcementId);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute statement: ' . $stmt->error);
            }

            $message = 'Announcement updated successfully';
            $newId = $announcementId;
            $stmt->close();
        } else {
            // CREATE new announcement using stored procedure
            // The stored procedure automatically sets Is_Active=1 and deactivates all others
            $stmt = $conn->prepare("CALL CreateAnnouncement(?, ?, ?)");
            if (!$stmt) {
                throw new Exception('Failed to prepare stored procedure call: ' . $conn->error);
            }
            
            $stmt->bind_param("sss", $title, $content, $admin_email);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute stored procedure: ' . $stmt->error);
            }

            // Get the last inserted ID
            $stmt->close();
            $newId = $conn->insert_id;
            
            $message = 'Announcement created successfully';
        }

        // Get the updated/created announcement
        $selectStmt = $conn->prepare("SELECT Announcement_ID, Title, Content, Is_Active, Start_Date, End_Date, Created_By, Created_At FROM announcements WHERE Announcement_ID = ?");
        if (!$selectStmt) {
            throw new Exception('Failed to prepare select statement: ' . $conn->error);
        }
        
        $selectStmt->bind_param("i", $newId);
        $selectStmt->execute();
        $result = $selectStmt->get_result();
        $announcement = $result->fetch_assoc();
        $selectStmt->close();

        if (!$announcement) {
            // If we couldn't find by ID, get the most recent announcement
            $selectStmt = $conn->prepare("SELECT Announcement_ID, Title, Content, Is_Active, Start_Date, End_Date, Created_By, Created_At FROM announcements ORDER BY Created_At DESC LIMIT 1");
            $selectStmt->execute();
            $result = $selectStmt->get_result();
            $announcement = $result->fetch_assoc();
            $selectStmt->close();
        }

        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => $announcement
        ]);

    } catch (Exception $e) {
        error_log("CreateAnnouncement error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Failed to save announcement: ' . $e->getMessage()]);
    }
}
?>