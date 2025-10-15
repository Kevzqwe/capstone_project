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

// Dynamic CORS handling - MUST be before any output
$allowed_origins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8000',
    'http://localhost:8080',
    'https://yourdomain.com'
];

$origin = isset($_SERVER['HTTP_ORIGIN']) ? $_SERVER['HTTP_ORIGIN'] : '';

// Always set CORS headers for allowed origins
if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
    header('Access-Control-Allow-Credentials: true');
} elseif (getenv('APP_ENV') === 'development') {
    // In development, allow localhost with any port
    if (strpos($origin, 'http://localhost') === 0 || strpos($origin, 'http://127.0.0.1') === 0) {
        header("Access-Control-Allow-Origin: $origin");
        header('Access-Control-Allow-Credentials: true');
    }
}

header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, Accept, Origin, Cache-Control');
header('Access-Control-Max-Age: 86400');

// Handle preflight OPTIONS request - MUST be early
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Regular headers
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
    }
    
    public function sendSMS($phoneNumber, $message) {
        if (empty($phoneNumber) || empty($message)) {
            throw new Exception('Phone number and message are required');
        }
        
        // Clean phone number
        $phoneNumber = preg_replace('/[^0-9]/', '', $phoneNumber);
        
        // Format to Philippine number format (639XXXXXXXXX)
        if (strlen($phoneNumber) === 10 && substr($phoneNumber, 0, 1) === '9') {
            $phoneNumber = '63' . $phoneNumber;
        } elseif (strlen($phoneNumber) === 11 && substr($phoneNumber, 0, 2) === '09') {
            $phoneNumber = '63' . substr($phoneNumber, 1);
        }
        
        if (!preg_match('/^639[0-9]{9}$/', $phoneNumber)) {
            throw new Exception('Invalid Philippine phone number format');
        }
        
        if (strlen($message) > 160) {
            $message = substr($message, 0, 157) . '...';
        }
        
        // Prepare data for IPROG API
        $data = [
            'api_token' => $this->apiToken,
            'message' => $message,
            'phone_number' => $phoneNumber
        ];
        
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
        
        if ($error || $httpCode !== 200) {
            error_log("IPROG SMS Error: $error - HTTP $httpCode");
            throw new Exception('SMS service error');
        }
        
        return true;
    }
}

function sendNotificationSMS($phoneNumber, $requestId, $studentName, $totalAmount, $paymentMethod, $scheduledPickup) {
    try {
        if (empty($phoneNumber)) {
            error_log("No phone number provided for SMS");
            return false;
        }
        
        $iprogApiToken = Config::get('IPROG_API_TOKEN', '');
        
        if (empty($iprogApiToken)) {
            error_log("IPROG API token not configured. SMS not sent.");
            return false;
        }
        
        $sms = new IProgSMS($iprogApiToken);
        
        // Extract first name from student name (format: Surname, Firstname Middlename)
        $nameParts = explode(',', $studentName);
        $firstName = trim($nameParts[1] ?? $studentName);
        $firstName = explode(' ', $firstName)[0];
        
        $pickupDate = date('F j, Y', strtotime($scheduledPickup));
        $formattedAmount = number_format($totalAmount, 2);
        
        // UPDATED MESSAGE FORMAT FOR CASH PAYMENT
        $message = "Hi! $firstName your request document #$requestId is received. ";
        $message .= "Mode of payment: " . ucfirst($paymentMethod) . ". ";
        $message .= "Please prepare ₱$formattedAmount. ";
        $message .= "Pickup: $pickupDate. Thank you.";
        
        $sms->sendSMS($phoneNumber, $message);
        
        error_log("SMS sent successfully to {$phoneNumber}");
        return true;
        
    } catch (Exception $e) {
        error_log("SMS sending failed: " . $e->getMessage());
        return false;
    }
}

