<?php
/**
 * Date Range Filter API for Document Requests
 * Filters and retrieves document requests within a specified date range
 */

// ==================== CONFIGURATION & ERROR HANDLING ====================
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

// Start output buffering
ob_start();

// ==================== CORS HEADERS ====================
$allowed_origin = Config::get('REACT_APP_URL', 'http://localhost:3000');
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization, Cache-Control");
header("Access-Control-Max-Age: 86400");
header('Content-Type: application/json; charset=utf-8');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code(200);
    exit();
}

// ==================== SESSION CHECK ====================
session_start();

// Check authentication
if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'admin') {
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Not authenticated. Please login.'
    ], 401);
}

// ==================== HELPER FUNCTIONS ====================

function sendJsonResponse($data, $statusCode = 200) {
    if (ob_get_level() > 0) {
        ob_end_clean();
    }
    http_response_code($statusCode);
    echo json_encode($data, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_PRETTY_PRINT);
    exit();
}

function calculateAnalytics($requests) {
    $analytics = [
        'pending_requests' => 0,
        'ongoing_requests' => 0,
        'ready_requests' => 0,
        'completed_requests' => 0,
        'total_requests' => count($requests)
    ];
    
    foreach ($requests as $request) {
        $status = strtolower($request['Status'] ?? '');
        
        switch ($status) {
            case 'pending':
                $analytics['pending_requests']++;
                break;
            case 'ongoing':
            case 'processing':
                $analytics['ongoing_requests']++;
                break;
            case 'ready':
            case 'ready for pickup':
            case 'ready for pick up':
                $analytics['ready_requests']++;
                break;
            case 'completed':
            case 'picked up':
                $analytics['completed_requests']++;
                break;
        }
    }
    
    return $analytics;
}

function formatRequestData($row) {
    return [
        'Request_ID' => $row['Request_ID'],
        'request_id' => $row['Request_ID'],
        'Student_ID' => $row['Student_ID'] ?? 'N/A',
        'student_id' => $row['Student_ID'] ?? 'N/A',
        'Student_Name' => $row['Student_Name'] ?? 'N/A',
        'student_name' => $row['Student_Name'] ?? 'N/A',
        'Grade_Level' => $row['Grade_Level'] ?? 'N/A',
        'grade_level' => $row['Grade_Level'] ?? 'N/A',
        'Section' => $row['Section'] ?? 'N/A',
        'section' => $row['Section'] ?? 'N/A',
        'Contact_No' => $row['Contact_No'] ?? 'N/A',
        'contact_no' => $row['Contact_No'] ?? 'N/A',
        'Email' => $row['Email'] ?? 'N/A',
        'email' => $row['Email'] ?? 'N/A',
        'Payment_Method' => $row['Payment_Method'] ?? 'N/A',
        'payment_method' => $row['Payment_Method'] ?? 'N/A',
        'Date_Requested' => $row['Date_Requested'] ?? null,
        'date_requested' => $row['Date_Requested'] ?? null,
        'Scheduled_Pick_Up' => $row['Scheduled_Pick_Up'] ?? null,
        'scheduled_pick_up' => $row['Scheduled_Pick_Up'] ?? null,
        'Rescheduled_Pick_Up' => $row['Rescheduled_Pick_Up'] ?? null,
        'rescheduled_pick_up' => $row['Rescheduled_Pick_Up'] ?? null,
        'Status' => $row['Status'] ?? 'N/A',
        'status' => $row['Status'] ?? 'N/A',
        'Total_Amount' => $row['Total_Amount'] ?? 0,
        'total_amount' => $row['Total_Amount'] ?? 0,
        'payment_amount' => $row['Total_Amount'] ?? 0
    ];
}

function clearStoredProcedureResults($conn) {
    while ($conn->more_results()) {
        $conn->next_result();
        if ($res = $conn->store_result()) {
            $res->free();
        }
    }
}

// ==================== DATABASE CONNECTION ====================
$conn = null;

try {
    $dbConfig = Config::database();
    
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
    error_log("Database connected successfully for filtered_date.php");
    
} catch (Exception $e) {
    error_log("Database connection error in filtered_date.php: " . $e->getMessage());
    sendJsonResponse([
        'status' => 'error',
        'message' => 'Database connection failed. Please try again later.'
    ], 500);
}

// ==================== MAIN LOGIC ====================

