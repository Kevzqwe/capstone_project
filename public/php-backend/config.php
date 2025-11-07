<?php
/**
 * Configuration File for Hostinger Database
 * Using your actual Hostinger credentials
 */

class Config {
    
    // ✅ Your actual Hostinger database credentials
    private static $database = [
        'host' => 'localhost',
        'name' => 'u868164296_pcsch_database',
        'user' => 'u868164296_localhost',
        'pass' => 'Admin_703'
    ];
    
    // Production mode
    private static $production = true;
    
    /**
     * Get database configuration
     */
    public static function database() {
        return self::$database;
    }
    
    /**
     * Check if in production mode
     */
    public static function isProduction() {
        return self::$production;
    }
    
    /**
     * Get allowed origins for CORS
     */
    public static function getAllowedOrigins() {
        return [
            'https://capstone-project-smoky-one.vercel.app',
            'https://capstone-project-9boktvw8q-kevzqwes-projects.vercel.app',
            'https://mediumaquamarine-heron-545485.hostingersite.com',
            'http://localhost:3000',
            'http://localhost:5173'
        ];
    }
    
    /**
     * Test database connection
     */
    public static function testConnection() {
        $db = self::$database;
        
        try {
            $conn = new mysqli(
                $db['host'],
                $db['user'],
                $db['pass'],
                $db['name']
            );
            
            if ($conn->connect_error) {
                return [
                    'success' => false,
                    'error' => $conn->connect_error,
                    'error_no' => $conn->connect_errno
                ];
            }
            
            $conn->close();
            
            return [
                'success' => true,
                'message' => 'Database connection successful!'
            ];
            
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
?>
