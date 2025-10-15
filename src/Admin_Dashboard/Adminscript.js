import { useState, useEffect, useCallback } from 'react';

// API base URLs for your PHP backend
const API_BASE_URL = 'http://localhost/capstone_project/public/php-backend/admin_data.php';
const API_RH_URL = 'http://localhost/capstone_project/public/php-backend/admin_rh.php';

export const useAdminDashboard = () => {
    const [currentDate, setCurrentDate] = useState('');
    const [activeSection, setActiveSection] = useState('dashboard');
    const [adminData, setAdminData] = useState({
        name: 'Administrator',
        email: 'Loading...',
        contact: 'Loading...',
        status: 'Loading...',
        id: 'Loading...'
    });
    const [rawAdminData, setRawAdminData] = useState(null);
    const [dashboardData, setDashboardData] = useState(null);
    const [documentRequests, setDocumentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);
    
    // Notification states
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

    const showMessage = useCallback((message, type) => {
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
            background: ${type === 'success' ? '#27ae60' : '#e74c3c'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 5000);
    }, []);

    // Notification functions
    const updateNotificationBadge = useCallback((count) => {
        const notificationBtn = document.querySelector('.action-btn[title="Notifications"]');
        if (!notificationBtn) return;
        
        let badge = notificationBtn.querySelector('.notification-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'notification-badge';
            badge.style.cssText = `
                position: absolute;
                top: -5px;
                right: -5px;
                background: #e74c3c;
                color: white;
                border-radius: 50%;
                width: 18px;
                height: 18px;
                font-size: 10px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
            `;
            notificationBtn.style.position = 'relative';
            notificationBtn.appendChild(badge);
        }
        
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }, []);

    const getReadNotifications = useCallback(() => {
        try {
            return JSON.parse(localStorage.getItem('adminReadNotifications') || '[]');
        } catch (error) {
            console.error('Error reading read notifications from localStorage:', error);
            return [];
        }
    }, []);

    const saveReadNotification = useCallback((notificationId) => {
        try {
            const readNotifications = getReadNotifications();
            if (!readNotifications.includes(notificationId)) {
                readNotifications.push(notificationId);
                localStorage.setItem('adminReadNotifications', JSON.stringify(readNotifications));
            }
        } catch (error) {
            console.error('Error saving read notification to localStorage:', error);
        }
    }, [getReadNotifications]);

    const toggleNotificationDropdown = useCallback(() => {
        setShowNotificationDropdown(prev => !prev);
    }, []);

    const markNotificationAsRead = useCallback(async (notificationId) => {
        try {
            // Save to localStorage immediately for persistence
            saveReadNotification(notificationId);
            
            // Update UI state immediately
            setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
            setUnreadCount(prev => Math.max(0, prev - 1));
            updateNotificationBadge(Math.max(0, unreadCount - 1));
            
            // Update global notifications
            if (window.adminNotifications) {
                window.adminNotifications = window.adminNotifications.filter(
                    notif => notif.id !== notificationId
                );
            }

            // Call the backend API to mark as read in database
            const response = await fetch(`${API_BASE_URL}?action=markNotificationRead`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ notification_id: notificationId })
            });

            const result = await response.json();
            
            if (result.status === 'success') {
                console.log('Notification marked as read in database:', notificationId);
                return true;
            } else {
                console.warn('Failed to mark notification as read in database:', result.message);
                return false;
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }, [unreadCount, updateNotificationBadge, saveReadNotification]);

    const handleNotificationClick = useCallback(async (notificationId) => {
        console.log('Notification clicked, marking as read:', notificationId);
        await markNotificationAsRead(notificationId);
    }, [markNotificationAsRead]);

    const fetchNotifications = useCallback(() => {
        fetch(`${API_BASE_URL}?action=getNotifications`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
            }
        })
            .then(response => response.json())
            .then(data => {
                if (data.status === 'success') {
                    // Filter out notifications that have been marked as read in localStorage
                    const readNotifications = getReadNotifications();
                    const filteredNotifications = data.notifications?.filter(notif => 
                        !readNotifications.includes(notif.id)
                    ) || [];
                    
                    setNotifications(filteredNotifications);
                    setUnreadCount(filteredNotifications.length);
                    window.adminNotifications = filteredNotifications;
                    updateNotificationBadge(filteredNotifications.length);
                }
            })
            .catch(error => {
                console.error('Error fetching notifications:', error);
            });
    }, [updateNotificationBadge, getReadNotifications]);

    // Function to create notification for new document requests
    const createRequestNotification = useCallback((request) => {
        const notification = {
            id: `request_${request.request_id}_${Date.now()}`,
            title: `New Document Request - ${request.student_name || 'Student'}`,
            message: `Requested: ${request.document_type || 'Document'}`,
            type: 'request',
            request_id: request.request_id,
            student_name: request.student_name,
            document_type: request.document_type,
            created_at: new Date().toISOString(),
            is_read: false
        };
        
        return notification;
    }, []);

    // Function to add notification for status changes
    const createStatusNotification = useCallback((request, oldStatus, newStatus) => {
        const notification = {
            id: `status_${request.request_id}_${Date.now()}`,
            title: `Request Status Updated`,
            message: `Request ${request.request_id} changed from ${oldStatus} to ${newStatus}`,
            type: 'status',
            request_id: request.request_id,
            student_name: request.student_name,
            old_status: oldStatus,
            new_status: newStatus,
            created_at: new Date().toISOString(),
            is_read: false
        };
        
        return notification;
    }, []);

    // Function to simulate receiving new requests (you can call this when new requests come in)
    const addNewRequestNotification = useCallback((request) => {
        const newNotification = createRequestNotification(request);
        
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        updateNotificationBadge(unreadCount + 1);
        
        // Also update global notifications
        if (window.adminNotifications) {
            window.adminNotifications = [newNotification, ...window.adminNotifications];
        }
        
        showMessage(`New document request from ${request.student_name}`, 'success');
    }, [createRequestNotification, unreadCount, updateNotificationBadge, showMessage]);

    // Function to add status change notification
    const addStatusChangeNotification = useCallback((request, oldStatus, newStatus) => {
        const newNotification = createStatusNotification(request, oldStatus, newStatus);
        
        setNotifications(prev => [newNotification, ...prev]);
        setUnreadCount(prev => prev + 1);
        updateNotificationBadge(unreadCount + 1);
        
        if (window.adminNotifications) {
            window.adminNotifications = [newNotification, ...window.adminNotifications];
        }
        
        showMessage(`Request status updated to ${newStatus}`, 'success');
    }, [createStatusNotification, unreadCount, updateNotificationBadge, showMessage]);

    const updateDate = useCallback(() => {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        setCurrentDate(today.toLocaleDateString('en-US', options));
    }, []);

    const formatEmailForDisplay = useCallback((email) => {
        if (!email) return 'Not set';
        return email.toLowerCase();
    }, []);

    const getNameFromEmail = useCallback((email) => {
        if (!email) return 'Administrator';
        
        const username = email.split('@')[0];
        
        let formattedName = username
            .split(/[._]/)
            .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
            .join(' ');
        
        if (formattedName.length > 20 || formattedName.split(' ').length > 3) {
            return 'School Administrator';
        }
        
        return formattedName;
    }, []);

    const displayAdminData = useCallback((adminDataResponse) => {
        console.log('Admin data received:', adminDataResponse);
        
        const formattedEmail = formatEmailForDisplay(adminDataResponse.Email);
        const adminName = getNameFromEmail(adminDataResponse.Email);
        
        const newAdminData = {
            name: adminName,
            email: formattedEmail,
            contact: adminDataResponse.Contact_No || 'Not set',
            status: adminDataResponse.is_Active ? 'Active' : 'Inactive',
            id: adminDataResponse.Admin_ID || 'N/A'
        };
        
        setAdminData(newAdminData);
        setRawAdminData(adminDataResponse);
    }, [formatEmailForDisplay, getNameFromEmail]);

    const displayFallbackAdminData = useCallback(() => {
        setAdminData({
            name: 'Administrator',
            email: 'Not set',
            contact: 'Not set',
            status: 'Active',
            id: 'N/A'
        });
    }, []);

    const loadAdminData = useCallback(async () => {
        console.log('Loading admin data from:', `${API_BASE_URL}?action=getAdminData`);
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${API_BASE_URL}?action=getAdminData`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            console.log('Response status:', response.status);
            
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Response error:', errorText);
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Admin data response:', data);

            if (data.status === 'success' && data.data) {
                displayAdminData(data.data);
                window.adminData = data.data;
                setError(null);
            } else {
                console.error('Error loading admin data:', data.message);
                
                if (data.message === 'Not authenticated' || data.message === 'Email missing in session') {
                    setError('Session expired. Please login again.');
                    showMessage('Session expired. Redirecting to login...', 'error');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    setError(data.message || 'Failed to load admin data');
                    showMessage('Failed to load admin data: ' + data.message, 'error');
                }
                
                displayFallbackAdminData();
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            
            let errorMessage = 'Unable to connect to server';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Unable to connect to server. Check if PHP server is running at ' + API_BASE_URL;
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Network error. Check CORS settings or file path.';
            } else {
                errorMessage = error.message || 'Unable to connect to server';
            }
            
            setError(errorMessage);
            showMessage(errorMessage, 'error');
            displayFallbackAdminData();
        } finally {
            setLoading(false);
        }
    }, [displayAdminData, displayFallbackAdminData, showMessage]);

    const loadDashboardData = useCallback(async () => {
        try {
            console.log('Loading dashboard data...');
            const response = await fetch(`${API_BASE_URL}?action=getDashboardData`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            console.log('Dashboard data response:', data);
            
            if (data.status === 'success') {
                setDashboardData(data.data);
            } else {
                console.error('Error loading dashboard data:', data.message);
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
        }
    }, []);

    const loadDocumentRequests = useCallback(async () => {
        try {
            console.log('Loading document requests...');
            setLoading(true);
            
            const response = await fetch(`${API_RH_URL}?action=getRequests`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            console.log('Document requests response:', data);
            
            if (data.status === 'success') {
                setDocumentRequests(data.data || []);
                setError(null);
                
                // Check for new requests and create notifications
                if (data.data && data.data.length > 0) {
                    const newRequests = data.data.filter(request => 
                        request.status === 'Pending' || request.status === 'pending'
                    );
                    
                    // You might want to add logic here to only notify about truly new requests
                    // For now, we'll just show a count
                    if (newRequests.length > 0) {
                        console.log(`Found ${newRequests.length} pending requests`);
                    }
                }
            } else {
                console.error('Error loading document requests:', data.message);
                setError(data.message);
            }
        } catch (error) {
            console.error('Error fetching document requests:', error);
            setError('Failed to load document requests');
        } finally {
            setLoading(false);
        }
    }, []);

    const handleNavigation = useCallback((section) => {
        console.log('Navigating to:', section);
        setActiveSection(section);

        const navItems = document.querySelectorAll('.nav-link');
        navItems.forEach(item => {
            item.classList.remove('active');
            const itemSection = item.getAttribute('data-section');
            if (itemSection === section) {
                item.classList.add('active');
            }
        });

        const pages = document.querySelectorAll('.page');
        pages.forEach(page => {
            page.classList.remove('active');
            page.style.display = 'none';
        });
        
        const activePageEl = document.getElementById(section);
        if (activePageEl) {
            activePageEl.classList.add('active');
            activePageEl.style.display = 'block';
        }
    }, []);

    const handleLogout = useCallback(async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            try {
                await fetch('http://localhost/capstone_project/public/php-backend/logout.php', {
                    method: 'POST',
                    credentials: 'include'
                });
                showMessage('Logging out...', 'success');
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                setTimeout(() => {
                    window.location.href = '/login';
                }, 500);
            }
        }
    }, [showMessage]);

    const handleStatusChange = useCallback((requestId, newStatus) => {
        setDocumentRequests(prev => prev.map(request => 
            request.request_id === requestId ? { ...request, status: newStatus } : request
        ));
        showMessage(`Request status updated to ${newStatus}`, 'success');
    }, [showMessage]);

    const handleDocumentSelect = useCallback((documentType) => {
        const documentTitles = {
            'grades': 'Copy of Grades (Form 138)',
            'diploma': 'Diploma',
            'enrollment': 'Certificate of Enrollment (COE)',
            'form137': 'Form 137 (Permanent Record)',
            'moral': 'Good Moral Certificate'
        };
        
        const title = documentTitles[documentType] || documentType;
        showMessage(`Document selected: ${title}`, 'success');
    }, [showMessage]);

    // New action handlers for document requests
    const handleViewRequest = useCallback(async (request) => {
        try {
            console.log('Viewing request:', request);
            
            const response = await fetch(`${API_RH_URL}?action=viewRequest&request_id=${request.request_id}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            
            if (data.status === 'success') {
                setSelectedRequest(data.data);
                setShowModal(true);
                showMessage(`Viewing details for Request ID: ${request.request_id}`, 'success');
            } else {
                showMessage('Failed to load request details', 'error');
            }
        } catch (error) {
            console.error('Error viewing request:', error);
            showMessage('Error loading request details', 'error');
        }
    }, [showMessage]);

    const handleEditRequest = useCallback((request) => {
        console.log('Editing request:', request);
        showMessage(`Edit mode for Request ID: ${request.request_id}`, 'success');
        // TODO: Implement edit functionality
        // You can navigate to edit page or open edit modal
    }, [showMessage]);

    const handleApproveRequest = useCallback(async (request) => {
        if (window.confirm(`Approve Request ID: ${request.request_id}?`)) {
            try {
                console.log('Approving request:', request.request_id);
                
                const response = await fetch(`${API_RH_URL}?action=approveRequest`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ request_id: request.request_id })
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    const oldStatus = request.status;
                    
                    // Update local state
                    setDocumentRequests(prev => prev.map(req => 
                        req.request_id === request.request_id 
                            ? { ...req, status: 'Approved' } 
                            : req
                    ));
                    
                    // Add notification for status change
                    addStatusChangeNotification(request, oldStatus, 'Approved');
                    
                    showMessage(`Request ID ${request.request_id} approved successfully!`, 'success');
                    
                    // Reload dashboard data to update counts
                    loadDashboardData();
                } else {
                    showMessage(data.message || 'Failed to approve request', 'error');
                }
                
            } catch (error) {
                console.error('Error approving request:', error);
                showMessage('Failed to approve request', 'error');
            }
        }
    }, [showMessage, loadDashboardData, addStatusChangeNotification]);

    const handleRejectRequest = useCallback(async (request) => {
        if (window.confirm(`Reject Request ID: ${request.request_id}?`)) {
            try {
                console.log('Rejecting request:', request.request_id);
                
                const response = await fetch(`${API_RH_URL}?action=rejectRequest`, {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ request_id: request.request_id })
                });
                
                const data = await response.json();
                
                if (data.status === 'success') {
                    const oldStatus = request.status;
                    
                    // Update local state
                    setDocumentRequests(prev => prev.map(req => 
                        req.request_id === request.request_id 
                            ? { ...req, status: 'Rejected' } 
                            : req
                    ));
                    
                    // Add notification for status change
                    addStatusChangeNotification(request, oldStatus, 'Rejected');
                    
                    showMessage(`Request ID ${request.request_id} rejected`, 'success');
                    
                    // Reload dashboard data to update counts
                    loadDashboardData();
                } else {
                    showMessage(data.message || 'Failed to reject request', 'error');
                }
                
            } catch (error) {
                console.error('Error rejecting request:', error);
                showMessage('Failed to reject request', 'error');
            }
        }
    }, [showMessage, loadDashboardData, addStatusChangeNotification]);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setSelectedRequest(null);
    }, []);

    const handleReschedulePickup = useCallback(async (requestId, newDate) => {
        try {
            console.log('Rescheduling pickup for request:', requestId, 'to:', newDate);
            
            const response = await fetch(`${API_RH_URL}?action=updateRequest`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ 
                    request_id: requestId,
                    rescheduled_pickup: newDate
                })
            });
            
            const data = await response.json();
            
            if (data.status === 'success') {
                // Update local state
                setDocumentRequests(prev => prev.map(req => 
                    req.request_id === requestId 
                        ? { ...req, rescheduled_pick_up: newDate } 
                        : req
                ));
                
                showMessage('Pickup date rescheduled successfully', 'success');
            } else {
                showMessage(data.message || 'Failed to reschedule pickup', 'error');
            }
            
        } catch (error) {
            console.error('Error rescheduling pickup:', error);
            showMessage('Failed to reschedule pickup', 'error');
        }
    }, [showMessage]);

    // Setup navigation handlers
    const setupNavigationHandlers = useCallback(() => {
        const navItems = document.querySelectorAll('[data-section]');
        navItems.forEach(item => {
            item.addEventListener('click', function(e) {
                e.preventDefault();
                const section = this.getAttribute('data-section');
                if (section) {
                    handleNavigation(section);
                }
            });
        });
    }, [handleNavigation]);

    // Initialize on mount
    useEffect(() => {
        updateDate();
        loadAdminData();
        setupNavigationHandlers();
        fetchNotifications(); // Load notifications
        
        if (activeSection === 'dashboard') {
            loadDashboardData();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Load section-specific data when section changes
    useEffect(() => {
        if (activeSection === 'dashboard') {
            loadDashboardData();
        } else if (activeSection === 'document-requests') {
            loadDocumentRequests();
        }
    }, [activeSection, loadDashboardData, loadDocumentRequests]);

    return {
        currentDate,
        activeSection,
        adminData,
        rawAdminData,
        dashboardData,
        documentRequests,
        loading,
        error,
        selectedRequest,
        showModal,
        // Notification states and functions
        notifications,
        unreadCount,
        showNotificationDropdown,
        toggleNotificationDropdown,
        handleNotificationClick,
        addNewRequestNotification,
        addStatusChangeNotification,
        // Existing functions
        handleNavigation,
        handleLogout,
        handleStatusChange,
        handleDocumentSelect,
        handleViewRequest,
        handleEditRequest,
        handleApproveRequest,
        handleRejectRequest,
        handleCloseModal,
        reloadAdminData: loadAdminData,
        loadDashboardData,
        loadDocumentRequests
    };
};

export default useAdminDashboard;