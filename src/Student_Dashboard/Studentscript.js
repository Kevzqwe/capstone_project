import { useState, useEffect, useCallback } from 'react';

// ✅ UPDATED TO USE HOSTINGER BACKEND
const API_BASE_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/student_data.php';
const FEEDBACK_API_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/feedback.php';
const ANNOUNCEMENT_API_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/announcement.php';
const TRANSACTION_API_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/transaction.php';

export const useStudentPortal = () => {
  const [studentData, setStudentData] = useState(null);
  const [activePage, setActivePage] = useState('dashboard');
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [isLoadingUserData, setIsLoadingUserData] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [announcement, setAnnouncement] = useState('Welcome to Pateros Catholic School Document Request System');
  const [transactionDays, setTransactionDays] = useState('Monday to Friday, 8:00 AM - 5:00 PM');
  const [announcementLoading, setAnnouncementLoading] = useState(false);
  const [transactionLoading, setTransactionLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

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

  // Fetch announcement data - matching your backend structure
  const loadAnnouncement = useCallback(async () => {
    try {
      console.log('Loading announcement...');
      setAnnouncementLoading(true);
      
      const response = await fetch(`${ANNOUNCEMENT_API_URL}?action=get_announcement_data`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      console.log('Announcement response status:', response.status);

      if (!response.ok) {
        console.error('Announcement request failed with status:', response.status);
        setAnnouncementLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Announcement response:', data);
      
      if (data.status === 'success' && data.data) {
        // Match your backend field names: Content, Title
        const announcementText = data.data.Content || 
                                data.data.content || 
                                'Welcome to Pateros Catholic School Document Request System';
        
        console.log('✓ Setting announcement to:', announcementText);
        setAnnouncement(announcementText);
      } else if (data.status === 'error') {
        console.warn('Announcement error:', data.message);
        // Keep default announcement
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    } finally {
      setAnnouncementLoading(false);
    }
  }, []);

  // Fetch transaction days data - matching your backend structure
  const loadTransaction = useCallback(async () => {
    try {
      console.log('Loading transaction hours...');
      setTransactionLoading(true);
      
      const response = await fetch(`${TRANSACTION_API_URL}?action=get_transaction_data`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      console.log('Transaction response status:', response.status);

      if (!response.ok) {
        console.error('Transaction request failed with status:', response.status);
        setTransactionLoading(false);
        return;
      }

      const data = await response.json();
      console.log('Transaction response:', data);
      
      if (data.status === 'success' && data.data) {
        // Match your backend field names: Description
        const transactionText = data.data.Description || 
                               data.data.description || 
                               'Monday to Friday, 8:00 AM - 5:00 PM';
        
        console.log('✓ Setting transaction days to:', transactionText);
        setTransactionDays(transactionText);
      } else if (data.status === 'error') {
        console.warn('Transaction error:', data.message);
        // Keep default transaction days
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setTransactionLoading(false);
    }
  }, []);

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
      return JSON.parse(localStorage.getItem('readNotifications') || '[]');
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
        localStorage.setItem('readNotifications', JSON.stringify(readNotifications));
      }
    } catch (error) {
      console.error('Error saving read notification to localStorage:', error);
    }
  }, [getReadNotifications]);

  const updateWelcomeMessages = useCallback((data) => {
    const firstName = data.first_name || data.First_Name || 'Student';
    
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
      welcomeName.textContent = firstName;
    }
    
    const welcomeMessage = document.querySelector('.welcome-message h2');
    if (welcomeMessage) {
      welcomeMessage.innerHTML = `Welcome back, <span id="welcomeName">${firstName}</span>!`;
    }
    
    const accountName = document.getElementById('accountName');
    if (accountName && (data.full_name || data.Full_Name)) {
      accountName.textContent = data.full_name || data.Full_Name;
    }
    
    const welcomeDate = document.getElementById('welcomeDate');
    if (welcomeDate) {
      const today = new Date();
      const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      welcomeDate.textContent = today.toLocaleDateString('en-US', options);
    }
  }, []);

  const updateAccountPage = useCallback((data) => {
    console.log('Updating account page with:', data);
    
    const accountName = document.getElementById('accountName');
    if (accountName && (data.full_name || data.Full_Name)) {
      accountName.textContent = data.full_name || data.Full_Name;
    }
    
    const studentNoElement = document.querySelector('.student-no');
    if (studentNoElement && (data.student_id || data.Student_ID)) {
      studentNoElement.textContent = `Student ID: ${data.student_id || data.Student_ID}`;
    }
    
    const fieldMappings = {
      'address': data.address || data.Address || '',
      'contact': data.contact_no || data.Contact_No || '',
      'email': data.email || data.Email || '',
      'grade': `${data.grade_display || data.Grade_Level || ''} ${data.section || data.Section || ''}`.trim() || 'Not assigned'
    };
    
    Object.keys(fieldMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = fieldMappings[fieldId];
        element.readOnly = true;
        element.style.cursor = 'not-allowed';
        element.style.backgroundColor = '#f8f9fa';
      }
    });
  }, []);

  const updateAllUserInterfaces = useCallback((data) => {
    console.log('Updating all UI elements with:', data);
    
    const sidebarName = document.getElementById('studentName');
    if (sidebarName && (data.full_name || data.Full_Name)) {
      sidebarName.textContent = data.full_name || data.Full_Name;
    }
    
    updateWelcomeMessages(data);
    
    if (activePage === 'account') {
      updateAccountPage(data);
    }
  }, [updateWelcomeMessages, updateAccountPage, activePage]);

  const loadUserData = useCallback(() => {
    if (isLoadingUserData) {
      console.log('Already loading user data, skipping...');
      return;
    }
    
    console.log('Loading user data...');
    setIsLoadingUserData(true);
    
    fetch(`${API_BASE_URL}?action=getStudentData`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
      .then(response => {
        console.log('Response status:', response.status);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        return response.json();
      })
      .then(data => {
        console.log('User data response:', data);
        if (data.status === 'success') {
          setStudentData(data.data);
          setIsAuthenticated(true);
          window.studentData = data.data;
          
          // Load announcement and transaction after authentication is confirmed
          setTimeout(() => {
            loadAnnouncement();
            loadTransaction();
          }, 300);
        } else {
          console.error('Failed to load student data:', data.message);
          setIsAuthenticated(false);
          showMessage('Failed to load student data: ' + data.message, 'error');
        }
      })
      .catch(error => {
        console.error('Error loading user data:', error);
        setIsAuthenticated(false);
        showMessage('Error loading student data', 'error');
      })
      .finally(() => {
        setIsLoadingUserData(false);
      });
  }, [isLoadingUserData, showMessage, loadAnnouncement, loadTransaction]);

  const updateDashboard = useCallback((data) => {
    if (studentData) {
      updateWelcomeMessages(studentData);
    }
    
    const announcementCard = document.querySelector('.info-card h3');
    if (announcementCard && announcementCard.textContent === 'Announcement') {
      const announcementContent = announcementCard.nextElementSibling;
      if (announcementContent && data.announcement) {
        announcementContent.textContent = data.announcement;
      }
    }
    
    const transactionCard = document.querySelectorAll('.info-card h3')[1];
    if (transactionCard && transactionCard.textContent === 'Transaction Days') {
      const transactionContent = transactionCard.nextElementSibling;
      if (transactionContent && data.transaction_hours) {
        transactionContent.textContent = data.transaction_hours;
      }
    }
  }, [studentData, updateWelcomeMessages]);

  const loadDashboardData = useCallback(() => {
    fetch(`${API_BASE_URL}?action=getDashboardData`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          setDashboardData(data.data);
          updateDashboard(data.data);
        }
      })
      .catch(error => {
        console.error('Error loading dashboard data:', error);
      });
  }, [updateDashboard]);

  const fetchNotifications = useCallback(() => {
    fetch(`${API_BASE_URL}?action=getNotifications`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })
      .then(response => response.json())
      .then(data => {
        if (data.status === 'success') {
          const readNotifications = getReadNotifications();
          const filteredNotifications = data.notifications?.filter(notif => 
            !readNotifications.includes(notif.id)
          ) || [];
          
          setNotifications(filteredNotifications);
          setUnreadCount(filteredNotifications.length);
          window.studentNotifications = filteredNotifications;
          updateNotificationBadge(filteredNotifications.length);
        }
      })
      .catch(error => {
        console.error('Error fetching notifications:', error);
      });
  }, [updateNotificationBadge, getReadNotifications]);

  const toggleNotificationDropdown = useCallback(() => {
    setShowNotificationDropdown(prev => !prev);
  }, []);

  const openFeedbackModal = useCallback(() => {
    console.log('Opening feedback modal - state will be set to true');
    setShowFeedbackModal(true);
  }, []);

  const closeFeedbackModal = useCallback(() => {
    console.log('Closing feedback modal');
    setShowFeedbackModal(false);
    setFeedback('');
  }, []);

  const handleFeedbackSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!feedback || !feedback.trim()) {
      showMessage('Please provide a feedback message', 'error');
      return;
    }

    if (!studentData?.email && !studentData?.Email) {
      showMessage('Email not found. Please try again.', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      console.log('Submitting feedback:', {
        email: studentData.email || studentData.Email,
        feedback_type: 'General',
        message: feedback
      });

      const response = await fetch(`${FEEDBACK_API_URL}?action=submitFeedback`, {
        method: 'POST',
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          email: studentData.email || studentData.Email,
          feedback_type: 'General',
          message: feedback
        })
      });

      const result = await response.json();
      console.log('Feedback submission result:', result);
      
      if (result.success) {
        showMessage(result.message || 'Feedback submitted successfully!', 'success');
        setFeedback('');
        closeFeedbackModal();
      } else {
        showMessage(result.message || 'Failed to submit feedback', 'error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showMessage('Error submitting feedback. Please try again.', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [feedback, studentData, showMessage, closeFeedbackModal]);

  const markNotificationAsRead = useCallback(async (notificationId) => {
    try {
      saveReadNotification(notificationId);
      
      setNotifications(prev => prev.filter(notif => notif.id !== notificationId));
      setUnreadCount(prev => Math.max(0, prev - 1));
      updateNotificationBadge(Math.max(0, unreadCount - 1));
      
      if (window.studentNotifications) {
        window.studentNotifications = window.studentNotifications.filter(
          notif => notif.id !== notificationId
        );
      }

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

  const updatePageTitle = useCallback((pageName) => {
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
      const titles = {
        'dashboard': 'Dashboard',
        'documents': 'Documents',
        'request-history': 'Request History',
        'account': 'Account'
      };
      pageTitle.textContent = titles[pageName] || pageName.charAt(0).toUpperCase() + pageName.slice(1);
    }
  }, []);

  const updateActiveNav = useCallback((pageName) => {
    const navItems = document.querySelectorAll('.nav-link');
    navItems.forEach(item => {
      item.classList.remove('active');
      const itemPage = item.getAttribute('data-page');
      if (itemPage === pageName) {
        item.classList.add('active');
      }
    });
  }, []);

  const showPage = useCallback((pageName) => {
    console.log('Showing page:', pageName);
    setActivePage(pageName);
    
    const pages = document.querySelectorAll('.page');
    pages.forEach(page => {
      page.classList.remove('active');
      page.style.display = 'none';
    });
    
    const activePageEl = document.getElementById(pageName);
    if (activePageEl) {
      activePageEl.classList.add('active');
      activePageEl.style.display = 'block';
    }
    
    updateActiveNav(pageName);
    updatePageTitle(pageName);
  }, [updateActiveNav, updatePageTitle]);

  const setupNavigationHandlers = useCallback(() => {
    const navItems = document.querySelectorAll('[data-page], nav a');
    navItems.forEach(item => {
      item.addEventListener('click', function(e) {
        e.preventDefault();
        const pageName = this.getAttribute('data-page') || 
                       this.getAttribute('href')?.replace('#', '');
        if (pageName) {
          showPage(pageName);
        }
      });
    });
  }, [showPage]);

  const setupMenuToggleHandler = useCallback(() => {
    const menuToggle = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (menuToggle && sidebar) {
      menuToggle.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
      });
    }
  }, []);

  const setupLogoutHandler = useCallback(() => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.confirm('Are you sure you want to logout?')) {
          window.location.href = 'index.html';
        }
      });
    }
  }, []);

  const loadInitialData = useCallback(() => {
    const activePageEl = document.querySelector('.page.active');
    if (activePageEl && activePageEl.id === 'dashboard') {
      loadDashboardData();
    }
  }, [loadDashboardData]);

  useEffect(() => {
    window.openFeedbackModal = () => {
      console.log('Global openFeedbackModal called');
      setShowFeedbackModal(true);
    };
    window.closeFeedbackModal = () => {
      console.log('Global closeFeedbackModal called');
      setShowFeedbackModal(false);
      setFeedback('');
    };
  }, []);

  useEffect(() => {
    console.log('showFeedbackModal state changed to:', showFeedbackModal);
  }, [showFeedbackModal]);

  // Load initial data on mount
  useEffect(() => {
    // Load user data first to establish authentication
    loadUserData();
    fetchNotifications();
    
    loadInitialData();
    setupNavigationHandlers();
    setupMenuToggleHandler();
    setupLogoutHandler();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (studentData) {
      updateAllUserInterfaces(studentData);
    }
  }, [studentData, updateAllUserInterfaces]);

  useEffect(() => {
    if (activePage === 'dashboard') {
      loadDashboardData();
      if (isAuthenticated) {
        loadAnnouncement();
        loadTransaction();
      }
    } else if (activePage === 'account' && studentData) {
      updateAccountPage(studentData);
    } else if (activePage === 'request-history') {
      if (typeof window.RequestHistoryTable === 'function') {
        setTimeout(window.RequestHistoryTable, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, isAuthenticated]);

  return {
    studentData,
    activePage,
    notifications,
    unreadCount,
    showNotificationDropdown,
    showFeedbackModal,
    dashboardData,
    feedback,
    isSubmitting,
    announcement,
    transactionDays,
    announcementLoading,
    transactionLoading,
    isAuthenticated,
    setFeedback,
    openFeedbackModal,
    closeFeedbackModal,
    toggleNotificationDropdown,
    handleFeedbackSubmit,
    handleNotificationClick,
    markNotificationAsRead
  };
};

export default useStudentPortal;
