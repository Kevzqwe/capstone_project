<?php
// Session configuration - MUST be before session_start()
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

error_log("=== DOCUMENT REQUEST HANDLER STARTED ===");

// Dynamic CORS handling
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000',
    'http://localhost:8080',
    'https://yourdomain.com'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} elseif (getenv('APP_ENV') === 'development') {
    if (strpos($origin, 'http://localhost') === 0 || strpos($origin, 'http://127.0.0.1') === 0) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    }
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
header('Access-Control-Max-Age: 86400');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

require_once __DIR__ . '/config.php';

function sendResponse($success, $message, $data = []) {
    $response = ['success' => $success, 'message' => $message];
    if (!empty($data)) {
        $response = array_merge($response, $data);
    }
    echo json_encode($response, JSON_UNESCAPED_UNICODE);
    exit();
}

function getArrayValue($array, $key, $default = '') {
    if (!isset($array[$key])) {
        return $default;
    }
    
    $value = $array[$key];
    
    if (is_string($value)) {
        $value = htmlspecialchars($value, ENT_QUOTES, 'UTF-8');
        $value = str_replace("\0", "", $value);
    }
    
    return $value;
}

// PayMongo API Class
class PayMongoAPI {
    private $secretKey;
    private $apiUrl = 'https://api.paymongo.com/v1';
    private $isEnabled = false;
    
    public function __construct($secretKey) {
        $this->secretKey = $secretKey;
        if (!empty($secretKey) && (strpos($secretKey, 'sk_test_') === 0 || strpos($secretKey, 'sk_live_') === 0)) {
            $this->isEnabled = true;
        }
    }
    
    public function isEnabled() {
        return $this->isEnabled;
    }
    
    public function createCheckoutSession($amount, $description, $successUrl, $cancelUrl, $metadata = [], $paymentMethods = ['gcash', 'paymaya']) {
        error_log("Creating PayMongo checkout session for amount: $amount");
        
        if (!$this->isEnabled) {
            throw new Exception('PayMongo is not configured. Please use cash payment.');
        }
        
        $amountInCents = intval($amount * 100);
        
        $payload = [
            'data' => [
                'attributes' => [
                    'line_items' => [
                        [
                            'currency' => 'PHP',
                            'amount' => $amountInCents,
                            'description' => $description,
                            'name' => 'Document Request',
                            'quantity' => 1
                        ]
                    ],
                    'payment_method_types' => $paymentMethods,
                    'success_url' => $successUrl,
                    'cancel_url' => $cancelUrl,
                    'description' => $description,
                    'metadata' => $metadata
                ]
            ]
        ];
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->apiUrl . '/checkout_sessions');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
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
        
        if ($error) {
            error_log("PayMongo cURL Error: $error");
            throw new Exception('Payment service connection error');
        }
        
        if ($httpCode !== 200 && $httpCode !== 201) {
            error_log("PayMongo HTTP Error: $httpCode - $response");
            throw new Exception('Payment service error');
        }
        
        $result = json_decode($response, true);
        
        if (!isset($result['data']['id']) || !isset($result['data']['attributes']['checkout_url'])) {
            throw new Exception('Invalid payment service response');
        }
        
        return [
            'session_id' => $result['data']['id'],
            'checkout_url' => $result['data']['attributes']['checkout_url']
        ];
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
        error_log("📱 Input Phone: $phoneNumber");
        error_log("💬 Message: $message");
        
        if (empty($phoneNumber) || empty($message)) {
            throw new Exception('Phone and message required');
        }
        
        // Clean phone number
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
        error_log("🧹 Cleaned: $phoneNumber (length: " . strlen($phoneNumber) . ")");
        
        // Format to 639XXXXXXXXX
        if (strlen($phoneNumber) === 10 && substr($phoneNumber, 0, 1) === '9') {
            $phoneNumber = '63' . $phoneNumber;
        } elseif (strlen($phoneNumber) === 11 && substr($phoneNumber, 0, 2) === '09') {
            $phoneNumber = '63' . substr($phoneNumber, 1);
        } elseif (strlen($phoneNumber) === 12 && substr($phoneNumber, 0, 3) === '639') {
            // Already correct
        } elseif (strlen($phoneNumber) === 13 && substr($phoneNumber, 0, 4) === '+639') {
            $phoneNumber = substr($phoneNumber, 1);
        } else {
            error_log("❌ Invalid format: $phoneNumber");
            throw new Exception('Invalid phone number format');
        }
        
