<?php
/**
 * Environment Configuration Loader
 * Place this file in your PHP backend root directory
 */

/**
 * -------------------------
 * CORS CONFIGURATION
 * -------------------------
 * Allow requests from your Vercel domain, Hostinger, and local dev
 */
$allowed_origins = [
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost',
    'https://capstone-project-smoky-one.vercel.app',
    'https://mediumaquamarine-heron-545485.hostingersite.com'
];

// Detect request origin
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowed_origins)) {
    header("Access-Control-Allow-Origin: $origin");
}

header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");

// Handle preflight OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

/**
 * -------------------------
 * MAIN CONFIG CLASS
 * -------------------------
 */
class Config {
    private static $loaded = false;
    private static $envPath = null;
    
    /**
     * Load environment variables from .env file
     */
    public static function loadEnv($filePath = null) {
        if (self::$loaded) {
            return;
        }
        
        // Determine .env file path
        if ($filePath === null) {
            $possiblePaths = [
                __DIR__ . '/.env',
                dirname(__DIR__) . '/.env',
                dirname(dirname(__DIR__)) . '/.env',
                $_SERVER['DOCUMENT_ROOT'] . '/.env'
            ];
            
            $filePath = null;
            foreach ($possiblePaths as $path) {
                if (file_exists($path)) {
                    $filePath = $path;
                    error_log("Found .env file at: $path");
                    break;
                }
            }
            
            if ($filePath === null) {
                error_log("WARNING: .env file not found in any expected location. Checked: " . implode(", ", $possiblePaths));
                self::$loaded = true;
                return;
            }
        }
        
        if (!file_exists($filePath)) {
            error_log("ERROR: .env file not found at: $filePath");
            throw new Exception('.env file not found at: ' . $filePath);
        }
        
        $envContent = file_get_contents($filePath);
        if ($envContent === false) {
            throw new Exception('Failed to read .env file at: ' . $filePath);
        }
        
        $lines = explode("\n", $envContent);
        $loadedCount = 0;
        
        foreach ($lines as $line) {
            $line = trim($line);
            
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value, '"\' ');
                
                if (!array_key_exists($key, $_ENV)) {
                    $_ENV[$key] = $value;
                    putenv("$key=$value");
                    $loadedCount++;
                }
            }
        }
        
        error_log("Config: Loaded $loadedCount environment variables from .env");
        self::$loaded = true;
        self::$envPath = $filePath;
    }
    
    public static function get($key, $default = null) {
        $value = $_ENV[$key] ?? getenv($key);
        if ($value === false) {
            if ($default === null) {
                error_log("WARNING: Config key not found: $key");
            }
            return $default;
        }
        return $value;
    }
    
    public static function has($key) {
        return isset($_ENV[$key]) || getenv($key) !== false;
    }
    
    public static function database() {
        return [
            'host' => self::get('DB_HOST', 'localhost'),
            'user' => self::get('DB_USER', 'root'),
            'pass' => self::get('DB_PASS', ''),
            'name' => self::get('DB_NAME', 'pcs_db')
        ];
    }
    
    public static function paymongo() {
        return [
            'secret_key' => self::get('PAYMONGO_SECRET_KEY'),
            'public_key' => self::get('PAYMONGO_PUBLIC_KEY')
        ];
    }
    
    public static function iprog() {
        return [
            'api_token' => self::get('IPROG_API_TOKEN'),
            'sender_name' => self::get('IPROG_SENDER_NAME', 'IPROGSMS')
        ];
    }
    
    public static function app() {
        return [
            'base_url' => self::get('BASE_URL', 'http://localhost:8000'),
            'environment' => self::get('ENVIRONMENT', 'development'),
            'react_app_url' => self::get('REACT_APP_URL', 'http://localhost:3000'),
            'php_api_url' => self::get('PHP_API_URL', 'http://localhost/capstone_project/public/php-backend')
        ];
    }
    
    public static function getReactUrl() {
        return self::get('REACT_APP_URL', 'http://localhost:3000');
    }
    
    public static function getPhpApiUrl() {
        return self::get('PHP_API_URL', 'http://localhost/capstone_project/public/php-backend');
    }
    
    public static function isProduction() {
        return self::get('ENVIRONMENT') === 'production';
    }
    
    public static function getEnvPath() {
        return self::$envPath ?? 'Not loaded';
    }
}

// Auto-load environment variables
try {
    Config::loadEnv();
} catch (Exception $e) {
    error_log('Config Error: ' . $e->getMessage());
}
?>
