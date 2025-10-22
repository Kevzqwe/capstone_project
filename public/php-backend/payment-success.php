<?php
// CORS Headers
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

error_log("=== PAYMENT SUCCESS HANDLER ===");

// Security headers
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

require_once __DIR__ . '/config.php';

// PayMongo API
class PayMongoAPI {
    private $secretKey;
    private $apiUrl = 'https://api.paymongo.com/v1';
    
    public function __construct($secretKey) {
        $this->secretKey = $secretKey;
    }
    
    public function verifyPayment($checkoutSessionId) {
        error_log("Verifying: $checkoutSessionId");
        
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
        
        error_log("Response Code: $httpCode");
        
        if ($error) {
            error_log("cURL Error: $error");
            throw new Exception('Verification connection error');
        }
        
        if ($httpCode === 404) {
            return false;
        }
        
        if ($httpCode !== 200) {
            throw new Exception('Verification error: HTTP ' . $httpCode);
        }
        
        $result = json_decode($response, true);
        
        if (!isset($result['data']['attributes'])) {
            throw new Exception('Invalid verification response');
        }
        
        $status = $result['data']['attributes']['status'] ?? '';
        error_log("Status: $status");
        
        return $status === 'paid';
    }
}

// IPROG SMS Class
class IProgSMS {
    private $apiToken;
    private $apiUrl = 'https://sms.iprogtech.com/api/v1/sms_messages';
    
    public function __construct($apiToken) {
        $this->apiToken = $apiToken;
        error_log("✓ IProgSMS initialized");
    }
    
    public function sendSMS($phoneNumber, $message) {
        error_log("=== SMS SEND ===");
        error_log("📱 Input: $phoneNumber");
        error_log("💬 Message: $message");
        
        if (empty($phoneNumber) || empty($message)) {
            throw new Exception('Phone and message required');
        }
        
        // Clean
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
        error_log("🧹 Cleaned: $phoneNumber");
        
        // Format to 639XXXXXXXXX
        if (strlen($phoneNumber) === 10 && substr($phoneNumber, 0, 1) === '9') {
            $phoneNumber = '63' . $phoneNumber;
        } elseif (strlen($phoneNumber) === 11 && substr($phoneNumber, 0, 2) === '09') {
            $phoneNumber = '63' . substr($phoneNumber, 1);
        } elseif (strlen($phoneNumber) === 13 && substr($phoneNumber, 0, 4) === '+639') {
            $phoneNumber = substr($phoneNumber, 1);
        }
        
        error_log("📱 Formatted: $phoneNumber");
        
        if (!preg_match('/^639[0-9]{9}$/', $phoneNumber)) {
            error_log("❌ Invalid");
            throw new Exception('Invalid phone: ' . $phoneNumber);
        }
        
        if (strlen($message) > 160) {
            $message = substr($message, 0, 157) . '...';
        }
        
        $data = [
            'api_token' => $this->apiToken,
            'message' => $message,
            'phone_number' => $phoneNumber
        ];
        
        error_log("🚀 Sending...");
        
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
        
        error_log("📡 HTTP: $httpCode");
        error_log("📨 Response: $response");
        
        if ($error) {
            error_log("❌ cURL: $error");
            throw new Exception('Connection error: ' . $error);
        }
        
        $responseData = json_decode($response, true);
        
        if ($httpCode !== 200) {
            $errorMsg = 'HTTP ' . $httpCode;
            if (isset($responseData['message'])) {
                $errorMsg .= ': ' . (is_array($responseData['message']) 
                    ? implode(', ', $responseData['message']) 
                    : $responseData['message']);
            }
            throw new Exception($errorMsg);
        }
        
        if (isset($responseData['status']) && $responseData['status'] !== 200) {
            $errorMsg = isset($responseData['message']) ? 
                (is_array($responseData['message']) ? implode(', ', $responseData['message']) : $responseData['message']) 
                : 'Unknown error';
            throw new Exception($errorMsg);
        }
        
        error_log("✅ SMS SENT");
        if (isset($responseData['message_id'])) {
            error_log("📧 ID: " . $responseData['message_id']);
        }
        
        return true;
    }
}