        error_log("📱 Formatted: $phoneNumber");
        
        // Validate
        if (!preg_match('/^639[0-9]{9}$/', $phoneNumber)) {
            error_log("❌ Failed validation");
            throw new Exception('Invalid Philippine mobile number: ' . $phoneNumber);
        }
        
        // Truncate message
        if (strlen($message) > 160) {
            $message = substr($message, 0, 157) . '...';
        }
        
        // API Request
        $data = [
            'api_token' => $this->apiToken,
            'message' => $message,
            'phone_number' => $phoneNumber
        ];
        
        error_log("🚀 Sending to IPROG...");
        
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
            error_log("❌ cURL Error: $error");
            throw new Exception('SMS connection error: ' . $error);
        }
        
        $responseData = json_decode($response, true);
        
        if ($httpCode !== 200) {
            error_log("❌ HTTP Error");
            $errorMsg = isset($responseData['message']) ? 
                (is_array($responseData['message']) ? implode(', ', $responseData['message']) : $responseData['message']) 
                : 'HTTP ' . $httpCode;
            throw new Exception('SMS API error: ' . $errorMsg);
        }
        
        if (isset($responseData['status']) && $responseData['status'] !== 200) {
            $errorMsg = isset($responseData['message']) ? 
                (is_array($responseData['message']) ? implode(', ', $responseData['message']) : $responseData['message']) 
                : 'Unknown error';
            throw new Exception('SMS rejected: ' . $errorMsg);
        }
        
        error_log("✅ SMS SENT - To: $phoneNumber");
        if (isset($responseData['message_id'])) {
            error_log("📧 Message ID: " . $responseData['message_id']);
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
        error_log("Notification error: " . $e->getMessage());
        return false;
    }
}

function saveToDatabase($studentNumber, $studentName, $grade, $section, $contactNo, $email, $paymentMethod, $scheduledPickup, $documentJson, $paymongoSessionId = null) {
    $dbConfig = Config::database();
    $conn = new mysqli(
        $dbConfig['host'],
        $dbConfig['user'],
        $dbConfig['pass'],
        $dbConfig['name']
    );
    
    if ($conn->connect_error) {
        error_log("DB connection failed: " . $conn->connect_error);
        throw new Exception('Database connection failed');
    }
    
    $conn->set_charset('utf8mb4');
    
    error_log("Calling InsertDocumentRequest");
    
    $stmt = $conn->prepare("CALL InsertDocumentRequest(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        $error = 'Prepare failed: ' . $conn->error;
        error_log($error);
        $conn->close();
        throw new Exception($error);
    }
    
    $stmt->bind_param(
        "isssssssss",
        $studentNumber,
        $studentName,
        $grade,
        $section,
        $contactNo,
        $email,
        $paymentMethod,
        $scheduledPickup,
        $documentJson,
        $paymongoSessionId
    );

    if (!$stmt->execute()) {
        $error = 'Execute failed: ' . $stmt->error;
        error_log($error);
        $stmt->close();
        $conn->close();
        throw new Exception($error);
    }

    error_log("✓ Procedure executed");

    $result = $stmt->get_result();
    $requestId = 0;
    $finalAmount = 0;
    $message = 'Request created successfully';

    if ($result && $row = $result->fetch_assoc()) {
        $requestId = isset($row['request_id']) ? intval($row['request_id']) : 0;
        $finalAmount = isset($row['total_amount']) ? floatval($row['total_amount']) : 0;
        $message = isset($row['message']) ? $row['message'] : $message;
        
        error_log("✓ RequestID=$requestId, Amount=₱$finalAmount");
    }

    if ($result) {
        $result->close();
    }
    $stmt->close();

    if ($requestId == 0) {
        $idResult = $conn->query("SELECT LAST_INSERT_ID() as last_id");
        if ($idResult && $idRow = $idResult->fetch_assoc()) {
            $requestId = intval($idRow['last_id']);
        }
        if ($idResult) {
            $idResult->close();
        }
    }

    $conn->close();
    
    if ($requestId == 0) {
        throw new Exception('Failed to get request ID');
    }
    
    return [
        'request_id' => $requestId, 
        'final_amount' => $finalAmount, 
        'message' => $message
    ];
}

