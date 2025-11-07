import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import PCSlogo from '../Components/Assets/PCSlogo.png';
import { FaEye } from "react-icons/fa";

const Login = () => {
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const togglePassword = () => {
        setShowPassword(!showPassword);
    };

    const showError = (message) => {
        alert(message);
    };

    const handleLogin = async (event) => {
        event.preventDefault();
        
        if (isLoading) return;

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            showError('Please enter both email and password');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(trimmedEmail)) {
            showError('Please enter a valid email address');
            return;
        }

        setIsLoading(true);

        try {
            // ✅ FIXED: Hardcoded full URL - no environment variables
            const apiUrl = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/login.php';
            
            console.log('=== LOGIN DEBUG ===');
            console.log('API URL:', apiUrl);
            console.log('Current location:', window.location.href);
            console.log('Email:', trimmedEmail);
            
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({
                    email: trimmedEmail,
                    password: trimmedPassword
                })
            });

            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            // Check if response is OK
            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                    console.error('Server response error:', errorText);
                } catch (e) {
                    console.error('Could not read error response');
                }
                throw new Error(`Server error: ${response.status} ${response.statusText}`);
            }

            // Parse JSON response
            const contentType = response.headers.get("content-type");
            console.log('Content-Type:', contentType);

            if (!contentType || !contentType.includes("application/json")) {
                const text = await response.text();
                console.error('Non-JSON response:', text);
                throw new Error('Server returned invalid response format');
            }

            const data = await response.json();
            console.log('Login response data:', data);

            if (data.status === 'success') {
                console.log('✅ Login successful, role:', data.role);
                
                // Store user info in localStorage
                localStorage.setItem('user_role', data.role);
                localStorage.setItem('user_email', data.email);
                localStorage.setItem('user_id', data.user_id);
                localStorage.setItem('logged_in', 'true');
                
                // Store in sessionStorage as backup
                sessionStorage.setItem('user_role', data.role);
                sessionStorage.setItem('user_email', data.email);
                sessionStorage.setItem('user_id', data.user_id);
                
                const userRole = data.role.toLowerCase();
                
                // Redirect based on role
                if (userRole === 'admin') {
                    console.log('Redirecting to admin dashboard...');
                    navigate('/admin-dashboard');
                } else if (userRole === 'student') {
                    console.log('Redirecting to student dashboard...');
                    navigate('/student-dashboard');
                } else {
                    showError('Unknown user role. Please contact administrator.');
                    setIsLoading(false);
                }
            } else {
                // Login failed
                console.error('❌ Login failed:', data.message);
                showError(data.message || 'Login failed. Please check your credentials and try again.');
                setIsLoading(false);
            }

        } catch (error) {
            console.error('❌ Login error details:', error);
            console.error('Error name:', error.name);
            console.error('Error message:', error.message);
            
            // Specific error handling
            if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
                showError("Cannot connect to server. Please check:\n1. Your internet connection\n2. Server is running\n3. CORS is configured correctly");
            } else if (error.name === 'SyntaxError') {
                showError("Server returned invalid data. Please contact administrator.");
            } else {
                showError("Login error: " + error.message);
            }
            setIsLoading(false);
        }
    };

    // Handle Enter key press for form submission
    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            handleLogin(event);
        }
    };

    return (
        <div className="container">
            <div className="left-panel">
                <img src={PCSlogo} alt="School Logo" className="school-logo" />
                <h2>Online Document Request System</h2>
                <p>Pateros Catholic School</p>
            </div>

            <div className="right-panel">
                <div className="login-box">
                    <h3>Login Your Account</h3>

                    <form onSubmit={handleLogin} onKeyPress={handleKeyPress}>
                        <div className="form-group">
                            <label htmlFor="email">Email</label>
                            <input 
                                id="email"
                                type="email" 
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required 
                                autoComplete="email"
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password-input-container">
                                <input 
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password" 
                                    id="password" 
                                    className="password-input"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required 
                                    autoComplete="current-password"
                                />
                                <span 
                                    className="password-toggle" 
                                    onClick={togglePassword}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                    onKeyPress={(e) => e.key === 'Enter' && togglePassword()}
                                >
                                    <FaEye />
                                </span>
                            </div>
                        </div>

                        <button 
                            type="submit"
                            className={`login-btn ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <>
                                    <span className="loader"></span>
                                    Logging in...
                                </>
                            ) : (
                                'Login'
                            )}
                        </button>
                    </form>

                    {/* Always show debug info */}
                    <div style={{marginTop: '20px', padding: '10px', background: '#f0f0f0', borderRadius: '5px', fontSize: '11px', color: '#333'}}>
                        <strong>🔧 API Endpoint:</strong><br/>
                        https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/login.php
                        <br/><br/>
                        <strong>📍 Current URL:</strong><br/>
                        {window.location.href}
                    </div>
                </div>
            </div>
        </div>
    );
}

export default Login;
