<?php
// Load configuration
require_once __DIR__ . '/config.php';

// Enable error reporting for development (disable in production)
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
}

// Start session with secure settings
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', Config::isProduction() ? 1 : 0);
ini_set('session.cookie_samesite', 'Lax');
session_start();

// ============================================================================
// CORS HEADERS
// ============================================================================
$allowed_origin = Config::get('REACT_APP_URL', 'http://localhost:3000');
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization, Cache-Control");
header("Access-Control-Max-Age: 86400");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'admin') {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    exit();
}

$admin_email = $_SESSION['email'] ?? null;
if (!$admin_email) {
    echo json_encode(['status' => 'error', 'message' => 'Email missing in session']);
    exit();
}

// Only accept POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['status' => 'error', 'message' => 'Invalid request method']);
    exit();
}

// Get database configuration
$dbConfig = Config::database();

// Create connection with error handling
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
    echo json_encode([
        'status' => 'error', 
        'message' => 'Server error. Please try again later.'
    ]);
    exit();
}

// ============================================================================
// MAIN EXECUTION
// ============================================================================
try {
    createTransactionSchedule($conn, $admin_email);
} catch (Exception $e) {
    error_log('Create Transaction Schedule Error: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Server error occurred']);
}

$conn->close();

// ============================================================================
// FUNCTION: Create Transaction Schedule (Using Your 3-Parameter Stored Procedure)
// ============================================================================
function createTransactionSchedule($conn, $admin_email) {
    try {
        // Get JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid JSON input'
            ]);
            return;
        }
        
        // Check for both possible field names
        $description = isset($input['description']) ? trim($input['description']) : 
                      (isset($input['Description']) ? trim($input['Description']) : '');
        
        if ($description === '') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Description is required'
            ]);
            return;
        }
        
        // Check if this is an update (has Transaction_Sched_ID)
        $scheduleId = isset($input['transaction_sched_id']) ? $input['transaction_sched_id'] : 
                     (isset($input['Transaction_Sched_ID']) ? $input['Transaction_Sched_ID'] : null);
        
        if ($scheduleId) {
            // UPDATE existing transaction schedule
            $isActive = isset($input['is_active']) ? (bool)$input['is_active'] : 
                       (isset($input['Is_Active']) ? (bool)$input['Is_Active'] : true);
            
            error_log("Updating transaction schedule: ID=$scheduleId, Description='$description', IsActive=$isActive");
            
            $stmt = $conn->prepare("UPDATE transaction_schedule SET Description = ?, Is_Active = ?, Updated_By = ?, Updated_At = NOW() WHERE Transaction_Sched_ID = ?");
            if (!$stmt) {
                throw new Exception('Failed to prepare update statement: ' . $conn->error);
            }
            
            $stmt->bind_param("sisi", $description, $isActive, $admin_email, $scheduleId);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute update: ' . $stmt->error);
            }
            
            $stmt->close();
            $message = 'Transaction schedule updated successfully';
            $newId = $scheduleId;
            
        } else {
            // CREATE new transaction schedule using stored procedure
            // Your stored procedure expects: (p_description, p_is_active, p_updated_by)
            // We always pass TRUE (1) for p_is_active so it creates as active
            error_log("Creating new transaction schedule: Description='$description', IsActive=1, UpdatedBy='$admin_email'");
            
            $stmt = $conn->prepare("CALL CreateTransactionSchedule(?, ?, ?)");
            if (!$stmt) {
                throw new Exception('Failed to prepare stored procedure: ' . $conn->error);
            }
            
            // Pass 1 (TRUE) for p_is_active to ensure new transaction schedule is active
            $isActive = 1;
            $stmt->bind_param("sis", $description, $isActive, $admin_email);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute stored procedure: ' . $stmt->error);
            }
            
            $stmt->close();
            
            // Clean up any remaining result sets
            while ($conn->more_results()) {
                $conn->next_result();
                if ($res = $conn->store_result()) {
                    $res->free();
                }
            }
            
            // Get the last inserted ID
            $newId = $conn->insert_id;
            $message = 'Transaction schedule created successfully';
        }
        
        // Fetch the final record to return
        $selectStmt = $conn->prepare("SELECT Transaction_Sched_ID, Description, Is_Active, Updated_By, Created_At, Updated_At FROM transaction_schedule WHERE Transaction_Sched_ID = ?");
        if (!$selectStmt) {
            throw new Exception('Failed to prepare select statement: ' . $conn->error);
        }
        
        $selectStmt->bind_param("i", $newId);
        $selectStmt->execute();
        $result = $selectStmt->get_result();
        $schedule = $result->fetch_assoc();
        $selectStmt->close();
        
        if (!$schedule) {
            // If we couldn't find by ID, get the most recent one
            $selectStmt = $conn->prepare("SELECT Transaction_Sched_ID, Description, Is_Active, Updated_By, Created_At, Updated_At FROM transaction_schedule ORDER BY Created_At DESC LIMIT 1");
            $selectStmt->execute();
            $result = $selectStmt->get_result();
            $schedule = $result->fetch_assoc();
            $selectStmt->close();
        }
        
        error_log("Transaction schedule operation successful: ID=" . $schedule['Transaction_Sched_ID']);
        
        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'data' => [
                'Transaction_Sched_ID' => $schedule['Transaction_Sched_ID'],
                'Description' => $schedule['Description'],
                'Is_Active' => (bool)$schedule['Is_Active'],
                'Updated_By' => $schedule['Updated_By'],
                'Created_At' => $schedule['Created_At'],
                'Updated_At' => $schedule['Updated_At']
            ]
        ]);
        
    } catch (Exception $e) {
        error_log("CreateTransactionSchedule error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to save transaction schedule: ' . $e->getMessage()
        ]);
    }
}
?>