// SMS NOTIFICATION FUNCTION - FIXED FOR CASH AND ONLINE PAYMENTS
function sendNotificationSMS($phoneNumber, $requestId, $studentName, $totalAmount, $paymentMethod, $scheduledPickup) {
    error_log("=== SMS NOTIFICATION START ===");
    error_log("Phone: $phoneNumber | Request: #$requestId | Method: $paymentMethod");
    
    try {
        if (empty($phoneNumber)) {
            error_log("❌ No phone number");
            return false;
        }
        
        $iprogApiToken = Config::get('IPROG_API_TOKEN', '');
        
        if (empty($iprogApiToken)) {
            error_log("❌ No IPROG API token");
            return false;
        }
        
        $sms = new IProgSMS($iprogApiToken);
        
        // Extract first name
        $nameParts = explode(',', $studentName);
        $firstName = trim($nameParts[1] ?? $nameParts[0]);
        $firstName = explode(' ', $firstName)[0];
        
        // Format date - Full date format
        $pickupDate = date('F j, Y', strtotime($scheduledPickup));
        
        // Format amount without peso sign (avoid Unicode issues)
        $formattedAmount = number_format($totalAmount, 2);
        
        // BUILD MESSAGE BASED ON PAYMENT METHOD
        $paymentLower = strtolower(trim($paymentMethod));
        
        if ($paymentLower === 'cash') {
            // CASH PAYMENT MESSAGE
            $message = "Hi! $firstName your request document #$requestId is received. ";
            $message .= "Mode of payment: Cash. ";
            $message .= "Please prepare P$formattedAmount. ";
            $message .= "Pickup: $pickupDate. ";
            $message .= "Thank you.";
            
        } else {
            // ONLINE PAYMENT MESSAGE (GCash/Maya)
            $message = "Hi! $firstName your request document #$requestId is received. ";
            $message .= "Mode of payment: Online payment. ";
            $message .= "Please prepare the receipt. ";
            $message .= "Pickup: $pickupDate. ";
            $message .= "Thank you.";
        }
        
        error_log("📱 Sending SMS to: $phoneNumber");
        error_log("💬 Message: $message");
        
        try {
            $sms->sendSMS($phoneNumber, $message);
            error_log("✅ SMS SENT SUCCESSFULLY");
            return true;
            
        } catch (Exception $e) {
            error_log("❌ Primary SMS failed: " . $e->getMessage());
            
            // FALLBACK: Try alternative format if primary fails
            try {
                error_log("🔄 Trying fallback message...");
                
                if ($paymentLower === 'cash') {
                    $fallbackMessage = "Hi! $firstName your document request #$requestId is confirmed. ";
                    $fallbackMessage .= "Payment: Cash. ";
                    $fallbackMessage .= "Amount: P$formattedAmount. ";
                    $fallbackMessage .= "Pickup: $pickupDate. ";
                    $fallbackMessage .= "Thank you!";
                } else {
                    $fallbackMessage = "Hi! $firstName your document request #$requestId is confirmed. ";
                    $fallbackMessage .= "Total: P$formattedAmount. ";
                    $fallbackMessage .= "Pickup date: $pickupDate. ";
                    $fallbackMessage .= "Thank you!";
                }
                
                error_log("💬 Fallback: $fallbackMessage");
                $sms->sendSMS($phoneNumber, $fallbackMessage);
                error_log("✅ FALLBACK SMS SENT");
                return true;
                
            } catch (Exception $e2) {
                error_log("❌ Fallback also failed: " . $e2->getMessage());
                return false;
            }
        }
        
    } catch (Exception $e) {
        error_log("❌ SMS Exception: " . $e->getMessage());
        return false;
    }
}

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
            error_log("DB failed: " . $conn->connect_error);
            return false;
        }
        
        $conn->set_charset('utf8mb4');
        
        $message = sprintf(
            "Document Request #%d submitted. Amount: ₱%.2f via %s. Pickup: %s",
            $requestId,
            $totalAmount,
            ucfirst($paymentMethod),
            date('F j, Y', strtotime($scheduledPickup))
        );
        
        $stmt = $conn->prepare("
            INSERT INTO notifications (Notification_type, Student_ID, Created_At) 
            VALUES (?, ?, NOW())
        ");
        
        if (!$stmt) {
            error_log("Prepare failed: " . $conn->error);
            $conn->close();
            return false;
        }
        
        $stmt->bind_param("si", $message, $studentNumber);
        
        if (!$stmt->execute()) {
            error_log("Execute failed: " . $stmt->error);
            $stmt->close();
            $conn->close();
            return false;
        }
        
        $stmt->close();
        $conn->close();
        
        error_log("✓ Notification created");
        return true;
        
    } catch (Exception $e) {
        error_log("Error: " . $e->getMessage());
        return false;
    }
}

