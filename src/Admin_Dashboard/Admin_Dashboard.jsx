import React, { useState, useEffect } from 'react';
import { useAdminDashboard } from './Adminscript';
import './Admin.css';
import PCSlogo from '../Components/Assets/PCSlogo.png';
import Icon from '../Components/Assets/Icon.png';
import mail from '../Components/Assets/mail.png';
import bell from '../Components/Assets/bell.png';
import files from '../Components/Assets/files.png';
import check from '../Components/Assets/check.png';
import initializeChatbase from './Chatbase';

const AdminDashboard = () => {
    const {
        currentDate,
        activeSection,
        adminData,
        dashboardData,
        documentRequests,
        loading,
        error,
        handleNavigation,
        handleLogout,
        handleReschedulePickup,
        reloadAdminData
    } = useAdminDashboard();

    const [currentPage, setCurrentPage] = useState(1);
    const [requestUpdates, setRequestUpdates] = useState({});
    const rowsPerPage = 10;

    // Initialize Chatbase on component mount
    useEffect(() => {
        initializeChatbase();
    }, []);

    const totalRows = documentRequests?.length || 0;
    const totalPages = Math.ceil(totalRows / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const currentRows = documentRequests?.slice(startIndex, startIndex + rowsPerPage) || [];

    const handlePageChange = (page) => {
        setCurrentPage(page);
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            setCurrentPage(currentPage + 1);
        }
    };

    const handlePrevPage = () => {
        if (currentPage > 1) {
            setCurrentPage(currentPage - 1);
        }
    };

    // Track changes to status and rescheduled pickup
    const handleStatusChange = (e, requestId) => {
        const selectElement = e.target;
        const status = e.target.value;
        
        // Remove all status classes
        selectElement.classList.remove(
            'status-pending',
            'status-ongoing', 
            'status-ready-for-pick-up',
            'status-completed'
        );
        
        // Add the appropriate class based on selected value
        switch(status) {
            case 'Pending':
                selectElement.classList.add('status-pending');
                break;
            case 'Ongoing':
                selectElement.classList.add('status-ongoing');
                break;
            case 'Ready for Pick up':
                selectElement.classList.add('status-ready-for-pick-up');
                break;
            case 'Completed':
                selectElement.classList.add('status-completed');
                break;
            default:
                selectElement.classList.add('status-pending');
        }

        // Store the update
        setRequestUpdates(prev => ({
            ...prev,
            [requestId]: {
                ...prev[requestId],
                status: status
            }
        }));
    };

    const handleDateChange = (requestId, newDate) => {
        setRequestUpdates(prev => ({
            ...prev,
            [requestId]: {
                ...prev[requestId],
                rescheduled_pickup: newDate
            }
        }));
    };

    // Save button handler
    const handleSaveRequest = async (requestId) => {
        const updates = requestUpdates[requestId];
        
        if (!updates) {
            showMessage('No changes to save', 'info');
            return;
        }

        try {
            const response = await fetch('http://localhost/capstone_project/public/php-backend/update_request.php?action=updateRequest', {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    request_id: requestId,
                    scheduled_pickup: updates.scheduled_pickup || null,
                    rescheduled_pickup: updates.rescheduled_pickup || null,
                    status: updates.status || null
                })
            });

            const data = await response.json();

            if (data.status === 'success') {
                showMessage('Request updated successfully!', 'success');
                
                // Clear the updates for this request
                setRequestUpdates(prev => {
                    const newUpdates = { ...prev };
                    delete newUpdates[requestId];
                    return newUpdates;
                });

                // Reload data
                reloadAdminData();
            } else {
                showMessage(data.message || 'Failed to update request', 'error');
            }
        } catch (error) {
            console.error('Error updating request:', error);
            showMessage('Failed to update request', 'error');
        }
    };

    const showMessage = (message, type) => {
        const existing = document.querySelector('.status-message');
        if (existing) existing.remove();
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `status-message ${type}`;
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 5px;
            color: white;
            font-weight: bold;
            z-index: 3000;
            background: ${type === 'success' ? '#27ae60' : type === 'info' ? '#3498db' : '#e74c3c'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 5000);
    };

    // Calculate percentages for analytics chart
    const pendingCount = dashboardData?.pending_requests || 0;
    const ongoingCount = dashboardData?.ongoing_requests || 0;
    const readyCount = dashboardData?.ready_requests || 0;
    const completedCount = dashboardData?.completed_requests || 0;
    const totalRequests = pendingCount + ongoingCount + readyCount + completedCount;

    // Calculate circumference
    const circumference = 2 * Math.PI * 120;
    
    // Calculate stroke dash arrays based on actual counts
    const pendingDash = totalRequests > 0 ? (pendingCount / totalRequests) * circumference : circumference;
    const ongoingDash = totalRequests > 0 ? (ongoingCount / totalRequests) * circumference : 0;
    const readyDash = totalRequests > 0 ? (readyCount / totalRequests) * circumference : 0;
    const completedDash = totalRequests > 0 ? (completedCount / totalRequests) * circumference : 0;

    return (
        <div className="container">
            <aside className="sidebar">
                <div className="school-info">
                    <div className="logo">
                        <img src={PCSlogo} alt="School Logo" />
                    </div>
                    <h3>Pateros Catholic School</h3>
                </div>
                
                <div className="admin-profile">
                    <div className="profile-img">
                        <img src={Icon} alt="Administrator" />
                    </div>
                    <h4 className="admin-name">{adminData.name}</h4>
                    <span className="role">Admin</span>
                    <span className="admin-email-display">{adminData.email}</span>
                    {loading && <div className="loading-text">Loading...</div>}
                    {error && <div className="error-text">Failed to load data</div>}
                </div>
                
                <nav className="nav-menu">
                    <ul>
                        <button 
                            className={`nav-btn ${activeSection === 'dashboard' ? 'active' : ''}`}
                            onClick={() => handleNavigation('dashboard')}
                        >
                            <i className="fas fa-home"></i>
                            <span>Dashboard</span>
                        </button>
                        <button 
                            className={`nav-btn ${activeSection === 'document-requests' ? 'active' : ''}`}
                            onClick={() => handleNavigation('document-requests')}
                        >
                            <i className="fas fa-file-alt"></i>
                            <span>Document Requests</span>
                        </button>
                        <button 
                            className={`nav-btn ${activeSection === 'analytics' ? 'active' : ''}`}
                            onClick={() => handleNavigation('analytics')}
                        >
                            <i className="fas fa-chart-pie"></i>
                            <span>Analytics</span>
                        </button>
                        <button 
                            className={`nav-btn ${activeSection === 'account' ? 'active' : ''}`}
                            onClick={() => handleNavigation('account')}
                        >
                            <i className="fas fa-user-cog"></i>
                            <span>Account</span>
                        </button>
                    </ul>
                </nav>
                
                <button className="logout-btn" onClick={handleLogout}>
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Logout</span>
                </button>
            </aside>

            <main className="main-content">
                <header className="header">
                    <nav className="breadcrumb">Pateros Catholic School Document Request</nav>
                    <div className="header-icons">
                        <img src={mail} alt="Mail" className="header-icon" />
                        <img src={bell} alt="Notifications" className="header-icon" />
                    </div>
                </header>

                {/* Dashboard Section */}
                <div className={`page-section ${activeSection === 'dashboard' ? 'active' : ''}`}>
                    <div className="dashboard-content">
                        <div className="welcome-section">
                            <h1>Dashboard</h1>
                            <div className="welcome-text">
                                <h2 className="welcome-message">Welcome, {adminData.name}!</h2>
                                <div className="welcome-date">{currentDate}</div>
                            </div>
                        </div>

                        {error && (
                            <div className="error-banner">
                                <strong>Error:</strong> {error}
                                <button onClick={reloadAdminData} className="retry-btn">Retry</button>
                            </div>
                        )}

                        <div className="stats-grid">
                            <div className="stat-card pending">
                                <div className="stat-icon">
                                    <img src={files} alt="Pending" className="stat-icon-img" />
                                </div>
                                <div className="stat-info">
                                    <h3>{dashboardData?.pending_requests ?? 0}</h3>
                                    <p>Pending</p>
                                </div>
                            </div>
                            
                            <div className="stat-card ready">
                                <div className="stat-icon">
                                    <img src={files} alt="Ready for pickup" className="stat-icon-img" />
                                </div>
                                <div className="stat-info">
                                    <h3>{dashboardData?.ready_requests ?? 0}</h3>
                                    <p>Ready for pick-up</p>
                                </div>
                            </div>
                            
                            <div className="stat-card completed">
                                <div className="stat-icon">
                                    <img src={check} alt="Completed" className="stat-icon-img" />
                                </div>
                                <div className="stat-info">
                                    <h3>{dashboardData?.completed_requests ?? 0}</h3>
                                    <p>Completed</p>
                                </div>
                            </div>
                        </div>

                        <div className="bottom-cards">
                            <div className="announcement-card">
                                <h3>Announcement</h3>
                                <div className="announcement-content">
                                    <div className="announcement-header">
                                        <input 
                                            type="text" 
                                            className="announcement-title" 
                                            defaultValue="School Announcement:" 
                                            placeholder="Enter announcement title..." 
                                        />
                                    </div>
                                    <div className="announcement-body">
                                        <textarea 
                                            className="announcement-text" 
                                            placeholder="Enter announcement content..."
                                            defaultValue={dashboardData?.announcement || ''}
                                        />
                                    </div>
                                    <div className="announcement-actions">
                                        <button className="btn-edit">Edit</button>
                                        <button className="btn-publish">Publish</button>
                                    </div>
                                </div>
                            </div>

                            <div className="transaction-card">
                                <h3>Transaction Days</h3>
                                <div className="transaction-content">
                                    <textarea 
                                        className="transaction-text" 
                                        placeholder="Enter transaction information..."
                                        defaultValue={dashboardData?.transaction_hours || ''}
                                    />
                                    <div className="transaction-actions">
                                        <button className="btn-edit">Edit</button>
                                        <button className="btn-publish">Publish</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Document Requests Section */}
                <div className={`page-section ${activeSection === 'document-requests' ? 'active' : ''}`}>
                    <div className="document-requests-section">
                        <div className="section-header">
                            <h2>Document Requests</h2>
                            <p className="total-requests-count">Total Requests: {documentRequests?.length ?? 0}</p>
                        </div>
                        
                        {error && (
                            <div className="error-banner">
                                <strong>Error:</strong> {error}
                            </div>
                        )}
                        
                        <div className="table-wrapper">
                            <table className="requests-table">
                                <thead>
                                    <tr>
                                        <th>Request ID</th>
                                        <th>Student ID</th>
                                        <th>Student Name</th>
                                        <th>Grade Level</th>
                                        <th>Section</th>
                                        <th>Contact No</th>
                                        <th>Email</th>
                                        <th>Payment Method</th>
                                        <th>Date Requested</th>
                                        <th>Scheduled Pick Up</th>
                                        <th>Rescheduled Pick Up</th>
                                        <th>Status</th>
                                        <th>Total Amount</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading && documentRequests.length === 0 ? (
                                        <tr>
                                            <td colSpan="14" className="loading-cell">
                                                <div className="loading-container">
                                                    <div className="spinner"></div>
                                                    <span>Loading requests...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : currentRows && currentRows.length > 0 ? (
                                        currentRows.map((request) => (
                                            <tr key={request.request_id}>
                                                <td>{request.request_id}</td>
                                                <td>{request.student_id}</td>
                                                <td>{request.student_name}</td>
                                                <td>{request.grade_level || 'N/A'}</td>
                                                <td>{request.section || 'N/A'}</td>
                                                <td>{request.contact_no || 'N/A'}</td>
                                                <td>{request.email || 'N/A'}</td>
                                                <td>{request.payment_method || 'N/A'}</td>
                                                <td>
                                                    {request.date_requested ? 
                                                        new Date(request.date_requested).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        }) : 'N/A'}
                                                </td>
                                                <td>
                                                    {request.scheduled_pick_up ? 
                                                        new Date(request.scheduled_pick_up).toISOString().split('T')[0] : 'N/A'}
                                                </td>
                                                <td>
                                                    <input 
                                                        type="date" 
                                                        className="date-input"
                                                        defaultValue={request.rescheduled_pick_up ? 
                                                            new Date(request.rescheduled_pick_up).toISOString().split('T')[0] : ''}
                                                        onChange={(e) => handleDateChange(request.request_id, e.target.value)}
                                                    />
                                                </td>
                                                <td>
                                                    <select 
                                                        className={`status-select status-${request.status?.toLowerCase().replace(/\s+/g, '-') || 'pending'}`}
                                                        defaultValue={request.status || 'Pending'}
                                                        onChange={(e) => handleStatusChange(e, request.request_id)}
                                                    >
                                                        <option value="Pending">Pending</option>
                                                        <option value="Ongoing">Ongoing</option>
                                                        <option value="Ready for Pick up">Ready for Pick up</option>
                                                        <option value="Completed">Completed</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    {request.total_amount ? 
                                                        `₱${parseFloat(request.total_amount).toFixed(2)}` : '₱0.00'}
                                                </td>
                                                <td>
                                                    <div className="action-buttons">
                                                        <button 
                                                            className="btn-action btn-save" 
                                                            title="Save Changes"
                                                            onClick={() => handleSaveRequest(request.request_id)}
                                                        >
                                                            <span className="save-text">Save</span>
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="14" className="empty-cell">
                                                <div className="empty-container">
                                                    <i className="fas fa-inbox"></i>
                                                    <span>No document requests found</span>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* Pagination Controls */}
                        {totalRows > 0 && (
                            <div className="pagination-controls">
                                <div className="pagination-info">
                                    Showing {startIndex + 1} to {Math.min(startIndex + rowsPerPage, totalRows)} of {totalRows} entries
                                </div>
                                
                                <div className="pagination-buttons">
                                    <button 
                                        onClick={handlePrevPage}
                                        disabled={currentPage === 1}
                                        className="pagination-btn"
                                    >
                                        Previous
                                    </button>
                                    
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                                        <button
                                            key={page}
                                            onClick={() => handlePageChange(page)}
                                            className={`pagination-btn ${currentPage === page ? 'active' : ''}`}
                                        >
                                            {page}
                                        </button>
                                    ))}
                                    
                                    <button 
                                        onClick={handleNextPage}
                                        disabled={currentPage === totalPages}
                                        className="pagination-btn"
                                    >
                                        Next
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Analytics Section */}
                <div className={`page-section ${activeSection === 'analytics' ? 'active' : ''}`}>
                    <div className="page-content">
                        <h2 className="section-title">Document Requests Analytics</h2>
                        
                        <div className="analytics-container">
                            <div className="circle-chart-container">
                                <svg width="300" height="300" viewBox="0 0 300 300">
                                    {/* Background circle */}
                                    <circle 
                                        cx="150" 
                                        cy="150" 
                                        r="120" 
                                        fill="none" 
                                        stroke="#f0f0f0" 
                                        strokeWidth="30"
                                    />
                                    
                                    {/* Only render segments with values > 0 */}
                                    {pendingCount > 0 && (
                                        <circle 
                                            cx="150" 
                                            cy="150" 
                                            r="120" 
                                            fill="none" 
                                            stroke="#ef5350" 
                                            strokeWidth="30"
                                            strokeDasharray={`${pendingDash} ${circumference}`}
                                            strokeDashoffset="0"
                                            transform="rotate(-90 150 150)"
                                            className="chart-segment-pending"
                                        />
                                    )}
                                    
                                    {ongoingCount > 0 && (
                                        <circle 
                                            cx="150" 
                                            cy="150" 
                                            r="120" 
                                            fill="none" 
                                            stroke="#ffc107" 
                                            strokeWidth="30"
                                            strokeDasharray={`${ongoingDash} ${circumference}`}
                                            strokeDashoffset={`${-pendingDash}`}
                                            transform="rotate(-90 150 150)"
                                            className="chart-segment-ongoing"
                                        />
                                    )}
                                    
                                    {readyCount > 0 && (
                                        <circle 
                                            cx="150" 
                                            cy="150" 
                                            r="120" 
                                            fill="none" 
                                            stroke="#ff9800" 
                                            strokeWidth="30"
                                            strokeDasharray={`${readyDash} ${circumference}`}
                                            strokeDashoffset={`${-(pendingDash + ongoingDash)}`}
                                            transform="rotate(-90 150 150)"
                                            className="chart-segment-ready"
                                        />
                                    )}
                                    
                                    {completedCount > 0 && (
                                        <circle 
                                            cx="150" 
                                            cy="150" 
                                            r="120" 
                                            fill="none" 
                                            stroke="#4caf50" 
                                            strokeWidth="30"
                                            strokeDasharray={`${completedDash} ${circumference}`}
                                            strokeDashoffset={`${-(pendingDash + ongoingDash + readyDash)}`}
                                            transform="rotate(-90 150 150)"
                                            className="chart-segment-completed"
                                        />
                                    )}
                                </svg>
                                
                                <div className="chart-center-text">
                                    <div className="chart-total-number">{totalRequests}</div>
                                    <div className="chart-total-label">Total Requests</div>
                                </div>
                            </div>

                            <div className="analytics-legend">
                                <div className="legend-item">
                                    <div className="legend-color legend-pending"></div>
                                    <span>Pending: {pendingCount}</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color legend-ongoing"></div>
                                    <span>Ongoing: {ongoingCount}</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color legend-ready"></div>
                                    <span>Ready: {readyCount}</span>
                                </div>
                                <div className="legend-item">
                                    <div className="legend-color legend-completed"></div>
                                    <span>Completed: {completedCount}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Account Section */}
                <div className={`page-section ${activeSection === 'account' ? 'active' : ''}`}>
                    <div className="page-content">
                        <div className="account-header">
                            <div className="account-avatar">
                                <img src={Icon} alt="Admin Avatar" />
                            </div>
                            <div className="account-info">
                                <h2><span className="admin-name">{adminData.name}</span></h2>
                                <p className="admin-id">Admin ID: {adminData.id}</p>
                            </div>
                        </div>

                        {error && (
                            <div className="error-banner">
                                <strong>Error:</strong> Unable to load account information
                                <button onClick={reloadAdminData} className="retry-btn">Retry</button>
                            </div>
                        )}

                        <div className="account-form">
                            <div className="form-group">
                                <label htmlFor="contact">Contact No</label>
                                <input 
                                    type="tel" 
                                    id="contact" 
                                    className="admin-contact" 
                                    value={adminData.contact} 
                                    readOnly 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="email">Email</label>
                                <input 
                                    type="email" 
                                    id="email" 
                                    className="admin-email-input" 
                                    value={adminData.email} 
                                    readOnly 
                                />
                            </div>

                            <div className="form-group">
                                <label htmlFor="status">Account Status</label>
                                <input 
                                    type="text" 
                                    id="status" 
                                    className="admin-status" 
                                    value={adminData.status} 
                                    readOnly 
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default AdminDashboard;