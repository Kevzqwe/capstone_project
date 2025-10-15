import React, { useState } from 'react';
import './Login.css';
import PCSlogo from '../Components/Assets/PCSlogo.png';
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";


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
                                />
                                <span 
                                    className="pass-opeen" 
                                    onClick={togglePassword}
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
                            <span className="loader"></span>
                            <span className="btn-text">
                                {isLoading ? 'Logging in...' : 'Login'}
                            </span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    

export default Login;