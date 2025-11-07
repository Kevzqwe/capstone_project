<?php
/**
 * User Login API - Complete Fixed Version
 * CORS headers properly configured for all Vercel deployments
 */

// Turn off output buffering to prevent header issues
if (ob_get_level()) ob_end_clean();

// Prevent any PHP errors from appearing before headers
error_reporting(0);
ini_set('display_errors', 0);

// ✅ FIXED: Dynamic CORS handling for ALL Vercel deployments
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Allow any Vercel deployment, localhost, or your Hostinger domain
if (strpos($origin, 'vercel.app') !== false) {
    header("Access-Control-Allow-Origin: $origin");
} else if (strpos($origin, 'localhost') !== false) {
    header("Access-Control-Allow-Origin: $origin");
} else if ($origin === 'https://mediumaquamarine-heron-545485.hostingersite.com') {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Default fallback
    header("Access-Control-Allow-Origin: https://capstone-project-smoky-one.vercel.app");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit(0);
}

// Now load configuration and enable error reporting
require_once __DIR__ . '/config.php';

// Enable error reporting after headers are sent
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

// Start session after CORS headers
if (session_status() === PHP_SESSION_NONE) {
    ini_set('session.cookie_httponly', 1);
    ini_set('session.cookie_secure', 1);
    ini_set('session.cookie_samesite', 'None');
    ini_set('session.gc_maxlifetime', 3600);
    session_start();
}

// Get database connection
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
    
} catch (Exception $e) {
    error_log("DB Connection Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Database connection failed. Please try again later.'
    ]);
    exit();
}

// Rate limiting
$ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rate_limit_key = "login_attempts_$ip_address";

if (!isset($_SESSION[$rate_limit_key])) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'time' => time()];
}

$rate_limit = &$_SESSION[$rate_limit_key];

// Reset rate limit after 15 minutes
if (time() - $rate_limit['time'] > 900) {
    $rate_limit = ['count' => 0, 'time' => time()];
}

if ($rate_limit['count'] >= 5) {
    http_response_code(429);
    echo json_encode([
        'status' => 'error',
        'message' => 'Too many login attempts. Please try again in 15 minutes.'
    ]);
    exit();
}

// Get input data
$input = json_decode(file_get_contents('php://input'), true);

// Support both JSON and form data
if (json_last_error() !== JSON_ERROR_NONE) {
    $email = trim($_POST['email'] ?? '');
    $password = trim($_POST['password'] ?? '');
} else {
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');
}

// Validate input
if (empty($email) || empty($password)) {
    $rate_limit['count']++;
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Email and password are required'
    ]);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    $rate_limit['count']++;
    http_response_code(400);
    echo json_encode([
        'status' => 'error',
        'message' => 'Please enter a valid email address'
    ]);
    exit();
}

// Attempt login
try {
    $stmt = $conn->prepare("CALL CheckUserLogin(?, ?)");
    
    if (!$stmt) {
        throw new Exception('Login procedure error: ' . $conn->error);
    }

    $stmt->bind_param("ss", $email, $password);
    
    if (!$stmt->execute()) {
        throw new Exception('Login execution error: ' . $stmt->error);
    }
    
    $result = $stmt->get_result();

    if ($result && $row = $result->fetch_assoc()) {
        $message = $row['Message'] ?? '';
        $admin_id = $row['Admin_ID'] ?? null;
        $student_id = $row['Student_ID'] ?? null;

        // Admin login successful
        if ($message === "Welcome Admin!") {
            session_regenerate_id(true);
            
            $_SESSION['logged_in'] = true;
            $_SESSION['role'] = 'admin';
            $_SESSION['email'] = $email;
            $_SESSION['admin_id'] = $admin_id;
            $_SESSION['user_id'] = $admin_id;
            $_SESSION['login_time'] = time();
            
            // Clear rate limiting on successful login
            unset($_SESSION[$rate_limit_key]);

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
        
        // Student login successful
        if ($message === "Welcome Student!") {
            session_regenerate_id(true);
            
            $_SESSION['logged_in'] = true;
            $_SESSION['role'] = 'student';
            $_SESSION['email'] = $email;
            $_SESSION['student_id'] = $student_id;
            $_SESSION['user_id'] = $student_id;
            $_SESSION['login_time'] = time();
            
            // Clear rate limiting on successful login
            unset($_SESSION[$rate_limit_key]);

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
        $rate_limit['count']++;
        $stmt->close();
        $conn->close();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => $message ?: 'Invalid email or password'
        ]);
        
    } else {
        // No user found
        $rate_limit['count']++;
        $stmt->close();
        $conn->close();
        
        http_response_code(401);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid email or password'
        ]);
    }
    
} catch (Exception $e) {
    error_log("Login System Error: " . $e->getMessage());
    
    // Clean up resources
    if (isset($stmt)) $stmt->close();
    if (isset($conn)) $conn->close();
    
    $rate_limit['count']++;
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Login system error. Please try again.'
    ]);
}
?>
