import React, { useState, useEffect } from 'react';
import { useAdminDashboard } from './Adminscript';
import './Admin.css';
import PCSlogo from '../Components/Assets/PCSlogo.png';
import Icon from '../Components/Assets/Icon.png';
import mail from '../Components/Assets/mail.png';
import burger from "../Components/Assets/burger.png";
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
        selectedRequest,
        showModal,
        handleNavigation,
        handleLogout,
        handleViewRequest,
        handleCloseModal,
        reloadAdminData,
        notifications,
        unreadCount,
        showNotificationDropdown,
        toggleNotificationDropdown,
        handleNotificationClick,
        mails,
        unreadMailCount,
        showMailDropdown,
        selectedMail,
        showMailModal,
        toggleMailDropdown,
        handleMailClick,
        closeMailModal,
        showNotificationModal,
        notificationRequestData,
        closeNotificationModal,
        announcementData,
        announcements,
        isEditingAnnouncement,
        announcementLoading,
        handleAnnouncementEdit,
        handleAnnouncementSave,
        handleAnnouncementChange,
        cancelAnnouncementEdit,
        transactionData,
        transactions,
        isEditingTransaction,
        transactionLoading,
        handleTransactionEdit,
        handleTransactionSave,
        handleTransactionChange,
        cancelTransactionEdit,
        handleStatusChange,
        handleSaveRequest,
        filterRequestsByDateRange,
        resetDateFilter,
        filteredData
    } = useAdminDashboard();

    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 10;
    
    // Mobile menu state
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
    
    // Date filter states
    const [startDate, setStartDate] = useState('2020-01-01');
    const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isFiltered, setIsFiltered] = useState(false);

    // Local state for rescheduled pickup dates
    const [rescheduledPickups, setRescheduledPickups] = useState({});

    // Local state for form validation
    const [announcementErrors, setAnnouncementErrors] = useState({});
    const [transactionErrors, setTransactionErrors] = useState({});

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

    const timeAgo = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const seconds = Math.floor((now - date) / 1000);
        
        if (seconds < 60) return 'Just now';
        const minutes = Math.floor(seconds / 60);
        if (minutes < 60) return `${minutes}m ago`;
        const hours = Math.floor(minutes / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    };

    // Mobile menu functions
    const toggleMobileMenu = () => {
        setIsMobileMenuOpen(!isMobileMenuOpen);
    };

    const handleMobileNavigation = (section) => {
        handleNavigation(section);
        setIsMobileMenuOpen(false);
    };

    // Handle date filter
    const handleApplyFilter = async () => {
        await filterRequestsByDateRange(startDate, endDate);
        setIsFiltered(true);
    };

    const handleResetFilter = () => {
        const today = new Date().toISOString().split('T')[0];
        setStartDate('2020-01-01');
        setEndDate(today);
        resetDateFilter();
        setIsFiltered(false);
    };

    // Handle Today button click
    const handleTodayClick = (isStartDate) => {
        const today = new Date().toISOString().split('T')[0];
        if (isStartDate) {
            setStartDate(today);
        } else {
            setEndDate(today);
        }
    };

    // Handle rescheduled pickup date change
    const handleRescheduledPickupChange = (requestId, newDate) => {
        setRescheduledPickups(prev => ({
            ...prev,
            [requestId]: newDate
        }));
    };

    // Enhanced announcement handlers
    const handleAnnouncementEditClick = () => {
        setAnnouncementErrors({});
        handleAnnouncementEdit();
    };

    const handleAnnouncementSaveClick = async () => {
        const errors = {};
        
        if (!announcementData.Title || !announcementData.Title.trim()) {
            errors.Title = 'Please enter a title for the announcement';
        }
        
        if (!announcementData.Content || !announcementData.Content.trim()) {
            errors.Content = 'Please enter content for the announcement';
        }

        if (Object.keys(errors).length > 0) {
            setAnnouncementErrors(errors);
            return;
        }

        setAnnouncementErrors({});
        await handleAnnouncementSave();
    };

    const handleAnnouncementCancel = () => {
        setAnnouncementErrors({});
        cancelAnnouncementEdit();
    };

    // Enhanced transaction handlers
    const handleTransactionEditClick = () => {
        setTransactionErrors({});
        handleTransactionEdit();
    };

    const handleTransactionSaveClick = async () => {
        if (!transactionData.Description || !transactionData.Description.trim()) {
            setTransactionErrors({ Description: 'Please enter transaction hours information' });
            return;
        }

        setTransactionErrors({});
        await handleTransactionSave();
    };

    const handleTransactionCancel = () => {
        setTransactionErrors({});
        cancelTransactionEdit();
    };

    // Clear individual field errors when user starts typing
    const handleAnnouncementTitleChange = (value) => {
        if (announcementErrors.Title) {
            setAnnouncementErrors(prev => ({ ...prev, Title: '' }));
        }
        handleAnnouncementChange('Title', value);
    };

    const handleAnnouncementContentChange = (value) => {
        if (announcementErrors.Content) {
            setAnnouncementErrors(prev => ({ ...prev, Content: '' }));
        }
        handleAnnouncementChange('Content', value);
    };

    const handleTransactionDescriptionChange = (value) => {
        if (transactionErrors.Description) {
            setTransactionErrors({});
        }
        handleTransactionChange('Description', value);
    };

    // Use filtered data if available, otherwise use dashboard data
    const displayData = filteredData || dashboardData;
    
    const pendingCount = displayData?.pending_requests || 0;
    const ongoingCount = displayData?.ongoing_requests || 0;
    const readyCount = displayData?.ready_requests || 0;
    const completedCount = displayData?.completed_requests || 0;
    const totalRequests = pendingCount + ongoingCount + readyCount + completedCount;
    const circumference = 2 * Math.PI * 180;
    
    const pendingDash = totalRequests > 0 ? (pendingCount / totalRequests) * circumference : circumference;
    const ongoingDash = totalRequests > 0 ? (ongoingCount / totalRequests) * circumference : 0;
    const readyDash = totalRequests > 0 ? (readyCount / totalRequests) * circumference : 0;
    const completedDash = totalRequests > 0 ? (completedCount / totalRequests) * circumference : 0;

    return (
        <div className="container">
            {/* Mobile Menu Overlay */}
            {isMobileMenuOpen && (
                <div 
                    className="mobile-menu-overlay" 
                    onClick={toggleMobileMenu}
                    style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.5)',
                        zIndex: 999,
                        display: window.innerWidth <= 768 ? 'block' : 'none'
                    }}
                />
            )}

            {/* Sidebar with Mobile Menu */}
            <aside className={`sidebar ${isMobileMenuOpen ? 'mobile-open' : ''}`}>
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
                            data-section="dashboard"
                            onClick={() => handleMobileNavigation('dashboard')}
                        >
                            <i className="fas fa-home"></i>
                            <span>Dashboard</span>
                        </button>
                        <button 
                            className={`nav-btn ${activeSection === 'document-requests' ? 'active' : ''}`}
                            data-section="document-requests"
                            onClick={() => handleMobileNavigation('document-requests')}
                        >
                            <i className="fas fa-file-alt"></i>
                            <span>Document Requests</span>
                        </button>
                        <button 
                            className={`nav-btn ${activeSection === 'analytics' ? 'active' : ''}`}
                            data-section="analytics"
                            onClick={() => handleMobileNavigation('analytics')}
                        >
                            <i className="fas fa-chart-pie"></i>
                            <span>Analytics</span>
                        </button>
                        <button 
                            className={`nav-btn ${activeSection === 'account' ? 'active' : ''}`}
                            data-section="account"
                            onClick={() => handleMobileNavigation('account')}
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
                    {/* Hamburger Button - Mobile Only */}
                    <button 
                        className="mobile-menu-btn" 
                        onClick={toggleMobileMenu}
                        style={{
                            display: 'none',
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            padding: '8px',
                            marginRight: '10px'
                        }}
                    >
                        <img src={burger} alt="Menu" style={{ width: '24px', height: '24px' }} />
                    </button>

                    <nav className="breadcrumb">Pateros Catholic School Document Request</nav>
                    <div className="header-icons">
                        {/* Mail Icon */}
                        <div className="icon-wrapper">
                            <img 
                                src={mail} 
                                alt="Mail" 
                                className="header-icon" 
                                onClick={() => {
                                    toggleMailDropdown();
                                    if (showNotificationDropdown) toggleNotificationDropdown();
                                }}
                            />
                            {unreadMailCount > 0 && (
                                <span className="badge">
                                    {unreadMailCount > 9 ? '9+' : unreadMailCount}
                                </span>
                            )}
                            
                            {showMailDropdown && (
                                <div className="dropdown-menu">
                                    <div className="dropdown-header">
                                        Messages ({unreadMailCount})
                                    </div>
                                    
                                    {mails && mails.length > 0 ? (
                                        mails.map((mailItem) => (
                                            <div 
                                                key={mailItem.id}
                                                onClick={() => handleMailClick(mailItem)}
                                                className="dropdown-item"
                                            >
                                                <div className="dropdown-item-title">
                                                    {mailItem.sender_name || 'Unknown'}
                                                </div>
                                                <div className="dropdown-item-subject">
                                                    {mailItem.subject}
                                                </div>
                                                <div className="dropdown-item-time">
                                                    {timeAgo(mailItem.created_at)}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dropdown-empty">
                                            No new messages
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Notification Icon */}
                        <div className="icon-wrapper">
                            <img 
                                src={bell} 
                                alt="Notifications" 
                                className="header-icon" 
                                onClick={toggleNotificationDropdown}
                            />
                            {unreadCount > 0 && (
                                <span className="badge">
                                    {unreadCount > 9 ? '9+' : unreadCount}
                                </span>
                            )}
                            
                            {showNotificationDropdown && (
                                <div className="dropdown-menu">
                                    <div className="dropdown-header">
                                        Notifications ({unreadCount})
                                    </div>
                                    
                                    {notifications && notifications.length > 0 ? (
                                        notifications.map((notification) => (
                                            <div 
                                                key={notification.id}
                                                onClick={() => handleNotificationClick(notification.id)}
                                                className={`dropdown-item ${notification.is_read === 0 || notification.is_read === '0' ? 'unread' : ''}`}
                                            >
                                                <div className="dropdown-item-title">
                                                    {notification.title}
                                                </div>
                                                <div className="dropdown-item-message">
                                                    {notification.message}
                                                </div>
                                                <div className="dropdown-item-time">
                                                    {timeAgo(notification.created_at)}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="dropdown-empty">
                                            No new notifications
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </header>

                {/* Mail Modal */}
                {showMailModal && selectedMail && (
                    <div className="modal-overlay" onClick={closeMailModal}>
                        <div className="modal-container" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>{selectedMail.subject}</h3>
                                <button onClick={closeMailModal} className="modal-close">
                                    ×
                                </button>
                            </div>
                            
                            <div className="modal-body">
                                <div className="modal-info">
                                    <div className="modal-info-item">
                                        <strong>From:</strong> {selectedMail.sender_name || 'Unknown'}
                                    </div>
                                    <div className="modal-info-item">
                                        <strong>Email:</strong> {selectedMail.sender_email || 'N/A'}
                                    </div>
                                    <div className="modal-timestamp">
                                        {new Date(selectedMail.created_at).toLocaleString()}
                                    </div>
                                </div>
                                
                                <div className="modal-message">
                                    {selectedMail.message}
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* NOTIFICATION MODAL */}
                {showNotificationModal && notificationRequestData && (
                    <div className="modal-overlay" onClick={closeNotificationModal}>
                        <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Modal Header */}
                            <div className="modal-header gradient-header">
                                <div>
                                    <h2 className="modal-title">
                                        {notificationRequestData.request_id !== 'N/A' 
                                            ? 'Request Details' 
                                            : 'Notification Details'}
                                    </h2>
                                    <p className="modal-subtitle">
                                        {notificationRequestData.request_id !== 'N/A' 
                                            ? `Request ID: #${notificationRequestData.request_id}`
                                            : 'General Notification'}
                                    </p>
                                </div>
                                <button onClick={closeNotificationModal} className="modal-close-gradient">
                                    ×
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="modal-body">
                                
                                {/* Notification Content for General Notifications */}
                                {notificationRequestData.request_id === 'N/A' && (
                                    <div className="notification-content">
                                        <h3 className="notification-title">
                                            {notificationRequestData.title}
                                        </h3>
                                        <div className="notification-message-box">
                                            <p>{notificationRequestData.message}</p>
                                        </div>
                                        <div className="notification-timestamp">
                                            Received: {new Date(notificationRequestData.created_at).toLocaleString()}
                                        </div>
                                    </div>
                                )}

                                {/* Request Details for Request-based Notifications */}
                                {notificationRequestData.request_id !== 'N/A' && (
                                    <>
                                        {/* Status Badges */}
                                        <div className="status-badges">
                                            <div className="status-badge-item">
                                                <span className="status-label">Request Status:</span>
                                                <span className={`status-value status-${notificationRequestData.status?.toLowerCase().replace(/ /g, '-')}`}>
                                                    {notificationRequestData.status || 'N/A'}
                                                </span>
                                            </div>

                                            <div className="status-badge-item">
                                                <span className="status-label">Payment Status:</span>
                                                <span className={`status-value ${notificationRequestData.payment_status_display === 'Paid' ? 'status-paid' : 'status-unpaid'}`}>
                                                    {notificationRequestData.payment_status_display || 'Unpaid'}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Information Grid */}
                                        <div className="info-grid">
                                            
                                            {/* Student Information */}
                                            <div className="info-section">
                                                <h3 className="info-section-title">Student Information</h3>
                                                <div className="info-fields">
                                                    <div className="info-field">
                                                        <label>Name</label>
                                                        <p>{notificationRequestData.student_name || 'N/A'}</p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Student ID</label>
                                                        <p>{notificationRequestData.student_id || 'N/A'}</p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Grade Level</label>
                                                        <p>{notificationRequestData.grade_level || 'N/A'}</p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Section</label>
                                                        <p>{notificationRequestData.section || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Contact Information */}
                                            <div className="info-section">
                                                <h3 className="info-section-title">Contact Information</h3>
                                                <div className="info-fields">
                                                    <div className="info-field">
                                                        <label>Contact No</label>
                                                        <p>{notificationRequestData.contact_no || 'N/A'}</p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Email</label>
                                                        <p>{notificationRequestData.email || 'N/A'}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Request & Payment Details */}
                                        <div className="info-grid">
                                            
                                            {/* Request Timeline */}
                                            <div className="info-section">
                                                <h3 className="info-section-title">Request Timeline</h3>
                                                <div className="info-fields">
                                                    <div className="info-field">
                                                        <label>Date Requested</label>
                                                        <p>
                                                            {notificationRequestData.date_requested 
                                                                ? new Date(notificationRequestData.date_requested).toLocaleDateString('en-US', { 
                                                                    year: 'numeric', 
                                                                    month: 'short', 
                                                                    day: 'numeric' 
                                                                }) 
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Scheduled Pick Up</label>
                                                        <p>
                                                            {notificationRequestData.scheduled_pick_up 
                                                                ? new Date(notificationRequestData.scheduled_pick_up).toLocaleDateString('en-US', { 
                                                                    year: 'numeric', 
                                                                    month: 'short', 
                                                                    day: 'numeric' 
                                                                }) 
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Rescheduled Pick Up</label>
                                                        <p>
                                                            {notificationRequestData.rescheduled_pick_up 
                                                                ? new Date(notificationRequestData.rescheduled_pick_up).toLocaleDateString('en-US', { 
                                                                    year: 'numeric', 
                                                                    month: 'short', 
                                                                    day: 'numeric' 
                                                                }) 
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Payment Information */}
                                            <div className="info-section">
                                                <h3 className="info-section-title">Payment Information</h3>
                                                <div className="info-fields">
                                                    <div className="info-field">
                                                        <label>Payment Method</label>
                                                        <p>
                                                            {notificationRequestData.payment_method ? 
                                                                notificationRequestData.payment_method.charAt(0).toUpperCase() + notificationRequestData.payment_method.slice(1) 
                                                                : 'N/A'}
                                                        </p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Amount</label>
                                                        <p>₱{parseFloat(notificationRequestData.payment_amount || 0).toFixed(2)}</p>
                                                    </div>
                                                    <div className="info-field">
                                                        <label>Payment Status</label>
                                                        <p className={notificationRequestData.payment_status_display === 'Paid' ? 'text-paid' : 'text-unpaid'}>
                                                            {notificationRequestData.payment_status_display || 'Unpaid'}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>

                            {/* Modal Footer */}
                            <div className="modal-footer">
                                <button onClick={closeNotificationModal} className="btn-modal-close">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* REQUEST DETAILS MODAL WITH PAYMENT STATUS AND SAVE BUTTON */}
                {showModal && selectedRequest && (
                    <div className="modal-overlay" onClick={handleCloseModal}>
                        <div className="modal-container modal-large" onClick={(e) => e.stopPropagation()}>
                            
                            {/* Modal Header */}
                            <div className="modal-header gradient-header">
                                <div>
                                    <h2 className="modal-title">Request Details</h2>
                                    <p className="modal-subtitle">Request ID: #{selectedRequest.request_id}</p>
                                </div>
                                <button onClick={handleCloseModal} className="modal-close-gradient">
                                    ×
                                </button>
                            </div>

                            {/* Modal Body */}
                            <div className="modal-body">
                                
                                {/* Status Badges */}
                                <div className="status-badges">
                                    <div className="status-badge-item">
                                        <span className="status-label">Request Status:</span>
                                        <span className={`status-value status-${selectedRequest.status?.toLowerCase().replace(/ /g, '-')}`}>
                                            {selectedRequest.status || 'N/A'}
                                        </span>
                                    </div>

                                    <div className="status-badge-item">
                                        <span className="status-label">Payment Status:</span>
                                        <span className={`status-value ${selectedRequest.payment_status_display === 'Paid' ? 'status-paid' : 'status-unpaid'}`}>
                                            {selectedRequest.payment_status_display || 'Unpaid'}
                                        </span>
                                    </div>
                                </div>

                                {/* Information Grid */}
                                <div className="info-grid">
                                    
                                    {/* Student Information */}
                                    <div className="info-section">
                                        <h3 className="info-section-title">Student Information</h3>
                                        <div className="info-fields">
                                            <div className="info-field">
                                                <label>Name</label>
                                                <p>{selectedRequest.student_name || 'N/A'}</p>
                                            </div>
                                            <div className="info-field">
                                                <label>Student ID</label>
                                                <p>{selectedRequest.student_id || 'N/A'}</p>
                                            </div>
                                            <div className="info-field">
                                                <label>Grade Level</label>
                                                <p>{selectedRequest.grade_level || 'N/A'}</p>
                                            </div>
                                            <div className="info-field">
                                                <label>Section</label>
                                                <p>{selectedRequest.section || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Contact Information */}
                                    <div className="info-section">
                                        <h3 className="info-section-title">Contact Information</h3>
                                        <div className="info-fields">
                                            <div className="info-field">
                                                <label>Contact No</label>
                                                <p>{selectedRequest.contact_no || 'N/A'}</p>
                                            </div>
                                            <div className="info-field">
                                                <label>Email</label>
                                                <p>{selectedRequest.email || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Request & Payment Details */}
                                <div className="info-grid">
                                    
                                    {/* Request Timeline */}
                                    <div className="info-section">
                                        <h3 className="info-section-title">Request Timeline</h3>
                                        <div className="info-fields">
                                            <div className="info-field">
                                                <label>Date Requested</label>
                                                <p>
                                                    {selectedRequest.date_requested 
                                                        ? new Date(selectedRequest.date_requested).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        }) 
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="info-field">
                                                <label>Scheduled Pick Up</label>
                                                <p>
                                                    {selectedRequest.scheduled_pick_up 
                                                        ? new Date(selectedRequest.scheduled_pick_up).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        }) 
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="info-field">
                                                <label>Rescheduled Pick Up</label>
                                                <p>
                                                    {selectedRequest.rescheduled_pick_up 
                                                        ? new Date(selectedRequest.rescheduled_pick_up).toLocaleDateString('en-US', { 
                                                            year: 'numeric', 
                                                            month: 'short', 
                                                            day: 'numeric' 
                                                        }) 
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Payment Information */}
                                    <div className="info-section">
                                        <h3 className="info-section-title">Payment Information</h3>
                                        <div className="info-fields">
                                            <div className="info-field">
                                                <label>Payment Method</label>
                                                <p>
                                                    {selectedRequest.payment_method ? 
                                                        selectedRequest.payment_method.charAt(0).toUpperCase() + selectedRequest.payment_method.slice(1) 
                                                        : 'N/A'}
                                                </p>
                                            </div>
                                            <div className="info-field">
                                                <label>Amount</label>
                                                <p>₱{parseFloat(selectedRequest.payment_amount || 0).toFixed(2)}</p>
                                            </div>
                                            <div className="info-field">
                                                <label>Payment Status</label>
                                                <p className={selectedRequest.payment_status_display === 'Paid' ? 'text-paid' : 'text-unpaid'}>
                                                    {selectedRequest.payment_status_display || 'Unpaid'}
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer with Save Button */}
                            <div className="modal-footer">
                                <button 
                                    onClick={() => {
                                        handleSaveRequest(selectedRequest);
                                        handleCloseModal();
                                    }} 
                                    className="btn-modal-save"
                                >
                                    Save
                                </button>
                                <button onClick={handleCloseModal} className="btn-modal-close">
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )}

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
                            {/* Announcement Card */}
                            <div className="announcement-card">
                                <div className="card-header">
                                    <h3>Announcement</h3>
                                    {announcementData.Announcement_ID && (
                                        <div className="edit-status">
                                            {isEditingAnnouncement ? 'Editing...' : 'Viewing'}
                                        </div>
                                    )}
                                </div>
                                <div className="announcement-content">
                                    <div className="announcement-header">
                                        <input 
                                            type="text" 
                                            className={`announcement-title ${announcementErrors.Title ? 'error' : ''}`}
                                            value={announcementData.Title}
                                            onChange={(e) => handleAnnouncementTitleChange(e.target.value)}
                                            placeholder="Enter announcement title..." 
                                            disabled={!isEditingAnnouncement}
                                        />
                                        {announcementErrors.Title && (
                                            <div className="error-message">{announcementErrors.Title}</div>
                                        )}
                                    </div>
                                    <div className="announcement-body">
                                        <textarea 
                                            className={`announcement-text ${announcementErrors.Content ? 'error' : ''}`}
                                            placeholder="Enter announcement content..."
                                            value={announcementData.Content}
                                            onChange={(e) => handleAnnouncementContentChange(e.target.value)}
                                            disabled={!isEditingAnnouncement}
                                        />
                                        {announcementErrors.Content && (
                                            <div className="error-message">{announcementErrors.Content}</div>
                                        )}
                                    </div>
                                    <div className="announcement-actions">
                                        {!isEditingAnnouncement ? (
                                            <button 
                                                className="btn-edit"
                                                onClick={handleAnnouncementEditClick}
                                            >
                                                {announcementData.Announcement_ID ? 'Edit' : 'Create New'}
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    className="btn-save"
                                                    onClick={handleAnnouncementSaveClick}
                                                    disabled={announcementLoading}
                                                >
                                                    {announcementLoading ? 'Saving...' : 'Save'}
                                                </button>
                                                <button 
                                                    className="btn-cancel"
                                                    onClick={handleAnnouncementCancel}
                                                    disabled={announcementLoading}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {announcementData.Is_Active && (
                                        <div className="published-badge">
                                            ✓ Published
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Transaction Card */}
                            <div className="transaction-card">
                                <div className="card-header">
                                    <h3>Transaction Hours</h3>
                                    {transactionData.Transaction_Sched_ID && (
                                        <div className="edit-status">
                                            {isEditingTransaction ? 'Editing...' : 'Viewing'}
                                        </div>
                                    )}
                                </div>
                                <div className="transaction-content">
                                    <textarea 
                                        className={`transaction-text ${transactionErrors.Description ? 'error' : ''}`}
                                        placeholder="Enter transaction hours information..."
                                        value={transactionData.Description}
                                        onChange={(e) => handleTransactionDescriptionChange(e.target.value)}
                                        disabled={!isEditingTransaction}
                                    />
                                    {transactionErrors.Description && (
                                        <div className="error-message">{transactionErrors.Description}</div>
                                    )}
                                    <div className="transaction-actions">
                                        {!isEditingTransaction ? (
                                            <button 
                                                className="btn-edit"
                                                onClick={handleTransactionEditClick}
                                            >
                                                {transactionData.Transaction_Sched_ID ? 'Edit' : 'Create New'}
                                            </button>
                                        ) : (
                                            <>
                                                <button 
                                                    className="btn-save"
                                                    onClick={handleTransactionSaveClick}
                                                    disabled={transactionLoading}
                                                >
                                                    {transactionLoading ? 'Saving...' : 'Save'}
                                                </button>
                                                <button 
                                                    className="btn-cancel"
                                                    onClick={handleTransactionCancel}
                                                    disabled={transactionLoading}
                                                >
                                                    Cancel
                                                </button>
                                            </>
                                        )}
                                    </div>
                                    {transactionData.Is_Active && (
                                        <div className="published-badge">
                                            ✓ Published
                                        </div>
                                    )}
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
                                        <th>Reschedule Pick Up</th>
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
                                                        className="reschedule-date-input"
                                                        value={rescheduledPickups[request.request_id] || request.rescheduled_pick_up || ''}
                                                        onChange={(e) => {
                                                            handleRescheduledPickupChange(request.request_id, e.target.value);
                                                            request.rescheduled_pick_up = e.target.value;
                                                        }}
                                                        min={new Date().toISOString().split('T')[0]}
                                                    />
                                                </td>
                                                <td>
                                                    <select 
                                                        className={`status-select status-${request.status?.toLowerCase().replace(/ /g, '-')}`}
                                                        value={request.status || 'Pending'}
                                                        onChange={(e) => handleStatusChange(request.request_id, e.target.value)}
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
                                                    <button 
                                                        className="btn-action btn-save"
                                                        title="Save Changes"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleSaveRequest(request);
                                                        }}
                                                    >
                                                        Save
                                                    </button>
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

                        {/* Pagination */}
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
                            {/* Left Side - Chart and Legend */}
                            <div className="analytics-left">
                                <div className="circle-chart-container">
                                    <svg width="450" height="450" viewBox="0 0 450 450">
                                        <circle 
                                            cx="225" 
                                            cy="225" 
                                            r="180" 
                                            fill="none" 
                                            stroke="#f0f0f0" 
                                            strokeWidth="45"
                                        />
                                        
                                        {pendingCount > 0 && (
                                            <circle 
                                                cx="225" 
                                                cy="225" 
                                                r="180" 
                                                fill="none" 
                                                stroke="#ef5350" 
                                                strokeWidth="45"
                                                strokeDasharray={`${pendingDash} ${circumference}`}
                                                strokeDashoffset="0"
                                                transform="rotate(-90 225 225)"
                                            />
                                        )}
                                        
                                        {ongoingCount > 0 && (
                                            <circle 
                                                cx="225" 
                                                cy="225" 
                                                r="180" 
                                                fill="none" 
                                                stroke="#ffc107" 
                                                strokeWidth="45"
                                                strokeDasharray={`${ongoingDash} ${circumference}`}
                                                strokeDashoffset={`${-pendingDash}`}
                                                transform="rotate(-90 225 225)"
                                            />
                                        )}
                                        
                                        {readyCount > 0 && (
                                            <circle 
                                                cx="225" 
                                                cy="225" 
                                                r="180" 
                                                fill="none" 
                                                stroke="#ff9800" 
                                                strokeWidth="45"
                                                strokeDasharray={`${readyDash} ${circumference}`}
                                                strokeDashoffset={`${-(pendingDash + ongoingDash)}`}
                                                transform="rotate(-90 225 225)"
                                            />
                                        )}
                                        
                                        {completedCount > 0 && (
                                            <circle 
                                                cx="225" 
                                                cy="225" 
                                                r="180" 
                                                fill="none" 
                                                stroke="#66bb6a" 
                                                strokeWidth="45"
                                                strokeDasharray={`${completedDash} ${circumference}`}
                                                strokeDashoffset={`${-(pendingDash + ongoingDash + readyDash)}`}
                                                transform="rotate(-90 225 225)"
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

                            {/* Right Side - Date Filter */}
                            <div className="analytics-right">
                                <div className="filter-header">
                                    <h3>Filter by Date Range</h3>
                                    <p>Select a date range to analyze requests</p>
                                </div>

                                <div className="date-filter-row">
                                    <div className="date-filter-group">
                                        <label htmlFor="start-date">Start Date</label>
                                        <input 
                                            type="date" 
                                            id="start-date"
                                            min="2020-01-01"
                                            max={new Date().toISOString().split('T')[0]}
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                        />
                                        <button 
                                            className="btn-today"
                                            onClick={() => handleTodayClick(true)}
                                            title="Set Start Date to Today"
                                        >
                                            <i className="fas fa-calendar-day"></i> Today
                                        </button>
                                    </div>

                                    <div className="date-filter-group">
                                        <label htmlFor="end-date">End Date</label>
                                        <input 
                                            type="date" 
                                            id="end-date"
                                            min={startDate || "2020-01-01"}
                                            max={new Date().toISOString().split('T')[0]}
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                        />
                                        <button 
                                            className="btn-today"
                                            onClick={() => handleTodayClick(false)}
                                            title="Set End Date to Today"
                                        >
                                            <i className="fas fa-calendar-day"></i> Today
                                        </button>
                                    </div>
                                </div>

                                <div className="filter-actions">
                                    <button 
                                        className="btn-filter btn-apply-filter"
                                        onClick={handleApplyFilter}
                                    >
                                        <i className="fas fa-check"></i>
                                        Apply
                                    </button>
                                    <button 
                                        className="btn-filter btn-reset-filter"
                                        onClick={handleResetFilter}
                                    >
                                        <i className="fas fa-redo"></i>
                                        Reset
                                    </button>
                                </div>

                                {isFiltered && (
                                    <div className="filter-summary">
                                        <h4>Current Filter</h4>
                                        <p><strong>From:</strong> {new Date(startDate).toLocaleDateString()}</p>
                                        <p><strong>To:</strong> {new Date(endDate).toLocaleDateString()}</p>
                                        <p><strong>Total Requests:</strong> {totalRequests}</p>
                                    </div>
                                )}
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
