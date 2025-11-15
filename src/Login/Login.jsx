import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './Login.css';
import PCSlogo from '../Components/Assets/PCSlogo.png';
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";

const Login = () => {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const togglePassword = () => setShowPassword(!showPassword);

  const showMessage = (msg, type = 'error') => {
    setError(msg);
    setTimeout(() => setError(''), 5000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail || !trimmedPassword) {
      showMessage('Please enter both email and password');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/login.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
      });

      const data = await response.json();

      if (!response.ok) {
        showMessage(data.message || 'Invalid credentials.');
        return;
      }

      if (data.status === 'success') {
        if (data.role === 'Admin') {
          navigate('/admin-dashboard');
        } else if (data.role === 'Student') {
          navigate('/student-dashboard');
        } else {
          showMessage('Unknown user role.');
        }
      } else {
        showMessage(data.message || 'Login failed.');
      }

    } catch (err) {
      console.error('Login error:', err);
      showMessage('Unable to connect to the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="container">
        {/* Left Panel - Logo and School Info */}
        <div className="left-panel">
          {/* Logo Container */}
          <div className="logo-container">
            <img 
              src={PCSlogo} 
              alt="Pateros Catholic School Logo" 
              className="school-logo"
              style={{ width: '600px', height: '600px' }}
            />
          </div>
          
          {/* School Info */}
          <div className="school-info">
            <h2>Pateros Catholic School</h2>
            <p>Online Document Request System</p>
          </div>
        </div>

        {/* Right Panel - Login Form */}
        <div className="right-panel">
          <div className="login-box">
            <h3>Login Your Account</h3>

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

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
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Enter your password"
                    className="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={isLoading}
                    required
                    autoComplete="current-password"
                  />
                  <span
                    className="pass-opeen"
                    onClick={togglePassword}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        togglePassword();
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <FaRegEyeSlash /> : <FaRegEye />}
                  </span>
                </div>
              </div>

              <button
                type="submit"
                className={`login-btn ${isLoading ? 'loading' : ''}`}
                disabled={isLoading}
              >
                {isLoading && <span className="loader"></span>}
                <span className="btn-text">
                  {isLoading ? 'Logging in...' : 'Login'}
                </span>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
