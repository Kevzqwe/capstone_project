<?php
session_start();

error_reporting(E_ALL);
ini_set('display_errors', 0);
ini_set('log_errors', 1);

error_log("=== PAYMENT CANCEL HANDLER STARTED ===");

header('X-Content-Type-Options: nosniff');
header('X-Frame-Options: DENY');
header('X-XSS-Protection: 1; mode=block');

require_once __DIR__ . '/config.php';

try {
    error_log("Session ID (PHP): " . session_id());
    
    $paymongoSessionId = isset($_GET['session_id']) ? trim($_GET['session_id']) : '';
    error_log("Session ID from URL: " . ($paymongoSessionId ?: 'EMPTY'));
    
    $pendingPayment = null;
    $sessionKey = null;
    
    // Try to find the pending payment in session
    if (!empty($paymongoSessionId)) {
        $sessionKey = 'pending_payment_' . $paymongoSessionId;
        if (isset($_SESSION[$sessionKey])) {
            $pendingPayment = $_SESSION[$sessionKey];
            error_log("Found pending payment in session");
        }
    }
    
    // If not found by session_id, search for most recent
    if (!$pendingPayment) {
        error_log("Searching for most recent pending payment...");
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
            $pendingPayment = $mostRecent;
            $sessionKey = $mostRecentKey;
            $paymongoSessionId = str_replace('pending_payment_', '', $mostRecentKey);
            error_log("Found most recent payment: $paymongoSessionId");
        }
    }
    
    // LOG CANCELLED PAYMENT FOR AUDIT TRAIL (Optional - no database changes)
    if ($pendingPayment) {
        error_log("✓ Payment cancelled by user");
        error_log("  Student: " . $pendingPayment['student_name']);
        error_log("  Amount: ₱" . $pendingPayment['total_amount']);
        error_log("  Method: " . $pendingPayment['payment_method']);
        error_log("  Session ID: $paymongoSessionId");
        error_log("  NO request saved to database (payment cancelled before completion)");
    } else {
        error_log("⚠ No pending payment found in session");
    }
    
    // Clear pending payment session data
    if ($sessionKey && isset($_SESSION[$sessionKey])) {
        unset($_SESSION[$sessionKey]);
        error_log("✓ Payment session cleared");
    }
    
    // Redirect to React Pay_Cancelled page
    $reactAppUrl = Config::getReactUrl();
    $url = rtrim($reactAppUrl, '/') . '/Pay_Cancelled';
    
    error_log("Redirecting to: $url");
    header("Location: $url");
    exit();
    
} catch (Exception $e) {
    error_log("EXCEPTION in payment-cancel.php: " . $e->getMessage());
    
    // Even on error, redirect to cancel page
    $reactAppUrl = Config::getReactUrl();
    $url = rtrim($reactAppUrl, '/') . '/Pay_Cancelled';
    header("Location: $url");
    exit();
}
?>