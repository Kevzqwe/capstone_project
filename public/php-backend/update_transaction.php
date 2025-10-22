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

if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'admin') {
    echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed. Use POST.']);
    exit();
}

$input = json_decode(file_get_contents('php://input'), true);

if (!$input) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid JSON input']);
    exit();
}

$transaction_id = isset($input['transaction_id']) ? intval($input['transaction_id']) : 0;
$description = isset($input['description']) ? trim($input['description']) : '';
$is_active = isset($input['is_active']) ? (bool)$input['is_active'] : false;

if ($transaction_id <= 0 || empty($description)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Transaction ID and description are required']);
    exit();
}

$updated_by = $_SESSION['email'] ?? 'admin';

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
    $stmt = $conn->prepare("CALL UpdateTransactionSchedule(?, ?, ?, ?)");
    
    if (!$stmt) {
        throw new Exception('Query preparation failed: ' . $conn->error);
    }
    
    $stmt->bind_param("isbs", $transaction_id, $description, $is_active, $updated_by);
    
    if (!$stmt->execute()) {
        throw new Exception('Query execution failed: ' . $stmt->error);
    }
    
    $stmt->close();
    
    while ($conn->more_results()) {
        $conn->next_result();
        if ($res = $conn->store_result()) {
            $res->free();
        }
    }
    
    error_log("Transaction schedule updated successfully by " . $updated_by . " - ID: " . $transaction_id);
    
    echo json_encode([
        'status' => 'success',
        'message' => 'Transaction schedule updated successfully',
        'data' => [
            'transaction_id' => $transaction_id,
            'description' => $description,
            'is_active' => $is_active
        ]
    ]);
    
} catch (Exception $e) {
    error_log('Transaction Schedule Update Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to update transaction schedule'
    ]);
}

$conn->close();
?>