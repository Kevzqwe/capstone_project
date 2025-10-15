<?php
require_once __DIR__ . '/config.php';

// Error handling
if (!Config::isProduction()) {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
    ini_set('log_errors', 1);
} else {
    error_reporting(E_ALL);
    ini_set('display_errors', 0);
}

// Start session
session_start();

// CORS headers
$allowed_origin = Config::get('REACT_APP_URL', 'http://localhost:3000');
header("Access-Control-Allow-Origin: $allowed_origin");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Accept");
header('Content-Type: application/json');

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Get database configuration from Config
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
    echo json_encode(['success' => false, 'message' => 'Server error. Please try again later.']);
    exit();
}

// Get action
$action = $_GET['action'] ?? $_POST['action'] ?? '';

// Route actions
try {
    switch ($action) {
        case 'submitFeedback':
            submitFeedback($conn);
            break;
        case 'get_feedbacks':
            getFeedbacks($conn);
            break;
        case 'get_feedback_detail':
            getFeedbackDetail($conn);
            break;
        case 'get_feedback_by_email':
            getFeedbackByEmail($conn);
            break;
        case 'search_feedbacks':
            searchFeedbacks($conn);
            break;
        case 'get_feedback_stats':
            getFeedbackStats($conn);
            break;
        default:
            echo json_encode(['success' => false, 'message' => 'Invalid action: ' . $action]);
    }
} catch (Exception $e) {
    error_log('Feedback Error: ' . $e->getMessage());
    echo json_encode(['success' => false, 'message' => 'Server error occurred']);
}

$conn->close();

// Submit feedback using stored procedure
function submitFeedback($conn) {
    try {
        // Get student_id from session if logged in (optional - can allow anonymous feedback)
        $student_id = $_SESSION['student_id'] ?? null;
        
        // Get JSON input
        $input = file_get_contents('php://input');
        $data = json_decode($input, true);
        
        if (!$data) {
            echo json_encode(['success' => false, 'message' => 'Invalid input data']);
            return;
        }
        
        $email = trim($data['email'] ?? '');
        $feedback_type = trim($data['feedback_type'] ?? '');
        $message = trim($data['message'] ?? '');
        
        // Validation
        if (empty($email) || empty($feedback_type) || empty($message)) {
            echo json_encode(['success' => false, 'message' => 'All fields are required']);
            return;
        }
        
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            echo json_encode(['success' => false, 'message' => 'Invalid email format']);
            return;
        }
        
        // Call stored procedure: SaveFeedback(p_student_id, p_email, p_feedback_type, p_msg)
        $stmt = $conn->prepare("CALL SaveFeedback(?, ?, ?, ?)");
        
        if (!$stmt) {
            throw new Exception('Failed to prepare statement: ' . $conn->error);
        }
        
        // Bind parameters - student_id can be NULL
        $stmt->bind_param("isss", $student_id, $email, $feedback_type, $message);
        
        if ($stmt->execute()) {
            // Get result from stored procedure
            $result = $stmt->get_result();
            
            if ($result && $row = $result->fetch_assoc()) {
                $feedbackMessage = $row['feedback_message'] ?? 'Feedback submitted successfully. Thank you for your input!';
                echo json_encode([
                    'success' => true,
                    'message' => $feedbackMessage
                ]);
            } else {
                echo json_encode([
                    'success' => true,
                    'message' => 'Feedback submitted successfully. Thank you for your input!'
                ]);
            }
        } else {
            throw new Exception('Failed to execute stored procedure: ' . $stmt->error);
        }
        
        $stmt->close();
        
    } catch (mysqli_sql_exception $e) {
        error_log("submitFeedback error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to submit feedback. Please try again.']);
    } catch (Exception $e) {
        error_log("submitFeedback error: " . $e->getMessage());
        echo json_encode(['success' => false, 'message' => 'Failed to submit feedback']);
    }
}

