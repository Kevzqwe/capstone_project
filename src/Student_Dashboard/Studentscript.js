import { useState, useEffect, useCallback } from 'react';

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
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackType, setFeedbackType] = useState('Select type'); // Default to 'Select type'
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
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

      if (!response.ok) {
        setAnnouncementLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        const announcementText = data.data.Content || 
                                data.data.content || 
                                'Welcome to Pateros Catholic School Document Request System';
        
        setAnnouncement(announcementText);
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    } finally {
      setAnnouncementLoading(false);
    }
  }, []);

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

      if (!response.ok) {
        setTransactionLoading(false);
        return;
      }

      const data = await response.json();
      
      if (data.status === 'success' && data.data) {
        const transactionText = data.data.Description || 
                               data.data.description || 
                               'Monday to Friday, 8:00 AM - 5:00 PM';
        
        setTransactionDays(transactionText);
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
    console.log('Updating welcome messages with data:', data);
    
    const firstName = data.First_Name || data.first_name || 'Student';
    
    console.log('Using first name:', firstName);
    
    const welcomeName = document.getElementById('welcomeName');
    if (welcomeName) {
      welcomeName.textContent = firstName;
      console.log('✓ Updated welcomeName element');
    }
    
    const welcomeMessage = document.querySelector('.welcome-message h2');
    if (welcomeMessage) {
      welcomeMessage.innerHTML = `Welcome back, <span id="welcomeName">${firstName}</span>!`;
      console.log('✓ Updated welcome message');
    }
    
    const accountName = document.getElementById('accountName');
    const fullName = data.full_name || 'N/A';
    if (accountName) {
      accountName.textContent = fullName;
      console.log('✓ Updated account name:', fullName);
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
      console.log('✓ Updated welcome date');
    }
  }, []);

  const updateAccountPage = useCallback((data) => {
    console.log('=== Updating account page ===');
    console.log('Data received:', data);
    
    const accountName = document.getElementById('accountName');
    const fullName = data.full_name || 'N/A';
    
    if (accountName) {
      accountName.textContent = fullName;
      console.log('✓ Account name:', fullName);
    }
    
    const studentNoElement = document.querySelector('.student-no');
    const studentId = data.Student_ID || data.student_id || 'undefined';
    
    if (studentNoElement) {
      studentNoElement.textContent = `Student No: ${studentId}`;
      console.log('✓ Student number:', studentId);
    }
    
    const fieldMappings = {
      'address': data.Address || data.address || '',
      'contact': data.Contact_No || data.contact_no || '',
      'email': data.Email || data.email || '',
      'grade': (() => {
        const gradeDisplay = data.grade_display || '';
        const section = data.Section || data.section || '';
        
        if (gradeDisplay && section) {
          return `${gradeDisplay} - ${section}`;
        } else if (gradeDisplay) {
          return gradeDisplay;
        } else if (section) {
          return `Section ${section}`;
        }
        return 'Not assigned';
      })()
    };
    
    console.log('Field mappings:', fieldMappings);
    
    Object.keys(fieldMappings).forEach(fieldId => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = fieldMappings[fieldId];
        element.readOnly = true;
        element.style.cursor = 'not-allowed';
        element.style.backgroundColor = '#f8f9fa';
        console.log(`✓ Updated ${fieldId}:`, fieldMappings[fieldId]);
      } else {
        console.warn(`✗ Element not found: ${fieldId}`);
      }
    });
    
    console.log('=== Account page update complete ===');
  }, []);

  const updateAllUserInterfaces = useCallback((data) => {
    console.log('=== Updating all UI elements ===');
    console.log('Data:', data);
    
    const sidebarName = document.getElementById('studentName');
    const fullName = data.full_name || 'Student';
    
    if (sidebarName) {
      sidebarName.textContent = fullName;
      console.log('✓ Sidebar name:', fullName);
    }
    
    updateWelcomeMessages(data);
    
    if (activePage === 'account') {
      console.log('On account page, updating...');
      updateAccountPage(data);
    }
    
    console.log('=== UI update complete ===');
  }, [updateWelcomeMessages, updateAccountPage, activePage]);

  const loadUserData = useCallback(() => {
    if (isLoadingUserData) {
      console.log('Already loading user data, skipping...');
      return;
    }
    
    console.log('=== Loading user data ===');
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
        console.log('=== API Response ===');
        console.log('Full response:', data);
        
        if (data.status === 'success' && data.data) {
          console.log('Student data:', data.data);
          console.log('Keys in data:', Object.keys(data.data));
          
          setStudentData(data.data);
          setIsAuthenticated(true);
          window.studentData = data.data;
          
          updateAllUserInterfaces(data.data);
          
          setTimeout(() => {
            loadAnnouncement();
            loadTransaction();
          }, 300);
          
          console.log('✓ User data loaded successfully');
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
  }, [isLoadingUserData, showMessage, loadAnnouncement, loadTransaction, updateAllUserInterfaces]);

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
    setShowFeedbackModal(true);
    const data = studentData || window.studentData;
    const userEmail = data?.Email || data?.email || '';
    setFeedbackEmail(userEmail);
    // REMOVED: setFeedbackType('General'); - Don't reset the type when opening modal
    // Keep whatever type is currently selected or default to 'Bug Report'
  }, [studentData]);

  const closeFeedbackModal = useCallback(() => {
    setShowFeedbackModal(false);
    setFeedback('');
    setFeedbackEmail('');
    setFeedbackType('Select type'); // Reset to 'Select type' when closing
    setFeedbackSuccess(false);
  }, []);

  const handleFeedbackSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    console.log('=== Submitting Feedback ===');
    console.log('Feedback message:', feedback);
    console.log('Email:', feedbackEmail);
    console.log('Type BEFORE submit:', feedbackType);
    
    // Validation
    if (!feedback || !feedback.trim()) {
      showMessage('Please provide a feedback message', 'error');
      return;
    }

    if (!feedbackEmail || !feedbackEmail.trim()) {
      showMessage('Email not found. Please try again.', 'error');
      return;
    }

    // Validate feedback type is selected
    if (!feedbackType || feedbackType === 'Select type') {
      showMessage('Please select a feedback type', 'error');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Create FormData
      const formData = new FormData();
      formData.append('action', 'submitFeedback');
      formData.append('email', feedbackEmail.trim());
      formData.append('feedback_type', feedbackType); // Use the state value directly
      formData.append('message', feedback.trim());

      console.log('=== FormData being sent ===');
      for (let pair of formData.entries()) {
        console.log(pair[0] + ': ' + pair[1]);
      }

      // Send request with proper error handling
      const response = await fetch(FEEDBACK_API_URL, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });

      console.log('Response status:', response.status);
      console.log('Response content-type:', response.headers.get('content-type'));

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // Get response text first for debugging
      const responseText = await response.text();
      console.log('Raw response:', responseText);

      // Try to parse as JSON
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        console.error('Response was:', responseText);
        throw new Error('Server returned invalid JSON. Please check server logs.');
      }

      console.log('Parsed result:', result);
      
      if (result.success) {
        setFeedbackSuccess(true);
        showMessage(result.message || 'Feedback submitted successfully!', 'success');
        
        // Clear form and close modal after 2 seconds
        setTimeout(() => {
          setFeedback('');
          setFeedbackType('Select type'); // Reset to 'Select type' after successful submit
          closeFeedbackModal();
        }, 2000);
      } else {
        console.error('Server returned error:', result.message);
        showMessage(result.message || 'Failed to submit feedback', 'error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showMessage('Error submitting feedback: ' + error.message, 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [feedback, feedbackEmail, feedbackType, showMessage, closeFeedbackModal]);

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
        console.log('Notification marked as read');
        return true;
      } else {
        console.warn('Failed to mark notification as read:', result.message);
        return false;
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      return false;
    }
  }, [unreadCount, updateNotificationBadge, saveReadNotification]);

  const handleNotificationClick = useCallback(async (notificationId) => {
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
      const newMenuToggle = menuToggle.cloneNode(true);
      menuToggle.parentNode.replaceChild(newMenuToggle, menuToggle);
      
      newMenuToggle.addEventListener('click', function(e) {
        e.preventDefault();
        e.stopPropagation();
        console.log('Menu toggle clicked');
        
        if (window.innerWidth <= 900) {
          sidebar.classList.toggle('mobile-open');
          console.log('Sidebar mobile-open toggled:', sidebar.classList.contains('mobile-open'));
        } else {
          sidebar.classList.toggle('collapsed');
          console.log('Sidebar collapsed toggled:', sidebar.classList.contains('collapsed'));
        }
      });
    }
  }, []);

  const setupLogoutHandler = useCallback(() => {
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', function(e) {
        e.preventDefault();
        if (window.confirm('Are you sure you want to logout?')) {
          window.location.href = 'https://mediumaquamarine-heron-545485.hostingersite.com/index.html';
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
      setShowFeedbackModal(true);
      const data = studentData || window.studentData;
      const userEmail = data?.Email || data?.email || '';
      setFeedbackEmail(userEmail);
      // REMOVED: setFeedbackType('General'); - Don't reset when opening
    };
    window.closeFeedbackModal = () => {
      setShowFeedbackModal(false);
      setFeedback('');
      setFeedbackEmail('');
      setFeedbackType('Select type'); // Reset to 'Select type' when closing
      setFeedbackSuccess(false);
    };
  }, [studentData]);

  useEffect(() => {
    console.log('=== Component mounted ===');
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
      console.log('=== Student data changed ===');
      console.log('Current data:', studentData);
      updateAllUserInterfaces(studentData);
    }
  }, [studentData, updateAllUserInterfaces]);

  useEffect(() => {
    console.log('=== Page changed to:', activePage, '===');
    
    if (activePage === 'dashboard') {
      loadDashboardData();
      if (isAuthenticated) {
        loadAnnouncement();
        loadTransaction();
      }
    } else if (activePage === 'account') {
      if (studentData) {
        setTimeout(() => {
          updateAccountPage(studentData);
        }, 100);
      }
    } else if (activePage === 'request-history') {
      if (typeof window.RequestHistoryTable === 'function') {
        setTimeout(window.RequestHistoryTable, 100);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activePage, isAuthenticated, studentData]);

  return {
    studentData,
    activePage,
    notifications,
    unreadCount,
    showNotificationDropdown,
    showFeedbackModal,
    dashboardData,
    feedback,
    feedbackEmail,
    feedbackType,
    isSubmitting,
    feedbackSuccess,
    announcement,
    transactionDays,
    announcementLoading,
    transactionLoading,
    isAuthenticated,
    setFeedback,
    setFeedbackEmail,
    setFeedbackType,
    openFeedbackModal,
    closeFeedbackModal,
    toggleNotificationDropdown,
    handleFeedbackSubmit,
    handleNotificationClick,
    markNotificationAsRead
  };
};

export default useStudentPortal;
