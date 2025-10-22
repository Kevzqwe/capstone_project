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
// CORS HEADERS - FIXED TO ALLOW CACHE-CONTROL
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
            
        case 'getNotifications':
            getNotifications($conn);
            break;
            
        case 'markNotificationRead':
            markNotificationRead($conn);
            break;
            
        case 'getMails':
            getMails($conn);
            break;
            
        case 'markMailRead':
            markMailRead($conn);
            break;
            
        case 'getPaymentStatus':
            getPaymentStatus($conn);
            break;
            
        default:
            echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
} catch (Exception $e) {
    error_log('Admin Data Error: ' . $e->getMessage());
    echo json_encode(['status' => 'error', 'message' => 'Server error occurred']);
}

$conn->close();

// ============================================================================
// FUNCTION: Get Admin Data
// ============================================================================
function getAdminData($conn, $admin_email) {
    try {
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'GetAdminbyEmail'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);
        
        if ($procExists) {
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

        // Get all request counts in one query
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

        // Get active announcement
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

        // Get active transaction schedule
        try {
            $stmt = $conn->prepare("CALL GetActiveTransaction()");
            if ($stmt) {
                if ($stmt->execute()) {
                    $result = $stmt->get_result();
                    if ($result && $row = $result->fetch_assoc()) {
                        $days = $row['Days_of_Week'] ?? 'Monday to Friday';
                        $startTime = $row['Start_Time'] ?? '08:00:00';
                        $endTime = $row['End_Time'] ?? '17:00:00';
                        
                        $startFormatted = date('g:i A', strtotime($startTime));
                        $endFormatted = date('g:i A', strtotime($endTime));
                        
                        $dashboardData['transaction_hours'] = "$days, $startFormatted - $endFormatted";
                    }
                }
                $stmt->close();
                
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

// ============================================================================
// FUNCTION: Get Document Requests
// ============================================================================
function getDocumentRequests($conn) {
    try {
        $stmt = $conn->prepare("
            SELECT 
                dr.Request_ID,
                dr.Student_ID,
                dr.Student_Name,
                dr.Grade,
                dr.Section,
                dr.Contact_No,
                dr.Email,
                dr.Status,
                dr.Scheduled_Pickup,
                dr.Created_At,
                dr.Updated_At,
                p.Payment_Method,
                p.Total_Amount,
                p.Status as Payment_Status
            FROM document_requests dr
            LEFT JOIN payment p ON dr.Request_ID = p.Request_ID
            ORDER BY dr.Created_At DESC
            LIMIT 100
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
                'student_name' => $row['Student_Name'],
                'grade' => $row['Grade'],
                'section' => $row['Section'],
                'contact_no' => $row['Contact_No'],
                'email' => $row['Email'],
                'status' => $row['Status'],
                'scheduled_pickup' => $row['Scheduled_Pickup'],
                'created_at' => $row['Created_At'],
                'updated_at' => $row['Updated_At'],
                'payment_method' => $row['Payment_Method'] ?? 'N/A',
                'total_amount' => $row['Total_Amount'] ?? 0,
                'payment_status' => $row['Payment_Status'] ?? 'N/A'
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

// ============================================================================
// FUNCTION: Get Notifications - USES STORED PROCEDURE GetAllNotifications
// ============================================================================
function getNotifications($conn) {
    try {
        error_log("Starting getNotifications - calling stored procedure");
        
        // Call the stored procedure GetAllNotifications
        $stmt = $conn->prepare("CALL GetAllNotifications()");
        
        if (!$stmt) {
            error_log("Failed to prepare stored procedure: " . $conn->error);
            echo json_encode([
                'status' => 'success',
                'notifications' => [],
                'unread_count' => 0,
                'total_count' => 0
            ]);
            return;
        }
        
        if (!$stmt->execute()) {
            error_log("Failed to execute stored procedure: " . $stmt->error);
            echo json_encode([
                'status' => 'success',
                'notifications' => [],
                'unread_count' => 0,
                'total_count' => 0
            ]);
            return;
        }
        
        $result = $stmt->get_result();
        
        if (!$result) {
            error_log("Failed to get result from stored procedure");
            echo json_encode([
                'status' => 'success',
                'notifications' => [],
                'unread_count' => 0,
                'total_count' => 0
            ]);
            return;
        }
        
        $notifications = [];
        $unread_count = 0;

        while ($row = $result->fetch_assoc()) {
            try {
                // Format the created_at date
                $createdDate = new DateTime($row['created_at']);
                $now = new DateTime();
                $interval = $now->diff($createdDate);
                
                // Create human-readable time difference
                if ($interval->days > 0) {
                    $timeAgo = $interval->days . ' day' . ($interval->days > 1 ? 's' : '') . ' ago';
                } elseif ($interval->h > 0) {
                    $timeAgo = $interval->h . ' hour' . ($interval->h > 1 ? 's' : '') . ' ago';
                } elseif ($interval->i > 0) {
                    $timeAgo = $interval->i . ' minute' . ($interval->i > 1 ? 's' : '') . ' ago';
                } else {
                    $timeAgo = 'Just now';
                }
                
                // Parse message to extract title and request ID
                $message = $row['message'];
                $title = "New Document Request";
                $requestId = null;
                
                // Extract request ID from message like "Document Request #201 submitted..."
                if (preg_match('/Document Request #(\d+)/i', $message, $matches)) {
                    $requestId = (int)$matches[1];
                    $title = "Document Request #" . $requestId;
                }
                
                $notification = [
                    'id' => (int)$row['id'],
                    'title' => $title,
                    'message' => $message,
                    'is_read' => 0,
                    'created_at' => $createdDate->format('Y-m-d H:i:s'),
                    'time_ago' => $timeAgo,
                    'request_id' => $requestId
                ];
                
                error_log("Notification: ID=" . $notification['id'] . ", RequestID=" . ($requestId ? $requestId : 'NULL') . ", Message=" . $message);
                
                $notifications[] = $notification;
                $unread_count++;
                
            } catch (Exception $e) {
                error_log("Error processing notification row: " . $e->getMessage());
                continue;
            }
        }

        // Sort by created_at descending (most recent first)
        usort($notifications, function($a, $b) {
            return strtotime($b['created_at']) - strtotime($a['created_at']);
        });

        error_log("Notifications fetched: " . count($notifications) . ", Unread: " . $unread_count);

        echo json_encode([
            'status' => 'success',
            'notifications' => $notifications,
            'unread_count' => $unread_count,
            'total_count' => count($notifications)
        ]);

        $stmt->close();
        
        // Clean up any remaining result sets
        while ($conn->more_results()) {
            $conn->next_result();
            if ($res = $conn->store_result()) {
                $res->free();
            }
        }
        
    } catch (Exception $e) {
        error_log("GetNotifications error: " . $e->getMessage());
        echo json_encode([
            'status' => 'success',
            'notifications' => [],
            'unread_count' => 0,
            'total_count' => 0
        ]);
    }
}

// ============================================================================
// FUNCTION: Mark Notification as Read
// ============================================================================
function markNotificationRead($conn) {
    try {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            http_response_code(405);
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed. Use POST.'
            ]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid JSON input'
            ]);
            return;
        }

        $notification_id = isset($input['notification_id']) ? intval($input['notification_id']) : 0;

        if ($notification_id <= 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid notification ID'
            ]);
            return;
        }

        // Update notification as read
        $stmt = $conn->prepare("
            UPDATE notifications 
            SET Is_Read = 1
            WHERE Notification_ID = ?
        ");

        if (!$stmt) {
            throw new Exception('Failed to prepare update query: ' . $conn->error);
        }

        $stmt->bind_param("i", $notification_id);
        
        if (!$stmt->execute()) {
            throw new Exception('Failed to execute update: ' . $stmt->error);
        }

        $affected_rows = $stmt->affected_rows;
        $stmt->close();

        error_log("Notification #" . $notification_id . " marked as read. Affected rows: " . $affected_rows);

        echo json_encode([
            'status' => 'success',
            'message' => 'Notification marked as read',
            'notification_id' => $notification_id
        ]);

    } catch (Exception $e) {
        error_log("MarkNotificationRead error: " . $e->getMessage());
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to mark notification as read'
        ]);
    }
}

