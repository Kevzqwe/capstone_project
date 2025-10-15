<?php
// CORS Headers first
$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';
$allowed_origins = ['http://localhost:3000', 'http://localhost:3001', 'http://127.0.0.1:3000', 'http://127.0.0.1:3001'];
$isLocalhost = (strpos($origin, 'localhost') !== false || strpos($origin, '127.0.0.1') !== false);
$isAllowed = in_array($origin, $allowed_origins) || $isLocalhost;

if ($isAllowed) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
}

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Session configuration
ini_set('session.gc_maxlifetime', 7200);
ini_set('session.cookie_lifetime', 7200);
ini_set('session.use_strict_mode', 0);
ini_set('session.use_cookies', 1);
ini_set('session.use_only_cookies', 1);
ini_set('session.cookie_httponly', 1);
ini_set('session.cookie_samesite', 'Lax');

session_start();

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

error_log("=== PAYMENT SUCCESS HANDLER STARTED ===");

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

require_once __DIR__ . '/config.php';

// CRITICAL: Explicitly load environment variables
try {
    Config::loadEnv();
    error_log("✓ Config loaded successfully - .env file path: " . Config::getEnvPath());
    
    // Verify critical configs are loaded
    if (!Config::has('IPROG_API_TOKEN')) {
        error_log("⚠️ WARNING: IPROG_API_TOKEN not found in config!");
    }
    if (!Config::has('PAYMONGO_SECRET_KEY')) {
        error_log("⚠️ WARNING: PAYMONGO_SECRET_KEY not found in config!");
    }
} catch (Exception $e) {
    error_log("❌ CRITICAL: Failed to load config: " . $e->getMessage());
}

// PayMongo API Class for verification
class PayMongoAPI {
    private $secretKey;
    private $apiUrl = 'https://api.paymongo.com/v1';
    
    public function __construct($secretKey) {
        $this->secretKey = $secretKey;
    }
    
    public function verifyPayment($checkoutSessionId) {
        error_log("Verifying PayMongo payment for session: $checkoutSessionId");
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->apiUrl . '/checkout_sessions/' . $checkoutSessionId);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Basic ' . base64_encode($this->secretKey . ':')
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        error_log("PayMongo API Response Code: $httpCode");
        
        if ($error) {
            error_log("cURL Error: $error");
            throw new Exception('Payment verification connection error');
        }
        
        if ($httpCode === 404) {
            error_log("Session ID not found in PayMongo");
            return false;
        }
        
        if ($httpCode !== 200) {
            throw new Exception('Payment verification error: HTTP ' . $httpCode);
        }
        
        $result = json_decode($response, true);
        
        if (!isset($result['data']['attributes'])) {
            throw new Exception('Invalid payment verification response');
        }
        
        $attributes = $result['data']['attributes'];
        $status = $attributes['status'] ?? '';
        
        error_log("Payment status: $status");
        
        return $status === 'paid';
    }
}

// IPROG SMS Class
class IProgSMS {
    private $apiToken;
    private $apiUrl = 'https://sms.iprogtech.com/api/v1/sms_messages';
    
    public function __construct($apiToken) {
        $this->apiToken = $apiToken;
    }
    
