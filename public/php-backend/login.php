<?php
require_once __DIR__ . '/config.php';

// =================== SECURITY & ERROR HANDLING ===================
if (ob_get_level()) ob_end_clean();

if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
}

ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_secure', 1);
ini_set('session.cookie_samesite', 'None');
ini_set('session.use_strict_mode', 1);

if (session_status() === PHP_SESSION_NONE) session_start();

// =================== CORS ===================
$allowed_origins = [
    'https://capstone-project-smoky-one.vercel.app',
    'https://mediumaquamarine-heron-545485.hostingersite.com'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowed_origins) || strpos($origin, 'vercel.app') !== false) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://capstone-project-smoky-one.vercel.app");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept");
header('Content-Type: application/json; charset=UTF-8');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['status' => 'error', 'message' => 'Method not allowed']);
    exit();
}

// =================== DATABASE ===================
$db = Config::database();

try {
    $conn = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);
    if ($conn->connect_error) throw new Exception('Database connection failed: ' . $conn->connect_error);
    $conn->set_charset("utf8mb4");
} catch (Exception $e) {
    error_log("DB error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'Server error. Try again later.']);
    exit();
}

// =================== INPUT VALIDATION ===================
$input = json_decode(file_get_contents('php://input'), true);
$email = trim($input['email'] ?? '');
$password = trim($input['password'] ?? '');

if (empty($email) || empty($password)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Email and password are required.']);
    exit();
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    echo json_encode(['status' => 'error', 'message' => 'Invalid email format.']);
    exit();
}

// =================== LOGIN USING STORED PROCEDURE ===================
try {
    $stmt = $conn->prepare("CALL CheckUserLogin(?, ?)");
    if (!$stmt) throw new Exception('Prepare failed: ' . $conn->error);

    $stmt->bind_param("ss", $email, $password);

    if (!$stmt->execute()) throw new Exception('Execute failed: ' . $stmt->error);

    $result = $stmt->get_result();
    $row = $result ? $result->fetch_assoc() : null;

    if (!$row) {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => 'Invalid email or password.']);
        exit();
    }

    $message = $row['Message'] ?? '';
    $admin_id = $row['Admin_ID'] ?? null;
    $student_id = $row['Student_ID'] ?? null;

    // =================== RESPONSE MAPPING ===================
    if ($message === 'Welcome Admin!' && $admin_id) {
        session_regenerate_id(true);
        $_SESSION = [
            'logged_in' => true,
            'role' => 'Admin',
            'email' => $email,
            'user_id' => $admin_id,
            'login_time' => time()
        ];

        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'role' => 'Admin',
            'user_id' => $admin_id,
            'redirect' => '/admin-dashboard'
        ]);
    } elseif ($message === 'Welcome Student!' && $student_id) {
        session_regenerate_id(true);
        $_SESSION = [
            'logged_in' => true,
            'role' => 'Student',
            'email' => $email,
            'user_id' => $student_id,
            'login_time' => time()
        ];

        echo json_encode([
            'status' => 'success',
            'message' => $message,
            'role' => 'Student',
            'user_id' => $student_id,
            'redirect' => '/student-dashboard'
        ]);
    } else {
        http_response_code(401);
        echo json_encode(['status' => 'error', 'message' => $message ?: 'Invalid credentials.']);
    }

    $stmt->close();
    $conn->close();

} catch (Exception $e) {
    error_log("Login error: " . $e->getMessage());
    http_response_code(500);
    echo json_encode(['status' => 'error', 'message' => 'An error occurred. Try again later.']);
    exit();
}
?>
