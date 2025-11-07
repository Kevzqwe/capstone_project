<?php
/**
 * User Login API - Complete Fixed Version with ALL Vercel URLs
 * CRITICAL: CORS headers MUST be set BEFORE any output
 */

// Turn off output buffering to prevent header issues
if (ob_get_level()) ob_end_clean();

// Prevent any PHP errors from appearing before headers
error_reporting(0);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

// ✅ FIXED: Add ALL your Vercel deployment URLs
$allowed_origins = [
    'https://mediumaquamarine-heron-545485.hostingersite.com',
    'https://capstone-project-93bnkx65x-kevzques-projects.vercel.app',
    'https://capstone-project-9boktw8q-kevzques-projects.vercel.app',
    'https://capstone-project-smoky-one.vercel.app',
    'http://localhost:3000',
    'http://localhost:5173'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Allow the request origin if it's in our list
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Fallback - allow any Vercel deployment
    if (strpos($origin, 'vercel.app') !== false) {
        header("Access-Control-Allow-Origin: $origin");
    } else {
        header("Access-Control-Allow-Origin: https://capstone-project-9boktw8q-kevzques-projects.vercel.app");
    }
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept, Authorization, X-Requested-With, Origin");
header("Access-Control-Max-Age: 86400");
header("Content-Type: application/json; charset=UTF-8");

// Handle preflight OPTIONS request immediately
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(204);
    exit(0);
}

// Now load other files
require_once __DIR__ . '/config.php';

// Enable error reporting after headers (for debugging)
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
        error_log("DB Connection Error: " . $conn->connect_error);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'message' => 'Database connection failed'
        ]);
        exit();
    }
    
    $conn->set_charset("utf8mb4");
    
} catch (Exception $e) {
    error_log("DB Config Error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Server configuration error'
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

        // Admin login
        if ($message === "Welcome Admin!") {
            session_regenerate_id(true);
            
            $_SESSION['logged_in'] = true;
            $_SESSION['role'] = 'admin';
            $_SESSION['email'] = $email;
            $_SESSION['admin_id'] = $admin_id;
            $_SESSION['user_id'] = $admin_id;
            $_SESSION['login_time'] = time();
            
            unset($_SESSION[$rate_limit_key]);

            $stmt->close();
            $conn->close();
            
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'message' => $message,
                'role' => 'admin',
                'user_id' => $admin_id,
                'email' => $email,
                'session_id' => session_id()
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
            $_SESSION['login_time'] = time();
            
            unset($_SESSION[$rate_limit_key]);

            $stmt->close();
            $conn->close();
            
            http_response_code(200);
            echo json_encode([
                'status' => 'success',
                'message' => $message,
                'role' => 'student',
                'user_id' => $student_id,
                'email' => $email,
                'session_id' => session_id()
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
    error_log("Login Error: " . $e->getMessage());
    
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