// ============================================================================
// FUNCTION: Get Mails (Feedbacks)
// ============================================================================
function getMails($conn) {
    try {
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'sp_get_all_feedbacks'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);
        
        if ($procExists) {
            $stmt = $conn->prepare("CALL sp_get_all_feedbacks()");
            
            if (!$stmt) {
                throw new Exception('Failed to prepare stored procedure call: ' . $conn->error);
            }
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute stored procedure: ' . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            $mails = [];
            
            while ($row = $result->fetch_assoc()) {
                $senderEmail = $row['Email'] ?? 'N/A';
                $senderName = $row['Student_Name'] ?? $senderEmail;
                
                $mail = [
                    'id' => $row['Feedback_ID'] ?? $row['id'] ?? 0,
                    'sender_name' => $senderName,
                    'sender_email' => $senderEmail,
                    'subject' => $row['Feedback_Type'] ?? $row['subject'] ?? 'Feedback',
                    'message' => $row['Feedback_Message'] ?? $row['Messages'] ?? $row['message'] ?? 'No message content',
                    'created_at' => $row['Created_At'] ?? $row['created_at'] ?? date('Y-m-d H:i:s'),
                    'is_read' => 0
                ];
                
                $mails[] = $mail;
            }
            
            $stmt->close();
            while ($conn->more_results()) {
                $conn->next_result();
                if ($res = $conn->store_result()) {
                    $res->free();
                }
            }
            
            echo json_encode([
                'status' => 'success',
                'mails' => $mails,
                'unread_count' => count($mails)
            ]);
            
        } else {
            $stmt = $conn->prepare("
                SELECT 
                    f.Feedback_ID as id,
                    f.Email as sender_email,
                    f.Feedback_Type as subject,
                    f.Messages as message,
                    f.Created_At as created_at,
                    CONCAT(s.First_Name, ' ', s.Last_Name) as sender_name
                FROM feedbacks f
                LEFT JOIN students s ON f.Student_ID = s.Student_ID
                ORDER BY f.Created_At DESC
                LIMIT 20
            ");
            
            if (!$stmt) {
                throw new Exception('Failed to prepare feedback query: ' . $conn->error);
            }
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute feedback query: ' . $stmt->error);
            }
            
            $result = $stmt->get_result();
            
            $mails = [];
            
            while ($row = $result->fetch_assoc()) {
                $senderEmail = $row['sender_email'] ?? 'N/A';
                $senderName = $row['sender_name'] ?? $senderEmail;
                
                $mails[] = [
                    'id' => $row['id'],
                    'sender_name' => $senderName,
                    'sender_email' => $senderEmail,
                    'subject' => $row['subject'] ?? 'Feedback',
                    'message' => $row['message'] ?? 'No message content',
                    'created_at' => $row['created_at'],
                    'is_read' => 0
                ];
            }
            
            $stmt->close();
            
            echo json_encode([
                'status' => 'success',
                'mails' => $mails,
                'unread_count' => count($mails)
            ]);
        }
        
    } catch (Exception $e) {
        error_log("GetMails error: " . $e->getMessage());
        echo json_encode([
            'status' => 'success',
            'mails' => [],
            'unread_count' => 0
        ]);
    }
}

