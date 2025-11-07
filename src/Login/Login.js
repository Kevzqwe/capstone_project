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

    // ✅ FIXED: Correct URL (fixed the typo - only one 'a' after 'medium')
    const apiUrl = window.location.hostname.includes('vercel.app')
        ? 'https://mediumaquamarine-heron-545485.hostingersite.com/public/bhp-backend'
        : 'http://localhost/capstone_project/public/php-backend';

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
            // ✅ FIXED: Send as JSON (matches your backend expectation)
            const response = await fetch(`${apiUrl}/login.php`, {
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

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.status === 'success') {
                console.log('Login successful, role:', data.role);
                const userRole = data.role.toLowerCase();

                if (userRole === 'admin') {
                    navigate('/admin-dashboard');
                } else if (userRole === 'student') {
                    navigate('/student-dashboard');
                } else {
                    showError('Unknown user role');
                    setIsLoading(false);
                }
            } else {
                showError(data.message || 'Login failed. Please try again.');
                setIsLoading(false);
            }
        } catch (error) {
            console.error('Network error:', error);
            showError('Unable to connect to server. Please check your connection and try again.');
            setIsLoading(false);
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

                    <form onSubmit={handleLogin}>
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
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    placeholder="Enter your password"
                                    id="password"
                                    className="Password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                    autoComplete="current-password"
                                    data-form-type="password"
                                />
                                <span
                                    className="pass-opeen"
                                    onClick={togglePassword}
                                    role="button"
                                    tabIndex={0}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
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
                            <span className="loader"></span>
                            <span className="btn-text">
                                {isLoading ? 'Logging in...' : 'Login'}
                            </span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
