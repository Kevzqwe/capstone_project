<?php
// Load configuration
require_once __DIR__ . '/config.php';

// Enable error reporting for development (disable in production)
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
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
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
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
        throw new Exception('Database connection failed');
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

// Rate limiting (basic implementation)
$ip_address = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$rate_limit_key = "login_attempts_$ip_address";

if (!isset($_SESSION[$rate_limit_key])) {
    $_SESSION[$rate_limit_key] = ['count' => 0, 'time' => time()];
}

$rate_limit = &$_SESSION[$rate_limit_key];
if (time() - $rate_limit['time'] > 900) { // Reset after 15 minutes
    $rate_limit = ['count' => 0, 'time' => time()];
}

if ($rate_limit['count'] >= 5) {
    echo json_encode([
        'status' => 'error',
        'message' => 'Too many login attempts. Please try again in 15 minutes.'
    ]);
    exit();
}

// Handle login
if ($_SERVER["REQUEST_METHOD"] === "POST") {
    // Get JSON input from React
    $input = json_decode(file_get_contents('php://input'), true);
    
    // Support both JSON and FormData
    $email = trim($input['email'] ?? $_POST['email'] ?? '');
    $password = trim($input['password'] ?? $_POST['password'] ?? '');

    if (empty($email) || empty($password)) {
        $rate_limit['count']++;
        echo json_encode([
            'status' => 'error', 
            'message' => 'Email and password are required.'
        ]);
        exit();
    }

    // Validate email format
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        $rate_limit['count']++;
        echo json_encode([
            'status' => 'error', 
            'message' => 'Invalid email format.'
        ]);
        exit();
    }

    try {
        // Call stored procedure
        $stmt = $conn->prepare("CALL CheckUserLogin(?, ?)");
        if (!$stmt) {
            throw new Exception('Query preparation failed');
        }

        $stmt->bind_param("ss", $email, $password);
        $stmt->execute();
        $result = $stmt->get_result();

        if ($result && $row = $result->fetch_assoc()) {
            $message = $row['Message'] ?? '';
            $admin_id = $row['Admin_ID'] ?? null;
            $student_id = $row['Student_ID'] ?? null;

            if ($message === "Welcome Admin!") {
                // Regenerate session ID to prevent session fixation
                session_regenerate_id(true);
                
                $_SESSION['logged_in'] = true;
                $_SESSION['role'] = 'admin';
                $_SESSION['email'] = $email;
                $_SESSION['admin_id'] = $admin_id;
                $_SESSION['user_id'] = $admin_id;
                $_SESSION['login_time'] = time();
                
                // Reset rate limit on successful login
                unset($_SESSION[$rate_limit_key]);

                echo json_encode([
                    'status' => 'success',
                    'message' => $message,
                    'role' => 'Admin',
                    'redirect' => 'Admin_Dashboard.html'
                ]);

            } elseif ($message === "Welcome Student!") {
                // Regenerate session ID to prevent session fixation
                session_regenerate_id(true);
                
                $_SESSION['logged_in'] = true;
                $_SESSION['role'] = 'student';
                $_SESSION['email'] = $email;
                $_SESSION['student_id'] = $student_id;
                $_SESSION['user_id'] = $student_id;
                $_SESSION['login_time'] = time();
                
                // Reset rate limit on successful login
                unset($_SESSION[$rate_limit_key]);

                echo json_encode([
                    'status' => 'success',
                    'message' => $message,
                    'role' => 'Student',
                    'redirect' => 'Student_Dashboard.html'
                ]);

            } else {
                $rate_limit['count']++;
                echo json_encode([
                    'status' => 'error', 
                    'message' => $message ?: 'Invalid email or password.'
                ]);
            }
        } else {
            $rate_limit['count']++;
            echo json_encode([
                'status' => 'error', 
                'message' => 'Invalid email or password.'
            ]);
        }

        $stmt->close();
        
    } catch (Exception $e) {
        error_log("Login error: " . $e->getMessage());
        echo json_encode([
            'status' => 'error', 
            'message' => 'An error occurred. Please try again.'
        ]);
    }
    
} else {
    echo json_encode([
        'status' => 'error', 
        'message' => 'Invalid request method.'
    ]);
}

$conn->close();
?>