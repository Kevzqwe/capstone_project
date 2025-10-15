<?php
// Load configuration
require_once __DIR__ . '/config.php';

// Enable error reporting for development
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

// CORS headers
$allowed_origin = Config::get('REACT_APP_URL', 'http://localhost:3000');
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'admin') {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    http_response_code(401);
    exit();
}

$admin_email = $_SESSION['email'] ?? null;
if (!$admin_email) {
    echo json_encode(['status' => 'error', 'message' => 'Email missing in session']);
    http_response_code(401);
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
    http_response_code(500);
    exit();
}

// Get action from request
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Route to appropriate action
try {
    switch ($action) {
        case 'getRequests':
            getDocumentRequests($conn);
            break;
            
        case 'viewRequest':
            viewRequestDetails($conn);
            break;
            
        case 'approveRequest':
            approveRequest($conn);
            break;
            
        case 'rejectRequest':
            rejectRequest($conn);
            break;
            
        case 'updateRequest':
            updateRequest($conn);
            break;
            
        case 'updateStatus':
            updateRequestStatus($conn);
            break;
            
        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
            http_response_code(400);
    }
} catch (Exception $e) {
    error_log('Admin Request Handler Error: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Server error occurred']);
    http_response_code(500);
}

$conn->close();

// Function to get all document requests
function getDocumentRequests($conn) {
    try {
        // Check if stored procedure exists
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'GetStudentDocumentRequest'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);
        
        if ($procExists) {
            // Use stored procedure
            $stmt = $conn->prepare("CALL GetStudentDocumentRequest()");
            if (!$stmt) {
                throw new Exception('Query preparation failed: ' . $conn->error);
            }

            if (!$stmt->execute()) {
                throw new Exception('Query execution failed: ' . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            $requests = [];
            while ($row = $result->fetch_assoc()) {
                $requests[] = [
                    'request_id' => $row['Request_ID'],
                    'student_id' => $row['Student_ID'],
                    'student_name' => $row['Student_Name'],
                    'grade_level' => $row['Grade_Level'] ?? null,
                    'section' => $row['Section'] ?? null,
                    'contact_no' => $row['Contact_No'] ?? null,
                    'email' => $row['Email'] ?? null,
                    'payment_method' => $row['Payment_Method'] ?? null,
                    'date_requested' => $row['Date_Requested'],
                    'scheduled_pick_up' => $row['Scheduled_Pick_Up'] ?? null,
                    'rescheduled_pick_up' => $row['Rescheduled_Pick_Up'] ?? null,
                    'status' => $row['Status'],
                    'total_amount' => $row['Total_Amount'] ?? 0
                ];
            }
            
            $stmt->close();
            
            // Clear stored procedure results
            while ($conn->more_results()) {
                $conn->next_result();
            }
            
            echo json_encode(['status' => 'success', 'data' => $requests]);
            
        } else {
            // Direct query if stored procedure doesn't exist
            $query = "
                SELECT 
                    r.Request_ID,
                    r.Student_ID,
                    CONCAT(s.First_Name, ' ', s.Last_Name) as Student_Name,
                    r.Grade_Level,
                    r.Section,
                    r.Contact_No,
                    r.Email,
                    r.Payment_Method,
                    r.Date_Requested,
                    r.Scheduled_Pick_Up,
                    r.Rescheduled_Pick_Up,
                    r.Status,
                    r.Total_Amount
                FROM document_requests r
                LEFT JOIN students s ON r.Student_ID = s.Student_ID
                ORDER BY r.Date_Requested DESC
            ";
            
            $result = $conn->query($query);
            
            if (!$result) {
                throw new Exception('Query failed: ' . $conn->error);
            }
            
            $requests = [];
            while ($row = $result->fetch_assoc()) {
                $requests[] = [
                    'request_id' => $row['Request_ID'],
                    'student_id' => $row['Student_ID'],
                    'student_name' => $row['Student_Name'],
                    'grade_level' => $row['Grade_Level'] ?? null,
                    'section' => $row['Section'] ?? null,
                    'contact_no' => $row['Contact_No'] ?? null,
                    'email' => $row['Email'] ?? null,
                    'payment_method' => $row['Payment_Method'] ?? null,
                    'date_requested' => $row['Date_Requested'],
                    'scheduled_pick_up' => $row['Scheduled_Pick_Up'] ?? null,
                    'rescheduled_pick_up' => $row['Rescheduled_Pick_Up'] ?? null,
                    'status' => $row['Status'],
                    'total_amount' => $row['Total_Amount'] ?? 0
                ];
            }
            
            echo json_encode(['status' => 'success', 'data' => $requests]);
        }
        
    } catch (Exception $e) {
        error_log("GetDocumentRequests error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Failed to fetch document requests']);
        http_response_code(500);
    }
}

// Function to view request details
function viewRequestDetails($conn) {
    try {
        $request_id = $_GET['request_id'] ?? $_POST['request_id'] ?? null;
        
        if (!$request_id) {
            throw new Exception('Request ID is required');
        }
        
        $stmt = $conn->prepare("
            SELECT 
                r.*,
                CONCAT(s.First_Name, ' ', s.Last_Name) as Student_Name,
                s.Email as Student_Email
            FROM document_requests r
            LEFT JOIN students s ON r.Student_ID = s.Student_ID
            WHERE r.Request_ID = ?
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        $stmt->bind_param("i", $request_id);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result && $row = $result->fetch_assoc()) {
            echo json_encode(['status' => 'success', 'data' => $row]);
        } else {
            echo json_encode(['status' => 'error', 'message' => 'Request not found']);
            http_response_code(404);
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("ViewRequestDetails error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        http_response_code(500);
    }
}

// Function to approve request
function approveRequest($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $request_id = $input['request_id'] ?? null;
        
        if (!$request_id) {
            throw new Exception('Request ID is required');
        }
        
        $stmt = $conn->prepare("
            UPDATE document_requests 
            SET Status = 'Approved',
                Updated_At = NOW()
            WHERE Request_ID = ?
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        $stmt->bind_param("i", $request_id);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode([
                    'status' => 'success', 
                    'message' => 'Request approved successfully'
                ]);
            } else {
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'Request not found or already approved'
                ]);
                http_response_code(404);
            }
        } else {
            throw new Exception('Failed to approve request');
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("ApproveRequest error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        http_response_code(500);
    }
}

// Function to reject request
function rejectRequest($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $request_id = $input['request_id'] ?? null;
        
        if (!$request_id) {
            throw new Exception('Request ID is required');
        }
        
        $stmt = $conn->prepare("
            UPDATE document_requests 
            SET Status = 'Rejected',
                Updated_At = NOW()
            WHERE Request_ID = ?
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        $stmt->bind_param("i", $request_id);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode([
                    'status' => 'success', 
                    'message' => 'Request rejected successfully'
                ]);
            } else {
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'Request not found or already rejected'
                ]);
                http_response_code(404);
            }
        } else {
            throw new Exception('Failed to reject request');
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("RejectRequest error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        http_response_code(500);
    }
}