// ============================================================================
// FUNCTION: Mark Mail as Read
// ============================================================================
function markMailRead($conn) {
    try {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            echo json_encode([
                'status' => 'error',
                'message' => 'Method not allowed'
            ]);
            return;
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $mail_id = isset($input['mail_id']) ? intval($input['mail_id']) : 0;

        if ($mail_id <= 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid mail ID'
            ]);
            return;
        }

        $columnCheck = $conn->query("
            SELECT COLUMN_NAME 
            FROM information_schema.COLUMNS 
            WHERE TABLE_SCHEMA = DATABASE() 
            AND TABLE_NAME = 'feedbacks' 
            AND COLUMN_NAME = 'Is_Read'
        ");
        
        if ($columnCheck && $columnCheck->num_rows > 0) {
            $stmt = $conn->prepare("
                UPDATE feedbacks 
                SET Is_Read = 1 
                WHERE Feedback_ID = ?
            ");

            if (!$stmt) {
                throw new Exception('Failed to prepare update query: ' . $conn->error);
            }

            $stmt->bind_param("i", $mail_id);
            
            if (!$stmt->execute()) {
                throw new Exception('Failed to execute update: ' . $stmt->error);
            }

            $stmt->close();
        }

        echo json_encode([
            'status' => 'success',
            'message' => 'Mail marked as read'
        ]);

    } catch (Exception $e) {
        error_log("MarkMailRead error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to mark mail as read'
        ]);
    }
}

