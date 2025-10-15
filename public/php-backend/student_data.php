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
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Check authentication
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'student') {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    exit();
}

$student_id = $_SESSION['student_id'] ?? null;
if (!$student_id) {
    echo json_encode(['status' => 'error', 'message' => 'Student ID missing in session']);
    exit();
}

// Get action from query parameter
$action = $_GET['action'] ?? 'getStudentData';

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
        case 'getStudentData':
            getStudentData($conn, $student_id);
            break;
            
        case 'getDashboardData':
            getDashboardData($conn, $student_id);
            break;
            
        case 'getNotifications':
            getNotifications($conn, $student_id);
            break;
            
        case 'markNotificationRead':
            markNotificationRead($conn, $student_id);
            break;
            
        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    error_log('Student Data Error: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Server error occurred']);
}

$conn->close();

// Function to get student data
function getStudentData($conn, $student_id) {
    try {
        // Check if stored procedure exists
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'GetStudentData'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);
        
        if ($procExists) {
            // Use stored procedure
            $stmt = $conn->prepare("CALL GetStudentData(?)");
            if (!$stmt) {
                throw new Exception('Query preparation failed: ' . $conn->error);
            }

            $stmt->bind_param("i", $student_id);
            
            if (!$stmt->execute()) {
                throw new Exception('Query execution failed: ' . $stmt->error);
            }
            
            $result = $stmt->get_result();

            if ($result && $row = $result->fetch_assoc()) {
                $full_name = trim($row['First_Name'] . ' ' . ($row['Middle_Name'] ? $row['Middle_Name'] . ' ' : '') . $row['Last_Name']);

                $studentData = [
                    'student_id'    => $row['Student_ID'],
                    'full_name'     => $full_name,
                    'first_name'    => $row['First_Name'],
                    'middle_name'   => $row['Middle_Name'] ?? '',
                    'last_name'     => $row['Last_Name'],
                    'email'         => $row['Email'] ?? '',
                    'contact_no'    => $row['Contact_No'] ?? '',
                    'address'       => $row['Address'] ?? '',
                    'grade_level'   => $row['Grade_level'] ?? '',
                    'grade_display' => $row['grade_display'] ?? '',
                    'section'       => $row['Section'] ?? '',
                    'school_year'   => $row['School_Year'] ?? ''
                ];

                // Clear stored procedure results
                $stmt->close();
                while ($conn->more_results()) {
                    $conn->next_result();
                }

                echo json_encode(['status' => 'success', 'data' => $studentData]);
            } else {
                $stmt->close();
                while ($conn->more_results()) {
                    $conn->next_result();
                }
                echo json_encode(['status' => 'error', 'message' => 'Student not found']);
            }
        } else {
            // Use direct query if stored procedure doesn't exist
            $stmt = $conn->prepare("
                SELECT 
                    s.Student_ID,
                    s.First_Name,
                    s.Middle_Name,
                    s.Last_Name,
                    s.Email,
                    s.Contact_No,
                    s.Address,
                    s.Grade_level,
                    s.Section,
                    s.School_Year,
                    CASE 
                        WHEN s.Grade_level = 7 THEN 'Grade 7'
                        WHEN s.Grade_level = 8 THEN 'Grade 8'
                        WHEN s.Grade_level = 9 THEN 'Grade 9'
                        WHEN s.Grade_level = 10 THEN 'Grade 10'
                        WHEN s.Grade_level = 11 THEN 'Grade 11'
                        WHEN s.Grade_level = 12 THEN 'Grade 12'
                        ELSE CONCAT('Grade ', s.Grade_level)
                    END as grade_display
                FROM students s
                WHERE s.Student_ID = ?
            ");
            
            if (!$stmt) {
                throw new Exception('Query preparation failed: ' . $conn->error);
            }

            $stmt->bind_param("i", $student_id);
            
            if (!$stmt->execute()) {
                throw new Exception('Query execution failed: ' . $stmt->error);
            }
            
            $result = $stmt->get_result();

            if ($result && $row = $result->fetch_assoc()) {
                $full_name = trim($row['First_Name'] . ' ' . ($row['Middle_Name'] ? $row['Middle_Name'] . ' ' : '') . $row['Last_Name']);

                $studentData = [
                    'student_id'    => $row['Student_ID'],
                    'full_name'     => $full_name,
                    'first_name'    => $row['First_Name'],
                    'middle_name'   => $row['Middle_Name'] ?? '',
                    'last_name'     => $row['Last_Name'],
                    'email'         => $row['Email'] ?? '',
                    'contact_no'    => $row['Contact_No'] ?? '',
                    'address'       => $row['Address'] ?? '',
                    'grade_level'   => $row['Grade_level'] ?? '',
                    'grade_display' => $row['grade_display'] ?? '',
                    'section'       => $row['Section'] ?? '',
                    'school_year'   => $row['School_Year'] ?? ''
                ];

                echo json_encode(['status' => 'success', 'data' => $studentData]);
            } else {
                echo json_encode(['status' => 'error', 'message' => 'Student not found']);
            }

            $stmt->close();
        }
    } catch (Exception $e) {
        error_log("GetStudentData error: " . $e->getMessage());
        echo json_encode(['status' => 'error', 'message' => 'Failed to fetch student data']);
    }
}

