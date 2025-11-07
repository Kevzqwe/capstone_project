<?php
/**
 * User Login API - Debug Version with Detailed Error Messages
 */

// Turn off output buffering
if (ob_get_level()) ob_end_clean();

// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// CORS headers first
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (strpos($origin, 'vercel.app') !== false) {
    header("Access-Control-Allow-Origin: $origin");
} else if (strpos($origin, 'localhost') !== false) {
    header("Access-Control-Allow-Origin: $origin");
} else if ($origin === 'https://mediumaquamarine-heron-545485.hostingersite.com') {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://capstone-project-smoky-one.vercel.app");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Only allow POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

// ✅ DIRECT DATABASE CONNECTION - No config.php needed for testing
$db_host = 'localhost';
$db_name = 'u868164296_pcsch_database';
$db_user = 'u868164296_localhost';
$db_pass = 'Admin_T03';

// Log connection attempt
error_log("=== DATABASE CONNECTION ATTEMPT ===");
error_log("Host: $db_host");
error_log("Database: $db_name");
error_log("User: $db_user");

// Test database connection
try {
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    
    if ($conn->connect_error) {
        $error_msg = "Connection failed: " . $conn->connect_error;
        $error_no = $conn->connect_errno;
        error_log("❌ MySQL Connection Error: $error_msg (Error #$error_no)");
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed',
            'debug' => [
                'error' => $error_msg,
                'error_no' => $error_no,
                'host' => $db_host,
                'database' => $db_name,
                'user' => $db_user
            ]
        ]);
        exit();
    }
    
    $conn->set_charset("utf8mb4");
    error_log("✅ Database connected successfully!");
    
} catch (Exception $e) {
    error_log("❌ Exception during connection: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection exception',
        'debug' => [
            'error' => $e->getMessage(),
            'host' => $db_host,
            'database' => $db_name,
            'user' => $db_user
        ]
    ]);
    exit();
}

// Start session
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 1);
    ini_set('session.cookie_samesite', 'None');
    session_start();
}

// Get input
$input = json_decode(file_get_contents('php://input'), true);

if (json_last_error() !== JSON_ERROR_NONE) {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
} else {
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');
}

error_log("Login attempt for email: $email");

// Validate input
if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Email and password are required'
    ]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Invalid email format'
    ]);
    exit();
}

// Check if stored procedure exists
try {
    $check_proc = $conn->query("SHOW PROCEDURE STATUS WHERE Db = '$db_name' AND Name = 'CheckUserLogin'");
    
    if ($check_proc->num_rows === 0) {
        error_log("❌ Stored procedure 'CheckUserLogin' does not exist!");
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Login procedure not found in database',
            'debug' => [
                'info' => 'The stored procedure CheckUserLogin does not exist. Please create it in phpMyAdmin.'
            ]
        ]);
        exit();
    }
    
    error_log("✅ Stored procedure exists");
    
} catch (Exception $e) {
    error_log("❌ Error checking procedure: " . $e->getMessage());
}

// Attempt login
try {
    $stmt = $conn->prepare("CALL CheckUserLogin(?, ?)");
    
    if (!$stmt) {
        throw new Exception('Prepare failed: ' . $conn->error);
    }

    $stmt->bind_param("ss", $email, $password);
    
    if (!$stmt->execute()) {
        throw new Exception('Execute failed: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();

    if ($result && $row = $result->fetch_assoc()) {
        $message = $row['Message'] ?? '';
        $admin_id = $row['Admin_ID'] ?? null;
        $student_id = $row['Student_ID'] ?? null;

        error_log("Login result: $message");

        // Admin login
        if ($message === "Welcome Admin!") {
            session_regenerate_id(true);
            
            $_SESSION['logged_in'] = true;
            $_SESSION['role'] = 'admin';
            $_SESSION['email'] = $email;
            $_SESSION['admin_id'] = $admin_id;
            $_SESSION['user_id'] = $admin_id;
            
            $stmt->close();
            $conn->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => $message,
                'role' => 'admin',
                'user_id' => $admin_id,
                'email' => $email
            ]);
            exit();
        }
        
        // Student login
        if ($message === "Welcome Student!") {
            session_regenerate_id(true);
            
            $_SESSION['logged_in'] = true;
            $_SESSION['role'] = 'student';
            $_SESSION['email'] = $email;
            $_SESSION['student_id'] = $student_id;
            $_SESSION['user_id'] = $student_id;
            
            $stmt->close();
            $conn->close();
            
            echo json_encode([
                'status' => 'success',
                'message' => $message,
                'role' => 'student',
                'user_id' => $student_id,
                'email' => $email
            ]);
            exit();
        }
        
        // Invalid credentials
        $stmt->close();
        $conn->close();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => $message ?: 'Invalid email or password'
        ]);
        
    } else {
        $stmt->close();
        $conn->close();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password'
        ]);
    }
    
} catch (Exception $e) {
    error_log("❌ Login error: " . $e->getMessage());
    
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Login system error',
        'debug' => [
            'error' => $e->getMessage()
        ]
    ]);
}
?>
