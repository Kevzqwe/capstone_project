import { useState, useEffect, useCallback } from 'react';

// API base URLs for your PHP backend - PRODUCTION
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
    
    // Notification states
    const [notifications, setNotifications] = useState([]);
    const [allNotifications, setAllNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
    const [readNotifications, setReadNotifications] = useState(new Set());

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

    // Announcement states - Enhanced for create and edit
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

    // Transaction states - Enhanced for create and edit
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

    // ==================== NOTIFICATION LOCALSTORAGE FUNCTIONS ====================

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
            const readNotifs = getReadNotifications();
            if (!readNotifs.includes(notificationId)) {
                readNotifs.push(notificationId);
                localStorage.setItem('adminReadNotifications', JSON.stringify(readNotifs));
                console.log('✓ Saved notification as read:', notificationId);
            }
        } catch (error) {
            console.error('Error saving read notification to localStorage:', error);
        }
    }, [getReadNotifications]);

    // ==================== NOTIFICATION FUNCTIONS ====================

    const updateNotificationBadge = useCallback((count) => {
        // Try to find notification button using multiple selectors
        const notificationBtn = document.querySelector('.notification-btn') || 
                               document.querySelector('[data-type="notification"]') ||
                               document.querySelector('.action-btn[title="Notifications"]');
        
        if (!notificationBtn) {
            console.warn('Notification button not found for badge update');
            return;
        }
        
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
                width: 20px;
                height: 20px;
                font-size: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                z-index: 10;
                pointer-events: none;
            `;
            notificationBtn.style.position = 'relative';
            notificationBtn.appendChild(badge);
        }
        
        badge.textContent = count > 9 ? '9+' : count;
        badge.style.display = count > 0 ? 'flex' : 'none';
    }, []);

    const toggleNotificationDropdown = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log('Toggle notification dropdown');
        setShowNotificationDropdown(prev => {
            const newState = !prev;
            console.log('Notification dropdown state:', newState);
            // Close mail dropdown if open
            if (newState) {
                setShowMailDropdown(false);
            }
            return newState;
        });
    }, []);

    const fetchNotifications = useCallback(() => {
        const url = `${API_BASE_URL}?action=getNotifications`;
        console.log('Fetching notifications from:', url);
        
        fetch(url, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'no-cache'
            }
        })
            .then(response => {
                console.log('Response status:', response.status);
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('===== FULL NOTIFICATIONS API RESPONSE =====');
                console.log('Full response object:', data);
                
                if (data.status === 'success' && Array.isArray(data.notifications)) {
                    const allNotifs = data.notifications;
                    
                    console.log('✓ Success - Processing', allNotifs.length, 'notifications');
                    
                    // Get read notifications from localStorage
                    const readNotifIds = getReadNotifications();
                    console.log('Read notification IDs from localStorage:', readNotifIds);
                    
                    // Mark notifications as read based on localStorage
                    const processedNotifs = allNotifs.map(notif => ({
                        ...notif,
                        is_read: readNotifIds.includes(notif.id) ? 1 : (notif.is_read || 0)
                    }));
                    
                    setAllNotifications(processedNotifs);
                    setNotifications(processedNotifs);
                    
                    // Calculate unread count based on processed notifications
                    const unreadNotifications = processedNotifs.filter(notif => 
                        notif.is_read === 0 || notif.is_read === '0'
                    );
                    
                    console.log('✓ Unread count calculated:', unreadNotifications.length);
                    
                    setUnreadCount(unreadNotifications.length);
                    setReadNotifications(new Set(readNotifIds));
                    window.adminNotifications = processedNotifs;
                    updateNotificationBadge(unreadNotifications.length);
                } else if (data.status === 'success' && (!data.notifications || data.notifications.length === 0)) {
                    console.warn('⚠ API returned success but notifications array is empty or missing');
                    setAllNotifications([]);
                    setNotifications([]);
                    setUnreadCount(0);
                    updateNotificationBadge(0);
                } else {
                    console.error('✗ API Error:', data.message);
                    setAllNotifications([]);
                    setNotifications([]);
                    setUnreadCount(0);
                }
            })
            .catch(error => {
                console.error('✗ Fetch error:', error);
            });
    }, [updateNotificationBadge, getReadNotifications]);

    const markNotificationAsRead = useCallback(async (notificationId) => {
        try {
            console.log('Marking notification as read:', notificationId);
            
            // Save to localStorage first (instant UI update)
            saveReadNotification(notificationId);
            
            // Update state immediately
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
            
            setReadNotifications(prev => new Set(prev.add(notificationId)));
            
            // Then sync with backend (optional, for database record)
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
            console.log('Mark as read response:', result);
            
            if (result.status === 'success') {
                console.log('✓ Notification marked as read in database:', notificationId);
                return true;
            } else {
                console.warn('✗ Failed to mark notification as read in database:', result.message);
                return false;
            }
        } catch (error) {
            console.error('✗ Error marking notification as read:', error);
            return false;
        }
    }, [updateNotificationBadge, saveReadNotification]);

    // ==================== NOTIFICATION MODAL FUNCTIONS ====================

    const extractRequestIdFromNotification = useCallback((notification) => {
        const titleMatch = notification.title?.match(/#(\d+)/);
        if (titleMatch) {
            return parseInt(titleMatch[1]);
        }
        
        const messageMatch = notification.message?.match(/#(\d+)/);
        if (messageMatch) {
            return parseInt(messageMatch[1]);
        }
        
        return null;
    }, []);

    const fetchRequestDetailsForNotification = useCallback(async (requestId) => {
        try {
            console.log('Fetching request details for notification:', requestId);
            
            const requestResponse = await fetch(`${API_RH_URL}?action=viewRequest&request_id=${requestId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const requestData = await requestResponse.json();
            console.log('Raw request data from API:', requestData);
            
            if (requestData.status !== 'success') {
                console.error('Failed to fetch request details:', requestData.message);
                return null;
            }

            const paymentResponse = await fetch(`${API_BASE_URL}?action=getPaymentStatus&request_id=${requestId}`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const paymentData = await paymentResponse.json();
            console.log('Raw payment data from API:', paymentData);
            
            const combinedData = {
                ...requestData.data,
                payment_status_display: paymentData.payment_status_display || 'Unpaid',
                payment_method: paymentData.payment_method || paymentData.Payment_Method || 'N/A',
                payment_amount: paymentData.payment_amount || paymentData.Total_Amount || 0,
                paymongo_session_id: paymentData.paymongo_session_id || null
            };

            console.log('Combined request and payment data (before normalization):', combinedData);
            
            const normalizedData = normalizeRequestData(combinedData);
            console.log('Final normalized data:', normalizedData);
            
            return normalizedData;

        } catch (error) {
            console.error('Error fetching request details for notification:', error);
            return null;
        }
    }, [normalizeRequestData]);

    const handleNotificationClick = useCallback(async (notificationId, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log('Notification clicked:', notificationId);
        
        try {
            const notification = allNotifications.find(notif => notif.id === notificationId);
            
            if (!notification) {
                console.warn('Notification not found:', notificationId);
                showMessage('Notification not found', 'error');
                return;
            }
            
            console.log('Found notification:', notification);
            
            // Mark as read immediately
            await markNotificationAsRead(notificationId);
            
            const requestId = extractRequestIdFromNotification(notification);
            
            if (requestId) {
                console.log('Opening request from notification:', requestId);
                
                const requestData = await fetchRequestDetailsForNotification(requestId);
                
                if (requestData) {
                    console.log('Setting notification request data:', requestData);
                    setNotificationRequestData(requestData);
                    setShowNotificationModal(true);
                    setShowNotificationDropdown(false);
                } else {
                    console.warn('Failed to fetch request details for:', requestId);
                    showMessage('Failed to load request details', 'error');
                }
            } else {
                console.log('Notification has no request ID, showing basic notification modal');
                
                const basicNotificationData = {
                    request_id: 'N/A',
                    student_name: 'N/A',
                    title: notification.title,
                    message: notification.message,
                    status: 'N/A',
                    payment_status_display: 'N/A',
                    created_at: notification.created_at,
                    student_id: 'N/A',
                    grade_level: 'N/A',
                    section: 'N/A',
                    contact_no: 'N/A',
                    email: 'N/A',
                    date_requested: 'N/A',
                    scheduled_pick_up: 'N/A',
                    rescheduled_pick_up: 'N/A',
                    payment_method: 'N/A',
                    payment_amount: 0
                };
                
                setNotificationRequestData(basicNotificationData);
                setShowNotificationModal(true);
                setShowNotificationDropdown(false);
            }
        } catch (error) {
            console.error('Error handling notification click:', error);
            showMessage('Error opening notification', 'error');
        }
    }, [allNotifications, showMessage, markNotificationAsRead, fetchRequestDetailsForNotification, extractRequestIdFromNotification]);

    const closeNotificationModal = useCallback(() => {
        setShowNotificationModal(false);
        setNotificationRequestData(null);
    }, []);

    // ==================== MAIL FUNCTIONS ====================

    const updateMailBadge = useCallback((count) => {
        // Try to find mail button using multiple selectors
        const mailBtn = document.querySelector('.mail-btn') || 
                       document.querySelector('[data-type="mail"]') ||
                       document.querySelector('.action-btn[title="Mail"]') ||
                       document.querySelector('img[src*="mail"]')?.parentElement;
        
        if (!mailBtn) {
            console.warn('Mail button not found for badge update');
            return;
        }
        
        let badge = mailBtn.querySelector('.mail-badge');
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
                width: 20px;
                height: 20px;
                font-size: 11px;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                z-index: 10;
                pointer-events: none;
            `;
            mailBtn.style.position = 'relative';
            mailBtn.appendChild(badge);
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

    const toggleMailDropdown = useCallback((e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log('Toggle mail dropdown');
        setShowMailDropdown(prev => {
            const newState = !prev;
            console.log('Mail dropdown state:', newState);
            // Close notification dropdown if open
            if (newState) {
                setShowNotificationDropdown(false);
            }
            return newState;
        });
    }, []);

    const fetchMails = useCallback(() => {
        fetch(`${API_BASE_URL}?action=getMails`, {
            method: 'GET',
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
            }
        })
            .then(response => response.json())
            .then(data => {
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
            })
            .catch(error => {
                console.error('Error fetching mails:', error);
            });
    }, [updateMailBadge, getReadMails]);

    const openMailModal = useCallback((mail) => {
        setSelectedMail(mail);
        setShowMailModal(true);
        setShowMailDropdown(false);
    }, []);

    const closeMailModal = useCallback(() => {
        setShowMailModal(false);
        setSelectedMail(null);
    }, []);

    const markMailAsRead = useCallback(async (mailId) => {
        try {
            saveReadMail(mailId);
            setReadMails(prev => new Set(prev.add(mailId)));
            
            const readMailsList = getReadMails();
            const unreadCount = mails.filter(mail => 
                !readMailsList.includes(mail.id)
            ).length;
            
            setUnreadMailCount(unreadCount);
            updateMailBadge(unreadCount);

            const response = await fetch(`${API_BASE_URL}?action=markMailRead`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({ mail_id: mailId })
            });

            const result = await response.json();
            return result.status === 'success';
        } catch (error) {
            console.error('Error marking mail as read:', error);
            return false;
        }
    }, [mails, updateMailBadge, saveReadMail, getReadMails]);

    const handleMailClick = useCallback((mail, e) => {
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        console.log('Mail clicked:', mail.id);
        openMailModal(mail);
        markMailAsRead(mail.id);
    }, [openMailModal, markMailAsRead]);

    // ==================== ANNOUNCEMENT FUNCTIONS ====================

    const loadAnnouncements = useCallback(async () => {
        try {
            console.log('Loading announcements...');
            const response = await fetch(`${API_BASE_URL}?action=getAnnouncements`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            console.log('Announcements response:', data);
            
            if (data.status === 'success' && data.data) {
                setAnnouncements(data.data);
                if (data.data.length > 0) {
                    const firstAnnouncement = data.data[0];
                    setAnnouncementData({
                        Announcement_ID: firstAnnouncement.Announcement_ID || firstAnnouncement.id,
                        Title: firstAnnouncement.Title || firstAnnouncement.title || '',
                        Content: firstAnnouncement.Content || firstAnnouncement.content || '',
                        Is_Active: firstAnnouncement.Is_Active || firstAnnouncement.is_active || false,
                        Start_Date: firstAnnouncement.Start_Date || firstAnnouncement.start_date || '',
                        End_Date: firstAnnouncement.End_Date || firstAnnouncement.end_date || ''
                    });
                }
            } else {
                console.warn('No announcements found or error:', data.message);
                setAnnouncements([]);
            }
        } catch (error) {
            console.error('Error loading announcements:', error);
            setAnnouncements([]);
        }
    }, []);

    const handleAnnouncementEdit = useCallback((announcement = null) => {
        if (announcement) {
            setAnnouncementData({
                Announcement_ID: announcement.Announcement_ID || announcement.id,
                Title: announcement.Title || announcement.title || '',
                Content: announcement.Content || announcement.content || '',
                Is_Active: announcement.Is_Active || announcement.is_active || false,
                Start_Date: announcement.Start_Date || announcement.start_date || '',
                End_Date: announcement.End_Date || announcement.end_date || ''
            });
        } else {
            setAnnouncementData({
                Announcement_ID: null,
                Title: '',
                Content: '',
                Is_Active: false,
                Start_Date: '',
                End_Date: ''
            });
        }
        setIsEditingAnnouncement(true);
    }, []);

    const handleAnnouncementSave = useCallback(async () => {
        try {
            console.log('Saving announcement...');
            setAnnouncementLoading(true);
            
            if (!announcementData.Title || !announcementData.Content) {
                showMessage('Please fill in both title and content', 'error');
                setAnnouncementLoading(false);
                return;
            }
            
            const isUpdate = announcementData.Announcement_ID !== null;
            
            const payload = {
                Title: announcementData.Title,
                Content: announcementData.Content,
                Is_Active: announcementData.Is_Active,
                Start_Date: announcementData.Start_Date || new Date().toISOString().split('T')[0],
                End_Date: announcementData.End_Date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
            };
            
            if (isUpdate) {
                payload.Announcement_ID = announcementData.Announcement_ID;
            }
            
            console.log('Sending payload:', payload);
            
            const response = await fetch(API_CREATE_ANNOUNCEMENT_URL, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log('Save announcement response:', data);
            
            if (data.status === 'success') {
                showMessage(
                    isUpdate ? 'Announcement updated successfully!' : 'Announcement created successfully!', 
                    'success'
                );
                
                await loadAnnouncements();
                
                setIsEditingAnnouncement(false);
            } else {
                showMessage(data.message || 'Failed to save announcement', 'error');
            }
        } catch (error) {
            console.error('Error saving announcement:', error);
            showMessage('Failed to save announcement', 'error');
        } finally {
            setAnnouncementLoading(false);
        }
    }, [announcementData, showMessage, loadAnnouncements]);

    const handleAnnouncementChange = useCallback((field, value) => {
        setAnnouncementData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const cancelAnnouncementEdit = useCallback(() => {
        setIsEditingAnnouncement(false);
        if (announcements.length > 0) {
            const firstAnnouncement = announcements[0];
            setAnnouncementData({
                Announcement_ID: firstAnnouncement.Announcement_ID || firstAnnouncement.id,
                Title: firstAnnouncement.Title || firstAnnouncement.title || '',
                Content: firstAnnouncement.Content || firstAnnouncement.content || '',
                Is_Active: firstAnnouncement.Is_Active || firstAnnouncement.is_active || false,
                Start_Date: firstAnnouncement.Start_Date || firstAnnouncement.start_date || '',
                End_Date: firstAnnouncement.End_Date || firstAnnouncement.end_date || ''
            });
        } else {
            setAnnouncementData({
                Announcement_ID: null,
                Title: '',
                Content: '',
                Is_Active: false,
                Start_Date: '',
                End_Date: ''
            });
        }
    }, [announcements]);

    // ==================== TRANSACTION FUNCTIONS ====================

    const loadTransactions = useCallback(async () => {
        try {
            console.log('Loading transactions...');
            const response = await fetch(`${API_BASE_URL}?action=getTransactions`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            console.log('Transactions response:', data);
            
            if (data.status === 'success' && data.data) {
                setTransactions(data.data);
                if (data.data.length > 0) {
                    const firstTransaction = data.data[0];
                    setTransactionData({
                        Transaction_Sched_ID: firstTransaction.Transaction_Sched_ID || firstTransaction.id,
                        Description: firstTransaction.Description || firstTransaction.description || '',
                        Is_Active: firstTransaction.Is_Active || firstTransaction.is_active || false
                    });
                }
            } else {
                console.warn('No transactions found or error:', data.message);
                setTransactions([]);
            }
        } catch (error) {
            console.error('Error loading transactions:', error);
            setTransactions([]);
        }
    }, []);

    const handleTransactionEdit = useCallback((transaction = null) => {
        if (transaction) {
            setTransactionData({
                Transaction_Sched_ID: transaction.Transaction_Sched_ID || transaction.id,
                Description: transaction.Description || transaction.description || '',
                Is_Active: transaction.Is_Active || transaction.is_active || false
            });
        } else {
            setTransactionData({
                Transaction_Sched_ID: null,
                Description: '',
                Is_Active: false
            });
        }
        setIsEditingTransaction(true);
    }, []);

    const handleTransactionSave = useCallback(async () => {
        try {
            console.log('Saving transaction hours...');
            setTransactionLoading(true);
            
            if (!transactionData.Description) {
                showMessage('Please fill in the transaction hours description', 'error');
                setTransactionLoading(false);
                return;
            }
            
            const isUpdate = transactionData.Transaction_Sched_ID !== null;
            
            const payload = {
                Description: transactionData.Description,
                Is_Active: transactionData.Is_Active
            };
            
            if (isUpdate) {
                payload.Transaction_Sched_ID = transactionData.Transaction_Sched_ID;
            }
            
            console.log('Sending payload:', payload);
            
            const response = await fetch(API_CREATE_TRANSACTION_URL, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            console.log('Save transaction response:', data);
            
            if (data.status === 'success') {
                showMessage(
                    isUpdate ? 'Transaction hours updated successfully!' : 'Transaction hours created successfully!', 
                    'success'
                );
                
                await loadTransactions();
                
                setIsEditingTransaction(false);
            } else {
                showMessage(data.message || 'Failed to save transaction hours', 'error');
            }
        } catch (error) {
            console.error('Error saving transaction:', error);
            showMessage('Failed to save transaction hours', 'error');
        } finally {
            setTransactionLoading(false);
        }
    }, [transactionData, showMessage, loadTransactions]);

    const handleTransactionChange = useCallback((field, value) => {
        setTransactionData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    const cancelTransactionEdit = useCallback(() => {
        setIsEditingTransaction(false);
        if (transactions.length > 0) {
            const firstTransaction = transactions[0];
            setTransactionData({
                Transaction_Sched_ID: firstTransaction.Transaction_Sched_ID || firstTransaction.id,
                Description: firstTransaction.Description || firstTransaction.description || '',
                Is_Active: firstTransaction.Is_Active || firstTransaction.is_active || false
            });
        } else {
            setTransactionData({
                Transaction_Sched_ID: null,
                Description: '',
                Is_Active: false
            });
        }
    }, [transactions]);

    // ==================== PAYMENT STATUS FUNCTION ====================

    const fetchPaymentStatus = useCallback(async (requestId) => {
        try {
            console.log('Fetching payment status for request:', requestId);
            
            const response = await fetch(
                `${API_BASE_URL}?action=getPaymentStatus&request_id=${requestId}`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                    }
                }
            );

            const paymentData = await response.json();
            
            if (paymentData.status === 'success') {
                console.log('Payment status fetched:', paymentData);
                return {
                    payment_status_display: paymentData.payment_status_display || 'Unpaid',
                    payment_method: paymentData.payment_method || paymentData.Payment_Method || 'N/A',
                    payment_amount: paymentData.payment_amount || paymentData.Total_Amount || 0,
                    paymongo_session_id: paymentData.paymongo_session_id || null
                };
            } else {
                console.warn('Failed to fetch payment status:', paymentData.message);
                return {
                    payment_status_display: 'Unpaid',
                    payment_method: 'N/A',
                    payment_amount: 0,
                    paymongo_session_id: null
                };
            }
        } catch (error) {
            console.error('Error fetching payment status:', error);
            return {
                payment_status_display: 'Unpaid',
                payment_method: 'N/A',
                payment_amount: 0,
                paymongo_session_id: null
            };
        }
    }, []);

    // ==================== DATE FILTER FUNCTIONS ====================

    const filterRequestsByDateRange = useCallback(async (startDate, endDate) => {
        try {
            console.log(`Filtering requests from ${startDate} to ${endDate}`);
            setIsFiltering(true);
            setError(null);
            
            if (!startDate || !endDate) {
                showMessage('Please select both start and end dates', 'error');
                setIsFiltering(false);
                return;
            }
            
            if (new Date(startDate) > new Date(endDate)) {
                showMessage('Start date cannot be after end date', 'error');
                setIsFiltering(false);
                return;
            }
            
            setDateFilterRange({ startDate, endDate });
            
            const url = `${API_FILTERED_DATE_URL}?action=filterByDateRange&start_date=${startDate}&end_date=${endDate}`;
            console.log('Fetching from URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                },
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            const data = await response.json();
            console.log('Date filter response:', data);
            
            if (data.status === 'success') {
                const analyticsData = data.data?.analytics || {};
                const requestsData = data.data?.requests || [];
                
                setFilteredData({
                    pending_requests: analyticsData.pending_requests || 0,
                    ongoing_requests: analyticsData.ongoing_requests || 0,
                    ready_requests: analyticsData.ready_requests || 0,
                    completed_requests: analyticsData.completed_requests || 0,
                    total_requests: analyticsData.total_requests || 0
                });
                
                setDocumentRequests(requestsData);
                
                showMessage(
                    `Filtered ${analyticsData.total_requests || requestsData.length} requests`,
                    'success'
                );
            } else {
                const errorMsg = data.message || 'Unknown error';
                console.error('Filter error:', errorMsg);
                showMessage('Failed to filter requests', 'error');
                setFilteredData(null);
            }
        } catch (error) {
            console.error('Error filtering requests by date range:', error);
            showMessage('Error filtering requests. Please try again.', 'error');
            setFilteredData(null);
        } finally {
            setIsFiltering(false);
        }
    }, [showMessage]);

    const resetDateFilter = useCallback(async () => {
        try {
            console.log('Resetting date filter...');
            setIsFiltering(true);
            setError(null);
            
            setDateFilterRange({ startDate: '', endDate: '' });
            
            const response = await fetch(
                `${API_FILTERED_DATE_URL}?action=resetDateFilter`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                    },
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Reset filter response:', data);
            
            if (data.status === 'success') {
                setFilteredData(null);
                
                const analyticsData = data.data?.analytics || {};
                const requestsData = data.data?.requests || [];
                
                setDashboardData({
                    pending_requests: analyticsData.pending_requests || 0,
                    ongoing_requests: analyticsData.ongoing_requests || 0,
                    ready_requests: analyticsData.ready_requests || 0,
                    completed_requests: analyticsData.completed_requests || 0,
                    total_requests: analyticsData.total_requests || 0
                });
                
                setDocumentRequests(requestsData);
                
                showMessage('Filter reset. Showing all requests.', 'success');
            } else {
                showMessage('Failed to reset filter', 'error');
            }
        } catch (error) {
            console.error('Error resetting date filter:', error);
            showMessage('Error resetting filter. Please try again.', 'error');
        } finally {
            setIsFiltering(false);
        }
    }, [showMessage]);

    const applyCurrentDateFilter = useCallback(() => {
        if (dateFilterRange.startDate && dateFilterRange.endDate) {
            filterRequestsByDateRange(dateFilterRange.startDate, dateFilterRange.endDate);
        }
    }, [dateFilterRange, filterRequestsByDateRange]);

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
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 2000);
                } else {
                    setError(data.message || 'Failed to load admin data');
                }
                
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
    }, [displayAdminData, displayFallbackAdminData]);

    // ==================== DASHBOARD DATA FUNCTIONS ====================

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
                setDashboardData(data.data || {});
            } else {
                console.error('Error loading dashboard data:', data.message);
                setDashboardData({});
            }
        } catch (error) {
            console.error('Error fetching dashboard data:', error);
            setDashboardData({});
        }
    }, []);

    // ==================== DOCUMENT REQUESTS FUNCTIONS ====================

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
        
        if (section === 'announcements') {
            loadAnnouncements();
        } else if (section === 'transaction-hours') {
            loadTransactions();
        }
    }, [loadAnnouncements, loadTransactions]);

    const handleLogout = useCallback(async () => {
        if (window.confirm('Are you sure you want to logout?')) {
            try {
                await fetch(API_LOGOUT_URL, {
                    method: 'POST',
                    credentials: 'include'
                });
            } catch (error) {
                console.error('Logout error:', error);
            } finally {
                setTimeout(() => {
                    window.location.href = '/login';
                }, 500);
            }
        }
    }, []);

    const handleStatusChange = useCallback((requestId, newStatus) => {
        setDocumentRequests(prev => prev.map(request => 
            request.request_id === requestId ? { ...request, status: newStatus } : request
        ));
    }, []);

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
                const paymentInfo = await fetchPaymentStatus(request.request_id);
                
                const enrichedData = {
                    ...data.data,
                    ...paymentInfo
                };
                
                const normalizedData = normalizeRequestData(enrichedData);
                
                setSelectedRequest(normalizedData);
                setShowModal(true);
            } else {
                showMessage('Failed to load request details', 'error');
            }
        } catch (error) {
            console.error('Error viewing request:', error);
            showMessage('Error loading request details', 'error');
        }
    }, [fetchPaymentStatus, normalizeRequestData, showMessage]);

    const handleCloseModal = useCallback(() => {
        setShowModal(false);
        setSelectedRequest(null);
    }, []);

    const handleSaveRequest = useCallback(async (request) => {
        try {
            console.log('Saving request:', request);
            
            const response = await fetch(`${API_UPDATE_URL}?action=updateRequest`, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    request_id: request.request_id,
                    scheduled_pickup: request.scheduled_pick_up,
                    rescheduled_pickup: request.rescheduled_pick_up,
                    status: request.status
                })
            });

            const result = await response.json();
            console.log('Save request response:', result);
            
            if (result.status === 'success') {
                setDocumentRequests(prev => prev.map(req => 
                    req.request_id === request.request_id 
                        ? { ...req, ...result.data } 
                        : req
                ));
                showMessage('Request saved successfully!', 'success');
                loadDashboardData();
            } else {
                showMessage('Failed to save request', 'error');
            }
        } catch (error) {
            console.error('Error saving request:', error);
            showMessage('Error saving request. Please try again.', 'error');
        }
    }, [showMessage, loadDashboardData]);

    // ==================== CLOSE DROPDOWNS ON OUTSIDE CLICK ====================
    
    useEffect(() => {
        const handleClickOutside = (event) => {
            // Check if click is outside notification dropdown
            const notificationDropdown = document.querySelector('.notification-dropdown');
            const notificationBtn = document.querySelector('.notification-btn') || 
                                   document.querySelector('[data-type="notification"]');
            
            if (showNotificationDropdown && 
                notificationDropdown && 
                !notificationDropdown.contains(event.target) &&
                notificationBtn &&
                !notificationBtn.contains(event.target)) {
                setShowNotificationDropdown(false);
            }
            
            // Check if click is outside mail dropdown
            const mailDropdown = document.querySelector('.mail-dropdown');
            const mailBtn = document.querySelector('.mail-btn') || 
                          document.querySelector('[data-type="mail"]');
            
            if (showMailDropdown && 
                mailDropdown && 
                !mailDropdown.contains(event.target) &&
                mailBtn &&
                !mailBtn.contains(event.target)) {
                setShowMailDropdown(false);
            }
        };
        
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('touchstart', handleClickOutside);
        
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('touchstart', handleClickOutside);
        };
    }, [showNotificationDropdown, showMailDropdown]);

    // ==================== EFFECTS ====================

    useEffect(() => {
        const interval = setInterval(() => {
            fetchNotifications();
            fetchMails();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchNotifications, fetchMails]);

    useEffect(() => {
        updateDate();
        loadAdminData();
        fetchNotifications();
        fetchMails();
        
        if (activeSection === 'dashboard') {
            loadDashboardData();
        }
        
        if (activeSection === 'document-requests') {
            loadDocumentRequests();
        }
        
        if (activeSection === 'announcements') {
            loadAnnouncements();
        } else if (activeSection === 'transaction-hours') {
            loadTransactions();
        }
    }, []);

    useEffect(() => {
        console.log('Active section changed to:', activeSection);
        
        if (activeSection === 'dashboard') {
            loadDashboardData();
        } else if (activeSection === 'document-requests') {
            if (dateFilterRange.startDate && dateFilterRange.endDate) {
                console.log('Re-applying date filter:', dateFilterRange);
                filterRequestsByDateRange(dateFilterRange.startDate, dateFilterRange.endDate);
            } else {
                loadDocumentRequests();
            }
        } else if (activeSection === 'announcements') {
            loadAnnouncements();
        } else if (activeSection === 'transaction-hours') {
            loadTransactions();
        }
    }, [activeSection, dateFilterRange.startDate, dateFilterRange.endDate, loadDashboardData, loadDocumentRequests, filterRequestsByDateRange, loadAnnouncements, loadTransactions]);

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
        notifications,
        unreadCount,
        showNotificationDropdown,
        toggleNotificationDropdown,
        handleNotificationClick,
        closeNotificationModal,
        showNotificationModal,
        notificationRequestData,
        mails,
        unreadMailCount: actualUnreadMailCount,
        showMailDropdown,
        selectedMail,
        showMailModal,
        toggleMailDropdown,
        handleMailClick,
        closeMailModal,
        announcementData,
        announcements,
        isEditingAnnouncement,
        announcementLoading,
        handleAnnouncementEdit,
        handleAnnouncementSave,
        handleAnnouncementChange,
        cancelAnnouncementEdit,
        loadAnnouncements,
        transactionData,
        transactions,
        isEditingTransaction,
        transactionLoading,
        handleTransactionEdit,
        handleTransactionSave,
        handleTransactionChange,
        cancelTransactionEdit,
        loadTransactions,
        filterRequestsByDateRange,
        resetDateFilter,
        applyCurrentDateFilter,
        filteredData,
        isFiltering,
        dateFilterRange,
        handleNavigation,
        handleLogout,
        handleStatusChange,
        handleViewRequest,
        handleCloseModal,
        handleSaveRequest,
        reloadAdminData: loadAdminData,
        loadDashboardData,
        loadDocumentRequests
    };
};

export default useAdminDashboard;