// Function to get dashboard data using stored procedures
function getDashboardData($conn, $student_id) {
    try {
        $dashboardData = [
            'announcement' => 'Welcome to Pateros Catholic School Document Request System',
            'transaction_hours' => 'Monday to Friday, 8:00 AM - 5:00 PM'
        ];

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
            error_log("GetActiveTransactionSchedule error: " . $e->getMessage());
        }

        echo json_encode(['status' => 'success', 'data' => $dashboardData]);

    } catch (Exception $e) {
        error_log("GetDashboardData error: " . $e->getMessage());
        // Return defaults on error
        echo json_encode([
            'status' => 'success', 
            'data' => [
                'announcement' => 'Welcome to Pateros Catholic School Document Request System',
                'transaction_hours' => 'Monday to Friday, 8:00 AM - 5:00 PM'
            ]
        ]);
    }
}

// Function to get notifications
function getNotifications($conn, $student_id) {
    try {
        // First check if notifications table exists with the correct structure
        $tableCheck = $conn->query("
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'notifications'
        ");
        
        if (!$tableCheck || $tableCheck->num_rows === 0) {
            // If notifications table doesn't exist, return empty
            echo json_encode([
                'status' => 'success',
                'notifications' => [],
                'unread_count' => 0
            ]);
            return;
        }

        // Check if the table has the required columns
        $columnCheck = $conn->query("
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'notifications' 
            AND COLUMN_NAME IN ('Notification_ID', 'Student_ID', 'Notification_type', 'Created_At')
        ");
        
        $requiredColumns = ['Notification_ID', 'Student_ID', 'Notification_type', 'Created_At'];
        $foundColumns = [];
        while ($row = $columnCheck->fetch_assoc()) {
            $foundColumns[] = $row['COLUMN_NAME'];
        }
        
        // If required columns are missing, return empty
        if (count(array_intersect($requiredColumns, $foundColumns)) !== count($requiredColumns)) {
            echo json_encode([
                'status' => 'success',
                'notifications' => [],
                'unread_count' => 0
            ]);
            return;
        }

        // Get notifications using your table structure
        $stmt = $conn->prepare("
            SELECT 
                Notification_ID as id,
                Notification_type as title,
                Notification_type as message,
                Created_At,
                '0' as is_read
            FROM notifications 
            WHERE Student_ID = ? 
            ORDER BY Created_At DESC 
            LIMIT 10
        ");
        
        if (!$stmt) {
            throw new Exception('Failed to prepare notification query: ' . $conn->error);
        }

        $stmt->bind_param("i", $student_id);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to execute notification query: ' . $stmt->error);
        }
        
        $result = $stmt->get_result();

        $notifications = [];
        $unread_count = 0;

        while ($row = $result->fetch_assoc()) {
            $notification = [
                'id' => $row['id'],
                'title' => $row['title'],
                'message' => $row['message'],
                'is_read' => $row['is_read'],
                'created_at' => date('M j, Y g:i A', strtotime($row['Created_At']))
            ];
            
            $notifications[] = $notification;
            
            if ($row['is_read'] == '0') {
                $unread_count++;
            }
        }

        echo json_encode([
            'status' => 'success',
            'notifications' => $notifications,
            'unread_count' => $unread_count
        ]);

        $stmt->close();
        
    } catch (Exception $e) {
        error_log("GetNotifications error: " . $e->getMessage());
        // Return empty on error
        echo json_encode([
            'status' => 'success',
            'notifications' => [],
            'unread_count' => 0
        ]);
    }
}

// Function to mark notification as read
function markNotificationRead($conn, $student_id) {
    try {
        // Only allow POST requests for this action
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed'
            ]);
            return;
        }

        // Get JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        $notification_id = isset($input['notification_id']) ? intval($input['notification_id']) : 0;

        if ($notification_id <= 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid notification ID'
            ]);
            return;
        }

        // Check if notifications table exists
        $tableCheck = $conn->query("
            SELECT TABLE_NAME 
            FROM information_schema.TABLES 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'notifications'
        ");
        
        if (!$tableCheck || $tableCheck->num_rows === 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Notifications system not available'
            ]);
            return;
        }

        // Check if Is_Read column exists
        $columnCheck = $conn->query("
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'notifications' 
            AND COLUMN_NAME = 'Is_Read'
        ");
        
        $hasIsReadColumn = ($columnCheck && $columnCheck->num_rows > 0);

        if ($hasIsReadColumn) {
            // Update with Is_Read column
            $stmt = $conn->prepare("
                UPDATE notifications 
                SET Is_Read = 1 
                WHERE Notification_ID = ? AND Student_ID = ?
            ");
        } else {
            // Alternative: Update the notification type to mark as read
            $stmt = $conn->prepare("
                UPDATE notifications 
                SET Notification_type = CONCAT(Notification_type, ' - Read')
                WHERE Notification_ID = ? AND Student_ID = ?
            ");
        }

        if (!$stmt) {
            throw new Exception('Failed to prepare update query: ' . $conn->error);
        }

        $stmt->bind_param("ii", $notification_id, $student_id);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to execute update: ' . $stmt->error);
        }

        $affected_rows = $stmt->affected_rows;
        $stmt->close();

        if ($affected_rows > 0) {
            echo json_encode([
                'status' => 'success',
                'message' => 'Notification marked as read'
            ]);
        } else {
            echo json_encode([
                'status' => 'error',
                'message' => 'Notification not found or already read'
            ]);
        }

    } catch (Exception $e) {
        error_log("MarkNotificationRead error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to mark notification as read'
        ]);
    }
}
?>