// Get all feedbacks (for admin)
function getFeedbacks($conn) {
    try {
        $query = "SELECT Feedback_ID, Email, Feedback_Type, created_at FROM feedbacks ORDER BY Feedback_ID DESC";
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception('Query failed: ' . $conn->error);
        }
        
        $feedbacks = [];
        while ($row = $result->fetch_assoc()) {
            $feedbacks[] = [
                'Feedback_ID' => (int)$row['Feedback_ID'],
                'Email' => $row['Email'],
                'Feedback_Type' => $row['Feedback_Type'] ?? 'General',
                'created_at' => $row['created_at']
            ];
        }
        
        echo json_encode([
            'success' => true,
            'feedbacks' => $feedbacks,
            'count' => count($feedbacks)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

// Get feedback detail
function getFeedbackDetail($conn) {
    try {
        $feedbackId = $_GET['id'] ?? null;
        
        if (!$feedbackId || !is_numeric($feedbackId)) {
            throw new Exception('Invalid feedback ID');
        }
        
        $stmt = $conn->prepare("
            SELECT f.Feedback_ID, f.Email, f.Messages, f.Feedback_Type, f.created_at, 
                   s.First_Name, s.Last_Name
            FROM feedbacks f
            LEFT JOIN students s ON f.Student_ID = s.Student_ID
            WHERE f.Feedback_ID = ? 
            LIMIT 1
        ");
        
        if (!$stmt) {
            throw new Exception('Failed to prepare statement: ' . $conn->error);
        }
        
        $stmt->bind_param("i", $feedbackId);
        $stmt->execute();
        $result = $stmt->get_result();
        
        if ($result->num_rows === 0) {
            $stmt->close();
            throw new Exception('Feedback not found');
        }
        
        $feedback = $result->fetch_assoc();
        $stmt->close();
        
        $student_name = '';
        if (!empty($feedback['First_Name']) || !empty($feedback['Last_Name'])) {
            $student_name = trim(($feedback['First_Name'] ?? '') . ' ' . ($feedback['Last_Name'] ?? ''));
        }
        
        echo json_encode([
            'success' => true,
            'feedback' => [
                'Feedback_ID' => (int)$feedback['Feedback_ID'],
                'Email' => $feedback['Email'],
                'Messages' => $feedback['Messages'],
                'Feedback_Type' => $feedback['Feedback_Type'] ?? 'General',
                'created_at' => $feedback['created_at'],
                'student_name' => $student_name
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

// Get feedbacks by email
function getFeedbackByEmail($conn) {
    try {
        $email = $_GET['email'] ?? null;
        
        if (!$email) {
            throw new Exception('Email address is required');
        }
        
        $stmt = $conn->prepare("
            SELECT Feedback_ID, Email, Feedback_Type, created_at 
            FROM feedbacks 
            WHERE Email = ? 
            ORDER BY Feedback_ID DESC
        ");
        
        if (!$stmt) {
            throw new Exception('Failed to prepare statement: ' . $conn->error);
        }
        
        $stmt->bind_param("s", $email);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $feedbacks = [];
        while ($row = $result->fetch_assoc()) {
            $feedbacks[] = [
                'Feedback_ID' => (int)$row['Feedback_ID'],
                'Email' => $row['Email'],
                'Feedback_Type' => $row['Feedback_Type'] ?? 'General',
                'created_at' => $row['created_at']
            ];
        }
        
        $stmt->close();
        
        echo json_encode([
            'success' => true,
            'feedbacks' => $feedbacks,
            'count' => count($feedbacks)
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

// Search feedbacks
function searchFeedbacks($conn) {
    try {
        $searchTerm = $_GET['search'] ?? $_POST['search'] ?? null;
        
        if (!$searchTerm || strlen(trim($searchTerm)) < 2) {
            throw new Exception('Search term must be at least 2 characters');
        }
        
        $searchTerm = trim($searchTerm);
        
        $stmt = $conn->prepare("
            SELECT Feedback_ID, Email, Feedback_Type, created_at 
            FROM feedbacks 
            WHERE Email LIKE CONCAT('%', ?, '%') 
               OR Feedback_Type LIKE CONCAT('%', ?, '%') 
               OR Messages LIKE CONCAT('%', ?, '%')
            ORDER BY Feedback_ID DESC
        ");
        
        if (!$stmt) {
            throw new Exception('Failed to prepare statement: ' . $conn->error);
        }
        
        $stmt->bind_param("sss", $searchTerm, $searchTerm, $searchTerm);
        $stmt->execute();
        $result = $stmt->get_result();
        
        $feedbacks = [];
        while ($row = $result->fetch_assoc()) {
            $feedbacks[] = [
                'Feedback_ID' => (int)$row['Feedback_ID'],
                'Email' => $row['Email'],
                'Feedback_Type' => $row['Feedback_Type'] ?? 'General',
                'created_at' => $row['created_at']
            ];
        }
        
        $stmt->close();
        
        echo json_encode([
            'success' => true,
            'feedbacks' => $feedbacks,
            'count' => count($feedbacks),
            'search_term' => $searchTerm
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}

// Get feedback statistics
function getFeedbackStats($conn) {
    try {
        $query = "
            SELECT 
                COUNT(*) as total_feedbacks,
                SUM(CASE WHEN LOWER(Feedback_Type) = 'complaint' THEN 1 ELSE 0 END) as complaints,
                SUM(CASE WHEN LOWER(Feedback_Type) = 'suggestion' THEN 1 ELSE 0 END) as suggestions,
                SUM(CASE WHEN LOWER(Feedback_Type) = 'compliment' THEN 1 ELSE 0 END) as compliments,
                SUM(CASE WHEN LOWER(Feedback_Type) = 'bug report' THEN 1 ELSE 0 END) as bug_reports,
                SUM(CASE WHEN LOWER(Feedback_Type) = 'feature request' THEN 1 ELSE 0 END) as feature_requests
            FROM feedbacks
        ";
        
        $result = $conn->query($query);
        
        if (!$result) {
            throw new Exception('Failed to get statistics: ' . $conn->error);
        }
        
        $stats = $result->fetch_assoc();
        
        echo json_encode([
            'success' => true,
            'stats' => [
                'total_feedbacks' => (int)$stats['total_feedbacks'],
                'complaints' => (int)$stats['complaints'],
                'suggestions' => (int)$stats['suggestions'],
                'compliments' => (int)$stats['compliments'],
                'bug_reports' => (int)$stats['bug_reports'],
                'feature_requests' => (int)$stats['feature_requests']
            ]
        ]);
        
    } catch (Exception $e) {
        echo json_encode([
            'success' => false,
            'message' => $e->getMessage()
        ]);
    }
}
?>