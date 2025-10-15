<?php
// Load configuration
require_once __DIR__ . '/config.php';

// Enable error reporting for development (disable in production)
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 0); // Don't display errors in JSON responses
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
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
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
    exit();
}

$admin_email = $_SESSION['email'] ?? null;
if (!$admin_email) {
    echo json_encode(['status' => 'error', 'message' => 'Email missing in session']);
    exit();
}

// Get action from query parameter
$action = $_GET['action'] ?? 'getAdminData';

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

// Route to appropriate action
try {
    switch ($action) {
        case 'getAdminData':
            getAdminData($conn, $admin_email);
            break;
            
        case 'getDashboardData':
            getDashboardData($conn);
            break;
            
        case 'getDocumentRequests':
            getDocumentRequests($conn);
            break;
            
        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    error_log('Admin Data Error: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Server error occurred']);
}

$conn->close();

// Function to get admin data
function getAdminData($conn, $admin_email) {
    try {
        // Check if stored procedure exists
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'GetAdminbyEmail'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);
        
        if ($procExists) {
            // Use stored procedure
            $stmt = $conn->prepare("CALL GetAdminbyEmail(?)");
            if (!$stmt) {
                throw new Exception('Query preparation failed: ' . $conn->error);
            }

            $stmt->bind_param("s", $admin_email);
            
            if (!$stmt->execute()) {
                throw new Exception('Query execution failed: ' . $stmt->error);
            }
            
            $result = $stmt->get_result();

            if ($result && $row = $result->fetch_assoc()) {
                $adminData = [
                    'Admin_ID'    => $row['Admin_ID'],
                    'Email'       => $row['Email'],
                    'Contact_No'  => $row['Contact_No'] ?? '',
                    'is_Active'   => (bool)$row['is_Active'],
                    'Created_At'  => $row['Created_At'] ?? '',
                    'Updated_At'  => $row['Updated_At'] ?? ''
                ];

                // Clear stored procedure results
                $stmt->close();
                while ($conn->more_results()) {
                    $conn->next_result();
                }

                echo json_encode(['status' => 'success', 'data' => $adminData]);
            } else {
                $stmt->close();
                while ($conn->more_results()) {
                    $conn->next_result();
                }
                echo json_encode(['status' => 'error', 'message' => 'Admin not found']);
            }
        } else {
            // Use direct query if stored procedure doesn't exist
            $stmt = $conn->prepare("
                SELECT 
                    Admin_ID,
                    Email,
                    Contact_No,
                    is_Active,
                    Created_At,
                    Updated_At
                FROM admin
                WHERE Email = ?
            ");
            
            if (!$stmt) {
                throw new Exception('Query preparation failed: ' . $conn->error);
            }

            $stmt->bind_param("s", $admin_email);
            
            if (!$stmt->execute()) {
                throw new Exception('Query execution failed: ' . $stmt->error);
            }
            
            $result = $stmt->get_result();

            if ($result && $row = $result->fetch_assoc()) {
                $adminData = [
                    'Admin_ID'    => $row['Admin_ID'],
                    'Email'       => $row['Email'],
                    'Contact_No'  => $row['Contact_No'] ?? '',
                    'is_Active'   => (bool)$row['is_Active'],
                    'Created_At'  => $row['Created_At'] ?? '',
                    'Updated_At'  => $row['Updated_At'] ?? ''
                ];

                echo json_encode(['status' => 'success', 'data' => $adminData]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Admin not found']);
            }

            $stmt->close();
        }
    } catch (Exception $e) {
        error_log("GetAdminData error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Failed to fetch admin data']);
    }
}

// Function to get dashboard data using stored procedures
function getDashboardData($conn) {
    try {
        $dashboardData = [
            'total_students' => 0,
            'pending_requests' => 0,
            'ongoing_requests' => 0,
            'ready_requests' => 0,
            'completed_requests' => 0,
            'total_requests' => 0,
            'announcement' => 'Welcome to Admin Dashboard',
            'transaction_hours' => 'Monday to Friday, 8:00 AM - 5:00 PM'
        ];

        // Get total students
        try {
            $result = $conn->query("SELECT COUNT(*) as count FROM students");
            if ($result && $row = $result->fetch_assoc()) {
                $dashboardData['total_students'] = (int)$row['count'];
            }
        } catch (Exception $e) {
            error_log("Error getting student count: " . $e->getMessage());
        }

        // Get all request counts in one query for better performance
        try {
            $result = $conn->query("
                SELECT 
                    COUNT(CASE WHEN Status = 'Pending' THEN 1 END) as pending_count,
                    COUNT(CASE WHEN Status = 'Ongoing' THEN 1 END) as ongoing_count,
                    COUNT(CASE WHEN Status = 'Ready for Pick up' THEN 1 END) as ready_count,
                    COUNT(CASE WHEN Status = 'Completed' THEN 1 END) as completed_count,
                    COUNT(*) as total_count
                FROM document_requests
            ");
            
            if ($result && $row = $result->fetch_assoc()) {
                $dashboardData['pending_requests'] = (int)$row['pending_count'];
                $dashboardData['ongoing_requests'] = (int)$row['ongoing_count'];
                $dashboardData['ready_requests'] = (int)$row['ready_count'];
                $dashboardData['completed_requests'] = (int)$row['completed_count'];
                $dashboardData['total_requests'] = (int)$row['total_count'];
            }
        } catch (Exception $e) {
            error_log("Error getting request counts: " . $e->getMessage());
        }

        // Get active announcement using stored procedure
        try {
            $stmt = $conn->prepare("CALL GetActiveAnnouncement()");
            if ($stmt) {
                if ($stmt->execute()) {
                    $result = $stmt->get_result();
                    if ($result && $row = $result->fetch_assoc()) {
                        $dashboardData['announcement'] = $row['Announcement_Content'] ?? $dashboardData['announcement'];
                    }
                }
                $stmt->close();
                
                // Clear any remaining results
                while ($conn->more_results()) {
                    $conn->next_result();
                    if ($res = $conn->store_result()) {
                        $res->free();
                    }
                }
            }
        } catch (Exception $e) {
            error_log("GetActiveAnnouncement error: " . $e->getMessage());
        }

        // Get active transaction schedule using stored procedure
        try {
            $stmt = $conn->prepare("CALL GetActiveTransaction()");
            if ($stmt) {
                if ($stmt->execute()) {
                    $result = $stmt->get_result();
                    if ($result && $row = $result->fetch_assoc()) {
                        // Format the transaction hours from the stored procedure result
                        $days = $row['Days_of_Week'] ?? 'Monday to Friday';
                        $startTime = $row['Start_Time'] ?? '08:00:00';
                        $endTime = $row['End_Time'] ?? '17:00:00';
                        
                        // Convert time format (e.g., 08:00:00 to 8:00 AM)
                        $startFormatted = date('g:i A', strtotime($startTime));
                        $endFormatted = date('g:i A', strtotime($endTime));
                        
                        $dashboardData['transaction_hours'] = "$days, $startFormatted - $endFormatted";
                    }
                }
                $stmt->close();
                
                // Clear any remaining results
                while ($conn->more_results()) {
                    $conn->next_result();
                    if ($res = $conn->store_result()) {
                        $res->free();
                    }
                }
            }
        } catch (Exception $e) {
            error_log("GetActiveTransaction error: " . $e->getMessage());
        }

        echo json_encode(['status' => 'success', 'data' => $dashboardData]);

    } catch (Exception $e) {
        error_log("GetDashboardData error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to fetch dashboard data'
        ]);
    }
}

// Function to get document requests
function getDocumentRequests($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT 
                dr.Request_ID,
                dr.Student_ID,
                CONCAT(s.First_Name, ' ', s.Last_Name) as student_name,
                dr.Document_Type,
                dr.Status,
                dr.Request_Date,
                dr.Completion_Date,
                dr.Purpose
            FROM document_requests dr
            JOIN students s ON dr.Student_ID = s.Student_ID
            ORDER BY dr.Request_Date DESC
            LIMIT 50
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }

        $stmt->execute();
        $result = $stmt->get_result();

        $requests = [];
        while ($row = $result->fetch_assoc()) {
            $requests[] = [
                'request_id' => $row['Request_ID'],
                'student_id' => $row['Student_ID'],
                'student_name' => $row['student_name'],
                'document_type' => $row['Document_Type'],
                'status' => $row['Status'],
                'request_date' => $row['Request_Date'],
                'completion_date' => $row['Completion_Date'],
                'purpose' => $row['Purpose']
            ];
        }

        echo json_encode(['status' => 'success', 'data' => $requests]);
        $stmt->close();

    } catch (Exception $e) {
        error_log("GetDocumentRequests error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to fetch document requests'
        ]);
    }
}
?>