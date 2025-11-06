import React, { useEffect, useState } from "react";
import "./Student.css";
import PCSlogo from "../Components/Assets/PCSlogo.png";
import Icon from "../Components/Assets/Icon.png";
import Docsimg from "../Components/Assets/Docsimg.png";
import Bell from "../Components/Assets/bell.png";
import useStudentPortal from "./Studentscript";
import useDocumentRequest from "./request";
import { RequestHistoryTable } from "./table.js";
import InitializeChatbase from './Chatbase'; 

export default function StudentDashboard() {
  const {
    studentData,
    notifications,
    unreadCount,
    showNotificationDropdown,
    showFeedbackModal,
    feedback,
    isSubmitting,
    announcement,
    transactionDays,
    announcementLoading,
    transactionLoading,
    setFeedback,
    openFeedbackModal,
    closeFeedbackModal,
    toggleNotificationDropdown,
    handleFeedbackSubmit,
    handleNotificationClick
  } = useStudentPortal();

  useDocumentRequest();

  // Force re-render when announcement or transaction changes
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      const requestHistoryPage = document.getElementById('request-history');
      if (requestHistoryPage?.classList.contains('active')) {
        setTimeout(() => {
          RequestHistoryTable();
        }, 100);
      }
    });

    const mainContent = document.querySelector('.main-content');
    if (mainContent) {
      observer.observe(mainContent, { attributes: true, subtree: true, attributeFilter: ['class'] });
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    InitializeChatbase();
  }, []);

  useEffect(() => {
    console.log('=== ANNOUNCEMENT DATA ===', announcement);
    console.log('=== TRANSACTION DAYS DATA ===', transactionDays);
    // Force re-render when data changes
    setRenderKey(prev => prev + 1);
  }, [announcement, transactionDays]);

  const handleFeedbackClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('=== FEEDBACK BUTTON CLICKED ===');
    openFeedbackModal();
  };

  return (
    <div className="container">
      <nav className="sidebar" id="sidebar">
        <div className="school-header">
          <div className="school-logo">
            <img src={PCSlogo} alt="School Logo" />
          </div>
          <div className="school-name">Pateros Catholic School</div>
        </div>

        <div className="student-profile">
          <div className="student-avatar">
            <img src={Icon} alt="Student Avatar" />
          </div>
          <div className="student-name">
            <span id="studentName">John Doe</span>
          </div>
          <span className="student-badge">Student</span>
        </div>

        <ul className="nav-menu">
          <li className="nav-item">
            <button className="nav-link" data-page="dashboard">
              <i className="fas fa-home"></i> Dashboard
            </button>
          </li>
          <li className="nav-item">
            <button className="nav-link" data-page="documents">
              <i className="fas fa-file-alt"></i> Documents
            </button>
          </li>
          <li className="nav-item">
            <button className="nav-link" data-page="request-history">
              <i className="fas fa-history"></i> Request History
            </button>
          </li>
          <li className="nav-item">
            <button className="nav-link" data-page="account">
              <i className="fas fa-user"></i> Account
            </button>
          </li>
        </ul>

        <button className="logout-btn" id="logoutBtn">
          <i className="fas fa-sign-out-alt"></i> Logout
        </button>
      </nav>

      <main className="main-content">
        <header className="header">
          <div className="header-left">
            <button className="action-btn menu-toggle" id="menuToggle">
              <i className="fas fa-bars"></i>
            </button>
            <h1 className="header-title" id="pageTitle">
              Pateros Catholic School Document Request
            </h1>
          </div>

          <div className="header-actions">
            <button 
              className="action-btn notification-btn" 
              title="Notifications"
              onClick={toggleNotificationDropdown}
            >
              <img src={Bell} alt="Notifications" />
              {unreadCount > 0 && (
                <span className="notification-badge">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {showNotificationDropdown && (
              <div className="notification-dropdown">
                <div className="notification-header">
                  <h3>Notifications {unreadCount > 0 && `(${unreadCount})`}</h3>
                  <button onClick={toggleNotificationDropdown} className="close-dropdown">×</button>
                </div>
                <div className="notification-list">
                  {notifications.length === 0 ? (
                    <div className="no-notifications">No notifications</div>
                  ) : (
                    notifications.map((notification) => (
                      <div
                        key={notification.id}
                        onClick={() => handleNotificationClick(notification.id)}
                        className="notification-item"
                        style={{
                          padding: '12px 15px',
                          borderBottom: '1px solid #eee',
                          cursor: 'pointer',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                      >
                        <div className="notification-title" style={{ 
                          fontWeight: '500', 
                          color: '#2c3e50',
                          fontSize: '14px',
                          marginBottom: '4px'
                        }}>
                          {notification.title}
                        </div>
                        <div className="notification-time" style={{
                          fontSize: '12px',
                          color: '#7f8c8d'
                        }}>
                          {notification.created_at}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="page active" id="dashboard">
          <div className="page-content">
            <div className="welcome-card">
              <div className="welcome-date" id="welcomeDate"></div>
              <div className="welcome-message">
                <h2>Welcome back, <span id="welcomeName"></span>!</h2>
                <p></p>
              </div>
            </div>

            <div className="cards-grid" key={renderKey}>
              <div className="info-card">
                <h3>Announcement</h3>
                <p>{announcementLoading ? 'Loading...' : announcement}</p>
              </div>
              <div className="info-card">
                <h3>Transaction Days</h3>
                <p>{transactionLoading ? 'Loading...' : transactionDays}</p>
              </div>
            </div>

            <button 
              className="request-btn feedback-btn" 
              onClick={handleFeedbackClick}
              style={{ position: 'relative', zIndex: 1 }}
            >
              <i className="fas fa-paper-plane"></i> Send Feedback
            </button>
          </div>
        </div>

        <div className="page" id="documents">
          <div className="page-content">
            <h2>Available Documents</h2>
            <div className="documents-grid">
              <button className="document-card" data-modal="modal-grades">
                <div className="document-icon">
                  <img src={Docsimg} alt="COG" />
                </div>
                <div className="document-title">Copy of Grades</div>
                <div className="document-subtitle">(Form 138)</div>
              </button>

              <button className="document-card" data-modal="modal-diploma">
                <div className="document-icon">
                  <img src={Docsimg} alt="Diploma" />
                </div>
                <div className="document-title">Diploma</div>
              </button>

              <button className="document-card" data-modal="modal-coe">
                <div className="document-icon">
                  <img src={Docsimg} alt="COE" />
                </div>
                <div className="document-title">Certificate of Enrollment</div>
                <div className="document-subtitle">(COE)</div>
              </button>

              <button className="document-card" data-modal="modal-form137">
                <div className="document-icon">
                  <img src={Docsimg} alt="Form 137" />
                </div>
                <div className="document-title">Form 137</div>
              </button>

              <button className="document-card" data-modal="modal-moral">
                <div className="document-icon">
                  <img src={Docsimg} alt="Good Moral" />
                </div>
                <div className="document-title">Good Moral Certificate</div>
              </button>
            </div>

            <button className="request-btn" id="openModalBtn">
              <i className="fas fa-paper-plane"></i> Request Documents
            </button>
          </div>
        </div>

        <div className="page" id="request-history">
          <div className="page-content">
            <h2>Request History</h2>
            <div id="requestHistoryTableContainer"></div>
          </div>
        </div>

        <div className="page" id="account">
          <div className="page-content">
            <div className="account-header">
              <div className="account-avatar">
                <img src={Icon} alt="Student Avatar" />
              </div>
              <div className="account-info">
                <h2>
                  <span id="accountName"></span>
                </h2>
                <p className="student-no"></p>
              </div>
            </div>

            <div className="account-form">
              <div className="form-group">
                <label htmlFor="address">Address</label>
                <input 
                  type="text" 
                  id="address" 
                  defaultValue="" 
                  readOnly 
                  className="readonly-input"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    color: '#6c757d',
                    cursor: 'not-allowed',
                    opacity: 0.8
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="contact">Contact No</label>
                <input 
                  type="tel" 
                  id="contact" 
                  defaultValue="" 
                  readOnly 
                  className="readonly-input"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    color: '#6c757d',
                    cursor: 'not-allowed',
                    opacity: 0.8
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="email">Email</label>
                <input 
                  type="email" 
                  id="email" 
                  defaultValue="" 
                  readOnly 
                  className="readonly-input"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    color: '#6c757d',
                    cursor: 'not-allowed',
                    opacity: 0.8
                  }}
                />
              </div>

              <div className="form-group">
                <label htmlFor="grade">Grade Level and Section</label>
                <input 
                  type="text" 
                  id="grade" 
                  defaultValue="" 
                  readOnly 
                  className="readonly-input"
                  style={{
                    backgroundColor: '#f8f9fa',
                    border: '1px solid #e9ecef',
                    color: '#6c757d',
                    cursor: 'not-allowed',
                    opacity: 0.8
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="modal-overlay" id="documentModal">
        <div className="modal-content">
          <div className="modal-header">
            <h2>Document Request Form</h2>
            <button className="close-modal" id="closeModalBtn">×</button>
          </div>

          <div className="form-content">
            <form id="documentRequestForm" onSubmit={(e) => e.preventDefault()}>
              <div className="form-section">
                <h3>Student Information</h3>
                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="studentNumber">Student Number*</label>
                    <input type="text" id="studentNumber" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="emailField">Email*</label>
                    <input type="email" id="emailField" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="contactNo">Contact No.*</label>
                    <input type="tel" id="contactNo" required />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="surname">Surname*</label>
                    <input type="text" id="surname" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="firstname">Firstname*</label>
                    <input type="text" id="firstname" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="middlename">Middlename</label>
                    <input type="text" id="middlename" />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label htmlFor="gradeField">Grade*</label>
                    <input type="text" id="gradeField" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="section">Section*</label>
                    <input type="text" id="section" required />
                  </div>

                  <div className="form-group">
                    <label htmlFor="date">Date</label>
                    <input type="date" id="date" />
                  </div>
                </div>
              </div>

              <div className="documents-section">
                <h3>Available Documents</h3>

                <div className="document-item">
                  <div className="document-info">
                    <input type="checkbox" className="document-checkbox" id="regForm" data-id="1" data-price="50" />
                    <label htmlFor="regForm" className="document-name">Copy of Grades</label>
                  </div>
                  <div className="document-price">₱ 50.00</div>
                </div>

                <div className="document-item">
                  <div className="document-info">
                    <input type="checkbox" className="document-checkbox" id="cog" data-id="2" data-price="100" />
                    <label htmlFor="cog" className="document-name">Diploma</label>
                  </div>
                  <div className="document-price">₱ 100.00</div>
                </div>

                <div className="document-item">
                  <div className="document-info">
                    <input type="checkbox" className="document-checkbox" id="coe" data-id="3" data-price="100" />
                    <label htmlFor="coe" className="document-name">Certificate of Enrollment</label>
                  </div>
                  <div className="document-price">₱ 100.00</div>
                </div>

                <div className="document-item">
                  <div className="document-info">
                    <input type="checkbox" className="document-checkbox" id="tor" data-id="4" data-price="150" />
                    <label htmlFor="tor" className="document-name">Form 137</label>
                  </div>
                  <div className="document-price">₱ 150.00</div>
                </div>

                <div className="document-item">
                  <div className="document-info">
                    <input type="checkbox" className="document-checkbox" id="gmc" data-id="5" data-price="50" />
                    <label htmlFor="gmc" className="document-name">Good Moral Certificate</label>
                  </div>
                  <div className="document-price">₱ 50.00</div>
                </div>
              </div>

              <div className="total-section">
                <span>Total:</span>
                <span id="totalAmount">₱ 0.00</span>
              </div>

              <div className="form-section">
                <h3>Payment Method</h3>
                <div className="payment-options">
                  <div className="payment-option">
                    <input type="radio" id="cash" name="payment" value="cash" required />
                    <label htmlFor="cash">Cash</label>
                  </div>

                  <div className="payment-option">
                    <input type="radio" id="gcash" name="payment" value="gcash" />
                    <label htmlFor="gcash">
                      <span>G</span> Cash
                    </label>
                  </div>

                  <div className="payment-option">
                    <input type="radio" id="maya" name="payment" value="maya" />
                    <label htmlFor="maya">maya</label>
                  </div>
                </div>
              </div>

              <button type="submit" className="submit-btn">Submit Request</button>
            </form>
          </div>
        </div>
      </div>

      {showFeedbackModal && (
        <div 
          className="modal-overlay feedback-modal-overlay"
          style={{ display: 'flex', zIndex: 9999 }}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeFeedbackModal();
            }
          }}
        >
          <div className="modal-content feedback-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Send Feedback</h2>
              <button className="close-modal" onClick={closeFeedbackModal}>×</button>
            </div>
            <div className="form-content">
              <form onSubmit={handleFeedbackSubmit}>
                <div className="form-group">
                  <label htmlFor="feedbackEmail">Email</label>
                  <input
                    type="email"
                    id="feedbackEmail"
                    value={studentData?.email || ''}
                    readOnly
                    placeholder="Enter your email"
                    style={{ backgroundColor: '#f8f9fa', cursor: 'not-allowed' }}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="feedbackType">Feedback Type</label>
                  <select
                    id="feedbackType"
                    style={{ 
                      width: '100%', 
                      padding: '10px', 
                      borderRadius: '5px',
                      border: '1px solid #ddd',
                      fontSize: '14px'
                    }}
                  >
                    <option value="">Select type</option>
                    <option value="bug">Bug Report</option>
                    <option value="feature">Feature Request</option>
                    <option value="improvement">Improvement</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                <div className="form-group">
                  <label htmlFor="feedbackText">Message</label>
                  <textarea
                    id="feedbackText"
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    placeholder="Please share your feedback..."
                    required
                    className="feedback-textarea"
                    style={{ minHeight: '120px' }}
                  />
                </div>
                
                <button type="submit" className="submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? 'Sending...' : 'Send Feedback'}
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}