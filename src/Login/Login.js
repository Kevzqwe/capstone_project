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

    const togglePassword = () => setShowPassword(!showPassword);

    const showError = (msg) => alert(msg);

    const handleLogin = async (e) => {
        e.preventDefault();
        if (isLoading) return;

        const trimmedEmail = email.trim().toLowerCase();
        const trimmedPassword = password.trim();
        if (!trimmedEmail || !trimmedPassword) {
            showError('Please enter both email and password');
            return;
        }

        setIsLoading(true);

        try {
            // ✅ Use your live Hostinger backend URL here
            const apiUrl = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend';

            const response = await fetch(`${apiUrl}/login.php`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
            });

            const data = await response.json();
            if (data.status === 'success') {
                console.log('Login successful', data);
                if (data.role.toLowerCase() === 'admin') {
                    navigate('/admin-dashboard');
                } else if (data.role.toLowerCase() === 'student') {
                    navigate('/student-dashboard');
                } else {
                    showError('Unknown user role.');
                }
            } else {
                showError(data.message || 'Login failed.');
            }
        } catch (err) {
            console.error('Network error:', err);
            showError('Unable to connect to server.');
        } finally {
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
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                disabled={isLoading}
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="password">Password</label>
                            <div className="password">
                                <input
                                    type={showPassword ? "text" : "password"}
                                    id="password"
                                    placeholder="Enter your password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    disabled={isLoading}
                                    required
                                />
                                <span className="pass-opeen" onClick={togglePassword}>
                                    <FaEye />
                                </span>
                            </div>
                        </div>

                        <button
                            type="submit"
                            className={`login-btn ${isLoading ? 'loading' : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? 'Logging in...' : 'Login'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Login;