try {
    $action = $_GET['action'] ?? '';
    error_log("filtered_date.php - Action: " . $action);
    
    // ==================== FILTER BY DATE RANGE ====================
    if ($action === 'filterByDateRange') {
        $start_date = trim($_GET['start_date'] ?? '');
        $end_date = trim($_GET['end_date'] ?? '');
        
        error_log("Filtering - Start: $start_date, End: $end_date");
        
        // Validate dates
        if (empty($start_date) || empty($end_date)) {
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Start date and end date are required'
            ], 400);
        }
        
        if (!preg_match('/^\d{4}-\d{2}-\d{2}$/', $start_date) || 
            !preg_match('/^\d{4}-\d{2}-\d{2}$/', $end_date)) {
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Invalid date format. Use YYYY-MM-DD'
            ], 400);
        }
        
        if (strtotime($start_date) > strtotime($end_date)) {
            sendJsonResponse([
                'status' => 'error',
                'message' => 'Start date cannot be after end date'
            ], 400);
        }
        
        // Check if stored procedure exists
        $checkProc = $conn->query("SHOW PROCEDURE STATUS WHERE Name = 'FilterRequestsByDateRange'");
        $procExists = ($checkProc && $checkProc->num_rows > 0);
        
        $requests = [];
        
        if ($procExists) {
            // Use stored procedure
            error_log("Using FilterRequestsByDateRange stored procedure");
            
            $stmt = $conn->prepare("CALL FilterRequestsByDateRange(?, ?)");
            
            if (!$stmt) {
                error_log("Failed to prepare stored procedure: " . $conn->error);
                throw new Exception('Failed to prepare query');
            }
            
            $stmt->bind_param("ss", $start_date, $end_date);
            
            if (!$stmt->execute()) {
                error_log("Failed to execute stored procedure: " . $stmt->error);
                throw new Exception('Failed to execute query');
            }
            
            $result = $stmt->get_result();
            
            if (!$result) {
                error_log("Failed to get result: " . $stmt->error);
                throw new Exception('Failed to retrieve data');
            }
            
            while ($row = $result->fetch_assoc()) {
                $requests[] = formatRequestData($row);
            }
            
            $stmt->close();
            clearStoredProcedureResults($conn);
            
        } else {
            // Fallback to direct SQL query
            error_log("Stored procedure not found, using direct SQL query");
            
            $sql = "SELECT 
                        Request_ID,
                        Student_ID,
                        Student_Name,
                        Grade_Level,
                        Section,
                        Contact_No,
                        Email,
                        Payment_Method,
                        Date_Requested,
                        Scheduled_Pick_Up,
                        Rescheduled_Pick_Up,
                        Status,
                        Total_Amount
                    FROM 
                        document_requests
                    WHERE 
                        DATE(Date_Requested) BETWEEN ? AND ?
                    ORDER BY 
                        Date_Requested ASC";
            
            $stmt = $conn->prepare($sql);
            
            if (!$stmt) {
                error_log("SQL prepare failed: " . $conn->error);
                throw new Exception('Failed to prepare query');
            }
            
            $stmt->bind_param("ss", $start_date, $end_date);
            
            if (!$stmt->execute()) {
                error_log("SQL execute failed: " . $stmt->error);
                throw new Exception('Failed to execute query');
            }
            
            $result = $stmt->get_result();
            
            if (!$result) {
                error_log("Failed to get result: " . $stmt->error);
                throw new Exception('Failed to retrieve data');
            }
            
            while ($row = $result->fetch_assoc()) {
                $requests[] = formatRequestData($row);
            }
            
            $stmt->close();
        }
        
        // Calculate analytics
        $analytics = calculateAnalytics($requests);
        
        error_log("Found " . count($requests) . " requests for date range");
        
        sendJsonResponse([
            'status' => 'success',
            'data' => [
                'requests' => $requests,
                'analytics' => $analytics
            ],
            'message' => 'Found ' . count($requests) . ' request' . (count($requests) !== 1 ? 's' : '') . ' for the selected date range',
            'date_range' => [
                'start' => $start_date,
                'end' => $end_date
            ]
        ]);
    }
    
    // ==================== RESET DATE FILTER ====================
    elseif ($action === 'resetDateFilter') {
        error_log("Resetting date filter - fetching all requests");
        
        $sql = "SELECT 
                    Request_ID,
                    Student_ID,
                    Student_Name,
                    Grade_Level,
                    Section,
                    Contact_No,
                    Email,
                    Payment_Method,
                    Date_Requested,
                    Scheduled_Pick_Up,
                    Rescheduled_Pick_Up,
                    Status,
                    Total_Amount
                FROM 
                    document_requests
                ORDER BY 
                    Date_Requested DESC";
        
        $result = $conn->query($sql);
        
        if (!$result) {
            error_log("Query failed: " . $conn->error);
            throw new Exception('Failed to fetch requests');
        }
        
        $requests = [];
        while ($row = $result->fetch_assoc()) {
            $requests[] = formatRequestData($row);
        }
        
        $analytics = calculateAnalytics($requests);
        
        error_log("Reset complete - returning " . count($requests) . " requests");
        
        sendJsonResponse([
            'status' => 'success',
            'data' => [
                'requests' => $requests,
                'analytics' => $analytics
            ],
            'message' => 'Filter reset. Showing all ' . count($requests) . ' request' . (count($requests) !== 1 ? 's' : '')
        ]);
    }
    
    // ==================== INVALID ACTION ====================
    else {
        error_log("Invalid action requested: " . $action);
        sendJsonResponse([
            'status' => 'error',
            'message' => 'Invalid action: ' . htmlspecialchars($action)
        ], 400);
    }
    
} catch (Exception $e) {
    error_log("ERROR in filtered_date.php: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    sendJsonResponse([
        'status' => 'error',
        'message' => 'An error occurred while processing your request. Please try again.'
    ], 500);
}

// ==================== CLEANUP ====================
if (isset($conn) && $conn instanceof mysqli) {
    $conn->close();
}

if (ob_get_level() > 0) {
    ob_end_clean();
}
?>