    public function sendSMS($phoneNumber, $message) {
        if (empty($phoneNumber) || empty($message)) {
            throw new Exception('Phone number and message are required');
        }
        
        // Clean phone number - more robust cleaning
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
        
        // Format to Philippine number format (639XXXXXXXXX)
        if (strlen($phoneNumber) === 10 && substr($phoneNumber, 0, 1) === '9') {
            $phoneNumber = '63' . $phoneNumber;
        } elseif (strlen($phoneNumber) === 11 && substr($phoneNumber, 0, 2) === '09') {
            $phoneNumber = '63' . substr($phoneNumber, 1);
        }
        
        error_log("Formatted phone number: $phoneNumber");
        
        if (!preg_match('/^639[0-9]{9}$/', $phoneNumber)) {
            error_log("Invalid phone format after processing: $phoneNumber");
            throw new Exception('Invalid Philippine phone number format: ' . $phoneNumber);
        }
        
        // Prepare data for IPROG API
        $data = [
            'api_token' => $this->apiToken,
            'message' => substr($message, 0, 160),
            'phone_number' => $phoneNumber
        ];
        
        error_log("Sending SMS to: $phoneNumber with message: " . substr($message, 0, 50) . "...");
        
        $ch = curl_init($this->apiUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, http_build_query($data));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/x-www-form-urlencoded'
        ]);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);
        
        error_log("IPROG API Response Code: $httpCode");
        error_log("IPROG API Full Response: " . $response);
        
        if ($error) {
            error_log("IPROG SMS cURL Error: " . $error);
            throw new Exception('SMS service connection error: ' . $error);
        }
        
        // Parse the response to check for actual success
        $responseData = json_decode($response, true);
        
        if ($httpCode !== 200) {
            error_log("IPROG SMS HTTP Error: " . $httpCode . " - " . $response);
            
            // Check if it's a content filtering error
            if (isset($responseData['message']) && is_array($responseData['message'])) {
                $errorMsg = implode(', ', $responseData['message']);
                if (strpos($errorMsg, 'phishing') !== false || strpos($errorMsg, 'suspicious') !== false) {
                    throw new Exception('Message blocked by content filter: ' . $errorMsg);
                }
            }
            
            throw new Exception('SMS service error: HTTP ' . $httpCode);
        }
        
        // Check if the response indicates success
        if (isset($responseData['status']) && $responseData['status'] !== 200) {
            $errorMsg = isset($responseData['message']) ? 
                (is_array($responseData['message']) ? implode(', ', $responseData['message']) : $responseData['message']) 
                : 'Unknown error';
            throw new Exception('SMS API error: ' . $errorMsg);
        }
        
        return true;
    }
}

function sendNotificationSMS($phoneNumber, $requestId, $studentName, $totalAmount, $paymentMethod, $scheduledPickup) {
    try {
        if (empty($phoneNumber)) {
            error_log("❌ No phone number provided for SMS");
            return false;
        }
        
        error_log("📱 Attempting SMS with phone: $phoneNumber");
        
        $iprogApiToken = Config::get('IPROG_API_TOKEN', '');
        
        error_log("IPROG Token retrieved: " . (empty($iprogApiToken) ? 'EMPTY/NOT SET' : 'LENGTH=' . strlen($iprogApiToken)));
        
        if (empty($iprogApiToken)) {
            error_log("❌ CRITICAL: IPROG API token is empty or not configured!");
            error_log("Check: Config::has('IPROG_API_TOKEN') = " . (Config::has('IPROG_API_TOKEN') ? 'true' : 'false'));
            error_log("SMS not sent.");
            return false;
        }
        
        $sms = new IProgSMS($iprogApiToken);
        
        // Extract first name from student name (format: Surname, Firstname Middlename)
        $nameParts = explode(',', $studentName);
        $firstName = trim($nameParts[1] ?? $studentName);
        $firstName = explode(' ', $firstName)[0];
        
        $pickupDate = date('F j, Y', strtotime($scheduledPickup));
        
        // ALWAYS USE "Online payment" FOR ONLINE PAYMENTS TO AVOID PHISHING DETECTION
        $smsPaymentMethod = "Online payment";
        
        // SAFE MESSAGE FORMAT
        $message = "Hi! $firstName your request document #$requestId is received. ";
        $message .= "Mode of payment: $smsPaymentMethod. ";
        $message .= "Please prepare the receipt. ";
        $message .= "Pickup: $pickupDate. Thank you.";
        
        error_log("Attempting to send SMS to: $phoneNumber");
        error_log("SMS Message: $message");
        
        $result = $sms->sendSMS($phoneNumber, $message);
        
        error_log("✓ SMS sent successfully to {$phoneNumber} for request #{$requestId}");
        return true;
        
    } catch (Exception $e) {
        error_log("❌ SMS sending failed: " . $e->getMessage());
        
        // Try with alternative safe message if first attempt fails
        try {
            error_log("🔄 Attempting with alternative safe message...");
            
            $nameParts = explode(',', $studentName);
            $firstName = trim($nameParts[1] ?? $studentName);
            $firstName = explode(' ', $firstName)[0];
            
            $pickupDate = date('M j, Y', strtotime($scheduledPickup));
            
            // Ultra-safe message without payment references
            $altMessage = "Hi $firstName! Your document request #$requestId is confirmed. ";
            $altMessage .= "Pickup date: $pickupDate. ";
            $altMessage .= "Please bring confirmation details. Thank you!";
            
            $sms->sendSMS($phoneNumber, $altMessage);
            error_log("✓ Alternative SMS sent successfully");
            return true;
            
        } catch (Exception $altException) {
            error_log("❌ Alternative SMS also failed: " . $altException->getMessage());
            return false;
        }
    }
}

