import { useState, useEffect, useCallback, useRef } from 'react';

// API base URLs for your PHP backend
const API_BASE_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/admin_data.php';
const API_RH_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/admin_rh.php';
const API_CREATE_ANNOUNCEMENT_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/create_announcement.php';
const API_CREATE_TRANSACTION_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/create_transaction.php';
const API_UPDATE_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/update_request.php';
const API_FILTERED_DATE_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/filtered_date.php';
const API_LOGOUT_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/logout.php';

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
    const [dashboardData, setDashboardData] = useState({});
    const [documentRequests, setDocumentRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedRequest, setSelectedRequest] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [sessionChecked, setSessionChecked] = useState(false);
    const [isAuthenticating, setIsAuthenticating] = useState(true);
    
    // Use ref to prevent multiple simultaneous operations
    const sessionCheckInProgress = useRef(false);
    const dataLoadedRef = useRef(false);
    const dataLoadingRef = useRef(false);
    const logoutInProgress = useRef(false);
    const isInitialized = useRef(false);
    
    // Notification states
    const [notifications, setNotifications] = useState([]);
    const [allNotifications, setAllNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

    // Mail states
    const [mails, setMails] = useState([]);
    const [unreadMailCount, setUnreadMailCount] = useState(0);
    const [showMailDropdown, setShowMailDropdown] = useState(false);
    const [selectedMail, setSelectedMail] = useState(null);
    const [showMailModal, setShowMailModal] = useState(false);
    const [readMails, setReadMails] = useState(new Set());

    // Notification modal state
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [notificationRequestData, setNotificationRequestData] = useState(null);

    // Announcement states
    const [announcementData, setAnnouncementData] = useState({
        Announcement_ID: null,
        Title: '',
        Content: '',
        Is_Active: false,
        Start_Date: '',
        End_Date: ''
    });
    const [announcements, setAnnouncements] = useState([]);
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    const [announcementLoading, setAnnouncementLoading] = useState(false);

    // Transaction states
    const [transactionData, setTransactionData] = useState({
        Transaction_Sched_ID: null,
        Description: '',
        Is_Active: false
    });
    const [transactions, setTransactions] = useState([]);
    const [isEditingTransaction, setIsEditingTransaction] = useState(false);
    const [transactionLoading, setTransactionLoading] = useState(false);

    // Date filter states
    const [filteredData, setFilteredData] = useState(null);
    const [isFiltering, setIsFiltering] = useState(false);
    const [dateFilterRange, setDateFilterRange] = useState({
        startDate: '',
        endDate: ''
    });

    // ==================== UTILITY FUNCTIONS ====================

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
            background: ${type === 'success' ? '#27ae60' : type === 'info' ? '#3498db' : '#e74c3c'};
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 5000);
    }, []);

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

    // ==================== AUTHENTICATION ERROR HANDLER ====================
    
    const handleAuthenticationError = useCallback((errorMessage) => {
        // Prevent multiple logout attempts
        if (logoutInProgress.current) {
            console.log('⏸️ Logout already in progress');
            return;
        }

        logoutInProgress.current = true;
        console.error('🚫 Authentication error:', errorMessage);
        
        setError('Session expired or not authenticated. Redirecting to login...');
        setIsAuthenticating(false);
        setSessionChecked(false);
        showMessage('Session expired. Please login again.', 'error');
        
        // Clear local storage
        localStorage.clear();
        
        // Redirect after a short delay
        setTimeout(() => {
            window.location.href = '/login';
        }, 2000);
    }, [showMessage]);

    // ==================== SESSION CHECK ====================
    
    const checkSession = useCallback(async () => {
        // Prevent multiple simultaneous checks
        if (sessionCheckInProgress.current) {
            console.log('⏸️ Session check already in progress');
            return sessionChecked;
        }

        sessionCheckInProgress.current = true;
        
        try {
            console.log('🔍 Checking session status...');
            
            const response = await fetch(`${API_BASE_URL}?action=checkSession`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache'
                }
            });
            
            if (!response.ok) {
                sessionCheckInProgress.current = false;
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📋 Session check response:', data);
            
            // Accept multiple possible session indicators
            const sessionValid = (data.logged_in || data.authenticated || data.session_exists) && 
                                (data.role === 'admin' || (data.role && String(data.role).toLowerCase() === 'admin'));
            
            if (sessionValid) {
                console.log('✅ Valid admin session found');
                setSessionChecked(true);
                setIsAuthenticating(false);
                sessionCheckInProgress.current = false;
                return true;
            } else {
                console.warn('❌ No valid session found:', data);
                sessionCheckInProgress.current = false;
                handleAuthenticationError('No valid session');
                return false;
            }
        } catch (error) {
            console.error('❌ Session check failed:', error);
            sessionCheckInProgress.current = false;
            handleAuthenticationError('Session check failed');
            return false;
        }
    }, [sessionChecked, handleAuthenticationError]);

    // ==================== ENHANCED FETCH WITH AUTH CHECK ====================
    
    const fetchWithAuth = useCallback(async (url, options = {}) => {
        try {
            console.log('📡 Fetching:', url);
            
            // Build fetch options with proper credentials
            const fetchOptions = {
                credentials: 'include',
                mode: 'cors',
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Cache-Control': 'no-cache',
                    ...(options.headers || {})
                },
                ...options
            };
            
            const response = await fetch(url, fetchOptions);
            
            console.log('📥 Response status:', response.status, 'for', url);
            
            // Handle authentication errors
            if (response.status === 401 || response.status === 403) {
                console.error('🚫 Authentication failed - Status:', response.status);
                const errorData = await response.json().catch(() => ({}));
                console.error('Error data:', errorData);
                handleAuthenticationError('Unauthorized access');
                return null;
            }
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('📦 Response data received for', url);
            
            // Check for authentication errors in response
            if (data && data.status === 'error') {
                if (data.redirect || 
                    data.session_expired ||
                    data.message === 'Not authenticated' || 
                    data.message === 'Not authenticated - Please login' ||
                    data.message === 'Email missing in session' ||
                    data.message === 'Not authorized - Admin access required' ||
                    (data.message && data.message.toLowerCase().includes('not authenticated')) ||
                    (data.message && data.message.toLowerCase().includes('session'))) {
                    handleAuthenticationError(data.message || 'Authentication error');
                    return null;
                }
            }
            
            return data;
        } catch (error) {
            console.error('❌ Fetch error for', url, ':', error);
            throw error;
        }
    }, [handleAuthenticationError]);

    // ==================== FIELD NORMALIZATION ====================
    
    const normalizeRequestData = useCallback((data) => {
        console.log('Normalizing request data:', data);
        
        const normalized = {
            request_id: data.Request_ID || data.request_id || 'N/A',
            student_name: data.Student_Name || data.student_name || 'N/A',
            student_id: data.Student_ID || data.student_id || 'N/A',
            grade_level: data.Grade_Level || data.grade_level || 'N/A',
            section: data.Section || data.section || 'N/A',
            contact_no: data.Contact_No || data.contact_no || 'N/A',
            email: data.Email || data.email || 'N/A',
            date_requested: data.Date_Requested || data.date_requested || 'N/A',
            scheduled_pick_up: data.Scheduled_Pick_Up || data.scheduled_pick_up || 'N/A',
            rescheduled_pick_up: data.Rescheduled_Pick_Up || data.rescheduled_pick_up || null,
            status: data.Status || data.status || 'N/A',
            payment_method: data.Payment_Method || data.payment_method || 'N/A',
            payment_amount: data.Total_Amount || data.payment_amount || data.total_amount || 0,
            payment_status_display: data.payment_status_display || 'Unpaid',
            paymongo_session_id: data.paymongo_session_id || null
        };
        
        console.log('Normalized data:', normalized);
        return normalized;
    }, []);

    // ==================== ADMIN DATA FUNCTIONS ====================

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
        if (!sessionChecked) {
            console.log('⏳ Session not verified yet, skipping admin data load');
            return;
        }
        
        console.log('Loading admin data from:', `${API_BASE_URL}?action=getAdminData`);
        setLoading(true);
        setError(null);

        try {
            const data = await fetchWithAuth(`${API_BASE_URL}?action=getAdminData`, {
                method: 'GET'
            });

            if (!data) {
                setLoading(false);
                return;
            }

            console.log('Admin data response:', data);

            if (data.status === 'success' && data.data) {
                displayAdminData(data.data);
                window.adminData = data.data;
                setError(null);
            } else {
                console.error('Error loading admin data:', data.message);
                setError(data.message || 'Failed to load admin data');
                displayFallbackAdminData();
            }
        } catch (error) {
            console.error('Error fetching admin data:', error);
            
            let errorMessage = 'Unable to connect to server';
            if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Unable to connect to server. Check if PHP server is running.';
            } else if (error.message.includes('NetworkError')) {
                errorMessage = 'Network error. Check CORS settings or file path.';
            } else {
                errorMessage = error.message || 'Unable to connect to server';
            }
            
            setError(errorMessage);
            displayFallbackAdminData();
        } finally {
            setLoading(false);
        }
    }, [sessionChecked, fetchWithAuth, displayAdminData, displayFallbackAdminData]);

    // ==================== DASHBOARD DATA FUNCTIONS ====================

    const loadDashboardData = useCallback(async () => {
        if (!sessionChecked) {
            console.log('⏳ Session not verified yet, skipping dashboard data load');
            return;
        }
        
        try {
            console.log('Loading dashboard data...');
            const data = await fetchWithAuth(`${API_BASE_URL}?action=getDashboardData`, {
                method: 'GET'
            });

            if (!data) return;
            
            console.log('Dashboard data response:', data);
            
            if (data.status === 'success') {
                setDashboardData(data.data || {});
            } else {
                console.error('Error loading dashboard data:', data.message);
                setDashboardData({});
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setDashboardData({});
        }
    }, [sessionChecked, fetchWithAuth]);

    // ==================== NOTIFICATION FUNCTIONS ====================

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

    const toggleNotificationDropdown = useCallback(() => {
        setShowNotificationDropdown(prev => !prev);
    }, []);

    const fetchNotifications = useCallback(async () => {
        if (!sessionChecked) {
            console.log('⏳ Session not verified yet, skipping notifications fetch');
            return;
        }
        
        const url = `${API_BASE_URL}?action=getNotifications`;
        console.log('Fetching notifications from:', url);
        
        try {
            const data = await fetchWithAuth(url, { method: 'GET' });
            
            if (!data) return;
            
            console.log('Notifications response received');
            
            if (data.status === 'success' && Array.isArray(data.notifications)) {
                const allNotifs = data.notifications;
                
                setAllNotifications(allNotifs);
                setNotifications(allNotifs);
                
                const unreadNotifications = allNotifs.filter(notif => 
                    notif.is_read === 0 || notif.is_read === '0'
                );
                
                setUnreadCount(unreadNotifications.length);
                window.adminNotifications = allNotifs;
                updateNotificationBadge(unreadNotifications.length);
            } else if (data.status === 'success' && (!data.notifications || data.notifications.length === 0)) {
                setAllNotifications([]);
                setNotifications([]);
                setUnreadCount(0);
                updateNotificationBadge(0);
            } else {
                console.error('API Error:', data.message);
                setAllNotifications([]);
                setNotifications([]);
                setUnreadCount(0);
            }
        } catch (error) {
            console.error('Fetch error:', error);
        }
    }, [sessionChecked, fetchWithAuth, updateNotificationBadge]);

    const markNotificationAsRead = useCallback(async (notificationId) => {
        if (!sessionChecked) return false;
        
        try {
            const data = await fetchWithAuth(`${API_BASE_URL}?action=markNotificationRead`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ notification_id: notificationId })
            });

            if (!data) return false;
            
            if (data.status === 'success') {
                setAllNotifications(prev => {
                    const updated = prev.map(notif => 
                        notif.id === notificationId 
                            ? { ...notif, is_read: 1 } 
                            : notif
                    );
                    
                    const newUnreadCount = updated.filter(notif => 
                        notif.is_read === 0 || notif.is_read === '0'
                    ).length;
                    
                    setUnreadCount(newUnreadCount);
                    updateNotificationBadge(newUnreadCount);
                    
                    return updated;
                });
                
                setNotifications(prev => prev.map(notif => 
                    notif.id === notificationId 
                        ? { ...notif, is_read: 1 } 
                        : notif
                ));
                
                return true;
            } else {
                return false;
            }
        } catch (error) {
            console.error('Error marking notification as read:', error);
            return false;
        }
    }, [sessionChecked, fetchWithAuth, updateNotificationBadge]);

    // ==================== MAIL FUNCTIONS ====================

    const updateMailBadge = useCallback((count) => {
        const mailBtn = document.querySelector('img[src*="mail"], .action-btn[title="Mail"]');
        if (!mailBtn) return;
        
        let badge = mailBtn.querySelector?.('.mail-badge') || mailBtn.parentElement?.querySelector('.mail-badge');
        if (!badge) {
            badge = document.createElement('span');
            badge.className = 'mail-badge';
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
            if (mailBtn.parentElement) {
                mailBtn.parentElement.style.position = 'relative';
                mailBtn.parentElement.appendChild(badge);
            }
        }
        
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }, []);

    const getReadMails = useCallback(() => {
        try {
            return JSON.parse(localStorage.getItem('adminReadMails') || '[]');
        } catch (error) {
            console.error('Error reading read mails from localStorage:', error);
            return [];
        }
    }, []);

    const saveReadMail = useCallback((mailId) => {
        try {
            const readMails = getReadMails();
            if (!readMails.includes(mailId)) {
                readMails.push(mailId);
                localStorage.setItem('adminReadMails', JSON.stringify(readMails));
            }
        } catch (error) {
            console.error('Error saving read mail to localStorage:', error);
        }
    }, [getReadMails]);

    const toggleMailDropdown = useCallback(() => {
        setShowMailDropdown(prev => !prev);
    }, []);

    const fetchMails = useCallback(async () => {
        if (!sessionChecked) {
            console.log('⏳ Session not verified yet, skipping mails fetch');
            return;
        }
        
        try {
            const data = await fetchWithAuth(`${API_BASE_URL}?action=getMails`, {
                method: 'GET'
            });
            
            if (!data) return;
            
            if (data.status === 'success') {
                setMails(data.mails || []);
                
                const readMails = getReadMails();
                const unreadCount = data.mails?.filter(mail => 
                    !readMails.includes(mail.id)
                ).length || 0;
                
                setUnreadMailCount(unreadCount);
                window.adminMails = data.mails || [];
                updateMailBadge(unreadCount);
            }
        } catch (error) {
            console.error('Error fetching mails:', error);
        }
    }, [sessionChecked, fetchWithAuth, updateMailBadge, getReadMails]);

    const handleLogout = useCallback(async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            logoutInProgress.current = true;
            try {
                await fetch(API_LOGOUT_URL, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                localStorage.clear();
                window.location.href = '/login';
            }
        }
    }, []);

    // ==================== LOAD ALL DATA WITH LONGER DELAYS ====================
    
    const loadAllData = useCallback(async () => {
        if (!sessionChecked || dataLoadingRef.current) {
            return;
        }
        
        console.log('🔄 Loading all data...');
        dataLoadingRef.current = true;
        
        try {
            // Load admin data first
            await loadAdminData();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Then load notifications
            await fetchNotifications();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Then load mails
            await fetchMails();
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Finally load dashboard if needed
            if (activeSection === 'dashboard') {
                await loadDashboardData();
            }
            
            console.log('✅ All data loaded successfully');
        } catch (error) {
            console.error('❌ Error loading data:', error);
        } finally {
            dataLoadingRef.current = false;
        }
    }, [sessionChecked, loadAdminData, fetchNotifications, fetchMails, loadDashboardData, activeSection]);

    // ==================== EFFECTS ====================

    // Single initialization effect
    useEffect(() => {
        if (isInitialized.current) {
            console.log('⏭️ Already initialized, skipping');
            return;
        }

        const initializeAdmin = async () => {
            console.log('🚀 Component mounted - initializing...');
            isInitialized.current = true;
            
            // Check session first
            const isValid = await checkSession();
            
            if (isValid && !dataLoadedRef.current) {
                console.log('✅ Session valid - waiting before loading data...');
                dataLoadedRef.current = true;
                updateDate();
                
                // Wait longer to ensure session is fully established
                setTimeout(() => {
                    loadAllData();
                }, 1000);
            }
        };
        
        initializeAdmin();
    }, []); // Only run once on mount

    // Effect to handle section changes
    useEffect(() => {
        if (!sessionChecked || !dataLoadedRef.current) return;
        
        console.log('Active section changed to:', activeSection);
        
        if (activeSection === 'dashboard') {
            loadDashboardData();
        }
    }, [activeSection, sessionChecked, loadDashboardData]);

    // Periodic refresh of notifications (less frequent)
    useEffect(() => {
        if (!sessionChecked || !dataLoadedRef.current) return;
        
        const interval = setInterval(() => {
            console.log('🔄 Periodic notification refresh');
            fetchNotifications();
        }, 120000); // Every 2 minutes instead of 1
        
        return () => clearInterval(interval);
    }, [sessionChecked, fetchNotifications]);

    // Calculate actual unread mail count
    const actualUnreadMailCount = mails.filter(mail => !getReadMails().includes(mail.id)).length;

    // ==================== RETURN ====================

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
        sessionChecked,
        isAuthenticating,
        notifications,
        allNotifications,
        unreadCount,
        showNotificationDropdown,
        toggleNotificationDropdown,
        markNotificationAsRead,
        fetchNotifications,
        showNotificationModal,
        notificationRequestData,
        setShowNotificationModal,
        setNotificationRequestData,
        mails,
        unreadMailCount: actualUnreadMailCount,
        showMailDropdown,
        selectedMail,
        showMailModal,
        toggleMailDropdown,
        setSelectedMail,
        setShowMailModal,
        saveReadMail,
        closeMailModal: () => setShowMailModal(false),
        announcementData,
        announcements,
        isEditingAnnouncement,
        announcementLoading,
        setAnnouncementData,
        setAnnouncements,
        setIsEditingAnnouncement,
        setAnnouncementLoading,
        transactionData,
        transactions,
        isEditingTransaction,
        transactionLoading,
        setTransactionData,
        setTransactions,
        setIsEditingTransaction,
        setTransactionLoading,
        filteredData,
        isFiltering,
        dateFilterRange,
        setFilteredData,
        setIsFiltering,
        setDateFilterRange,
        handleNavigation: (section) => setActiveSection(section),
        handleLogout,
        reloadAdminData: loadAdminData,
        loadDashboardData,
        normalizeRequestData,
        showMessage
    };
};

export default useAdminDashboard;