// ============================================================================
// FUNCTION: Get Payment Status - USES GetPaymentStatusOnly STORED PROCEDURE
// ============================================================================
function getPaymentStatus($conn) {
    try {
        // Get request_id from query parameter
        $request_id = isset($_GET['request_id']) ? intval($_GET['request_id']) : 0;
        
        if ($request_id <= 0) {
            echo json_encode([
                'status' => 'error',
                'message' => 'Invalid request ID',
                'payment_status_display' => 'Unpaid',
                'payment_method' => 'N/A',
                'payment_amount' => 0,
                'paymongo_session_id' => null
            ]);
            return;
        }

        error_log("Fetching payment status for request ID: " . $request_id);

        // Check if stored procedure exists
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'GetPaymentStatusOnly'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);

        if ($procExists) {
            // Use stored procedure
            $stmt = $conn->prepare("CALL GetPaymentStatusOnly(?)");
            
            if (!$stmt) {
                throw new Exception('Failed to prepare stored procedure: ' . $conn->error);
            }

            $stmt->bind_param("i", $request_id);

            if (!$stmt->execute()) {
                throw new Exception('Failed to execute stored procedure: ' . $stmt->error);
            }

            $result = $stmt->get_result();

            if ($result && $row = $result->fetch_assoc()) {
                $paymentData = [
                    'status' => 'success',
                    'payment_id' => $row['payment_id'] ?? 0,
                    'payment_amount' => floatval($row['payment_amount'] ?? 0),
                    'payment_method' => $row['payment_method'] ?? 'N/A',
                    'payment_db_status' => $row['payment_db_status'] ?? 'Unpaid',
                    'payment_status_display' => $row['payment_status_display'] ?? 'Unpaid',
                    'paymongo_session_id' => $row['paymongo_session_id'] ?? null
                ];

                error_log("Payment data retrieved: " . json_encode($paymentData));
                echo json_encode($paymentData);
            } else {
                // No payment record found - return unpaid status
                echo json_encode([
                    'status' => 'success',
                    'payment_id' => 0,
                    'payment_amount' => 0,
                    'payment_method' => 'N/A',
                    'payment_db_status' => 'Unpaid',
                    'payment_status_display' => 'Unpaid',
                    'paymongo_session_id' => null
                ]);
            }

            $stmt->close();
            
            // Clean up any remaining result sets
            while ($conn->more_results()) {
                $conn->next_result();
                if ($res = $conn->store_result()) {
                    $res->free();
                }
            }

        } else {
            // Fallback to direct SQL query
            error_log("Stored procedure not found, using direct SQL query");

            $stmt = $conn->prepare("
                SELECT 
                    COALESCE(p.payment_id, 0) as payment_id,
                    COALESCE(p.amount, 0) as payment_amount,
                    COALESCE(p.method, 'N/A') as payment_method,
                    COALESCE(p.status, 'Unpaid') as payment_db_status,
                    p.paymongo_session_id,
                    CASE 
                        WHEN p.payment_id IS NULL THEN 'Unpaid'
                        WHEN p.status = 'Paid' THEN 'Paid'
                        WHEN p.status = 'Unpaid' AND p.method = 'cash' AND p.paymongo_session_id IS NULL THEN 'Unpaid'
                        WHEN p.paymongo_session_id IS NOT NULL THEN 'Paid'
                        ELSE 'Unpaid'
                    END AS payment_status_display
                FROM payment p
                WHERE p.request_id = ?
                LIMIT 1
            ");

            if (!$stmt) {
                throw new Exception('Failed to prepare query: ' . $conn->error);
            }

            $stmt->bind_param("i", $request_id);

            if (!$stmt->execute()) {
                throw new Exception('Failed to execute query: ' . $stmt->error);
            }

            $result = $stmt->get_result();

            if ($result && $row = $result->fetch_assoc()) {
                $paymentData = [
                    'status' => 'success',
                    'payment_id' => $row['payment_id'] ?? 0,
                    'payment_amount' => floatval($row['payment_amount'] ?? 0),
                    'payment_method' => $row['payment_method'] ?? 'N/A',
                    'payment_db_status' => $row['payment_db_status'] ?? 'Unpaid',
                    'payment_status_display' => $row['payment_status_display'] ?? 'Unpaid',
                    'paymongo_session_id' => $row['paymongo_session_id'] ?? null
                ];

                echo json_encode($paymentData);
            } else {
                // No payment record found
                echo json_encode([
                    'status' => 'success',
                    'payment_id' => 0,
                    'payment_amount' => 0,
                    'payment_method' => 'N/A',
                    'payment_db_status' => 'Unpaid',
                    'payment_status_display' => 'Unpaid',
                    'paymongo_session_id' => null
                ]);
            }

            $stmt->close();
        }

    } catch (Exception $e) {
        error_log("GetPaymentStatus error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error',
            'message' => 'Failed to fetch payment status',
            'payment_status_display' => 'Unpaid',
            'payment_method' => 'N/A',
            'payment_amount' => 0,
            'paymongo_session_id' => null
        ]);
    }
}
?>