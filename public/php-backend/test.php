<?php
/**
 * TEST PAYMENT REDIRECT PAGE
 * Use this to manually test the payment success handler with a real PayMongo session
 * 
 * USAGE: http://localhost/capstone_project/public/php-backend/test-payment-redirect.php
 */

session_start();
error_log("=== TEST PAYMENT REDIRECT PAGE ===");

require_once __DIR__ . '/config.php';

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Test Payment Redirect</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 20px;
        }
        .container {
            background: white;
            padding: 40px;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0,0,0,0.1);
            max-width: 600px;
            width: 100%;
        }
        h1 {
            color: #2d3748;
            margin-bottom: 20px;
            font-size: 24px;
        }
        .info-box {
            background: #f7fafc;
            padding: 20px;
            border-radius: 10px;
            margin-bottom: 20px;
            border-left: 4px solid #667eea;
        }
        .session-list {
            background: #fff5f5;
            padding: 15px;
            border-radius: 8px;
            margin: 15px 0;
            max-height: 300px;
            overflow-y: auto;
        }
        .session-item {
            background: white;
            padding: 10px;
            margin: 5px 0;
            border-radius: 5px;
            border: 1px solid #e2e8f0;
            font-size: 12px;
        }
        .btn {
            display: inline-block;
            padding: 12px 24px;
            background: #667eea;
            color: white;
            text-decoration: none;
            border-radius: 8px;
            border: none;
            cursor: pointer;
            font-size: 14px;
            font-weight: 600;
            margin: 5px;
            transition: all 0.3s;
        }
        .btn:hover {
            background: #5a67d8;
            transform: translateY(-2px);
        }
        .btn-success {
            background: #10b981;
        }
        .btn-success:hover {
            background: #059669;
        }
        input[type="text"] {
            width: 100%;
            padding: 12px;
            border: 2px solid #e2e8f0;
            border-radius: 8px;
            font-size: 14px;
            margin: 10px 0;
        }
        label {
            display: block;
            font-weight: 600;
            color: #4a5568;
            margin-bottom: 5px;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🧪 Test Payment Redirect</h1>
        
        <div class="info-box">
            <p><strong>Purpose:</strong> This page helps you manually test the payment success handler.</p>
            <p style="margin-top: 10px;"><strong>Instructions:</strong></p>
            <ol style="margin-left: 20px; margin-top: 10px;">
                <li>Find your PayMongo checkout session ID (starts with <code>cs_</code>)</li>
                <li>Enter it below and click "Test Payment Success"</li>
                <li>Or use the quick link if you have a pending session</li>
            </ol>
        </div>

        <?php
        // Display all pending payment sessions
        $pendingSessions = [];
        foreach ($_SESSION as $key => $value) {
            if (strpos($key, 'pending_payment_') === 0 && is_array($value)) {
                $pendingSessions[] = [
                    'key' => $key,
                    'session_id' => $value['paymongo_checkout_id'] ?? 'Unknown',
                    'student_name' => $value['student_name'] ?? 'Unknown',
                    'amount' => $value['total_amount'] ?? 0
                ];
            }
        }

        if (!empty($pendingSessions)) {
            echo '<div class="info-box" style="border-left-color: #10b981;">';
            echo '<p><strong>✓ Found ' . count($pendingSessions) . ' pending payment session(s):</strong></p>';
            echo '<div class="session-list">';
            
            foreach ($pendingSessions as $session) {
                echo '<div class="session-item">';
                echo '<strong>Session ID:</strong> ' . htmlspecialchars($session['session_id']) . '<br>';
                echo '<strong>Student:</strong> ' . htmlspecialchars($session['student_name']) . '<br>';
                echo '<strong>Amount:</strong> ₱' . number_format($session['amount'], 2);
                echo '<div style="margin-top: 10px;">';
                echo '<a href="payment-success.php?session_id=' . urlencode($session['session_id']) . '" class="btn btn-success">Test This Session</a>';
                echo '</div>';
                echo '</div>';
            }
            
            echo '</div>';
            echo '</div>';
        } else {
            echo '<div class="info-box" style="border-left-color: #ef4444;">';
            echo '<p><strong>⚠️ No pending payment sessions found.</strong></p>';
            echo '<p style="margin-top: 10px;">Please initiate a payment from your application first, then come back to this page.</p>';
            echo '</div>';
        }
        ?>

        <div style="margin-top: 30px;">
            <label for="session_id">Or enter PayMongo Checkout Session ID manually:</label>
            <form method="GET" action="payment-success.php">
                <input 
                    type="text" 
                    name="session_id" 
                    id="session_id" 
                    placeholder="cs_XXXXXXXXXXXXXXXXXX"
                    pattern="cs_[a-zA-Z0-9]+"
                    title="PayMongo session ID must start with 'cs_'"
                >
                <button type="submit" class="btn">Test Payment Success</button>
            </form>
        </div>

        <div style="margin-top: 30px; text-align: center;">
            <a href="/" class="btn">← Back to Home</a>
        </div>

        <div style="margin-top: 20px; padding: 15px; background: #fffaf0; border-radius: 8px; font-size: 13px;">
            <strong>💡 Tip:</strong> You can find your PayMongo checkout session ID in:
            <ul style="margin-left: 20px; margin-top: 10px;">
                <li>The PayMongo dashboard under "Payments"</li>
                <li>Your PHP error logs when you create a checkout</li>
                <li>The URL when you're on the PayMongo checkout page</li>
            </ul>
        </div>
    </div>
</body>
</html>