<?php
/**
 * Environment Configuration Loader - Hostinger Optimized
 * Place this file in your PHP backend root directory
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
            // Try multiple possible locations (Hostinger paths included)
            $possiblePaths = [
                __DIR__ . '/.env',
                dirname(__DIR__) . '/.env',
                dirname(dirname(__DIR__)) . '/.env',
                $_SERVER['DOCUMENT_ROOT'] . '/.env',
                '/home/u850164226/domains/mediumaquamarine-heron-545485.hostingersite.com/public_html/.env'
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
                // Don't throw - allow the app to work with environment variables only
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
            
            // Skip empty lines and comments
            if (empty($line) || strpos($line, '#') === 0) {
                continue;
            }
            
            // Parse KEY=VALUE
            if (strpos($line, '=') !== false) {
                list($key, $value) = explode('=', $line, 2);
                $key = trim($key);
                $value = trim($value);
                
                // Remove quotes if present
                $value = trim($value, '"\'');
                
                // Set environment variable
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
    
    /**
     * Get environment variable with optional default
     */
    public static function get($key, $default = null) {
        $value = $_ENV[$key] ?? getenv($key);
        
        if ($value === false || $value === '') {
            if ($default === null) {
                error_log("WARNING: Config key not found: $key");
            }
            return $default;
        }
        
        return $value;
    }
    
    /**
     * Check if a config key exists
     */
    public static function has($key) {
        return isset($_ENV[$key]) || getenv($key) !== false;
    }
    
    /**
     * Get database configuration
     */
    public static function database() {
        return [
            'host' => self::get('DB_HOST', 'localhost'),
            'user' => self::get('DB_USER', 'u850164226_localhost'),
            'pass' => self::get('DB_PASS', 'Admin_703'),
            'name' => self::get('DB_NAME', 'u850164226_pcsch_database')
        ];
    }
    
    /**
     * Get PayMongo configuration
     */
    public static function paymongo() {
        return [
            'secret_key' => self::get('PAYMONGO_SECRET_KEY'),
            'public_key' => self::get('PAYMONGO_PUBLIC_KEY')
        ];
    }
    
    /**
     * Get IPROG SMS configuration
     */
    public static function iprog() {
        return [
            'api_token' => self::get('IPROG_API_TOKEN'),
            'sender_name' => self::get('IPROG_SENDER_NAME', 'IPROGSMS')
        ];
    }
    
    /**
     * Get application configuration
     */
    public static function app() {
        return [
            'base_url' => self::get('BASE_URL', 'https://mediumaquamarine-heron-545485.hostingersite.com'),
            'environment' => self::get('ENVIRONMENT', 'production'),
            'react_app_url' => self::get('REACT_APP_URL', 'https://mediumaquamarine-heron-545485.hostingersite.com'),
            'php_api_url' => self::get('PHP_API_URL', 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend')
        ];
    }
    
    /**
     * Get React App URL (Frontend URL)
     */
    public static function getReactUrl() {
        return self::get('REACT_APP_URL', 'https://mediumaquamarine-heron-545485.hostingersite.com');
    }
    
    /**
     * Get PHP API URL (Backend URL for PayMongo redirects)
     */
    public static function getPhpApiUrl() {
        return self::get('PHP_API_URL', 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend');
    }
    
    /**
     * Check if in production environment
     */
    public static function isProduction() {
        return self::get('ENVIRONMENT') === 'production';
    }
    
    /**
     * Get current .env file path
     */
    public static function getEnvPath() {
        return self::$envPath ?? 'Not loaded';
    }
    
    /**
     * Debug: Show all loaded configuration (for troubleshooting)
     * WARNING: Only use in development! Remove in production!
     */
    public static function debug() {
        if (!self::isProduction()) {
            return [
                'env_path' => self::getEnvPath(),
                'database' => [
                    'host' => self::get('DB_HOST'),
                    'user' => self::get('DB_USER'),
                    'name' => self::get('DB_NAME')
                ],
                'app' => self::app(),
                'is_production' => self::isProduction()
            ];
        }
        return ['error' => 'Debug disabled in production'];
    }
}

// Auto-load environment variables on include
try {
    Config::loadEnv();
} catch (Exception $e) {
    error_log('Config Error: ' . $e->getMessage());
    // Don't exit - allow app to continue with system environment variables
}
?>
