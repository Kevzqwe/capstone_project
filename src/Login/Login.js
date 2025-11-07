<?php
require_once __DIR__ . '/config.php';

// Error reporting
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 1);
} else {
    error_reporting(0);
    ini_set('display_errors', 0);
}

session_start();

// === CORS CONFIG ===
// Allow only these frontend origins
$allowed_origins = [
    'https://capstone-project-smoky-one.vercel.app',
    Config::get('REACT_APP_URL', 'https://mediumaquamarine-heron-545485.hostingersite.com'),
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: https://capstone-project-smoky-one.vercel.app");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header("Content-Type: application/json");

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// === DATABASE CONNECTION ===
$db = Config::database();
$conn = new mysqli($db['host'], $db['user'], $db['pass'], $db['name']);

if ($conn->connect_error) {
    echo json_encode(['status' => 'error', 'message' => 'Database connection failed.']);
    exit();
}

// === LOGIN HANDLER ===
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $input = json_decode(file_get_contents('php://input'), true);
    $email = trim($input['email'] ?? '');
    $password = trim($input['password'] ?? '');

    if (empty($email) || empty($password)) {
        echo json_encode(['status' => 'error', 'message' => 'Email and password are required.']);
        exit();
    }

    $stmt = $conn->prepare("CALL CheckUserLogin(?, ?)");
    if (!$stmt) {
        echo json_encode(['status' => 'error', 'message' => 'Query preparation failed.']);
        exit();
    }

    $stmt->bind_param("ss", $email, $password);
    $stmt->execute();
    $result = $stmt->get_result();

    if ($result && $row = $result->fetch_assoc()) {
        $message = $row['Message'] ?? '';
        $admin_id = $row['Admin_ID'] ?? null;
        $student_id = $row['Student_ID'] ?? null;

        if ($message === "Welcome Admin!") {
            session_regenerate_id(true);
            $_SESSION = [
                'logged_in' => true,
                'role' => 'admin',
                'email' => $email,
                'user_id' => $admin_id,
            ];
            echo json_encode([
                'status' => 'success',
                'message' => $message,
                'role' => 'Admin',
                'redirect' => '/admin-dashboard'
            ]);

        } elseif ($message === "Welcome Student!") {
            session_regenerate_id(true);
            $_SESSION = [
                'logged_in' => true,
                'role' => 'student',
                'email' => $email,
                'user_id' => $student_id,
            ];
            echo json_encode([
                'status' => 'success',
                'message' => $message,
                'role' => 'Student',
                'redirect' => '/student-dashboard'
            ]);

        } else {
            echo json_encode(['status' => 'error', 'message' => 'Invalid credentials.']);
        }

    } else {
        echo json_encode(['status' => 'error', 'message' => 'Invalid credentials.']);
    }

    $stmt->close();
}

$conn->close();
?>
