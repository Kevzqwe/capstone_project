import { useState, useEffect, useCallback } from 'react';

// API base URLs for your PHP backend
const API_BASE_URL = 'http://localhost/capstone_project/public/php-backend/admin_data.php';
const API_RH_URL = 'http://localhost/capstone_project/public/php-backend/admin_rh.php';
const API_ANNOUNCEMENT_URL = 'http://localhost/capstone_project/public/php-backend/announcement.php';
const API_UPDATE_ANNOUNCEMENT_URL = 'http://localhost/capstone_project/public/php-backend/update_announcement.php';
const API_TRANSACTION_URL = 'http://localhost/capstone_project/public/php-backend/transaction.php';
const API_UPDATE_TRANSACTION_URL = 'http://localhost/capstone_project/public/php-backend/update_transaction.php';
const API_UPDATE_URL = 'http://localhost/capstone_project/public/php-backend/update_request.php';
const API_FILTERED_DATE_URL = 'http://localhost/capstone_project/public/php-backend/filtered_date.php';

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
        Title: 'School Announcement:',
        Content: '',
        Is_Active: false,
        Start_Date: '',
        End_Date: ''
    });
    const [isEditingAnnouncement, setIsEditingAnnouncement] = useState(false);
    const [announcementLoading, setAnnouncementLoading] = useState(false);

    // Transaction states
    const [transactionData, setTransactionData] = useState({
        Transaction_Sched_ID: null,
        Description: 'Monday to Friday, 8:00 AM - 5:00 PM',
        Is_Active: false
    });
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
                    
                    setAllNotifications(allNotifs);
                    setNotifications(allNotifs);
                    
                    const unreadNotifications = allNotifs.filter(notif => 
                        notif.is_read === 0 || notif.is_read === '0'
                    );
                    
                    console.log('✓ Unread count calculated:', unreadNotifications.length);
                    
                    setUnreadCount(unreadNotifications.length);
                    window.adminNotifications = allNotifs;
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
    }, [updateNotificationBadge]);

    const markNotificationAsRead = useCallback(async (notificationId) => {
        try {
            console.log('Marking notification as read:', notificationId);
            
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
                console.warn('✗ Failed to mark notification as read:', result.message);
                return false;
            }
        } catch (error) {
            console.error('✗ Error marking notification as read:', error);
            return false;
        }
    }, [updateNotificationBadge]);

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

    const handleNotificationClick = useCallback(async (notificationId) => {
        console.log('Notification clicked:', notificationId);
        
        try {
            const notification = allNotifications.find(notif => notif.id === notificationId);
            
            if (!notification) {
                console.warn('Notification not found:', notificationId);
                showMessage('Notification not found', 'error');
                return;
            }
            
            console.log('Found notification:', notification);
            
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
                    showMessage(`Opened request ${requestId}`, 'success');
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
                showMessage(notification.title || 'Notification opened', 'info');
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

    const handleMailClick = useCallback((mail) => {
        console.log('Mail clicked:', mail.id);
        openMailModal(mail);
        markMailAsRead(mail.id);
    }, [openMailModal, markMailAsRead]);

    // ==================== ANNOUNCEMENT FUNCTIONS ====================

    const loadAnnouncement = useCallback(async () => {
        try {
            console.log('Loading announcement...');
            setAnnouncementLoading(true);
            const response = await fetch(`${API_ANNOUNCEMENT_URL}?action=get_announcement_data`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            console.log('Announcement response:', data);
            
            if (data.status === 'success') {
                setAnnouncementData({
                    Announcement_ID: data.data.Announcement_ID || data.data.id,
                    Title: data.data.Title || data.data.title || 'School Announcement:',
                    Content: data.data.Content || data.data.content || '',
                    Is_Active: data.data.Is_Active || data.data.is_active || false,
                    Start_Date: data.data.Start_Date || data.data.start_date || '',
                    End_Date: data.data.End_Date || data.data.end_date || ''
                });
            } else {
                console.error('Error loading announcement:', data.message);
                showMessage('Failed to load announcement: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error fetching announcement:', error);
            showMessage('Failed to load announcement', 'error');
        } finally {
            setAnnouncementLoading(false);
        }
    }, [showMessage]);

    const handleAnnouncementEdit = useCallback(() => {
        setIsEditingAnnouncement(true);
        showMessage('You can now edit the announcement', 'info');
    }, [showMessage]);

    const handleAnnouncementPublish = useCallback(async () => {
        try {
            console.log('Publishing announcement...');
            setAnnouncementLoading(true);
            
            const response = await fetch(API_UPDATE_ANNOUNCEMENT_URL, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    Announcement_ID: announcementData.Announcement_ID,
                    Title: announcementData.Title,
                    Content: announcementData.Content,
                    Is_Active: true,
                    Start_Date: announcementData.Start_Date || new Date().toISOString().split('T')[0],
                    End_Date: announcementData.End_Date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    action: 'publish_announcement'
                })
            });

            const data = await response.json();
            console.log('Publish announcement response:', data);
            
            if (data.status === 'success') {
                setAnnouncementData(prev => ({
                    ...prev,
                    Is_Active: true,
                    ...data.data
                }));
                setIsEditingAnnouncement(false);
                showMessage(data.message || 'Announcement published successfully', 'success');
            } else {
                showMessage(data.message || 'Failed to publish announcement', 'error');
            }
        } catch (error) {
            console.error('Error publishing announcement:', error);
            showMessage('Failed to publish announcement', 'error');
        } finally {
            setAnnouncementLoading(false);
        }
    }, [announcementData, showMessage]);

    const handleAnnouncementChange = useCallback((field, value) => {
        setAnnouncementData(prev => ({
            ...prev,
            [field]: value
        }));
    }, []);

    // ==================== TRANSACTION FUNCTIONS ====================

    const loadTransaction = useCallback(async () => {
        try {
            console.log('Loading transaction hours...');
            setTransactionLoading(true);
            const response = await fetch(`${API_TRANSACTION_URL}?action=get_transaction_data`, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                }
            });

            const data = await response.json();
            console.log('Transaction response:', data);
            
            if (data.status === 'success') {
                setTransactionData({
                    Transaction_Sched_ID: data.data.Transaction_Sched_ID || data.data.id,
                    Description: data.data.Description || data.data.content || 'Monday to Friday, 8:00 AM - 5:00 PM',
                    Is_Active: data.data.Is_Active || data.data.is_active || false
                });
            } else {
                console.error('Error loading transaction:', data.message);
                showMessage('Failed to load transaction hours: ' + data.message, 'error');
            }
        } catch (error) {
            console.error('Error fetching transaction:', error);
            showMessage('Failed to load transaction hours', 'error');
        } finally {
            setTransactionLoading(false);
        }
    }, [showMessage]);

    const handleTransactionEdit = useCallback(() => {
        setIsEditingTransaction(true);
        showMessage('You can now edit the transaction hours', 'info');
    }, [showMessage]);

    const handleTransactionPublish = useCallback(async () => {
        try {
            console.log('Publishing transaction hours...');
            setTransactionLoading(true);
            
            const response = await fetch(API_UPDATE_TRANSACTION_URL, {
                method: 'POST',
                credentials: 'include',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json',
                },
                body: JSON.stringify({
                    Transaction_Sched_ID: transactionData.Transaction_Sched_ID,
                    Description: transactionData.Description,
                    Is_Active: true,
                    action: 'publish_transaction'
                })
            });

            const data = await response.json();
            console.log('Publish transaction response:', data);
            
            if (data.status === 'success') {
                setTransactionData(prev => ({
                    ...prev,
                    Is_Active: true,
                    ...data.data
                }));
                setIsEditingTransaction(false);
                showMessage(data.message || 'Transaction hours published successfully', 'success');
            } else {
                showMessage(data.message || 'Failed to publish transaction hours', 'error');
            }
        } catch (error) {
            console.error('Error publishing transaction:', error);
            showMessage('Failed to publish transaction hours', 'error');
        } finally {
            setTransactionLoading(false);
        }
    }, [transactionData, showMessage]);

    const handleTransactionChange = useCallback((value) => {
        setTransactionData(prev => ({
            ...prev,
            Description: value
        }));
    }, []);

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

    /**
     * Filters document requests by date range using filtered_date.php
     * @param {string} startDate - Start date in YYYY-MM-DD format
     * @param {string} endDate - End date in YYYY-MM-DD format
     */
    const filterRequestsByDateRange = useCallback(async (startDate, endDate) => {
        try {
            console.log(`Filtering requests from ${startDate} to ${endDate} using filtered_date.php`);
            setIsFiltering(true);
            setError(null);
            
            // Validate dates
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
            
            // Store the filter range
            setDateFilterRange({ startDate, endDate });
            
            // Call the filtered_date.php endpoint with proper error handling
            const url = `${API_FILTERED_DATE_URL}?action=filterByDateRange&start_date=${startDate}&end_date=${endDate}`;
            console.log('Fetching from URL:', url);
            
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'include',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors' // Explicitly set CORS mode
            });

            console.log('Response status:', response.status);
            console.log('Response headers:', response.headers);

            // Check if response is OK
            if (!response.ok) {
                const errorText = await response.text();
                console.error('Server error response:', errorText);
                throw new Error(`Server error: ${response.status} - ${errorText}`);
            }

            // Try to parse JSON
            let data;
            try {
                const responseText = await response.text();
                console.log('Raw response text:', responseText);
                data = JSON.parse(responseText);
            } catch (parseError) {
                console.error('JSON parse error:', parseError);
                throw new Error('Invalid JSON response from server');
            }

            console.log('Date filter response from filtered_date.php:', data);
            
            if (data.status === 'success') {
                // Safe data access with fallbacks
                const analyticsData = data.data?.analytics || {};
                const requestsData = data.data?.requests || [];
                
                // Update filtered data for analytics with safe defaults
                setFilteredData({
                    pending_requests: analyticsData.pending_requests || 0,
                    ongoing_requests: analyticsData.ongoing_requests || 0,
                    ready_requests: analyticsData.ready_requests || 0,
                    completed_requests: analyticsData.completed_requests || 0,
                    total_requests: analyticsData.total_requests || 0
                });
                
                // Update document requests list with filtered data
                setDocumentRequests(requestsData);
                
                showMessage(
                    `Filtered ${analyticsData.total_requests || requestsData.length} requests from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
                    'success'
                );
            } else {
                const errorMsg = data.message || 'Unknown error';
                console.error('Filter error:', errorMsg);
                showMessage('Failed to filter requests: ' + errorMsg, 'error');
                setFilteredData(null);
            }
        } catch (error) {
            console.error('Error filtering requests by date range:', error);
            
            // Provide more specific error messages
            let errorMessage = 'Error filtering requests. Please try again.';
            if (error.message.includes('CORS')) {
                errorMessage = 'CORS error: Please check your PHP CORS headers configuration.';
            } else if (error.message.includes('Failed to fetch')) {
                errorMessage = 'Network error: Cannot connect to server. Check if PHP server is running.';
            } else if (error.message.includes('Invalid JSON')) {
                errorMessage = 'Server returned invalid response. Check PHP error logs.';
            } else if (error.message) {
                errorMessage = error.message;
            }
            
            showMessage(errorMessage, 'error');
            setFilteredData(null);
        } finally {
            setIsFiltering(false);
        }
    }, [showMessage]);

    /**
     * Resets the date filter and shows all requests
     */
    const resetDateFilter = useCallback(async () => {
        try {
            console.log('Resetting date filter...');
            setIsFiltering(true);
            setError(null);
            
            // Reset the filter range
            setDateFilterRange({ startDate: '', endDate: '' });
            
            // Call the filtered_date.php endpoint to reset
            const response = await fetch(
                `${API_FILTERED_DATE_URL}?action=resetDateFilter`,
                {
                    method: 'GET',
                    credentials: 'include',
                    headers: {
                        'Accept': 'application/json',
                    },
                    mode: 'cors'
                }
            );

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            console.log('Reset filter response from filtered_date.php:', data);
            
            if (data.status === 'success') {
                // Reset to show all data
                setFilteredData(null);
                
                // Safe data access with fallbacks
                const analyticsData = data.data?.analytics || {};
                const requestsData = data.data?.requests || [];
                
                // Reload dashboard data with safe defaults
                setDashboardData({
                    pending_requests: analyticsData.pending_requests || 0,
                    ongoing_requests: analyticsData.ongoing_requests || 0,
                    ready_requests: analyticsData.ready_requests || 0,
                    completed_requests: analyticsData.completed_requests || 0,
                    total_requests: analyticsData.total_requests || 0
                });
                
                // Reload document requests list with all data
                setDocumentRequests(requestsData);
                
                showMessage('Filter reset. Showing all requests.', 'success');
            } else {
                showMessage('Failed to reset filter: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error resetting date filter:', error);
            showMessage('Error resetting filter. Please try again.', 'error');
        } finally {
            setIsFiltering(false);
        }
    }, [showMessage]);

    /**
     * Applies the current date filter (useful when switching sections)
     */
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
                showMessage(`Viewing details for Request ID: ${request.request_id}`, 'success');
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

    // ==================== SAVE REQUEST FUNCTION ====================
    
    const handleSaveRequest = useCallback(async (request) => {
        try {
            console.log('Saving request:', request);
            
            showMessage('Saving request...', 'info');
            
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
                showMessage('Failed to save request: ' + (result.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            console.error('Error saving request:', error);
            showMessage('Error saving request. Please try again.', 'error');
        }
    }, [showMessage, loadDashboardData]);

    // ==================== EFFECTS ====================

    // Poll notifications every 30 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            fetchNotifications();
        }, 30000);
        
        return () => clearInterval(interval);
    }, [fetchNotifications]);

    // Initialize on mount
    useEffect(() => {
        updateDate();
        loadAdminData();
        fetchNotifications();
        fetchMails();
        loadAnnouncement();
        loadTransaction();
        
        if (activeSection === 'dashboard') {
            loadDashboardData();
        }
    }, []);

    // Load section-specific data when section changes
    useEffect(() => {
        if (activeSection === 'dashboard') {
            loadDashboardData();
        } else if (activeSection === 'document-requests') {
            loadDocumentRequests();
        }
    }, [activeSection, loadDashboardData, loadDocumentRequests]);

    // Re-apply date filter when switching to document-requests section if filter is active
    useEffect(() => {
        if (activeSection === 'document-requests' && dateFilterRange.startDate && dateFilterRange.endDate) {
            applyCurrentDateFilter();
        }
    }, [activeSection, dateFilterRange, applyCurrentDateFilter]);

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
        // Notification states and functions
        notifications,
        unreadCount,
        showNotificationDropdown,
        toggleNotificationDropdown,
        handleNotificationClick,
        closeNotificationModal,
        // Notification modal states and functions
        showNotificationModal,
        notificationRequestData,
        // Mail states and functions
        mails,
        unreadMailCount: actualUnreadMailCount,
        showMailDropdown,
        selectedMail,
        showMailModal,
        toggleMailDropdown,
        handleMailClick,
        closeMailModal,
        // Announcement states and functions
        announcementData,
        isEditingAnnouncement,
        announcementLoading,
        handleAnnouncementEdit,
        handleAnnouncementPublish,
        handleAnnouncementChange,
        // Transaction states and functions
        transactionData,
        isEditingTransaction,
        transactionLoading,
        handleTransactionEdit,
        handleTransactionPublish,
        handleTransactionChange,
        // Date filter functions and states
        filterRequestsByDateRange,
        resetDateFilter,
        applyCurrentDateFilter,
        filteredData,
        isFiltering,
        dateFilterRange,
        // Core functions
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