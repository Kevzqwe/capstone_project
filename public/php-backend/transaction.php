<?php
require_once __DIR__ . '/config.php';

if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
}

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', Config::isProduction() ? 1 : 0);
ini_set('session.cookie_samesite', 'Lax');
session_start();

$allowed_origin = Config::get('REACT_APP_URL', 'http://localhost:3000');
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS, PUT, DELETE");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization");
header("Access-Control-Max-Age: 86400");
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Handle both GET and POST requests
$input = [];
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true) ?: [];
} else if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    $input = $_GET;
}

$action = isset($input['action']) ? $input['action'] : 'get_transaction_data';

// Authentication check - UPDATED to allow students to read
if ($action !== 'get_transaction_data' && $action !== 'get_all_transaction_schedules') {
    // Write operations - Only admins can modify transaction schedules
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'admin') {
        echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
        exit();
    }
} else {
    // Read operations - Allow both students and admins
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true) {
        echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
        exit();
    }
    
    // Check if role is either student or admin
    if (!isset($_SESSION['role']) || ($_SESSION['role'] !== 'student' && $_SESSION['role'] !== 'admin')) {
        echo json_encode(['status' => 'error', 'message' => 'Invalid role']);
        exit();
    }
}

// Get database configuration
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
    http_response_code(500);
    echo json_encode([
        'status' => 'error', 
        'message' => 'Server error. Please try again later.'
    ]);
    exit();
}

try {
    if ($action === 'get_transaction_data') {
        // Get current active transaction schedule - ACCESSIBLE TO STUDENTS AND ADMINS
        $stmt = $conn->prepare("
            SELECT Transaction_Sched_ID, Description, Is_Active, Updated_By, Updated_At 
            FROM transaction_schedule 
            WHERE Is_Active = 1 
            ORDER BY Transaction_Sched_ID DESC 
            LIMIT 1
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Query execution failed: ' . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $transactionData = $result->fetch_assoc();
        $stmt->close();
        
        if ($transactionData) {
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'Transaction_Sched_ID' => $transactionData['Transaction_Sched_ID'],
                    'Description' => $transactionData['Description'],
                    'Is_Active' => (bool)$transactionData['Is_Active'],
                    'Updated_By' => $transactionData['Updated_By'],
                    'Updated_At' => $transactionData['Updated_At']
                ]
            ]);
        } else {
            // Return default data if none exists
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'Transaction_Sched_ID' => null,
                    'Description' => 'Monday to Friday, 8:00 AM - 5:00 PM',
                    'Is_Active' => false,
                    'Updated_By' => null,
                    'Updated_At' => null
                ]
            ]);
        }
        
    } else if ($action === 'get_all_transaction_schedules') {
        // Get all transaction schedules (for history/management) - ACCESSIBLE TO STUDENTS AND ADMINS
        $stmt = $conn->prepare("
            SELECT Transaction_Sched_ID, Description, Is_Active, Updated_By, Updated_At 
            FROM transaction_schedule 
            ORDER BY Transaction_Sched_ID DESC
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Query execution failed: ' . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $schedules = [];
        
        while ($row = $result->fetch_assoc()) {
            $schedules[] = [
                'Transaction_Sched_ID' => $row['Transaction_Sched_ID'],
                'Description' => $row['Description'],
                'Is_Active' => (bool)$row['Is_Active'],
                'Updated_By' => $row['Updated_By'],
                'Updated_At' => $row['Updated_At']
            ];
        }
        
        $stmt->close();
        
        echo json_encode([
            'status' => 'success',
            'data' => $schedules
        ]);
        
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    error_log('Transaction Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to process transaction request: ' . $e->getMessage()
    ]);
}

$conn->close();
?>