/**
 * Creates a notification in the database for a student's document request
 * Matches the table structure from your image
 * 
 * @param int $studentNumber - The student's ID number
 * @param int $requestId - The document request ID
 * @param string $paymentMethod - Payment method used (cash/gcash/maya)
 * @param float $totalAmount - Total amount of the request
 * @param string $scheduledPickup - Scheduled pickup date
 * @return bool - True if notification was created successfully, false otherwise
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
        
        // Create notification message based on your table structure
        $notificationType = "document_request";
        $message = sprintf(
            "Document Request #%d submitted. Amount: ₱%.2f via %s. Pickup: %s",
            $requestId,
            $totalAmount,
            ucfirst($paymentMethod),
            date('F j, Y', strtotime($scheduledPickup))
        );
        
        // Insert notification - adjusted for your table structure
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
        
        $notificationId = $conn->insert_id;
        
        $stmt->close();
        $conn->close();
        
        error_log("✓ Notification created successfully (ID: $notificationId) for student #$studentNumber");
        
        return true;
        
    } catch (Exception $e) {
        error_log("Error creating notification: " . $e->getMessage());
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
        error_log("Database connection failed: " . $conn->connect_error);
        throw new Exception('Database connection failed');
    }
    
    $conn->set_charset('utf8mb4');
    
    error_log("Calling stored procedure InsertDocumentRequest");
    error_log("Parameters: StudentID=$studentNumber, Name=$studentName, PaymentMethod=$paymentMethod");
    
    $stmt = $conn->prepare("CALL InsertDocumentRequest(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    
    if (!$stmt) {
        $error = 'Database prepare failed: ' . $conn->error;
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

    error_log("Executing stored procedure...");
    
    if (!$stmt->execute()) {
        $error = 'Database execute failed: ' . $stmt->error;
        error_log($error);
        $stmt->close();
        $conn->close();
        throw new Exception($error);
    }

    error_log("✓ Stored procedure executed successfully");

    $result = $stmt->get_result();
    $requestId = 0;
    $finalAmount = 0;
    $message = 'Request created successfully';

    if ($result && $row = $result->fetch_assoc()) {
        $requestId = isset($row['request_id']) ? intval($row['request_id']) : 0;
        $finalAmount = isset($row['total_amount']) ? floatval($row['total_amount']) : 0;
        $message = isset($row['message']) ? $row['message'] : $message;
        
        error_log("✓ Retrieved from SP: RequestID=$requestId, Amount=₱$finalAmount");
    } else {
        error_log("⚠ No result set returned from stored procedure");
    }

    if ($result) {
        $result->close();
    }
    $stmt->close();

    if ($requestId == 0) {
        error_log("Attempting to get request_id from LAST_INSERT_ID()");
        $idResult = $conn->query("SELECT LAST_INSERT_ID() as last_id");
        
        if ($idResult && $idRow = $idResult->fetch_assoc()) {
            $requestId = intval($idRow['last_id']);
            error_log("✓ Got request_id from LAST_INSERT_ID: $requestId");
        }
        
        if ($idResult) {
            $idResult->close();
        }
    }

    $conn->close();
    
    if ($requestId == 0) {
        throw new Exception('Failed to retrieve request ID after insert');
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

    // Calculate scheduled pickup as 3 business days from today
    // Skip weekends (Saturday and Sunday)
    $scheduledPickup = new DateTime();
    $daysAdded = 0;
    
    while ($daysAdded < 3) {
        $scheduledPickup->modify('+1 day');
        
        // Get day of week (1 = Monday, 7 = Sunday)
        $dayOfWeek = $scheduledPickup->format('N');
        
        // Only count weekdays (Monday to Friday)
        if ($dayOfWeek >= 1 && $dayOfWeek <= 5) {
            $daysAdded++;
        }
    }
    
    $scheduledPickupDate = $scheduledPickup->format('Y-m-d');
    
    error_log("Scheduled pickup calculated: $scheduledPickupDate (3 business days from " . date('Y-m-d') . ")");
    
    $studentNumber = intval(getArrayValue($student, 'studentNumber'));
    $grade = getArrayValue($student, 'grade');
    $section = getArrayValue($student, 'section');
    $contactNo = getArrayValue($student, 'contactNo');
    $documentJson = json_encode($documentData, JSON_UNESCAPED_UNICODE);

    // CASH PAYMENT - SAVE DIRECTLY TO DATABASE
    if ($paymentMethod === 'cash') {
        error_log("Processing CASH payment for student: $studentName");
        
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
        
        // Send SMS notification
        $smsSent = sendNotificationSMS($contactNo, $result['request_id'], $studentName, $result['final_amount'], $paymentMethod, $scheduledPickupDate);
        
        // Create notification in database
        $notificationCreated = createRequestNotification($studentNumber, $result['request_id'], $paymentMethod, $result['final_amount'], $scheduledPickupDate);
        
        $responseData = [
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
        ];
        
        $message = $result['message'];
        if ($smsSent) {
            $message .= " SMS notification sent.";
        }
        if ($notificationCreated) {
            $message .= " Notification created.";
        }
        
        sendResponse(true, $message, $responseData);
        
    } else {
        // ONLINE PAYMENT - ONLY CREATE PAYMENT SESSION
        error_log("Processing ONLINE payment ($paymentMethod)");
        
        $paymongoSecretKey = Config::get('PAYMONGO_SECRET_KEY', '');
        $paymongo = new PayMongoAPI($paymongoSecretKey);
        
        if (!$paymongo->isEnabled()) {
            sendResponse(false, 'Online payment not available. Please use cash payment.');
        }
        
        try {
            $reactAppUrl = Config::getReactUrl();
            $phpApiUrl = Config::getPhpApiUrl();
            
            // Ensure URLs don't have trailing slashes
            $reactAppUrl = rtrim($reactAppUrl, '/');
            $phpApiUrl = rtrim($phpApiUrl, '/');
            
            $description = "Document Request - " . substr($studentName, 0, 50);
            
            // Both success and cancel URLs use PHP handlers with {checkout_session_id} placeholder
            $successUrl = $phpApiUrl . '/payment-success.php?session_id={checkout_session_id}';
            $cancelUrl = $phpApiUrl . '/payment-cancel.php?session_id={checkout_session_id}';
            
            error_log("Success URL: $successUrl");
            error_log("Cancel URL: $cancelUrl");
            
            $metadata = [
                'student_number' => (string)$studentNumber,
                'student_name' => substr($studentName, 0, 50),
                'total_amount' => number_format($totalAmount, 2, '.', '')
            ];
            
            // Determine payment methods
            $paymongoMethods = [];
            if ($paymentMethod === 'gcash') {
                $paymongoMethods = ['gcash'];
            } elseif ($paymentMethod === 'maya') {
                $paymongoMethods = ['paymaya'];
            } else {
                $paymongoMethods = ['gcash', 'paymaya'];
            }
            
            // STEP 1: Create PayMongo checkout session
            error_log("Creating PayMongo checkout session...");
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
            
            error_log("✓ PayMongo checkout created successfully");
            error_log("  Checkout ID: $paymongoCheckoutId");
            error_log("  Checkout URL: $checkoutUrl");
            
            // STEP 2: Store payment data in session
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
            
            // Force session write
            session_write_close();
            session_start();
            
            error_log("✓ Payment data stored in PHP session");
            error_log("  Session Key: $sessionKey");
            error_log("  PHP Session ID: " . session_id());
            
            if (!isset($_SESSION[$sessionKey])) {
                error_log("❌ CRITICAL: Session data not found after storage!");
                throw new Exception('Failed to store payment session data');
            }
            
            error_log("✓ Session data verified present");
            
            // STEP 3: Return checkout URL to frontend
            sendResponse(true, 'Redirecting to payment gateway...', [
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
            error_log("❌ Online payment error: " . $e->getMessage());
            error_log("Stack trace: " . $e->getTraceAsString());
            sendResponse(false, 'Payment setup failed: ' . $e->getMessage());
        }
    }

} catch (Exception $e) {
    error_log("Exception: " . $e->getMessage());
    error_log("Stack trace: " . $e->getTraceAsString());
    sendResponse(false, 'An error occurred. Please try again later.');
}
?>