// Function to update request status
function updateRequestStatus($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $request_id = $input['request_id'] ?? null;
        $status = $input['status'] ?? null;
        
        if (!$request_id || !$status) {
            throw new Exception('Request ID and status are required');
        }
        
        $validStatuses = ['Pending', 'Approved', 'Rejected', 'Processing', 'Ready for Pickup', 'Completed', 'Cancelled'];
        if (!in_array($status, $validStatuses)) {
            throw new Exception('Invalid status value');
        }
        
        $stmt = $conn->prepare("
            UPDATE document_requests 
            SET Status = ?,
                Updated_At = NOW()
            WHERE Request_ID = ?
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        $stmt->bind_param("si", $status, $request_id);
        
        if ($stmt->execute()) {
            if ($stmt->affected_rows > 0) {
                echo json_encode([
                    'status' => 'success', 
                    'message' => "Request status updated to $status"
                ]);
            } else {
                echo json_encode([
                    'status' => 'error', 
                    'message' => 'Request not found or status unchanged'
                ]);
                http_response_code(404);
            }
        } else {
            throw new Exception('Failed to update status');
        }
        
        $stmt->close();
        
    } catch (Exception $e) {
        error_log("UpdateRequestStatus error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        http_response_code(500);
    }
}

// Function to update request (general update with multiple fields)
function updateRequest($conn) {
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        $request_id = $input['request_id'] ?? null;
        
        if (!$request_id) {
            throw new Exception('Request ID is required');
        }
        
        // Check if stored procedure exists
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'UpdateStudentRequest'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);
        
        if ($procExists) {
            // Use stored procedure
            $scheduled_pickup = $input['scheduled_pickup'] ?? null;
            $rescheduled_pickup = $input['rescheduled_pickup'] ?? null;
            $status = $input['status'] ?? null;
            
            $stmt = $conn->prepare("CALL UpdateStudentRequest(?, ?, ?, ?)");
            if (!$stmt) {
                throw new Exception('Query preparation failed: ' . $conn->error);
            }
            
            $stmt->bind_param("isss", $request_id, $scheduled_pickup, $rescheduled_pickup, $status);
            $stmt->execute();
            $result = $stmt->get_result();
            
            if ($result && $row = $result->fetch_assoc()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => $row['Message'] ?? 'Request updated successfully'
                ]);
            } else {
                throw new Exception('Failed to update request');
            }
            
            $stmt->close();
            
            // Clear stored procedure results
            while ($conn->more_results()) {
                $conn->next_result();
            }
        } else {
            // Direct update if stored procedure doesn't exist
            $updateFields = [];
            $params = [];
            $types = "";
            
            if (isset($input['scheduled_pickup'])) {
                $updateFields[] = "Scheduled_Pick_Up = ?";
                $params[] = $input['scheduled_pickup'];
                $types .= "s";
            }
            
            if (isset($input['rescheduled_pickup'])) {
                $updateFields[] = "Rescheduled_Pick_Up = ?";
                $params[] = $input['rescheduled_pickup'];
                $types .= "s";
            }
            
            if (isset($input['status'])) {
                $updateFields[] = "Status = ?";
                $params[] = $input['status'];
                $types .= "s";
            }
            
            $updateFields[] = "Updated_At = NOW()";
            
            if (empty($updateFields)) {
                throw new Exception('No fields to update');
            }
            
            $params[] = $request_id;
            $types .= "i";
            
            $query = "UPDATE document_requests SET " . implode(", ", $updateFields) . " WHERE Request_ID = ?";
            
            $stmt = $conn->prepare($query);
            if (!$stmt) {
                throw new Exception('Query preparation failed: ' . $conn->error);
            }
            
            $stmt->bind_param($types, ...$params);
            
            if ($stmt->execute()) {
                echo json_encode([
                    'status' => 'success',
                    'message' => 'Request updated successfully'
                ]);
            } else {
                throw new Exception('Failed to update request');
            }
            
            $stmt->close();
        }
        
    } catch (Exception $e) {
        error_log("UpdateRequest error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => $e->getMessage()]);
        http_response_code(500);
    }
}
?>