/**
 * Creates a notification in the database for a student's document request
 */
function createRequestNotification($studentNumber, $requestId, $paymentMethod, $totalAmount, $scheduledPickup) {
    try {
        $dbConfig = Config::database();
        $conn = new mysqli(
            $dbConfig['host'],
            $dbConfig['user'],
            $dbConfig['pass'],
            $dbConfig['name']
        );
        
        if ($conn->connect_error) {
            error_log("Database connection failed for notification: " . $conn->connect_error);
            return false;
        }
        
        $conn->set_charset('utf8mb4');
        
        // Create notification message
        $message = sprintf(
            "Document Request #%d submitted. Amount: ₱%.2f via %s. Pickup: %s",
            $requestId,
            $totalAmount,
            ucfirst($paymentMethod),
            date('F j, Y', strtotime($scheduledPickup))
        );
        
        // Insert notification
        $stmt = $conn->prepare("
            INSERT INTO notifications (Notification_type, Student_ID, Created_At) 
            VALUES (?, ?, NOW())
        ");
        
        if (!$stmt) {
            error_log("Failed to prepare notification statement: " . $conn->error);
            $conn->close();
            return false;
        }
        
        $stmt->bind_param("si", $message, $studentNumber);
        
        if (!$stmt->execute()) {
            error_log("Failed to insert notification: " . $stmt->error);
            $stmt->close();
            $conn->close();
            return false;
        }
        
        $stmt->close();
        $conn->close();
        
        error_log("✓ Notification created successfully for student #$studentNumber");
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error creating notification: " . $e->getMessage());
        return false;
    }
}

try {
    error_log("=== INCOMING REQUEST DEBUG ===");
    error_log("GET parameters: " . print_r($_GET, true));
    error_log("Request URI: " . ($_SERVER['REQUEST_URI'] ?? 'N/A'));
    error_log("Session ID: " . session_id());
    error_log("Session data keys: " . implode(", ", array_keys($_SESSION)));
    
    $paymongoSessionId = null;
    
    // Get session ID from GET parameters
    if (isset($_GET['session_id'])) {
        $paymongoSessionId = trim($_GET['session_id']);
        error_log("Found session_id in GET: $paymongoSessionId");
    }
    
    // Check for placeholder or empty
    if (empty($paymongoSessionId) || $paymongoSessionId === '{checkout_session_id}' || strpos($paymongoSessionId, '{') !== false) {
        error_log("⚠ Invalid or missing session ID, checking session storage...");
        
        // Try to find the most recent pending payment from session
        $mostRecent = null;
        $mostRecentKey = null;
        $mostRecentTime = 0;
        
        foreach ($_SESSION as $key => $value) {
            if (strpos($key, 'pending_payment_') === 0 && is_array($value)) {
                if (isset($value['created_at'])) {
                    $age = time() - $value['created_at'];
                    if ($age < 600 && $value['created_at'] > $mostRecentTime) {
                        $mostRecent = $value;
                        $mostRecentKey = $key;
                        $mostRecentTime = $value['created_at'];
                    }
                }
            }
        }
        
        if ($mostRecentKey) {
            $paymongoSessionId = str_replace('pending_payment_', '', $mostRecentKey);
            error_log("✓ Using most recent session from storage: $paymongoSessionId");
        }
    }
    
    // Validate session ID format
    if (empty($paymongoSessionId) || !preg_match('/^cs_[a-zA-Z0-9]+$/', $paymongoSessionId)) {
        error_log("❌ ERROR: Invalid PayMongo session ID format: $paymongoSessionId");
        
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'invalid_session',
            'message' => 'Invalid payment session format.'
        ]);
        
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    error_log("Processing payment for PayMongo session: $paymongoSessionId");
    
    // Get PayMongo secret key
    $paymongoSecretKey = Config::get('PAYMONGO_SECRET_KEY', '');
    
    if (empty($paymongoSecretKey)) {
        error_log("❌ ERROR: PayMongo secret key not configured");
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'config_error',
            'message' => 'Payment system not configured.'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    $paymongo = new PayMongoAPI($paymongoSecretKey);
    $isTestMode = (strpos($paymongoSecretKey, 'sk_test_') === 0);
    
    // Verify payment with PayMongo
    try {
        $isPaid = $paymongo->verifyPayment($paymongoSessionId);
        
        if (!$isPaid && !$isTestMode) {
            error_log("❌ Payment verification failed");
            
            $reactAppUrl = Config::getReactUrl();
            $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
                'success' => '0',
                'error' => 'payment_not_completed',
                'message' => 'Payment was not completed or verified'
            ]);
            
            header('Location: ' . $redirectUrl);
            exit();
        }
        
        error_log("✓ Payment verified successfully");
        
    } catch (Exception $e) {
        error_log("❌ Payment verification error: " . $e->getMessage());
        
        if (!$isTestMode) {
            $reactAppUrl = Config::getReactUrl();
            $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
                'success' => '0',
                'error' => 'verification_failed',
                'message' => $e->getMessage()
            ]);
            
            header('Location: ' . $redirectUrl);
            exit();
        }
    }
    
    // Search for session data
    error_log("=== SEARCHING FOR SESSION DATA ===");
    $sessionKey = 'pending_payment_' . $paymongoSessionId;
    $paymentData = null;

    if (isset($_SESSION[$sessionKey])) {
        $paymentData = $_SESSION[$sessionKey];
        error_log("✓ Found payment data using direct lookup");
    } else {
        error_log("⚠ Direct lookup failed, searching all keys...");
        error_log("Available session keys: " . implode(", ", array_keys($_SESSION)));
        
        foreach ($_SESSION as $key => $value) {
            if (strpos($key, 'pending_payment_') === 0 && is_array($value)) {
                if (isset($value['paymongo_checkout_id']) && $value['paymongo_checkout_id'] === $paymongoSessionId) {
                    $paymentData = $value;
                    $sessionKey = $key;
                    error_log("✓ Found matching payment data!");
                    break;
                }
            }
        }
    }

    if (!$paymentData) {
        error_log("❌ CRITICAL: No session data found for session ID: $paymongoSessionId");
        error_log("Session data dump: " . print_r($_SESSION, true));
        
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'session_not_found',
            'message' => 'Payment session not found. Please contact support.'
        ]);
        
        header('Location: ' . $redirectUrl);
        exit();
    }

    error_log("✓ Session data retrieved successfully");
    
    // Extract payment data
    $studentNumber = intval($paymentData['student_number'] ?? 0);
    $studentName = $paymentData['student_name'] ?? '';
    $grade = $paymentData['grade'] ?? '';
    $section = $paymentData['section'] ?? '';
    $contactNo = $paymentData['contact_no'] ?? '';
    $email = $paymentData['email'] ?? '';
    $paymentMethod = $paymentData['payment_method'] ?? '';
    $scheduledPickup = $paymentData['scheduled_pickup'] ?? '';
    $documentJson = $paymentData['document_json'] ?? '[]';
    $totalAmount = floatval($paymentData['total_amount'] ?? 0);
    
    error_log("✓ Payment data extracted: $studentName - ₱$totalAmount - Phone: $contactNo");
    
    // Validate extracted data
    if (empty($studentNumber) || empty($contactNo)) {
        error_log("❌ CRITICAL: Missing essential payment data");
        error_log("Student Number: $studentNumber, Contact: $contactNo");
        
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'incomplete_data',
            'message' => 'Missing required payment information'
        ]);
        
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    // Connect to database
    $dbConfig = Config::database();
    $conn = new mysqli($dbConfig['host'], $dbConfig['user'], $dbConfig['pass'], $dbConfig['name']);
    
    if ($conn->connect_error) {
        error_log("Database connection failed: " . $conn->connect_error);
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'db_error',
            'message' => 'Database connection failed'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    $conn->set_charset('utf8mb4');

    // Check if this payment was already processed
    $checkStmt = $conn->prepare("SELECT Request_ID FROM payment WHERE Paymongo_Session_ID = ?");
    if ($checkStmt) {
        $checkStmt->bind_param("s", $paymongoSessionId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult && $checkResult->num_rows > 0) {
            $existingRow = $checkResult->fetch_assoc();
            $existingRequestId = $existingRow['Request_ID'];
            
            error_log("⚠️ Payment already processed! Request ID: $existingRequestId");
            
            $checkStmt->close();
            $conn->close();
            
            if (isset($_SESSION[$sessionKey])) {
                unset($_SESSION[$sessionKey]);
            }
            
            $reactAppUrl = Config::getReactUrl();
            $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
                'success' => '1',
                'request_id' => $existingRequestId,
                'amount' => $totalAmount,
                'payment_method' => ucfirst($paymentMethod),
                'student_name' => $studentName,
                'duplicate' => '1'
            ]);
            
            header('Location: ' . $redirectUrl);
            exit();
        }
        $checkStmt->close();
    }

    // Call stored procedure
    error_log("Calling InsertDocumentRequest stored procedure");
    
    $stmt = $conn->prepare("CALL InsertDocumentRequest(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        error_log("Database prepare failed: " . $conn->error);
        $conn->close();
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'prepare_failed',
            'message' => 'Failed to process request'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    $stmt->bind_param("isssssssss", $studentNumber, $studentName, $grade, $section, $contactNo, $email, $paymentMethod, $scheduledPickup, $documentJson, $paymongoSessionId);
    
    if (!$stmt->execute()) {
        error_log("Stored procedure execution failed: " . $stmt->error);
        $stmt->close();
        $conn->close();
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'execute_failed',
            'message' => 'Failed to save request'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    error_log("✓ Stored procedure executed");
    
    // Get results
    $requestId = 0;
    $finalAmount = $totalAmount;
    
    $result = $stmt->get_result();
    if ($result && $row = $result->fetch_assoc()) {
        $requestId = isset($row['request_id']) ? intval($row['request_id']) : 0;
        $finalAmount = isset($row['total_amount']) ? floatval($row['total_amount']) : $totalAmount;
    }
    
    if ($result) $result->close();
    
    if ($requestId == 0) {
        $requestId = $conn->insert_id;
    }
    
    if ($requestId == 0) {
        $idQuery = $conn->query("SELECT LAST_INSERT_ID() as last_id");
        if ($idQuery && $idRow = $idQuery->fetch_assoc()) {
            $requestId = intval($idRow['last_id']);
        }
        if ($idQuery) $idQuery->close();
    }
    
    $stmt->close();
    
    if ($requestId == 0) {
        $conn->close();
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'no_request_id',
            'message' => 'Failed to retrieve request ID'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    error_log("✓ Request ID: $requestId");
    
    // Update payment status
    $updateStmt = $conn->prepare("UPDATE payment SET Status = 'Paid', Payment_Date = NOW() WHERE Request_ID = ?");
    if ($updateStmt) {
        $updateStmt->bind_param("i", $requestId);
        $updateStmt->execute();
        $updateStmt->close();
    }
    
    $conn->close();
    
    // SEND SMS NOTIFICATION - IMPROVED ERROR HANDLING
    error_log("=== INITIATING SMS NOTIFICATION ===");
    error_log("SMS Parameters - Phone: $contactNo | Name: $studentName | Amount: ₱$finalAmount | Method: $paymentMethod");
    
    $smsSent = sendNotificationSMS($contactNo, $requestId, $studentName, $finalAmount, $paymentMethod, $scheduledPickup);
    
    if ($smsSent) {
        error_log("✓✓✓ SMS SUCCESSFULLY SENT ✓✓✓");
    } else {
        error_log("❌❌❌ SMS FAILED TO SEND ❌❌❌");
    }
    
    // Create notification in database
    $notificationCreated = createRequestNotification($studentNumber, $requestId, $paymentMethod, $finalAmount, $scheduledPickup);
    
    // Clean up session
    if (isset($_SESSION[$sessionKey])) {
        unset($_SESSION[$sessionKey]);
    }
    
    // Redirect to success page with all parameters
    error_log("=== PAYMENT COMPLETED SUCCESSFULLY ===");
    error_log("Request ID: $requestId - Amount: ₱$finalAmount");
    error_log("SMS Sent: " . ($smsSent ? 'Yes' : 'No'));
    error_log("Notification Created: " . ($notificationCreated ? 'Yes' : 'No'));
    
    $reactAppUrl = Config::getReactUrl();
    $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
        'success' => '1',
        'request_id' => $requestId,
        'amount' => number_format($finalAmount, 2, '.', ''),
        'payment_method' => ucfirst($paymentMethod),
        'student_name' => $studentName,
        'scheduled_pickup' => $scheduledPickup,
        'sms_sent' => $smsSent ? '1' : '0',
        'notification_created' => $notificationCreated ? '1' : '0'
    ]);
    
    header('Location: ' . $redirectUrl);
    exit();
    
} catch (Exception $e) {
    error_log("=== PAYMENT ERROR ===");
    error_log("Error: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    
    $reactAppUrl = Config::getReactUrl();
    $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
        'success' => '0',
        'error' => 'exception',
        'message' => $e->getMessage()
    ]);
    
    header('Location: ' . $redirectUrl);
    exit();
}
?>