try {
    $raw = file_get_contents('php://input');
    if (empty($raw)) {
        sendResponse(false, 'No data received');
    }

    $data = json_decode($raw, true);
    if ($data === null) {
        sendResponse(false, 'Invalid request format');
    }

    $student = isset($data['studentInfo']) ? $data['studentInfo'] : [];
    $required = ['studentNumber', 'email', 'contactNo', 'surname', 'firstname', 'grade', 'section'];
    
    foreach($required as $field) {
        if (empty(getArrayValue($student, $field))) {
            sendResponse(false, "Missing required field: $field");
        }
    }
    
    $email = getArrayValue($student, 'email');
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        sendResponse(false, 'Invalid email address');
    }

    $documents = isset($data['selectedDocs']) ? $data['selectedDocs'] : [];
    if (empty($documents)) {
        sendResponse(false, "No documents selected");
    }

    $paymentMethod = strtolower(trim(getArrayValue($data, 'paymentMethod')));
    $allowedMethods = ['cash', 'gcash', 'maya'];
    if (!in_array($paymentMethod, $allowedMethods)) {
        sendResponse(false, "Invalid payment method");
    }

    $documentData = [];
    $totalAmount = 0;

    foreach ($documents as $doc) {
        $documentId = intval(getArrayValue($doc, 'id', 0));
        $quantity = intval(getArrayValue($doc, 'quantity', 1));
        $price = floatval(getArrayValue($doc, 'price', 0));
        
        if ($documentId <= 0 || $quantity <= 0 || $price < 0) continue;
        
        $documentData[] = [
            'id' => $documentId,
            'quantity' => $quantity,
            'price' => $price
        ];
        
        $totalAmount += $price * $quantity;
    }

    if (empty($documentData)) {
        sendResponse(false, "No valid documents selected");
    }

    $surname = getArrayValue($student, 'surname');
    $firstname = getArrayValue($student, 'firstname');
    $middlename = getArrayValue($student, 'middlename');
    
    $studentName = $surname . ', ' . $firstname;
    if (!empty($middlename)) {
        $studentName .= ' ' . $middlename;
    }

    // Calculate pickup (3 business days)
    $scheduledPickup = new DateTime();
    $daysAdded = 0;
    
    while ($daysAdded < 3) {
        $scheduledPickup->modify('+1 day');
        $dayOfWeek = $scheduledPickup->format('N');
        if ($dayOfWeek >= 1 && $dayOfWeek <= 5) {
            $daysAdded++;
        }
    }
    
    $scheduledPickupDate = $scheduledPickup->format('Y-m-d');
    
    $studentNumber = intval(getArrayValue($student, 'studentNumber'));
    $grade = getArrayValue($student, 'grade');
    $section = getArrayValue($student, 'section');
    $contactNo = getArrayValue($student, 'contactNo');
    $documentJson = json_encode($documentData, JSON_UNESCAPED_UNICODE);

    // CASH PAYMENT
    if ($paymentMethod === 'cash') {
        error_log("=== CASH PAYMENT ===");
        
        $result = saveToDatabase(
            $studentNumber,
            $studentName,
            $grade,
            $section,
            $contactNo,
            $email,
            $paymentMethod,
            $scheduledPickupDate,
            $documentJson
        );
        
        error_log("✓ Saved - Request: #" . $result['request_id']);
        
        // Send SMS
        $smsSent = sendNotificationSMS(
            $contactNo, 
            $result['request_id'], 
            $studentName, 
            $result['final_amount'], 
            $paymentMethod, 
            $scheduledPickupDate
        );
        
        error_log("SMS: " . ($smsSent ? 'SUCCESS ✅' : 'FAILED ❌'));
        
        // Create notification
        $notificationCreated = createRequestNotification(
            $studentNumber, 
            $result['request_id'], 
            $paymentMethod, 
            $result['final_amount'], 
            $scheduledPickupDate
        );
        
        $responseMessage = $result['message'];
        if ($smsSent) {
            $responseMessage .= " SMS sent.";
        }
        
        sendResponse(true, $responseMessage, [
            'grand_total' => $result['final_amount'],
            'student_name' => $studentName,
            'documents_processed' => count($documentData),
            'request_id' => $result['request_id'],
            'payment_method' => $paymentMethod,
            'sms_sent' => $smsSent,
            'notification_created' => $notificationCreated,
            'scheduled_pickup' => $scheduledPickupDate,
            'payment_redirect' => false,
            'payment_status' => 'paid'
        ]);
        
    } else {
        // ONLINE PAYMENT
        error_log("=== ONLINE PAYMENT ===");
        
        $paymongoSecretKey = Config::get('PAYMONGO_SECRET_KEY', '');
        $paymongo = new PayMongoAPI($paymongoSecretKey);
        
        if (!$paymongo->isEnabled()) {
            sendResponse(false, 'Online payment not available. Please use cash payment.');
        }
        
        try {
            $reactAppUrl = Config::getReactUrl();
            $phpApiUrl = Config::getPhpApiUrl();
            
            $reactAppUrl = rtrim($reactAppUrl, '/');
            $phpApiUrl = rtrim($phpApiUrl, '/');
            
            $description = "Document Request - " . substr($studentName, 0, 50);
            
            $successUrl = $phpApiUrl . '/payment-success.php?session_id={checkout_session_id}';
            $cancelUrl = $phpApiUrl . '/payment-cancel.php?session_id={checkout_session_id}';
            
            $metadata = [
                'student_number' => (string)$studentNumber,
                'student_name' => substr($studentName, 0, 50),
                'total_amount' => number_format($totalAmount, 2, '.', '')
            ];
            
            $paymongoMethods = ($paymentMethod === 'gcash') ? ['gcash'] : ['paymaya'];
            
            $checkoutSession = $paymongo->createCheckoutSession(
                $totalAmount,
                $description,
                $successUrl,
                $cancelUrl,
                $metadata,
                $paymongoMethods
            );
            
            $paymongoCheckoutId = $checkoutSession['session_id'];
            $checkoutUrl = $checkoutSession['checkout_url'];
            
            // Store in session
            $paymentSessionData = [
                'student_number' => $studentNumber,
                'student_name' => $studentName,
                'grade' => $grade,
                'section' => $section,
                'contact_no' => $contactNo,
                'email' => $email,
                'payment_method' => $paymentMethod,
                'scheduled_pickup' => $scheduledPickupDate,
                'document_json' => $documentJson,
                'total_amount' => $totalAmount,
                'documents_data' => $documentData,
                'created_at' => time(),
                'paymongo_checkout_id' => $paymongoCheckoutId
            ];
            
            $sessionKey = 'pending_payment_' . $paymongoCheckoutId;
            $_SESSION[$sessionKey] = $paymentSessionData;
            
            session_write_close();
            session_start();
            
            error_log("✓ Session stored: $sessionKey");
            
            sendResponse(true, 'Redirecting...', [
                'grand_total' => $totalAmount,
                'student_name' => $studentName,
                'documents_processed' => count($documentData),
                'payment_redirect' => true,
                'checkout_url' => $checkoutUrl,
                'payment_method' => $paymentMethod,
                'paymongo_session_id' => $paymongoCheckoutId,
                'payment_status' => 'pending',
                'session_stored' => true
            ]);
            
        } catch (Exception $e) {
            error_log("❌ Payment error: " . $e->getMessage());
            sendResponse(false, 'Payment setup failed: ' . $e->getMessage());
        }
    }

} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    sendResponse(false, 'An error occurred. Please try again later.');
}
?>