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

$action = isset($input['action']) ? $input['action'] : 'get_announcement_data';

// Authentication check - students can read, only admins can write
if ($action !== 'get_announcement_data' && $action !== 'get_all_announcements') {
    // Write operations require admin
    if (!isset($_SESSION['logged_in']) || $_SESSION['logged_in'] !== true || $_SESSION['role'] !== 'admin') {
        echo json_encode(['status' => 'error', 'message' => 'Not authenticated']);
        exit();
    }
} else {
    // Read operations - allow both students and admins
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
    if ($action === 'get_announcement_data') {
        // Get current active announcement - ACCESSIBLE TO STUDENTS AND ADMINS
        $stmt = $conn->prepare("
            SELECT Announcement_ID, Title, Content, Is_Active, Created_By, Start_Date, End_Date, Created_At 
            FROM announcements 
            WHERE Is_Active = 1 
            ORDER BY Announcement_ID DESC 
            LIMIT 1
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Query execution failed: ' . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $announcementData = $result->fetch_assoc();
        $stmt->close();
        
        if ($announcementData) {
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'Announcement_ID' => $announcementData['Announcement_ID'],
                    'Title' => $announcementData['Title'],
                    'Content' => $announcementData['Content'],
                    'Is_Active' => (bool)$announcementData['Is_Active'],
                    'Created_By' => $announcementData['Created_By'],
                    'Start_Date' => $announcementData['Start_Date'],
                    'End_Date' => $announcementData['End_Date'],
                    'Created_At' => $announcementData['Created_At']
                ]
            ]);
        } else {
            // Return default data if none exists
            echo json_encode([
                'status' => 'success',
                'data' => [
                    'Announcement_ID' => null,
                    'Title' => 'School Announcement:',
                    'Content' => 'Welcome to Pateros Catholic School Document Request System',
                    'Is_Active' => false,
                    'Created_By' => null,
                    'Start_Date' => null,
                    'End_Date' => null,
                    'Created_At' => null
                ]
            ]);
        }
        
    } else if ($action === 'get_all_announcements') {
        // Get all announcements (for history/management) - ACCESSIBLE TO STUDENTS AND ADMINS
        $stmt = $conn->prepare("
            SELECT Announcement_ID, Title, Content, Is_Active, Created_By, Start_Date, End_Date, Created_At 
            FROM announcements 
            ORDER BY Announcement_ID DESC
        ");
        
        if (!$stmt) {
            throw new Exception('Query preparation failed: ' . $conn->error);
        }
        
        if (!$stmt->execute()) {
            throw new Exception('Query execution failed: ' . $stmt->error);
        }
        
        $result = $stmt->get_result();
        $announcements = [];
        
        while ($row = $result->fetch_assoc()) {
            $announcements[] = [
                'Announcement_ID' => $row['Announcement_ID'],
                'Title' => $row['Title'],
                'Content' => $row['Content'],
                'Is_Active' => (bool)$row['Is_Active'],
                'Created_By' => $row['Created_By'],
                'Start_Date' => $row['Start_Date'],
                'End_Date' => $row['End_Date'],
                'Created_At' => $row['Created_At']
            ];
        }
        
        $stmt->close();
        
        echo json_encode([
            'status' => 'success',
            'data' => $announcements
        ]);
        
    } else {
        http_response_code(400);
        echo json_encode(['status' => 'error', 'message' => 'Invalid action']);
    }
    
} catch (Exception $e) {
    error_log('Announcement Error: ' . $e->getMessage());
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'message' => 'Failed to process announcement request: ' . $e->getMessage()
    ]);
}

$conn->close();
?>