try {
    error_log("=== PAYMENT SUCCESS ===");
    error_log("GET: " . print_r($_GET, true));
    
    $paymongoSessionId = null;
    
    if (isset($_GET['session_id'])) {
        $paymongoSessionId = trim($_GET['session_id']);
        error_log("Session: $paymongoSessionId");
    }
    
    // Check placeholder
    if (empty($paymongoSessionId) || $paymongoSessionId === '{checkout_session_id}' || strpos($paymongoSessionId, '{') !== false) {
        error_log("⚠ Invalid, searching...");
        
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
            error_log("✓ Using: $paymongoSessionId");
        }
    }
    
    // Validate
    if (empty($paymongoSessionId) || !preg_match('/^cs_[a-zA-Z0-9]+$/', $paymongoSessionId)) {
        error_log("❌ Invalid: $paymongoSessionId");
        
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'invalid_session',
            'message' => 'Invalid session'
        ]);
        
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    error_log("Processing: $paymongoSessionId");
    
    $paymongoSecretKey = Config::get('PAYMONGO_SECRET_KEY', '');
    
    if (empty($paymongoSecretKey)) {
        error_log("❌ No key");
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'config_error',
            'message' => 'Not configured'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    $paymongo = new PayMongoAPI($paymongoSecretKey);
    $isTestMode = (strpos($paymongoSecretKey, 'sk_test_') === 0);
    
    // Verify
    try {
        $isPaid = $paymongo->verifyPayment($paymongoSessionId);
        
        if (!$isPaid && !$isTestMode) {
            error_log("❌ Not verified");
            
            $reactAppUrl = Config::getReactUrl();
            $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
                'success' => '0',
                'error' => 'not_completed',
                'message' => 'Not completed'
            ]);
            
            header('Location: ' . $redirectUrl);
            exit();
        }
        
        error_log("✓ Verified");
        
    } catch (Exception $e) {
        error_log("❌ Verification: " . $e->getMessage());
        
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
    
    // Get session data
    error_log("=== FINDING DATA ===");
    $sessionKey = 'pending_payment_' . $paymongoSessionId;
    $paymentData = null;

    if (isset($_SESSION[$sessionKey])) {
        $paymentData = $_SESSION[$sessionKey];
        error_log("✓ Found");
    } else {
        error_log("⚠ Searching...");
        
        foreach ($_SESSION as $key => $value) {
            if (strpos($key, 'pending_payment_') === 0 && is_array($value)) {
                if (isset($value['paymongo_checkout_id']) && $value['paymongo_checkout_id'] === $paymongoSessionId) {
                    $paymentData = $value;
                    $sessionKey = $key;
                    error_log("✓ Found");
                    break;
                }
            }
        }
    }

    if (!$paymentData) {
        error_log("❌ No data");
        
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'session_not_found',
            'message' => 'Session not found'
        ]);
        
        header('Location: ' . $redirectUrl);
        exit();
    }

    error_log("✓ Data retrieved");
    
    // Extract
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
    
    error_log("✓ $studentName - ₱$totalAmount - Phone: $contactNo");
    
    if (empty($studentNumber) || empty($contactNo)) {
        error_log("❌ Missing data");
        
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'incomplete_data',
            'message' => 'Missing info'
        ]);
        
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    // Database
    $dbConfig = Config::database();
    $conn = new mysqli($dbConfig['host'], $dbConfig['user'], $dbConfig['pass'], $dbConfig['name']);
    
    if ($conn->connect_error) {
        error_log("DB failed: " . $conn->connect_error);
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'db_error',
            'message' => 'Database error'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    $conn->set_charset('utf8mb4');

    // Check duplicate
    $checkStmt = $conn->prepare("SELECT Request_ID FROM payment WHERE Paymongo_Session_ID = ?");
    if ($checkStmt) {
        $checkStmt->bind_param("s", $paymongoSessionId);
        $checkStmt->execute();
        $checkResult = $checkStmt->get_result();
        
        if ($checkResult && $checkResult->num_rows > 0) {
            $existingRow = $checkResult->fetch_assoc();
            $existingRequestId = $existingRow['Request_ID'];
            
            error_log("⚠️ Duplicate: #$existingRequestId");
            
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

    // Call procedure
    error_log("Calling InsertDocumentRequest");
    
    $stmt = $conn->prepare("CALL InsertDocumentRequest(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        error_log("Prepare failed: " . $conn->error);
        $conn->close();
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'prepare_failed',
            'message' => 'Failed to process'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    $stmt->bind_param("isssssssss", $studentNumber, $studentName, $grade, $section, $contactNo, $email, $paymentMethod, $scheduledPickup, $documentJson, $paymongoSessionId);
    
    if (!$stmt->execute()) {
        error_log("Execute failed: " . $stmt->error);
        $stmt->close();
        $conn->close();
        $reactAppUrl = Config::getReactUrl();
        $redirectUrl = rtrim($reactAppUrl, '/') . '/Pay_Success?' . http_build_query([
            'success' => '0',
            'error' => 'execute_failed',
            'message' => 'Failed'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    error_log("✓ Procedure executed");
    
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
            'message' => 'Failed to get ID'
        ]);
        header('Location: ' . $redirectUrl);
        exit();
    }
    
    error_log("✓ Request: #$requestId");
    
    // Update payment
    $updateStmt = $conn->prepare("UPDATE payment SET Status = 'Paid', Payment_Date = NOW() WHERE Request_ID = ?");
    if ($updateStmt) {
        $updateStmt->bind_param("i", $requestId);
        $updateStmt->execute();
        $updateStmt->close();
    }
    
    $conn->close();
    
    // SEND SMS
    error_log("=== SENDING SMS ===");
    
    $smsSent = sendNotificationSMS($contactNo, $requestId, $studentName, $finalAmount, $paymentMethod, $scheduledPickup);
    
    error_log("SMS: " . ($smsSent ? 'SUCCESS ✅' : 'FAILED ❌'));
    
    // Create notification
    $notificationCreated = createRequestNotification($studentNumber, $requestId, $paymentMethod, $finalAmount, $scheduledPickup);
    
    // Clean up
    if (isset($_SESSION[$sessionKey])) {
        unset($_SESSION[$sessionKey]);
    }
    
    // Redirect
    error_log("=== COMPLETED ===");
    error_log("Request: #$requestId - ₱$finalAmount");
    error_log("SMS: " . ($smsSent ? 'Sent' : 'Failed'));
    error_log("Notification: " . ($notificationCreated ? 'Created' : 'Failed'));
    
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
    error_log("=== ERROR ===");
    error_log("Error: " . $e->getMessage());
    error_log("Stack: " . $e->getTraceAsString());
    
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