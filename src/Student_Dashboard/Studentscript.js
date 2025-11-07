import { useState, useEffect, useCallback } from 'react';

// ======================
// ✅ CHANGE THESE TO YOUR HOSTINGER DOMAIN
// Example: https://capstonepateroscatholic.online/php-backend/...
// ======================
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

  // ========================
  // ✅ STATUS MESSAGE FUNCTION
  // ========================
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

  // ========================
  // ✅ LOAD ANNOUNCEMENT
  // ========================
  const loadAnnouncement = useCallback(async () => {
    try {
      setAnnouncementLoading(true);
      const response = await fetch(`${ANNOUNCEMENT_API_URL}?action=get_announcement_data`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setAnnouncement(data.data.Content || data.data.content || announcement);
      }
    } catch (error) {
      console.error('Error fetching announcement:', error);
    } finally {
      setAnnouncementLoading(false);
    }
  }, [announcement]);

  // ========================
  // ✅ LOAD TRANSACTION DAYS
  // ========================
  const loadTransaction = useCallback(async () => {
    try {
      setTransactionLoading(true);
      const response = await fetch(`${TRANSACTION_API_URL}?action=get_transaction_data`, {
        method: 'GET',
        credentials: 'include',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);
      const data = await response.json();
      if (data.status === 'success' && data.data) {
        setTransactionDays(data.data.Description || data.data.description || transactionDays);
      }
    } catch (error) {
      console.error('Error fetching transaction:', error);
    } finally {
      setTransactionLoading(false);
    }
  }, [transactionDays]);

  // ========================
  // ✅ LOAD STUDENT DATA
  // ========================
  const loadUserData = useCallback(() => {
    if (isLoadingUserData) return;
    setIsLoadingUserData(true);

    fetch(`${API_BASE_URL}?action=getStudentData`, {
      method: 'GET',
      credentials: 'include',
      headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    })
      .then(response => {
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(data => {
        if (data.status === 'success') {
          setStudentData(data.data);
          setIsAuthenticated(true);
          window.studentData = data.data;

          // Load related data after authentication
          setTimeout(() => {
            loadAnnouncement();
            loadTransaction();
          }, 300);
        } else {
          setIsAuthenticated(false);
          showMessage('Failed to load student data', 'error');
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

  // ========================
  // ✅ FEEDBACK HANDLER
  // ========================
  const handleFeedbackSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!feedback.trim()) {
      showMessage('Please provide feedback', 'error');
      return;
    }

    if (!studentData?.email) {
      showMessage('No email found. Try again.', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch(`${FEEDBACK_API_URL}?action=submitFeedback`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({
          email: studentData.email,
          feedback_type: 'General',
          message: feedback,
        }),
      });

      const result = await response.json();
      if (result.success) {
        showMessage(result.message || 'Feedback submitted successfully!', 'success');
        setFeedback('');
        setShowFeedbackModal(false);
      } else {
        showMessage(result.message || 'Failed to submit feedback', 'error');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showMessage('Error submitting feedback', 'error');
    } finally {
      setIsSubmitting(false);
    }
  }, [feedback, studentData, showMessage]);

  // ========================
  // ✅ INITIAL EFFECTS
  // ========================
  useEffect(() => {
    loadUserData();
  }, [loadUserData]);

  useEffect(() => {
    if (activePage === 'dashboard') {
      loadAnnouncement();
      loadTransaction();
    }
  }, [activePage, loadAnnouncement, loadTransaction]);

  return {
    studentData,
    activePage,
    showFeedbackModal,
    feedback,
    isSubmitting,
    announcement,
    transactionDays,
    announcementLoading,
    transactionLoading,
    isAuthenticated,
    setFeedback,
    setShowFeedbackModal,
    handleFeedbackSubmit,
  };
};

export default useStudentPortal;
