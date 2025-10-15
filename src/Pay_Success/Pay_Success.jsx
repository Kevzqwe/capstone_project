import React, { useState, useEffect } from 'react';

const Pay_Success = () => {
  const [paymentData, setPaymentData] = useState({
    success: false,
    requestId: '0',
    amount: '0.00',
    paymentMethod: 'Online Payment',
    studentName: '',
    smsSent: false,
    isDuplicate: false,
    error: '',
    message: ''
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const processPaymentResult = () => {
      const urlParams = new URLSearchParams(window.location.search);
      
      const success = urlParams.get('success') === '1';
      const requestId = urlParams.get('request_id') || '0';
      const amount = urlParams.get('amount') || '0.00';
      const paymentMethod = urlParams.get('payment_method') || 'Online Payment';
      const studentName = urlParams.get('student_name') || '';
      const smsSent = urlParams.get('sms_sent') === '1' || urlParams.get('sms_sent') === 'true';
      const isDuplicate = urlParams.get('duplicate') === '1';
      const error = urlParams.get('error') || '';
      const message = urlParams.get('message') || '';

      console.log('Payment Success Page - Parameters:', {
        success,
        requestId,
        amount,
        paymentMethod,
        studentName,
        smsSent,
        smsRawValue: urlParams.get('sms_sent'),
        isDuplicate,
        error,
        message
      });

      setPaymentData({
        success,
        requestId,
        amount,
        paymentMethod,
        studentName,
        smsSent,
        isDuplicate,
        error,
        message
      });

      setLoading(false);
    };

    processPaymentResult();
  }, []);

  const handleReturnHome = () => {
    localStorage.removeItem('pending_payment');
    window.location.href = '/';
  };

  const handleViewDashboard = () => {
    localStorage.removeItem('pending_payment');
    window.location.href = '/student-dashboard';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    card: {
      background: 'white',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
      maxWidth: '480px',
      width: '100%',
      animation: 'slideUp 0.5s ease-out'
    },
    icon: {
      marginBottom: '24px'
    },
    successCheckmark: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#10b981',
      color: 'white',
      fontSize: '40px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      boxShadow: '0 10px 20px rgba(16, 185, 129, 0.3)'
    },
    errorIcon: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#ef4444',
      color: 'white',
      fontSize: '40px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)'
    },
    loadingSpinner: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#f59e0b',
      color: 'white',
      fontSize: '40px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
      boxShadow: '0 10px 20px rgba(245, 158, 11, 0.3)',
      animation: 'pulse 2s infinite'
    },
    successTitle: {
      color: '#10b981',
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '24px',
      lineHeight: '1.2'
    },
    errorTitle: {
      color: '#ef4444',
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '24px',
      lineHeight: '1.2'
    },
    loadingTitle: {
      color: '#f59e0b',
      fontSize: '28px',
      fontWeight: '700',
      marginBottom: '24px',
      lineHeight: '1.2'
    },
    paymentDetails: {
      background: '#f8fafc',
      borderRadius: '12px',
      padding: '24px',
      marginBottom: '32px',
      border: '1px solid #e2e8f0'
    },
    detailText: {
      fontSize: '16px',
      color: '#4a5568',
      marginBottom: '20px',
      lineHeight: '1.5'
    },
    highlight: {
      color: '#2d3748',
      fontWeight: '600'
    },
    detailRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '12px 0',
      borderBottom: '1px solid #e2e8f0'
    },
    detailLabel: {
      color: '#718096',
      fontSize: '14px'
    },
    detailValue: {
      color: '#2d3748',
      fontSize: '16px',
      fontWeight: '600'
    },
    confirmationText: {
      color: '#059669',
      fontSize: '14px',
      marginTop: '16px',
      marginBottom: '0',
      fontStyle: 'italic',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px'
    },
    actionButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      marginBottom: '20px'
    },
    btn: {
      padding: '12px 24px',
      border: '2px solid',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textDecoration: 'none',
      display: 'inline-block',
      minWidth: '140px'
    },
    btnPrimary: {
      background: '#10b981',
      borderColor: '#10b981',
      color: 'white'
    },
    btnOutline: {
      background: 'transparent',
      borderColor: '#cbd5e0',
      color: '#4a5568'
    },
    statusMessage: {
      padding: '12px 16px',
      borderRadius: '8px',
      fontSize: '14px',
      marginTop: '12px'
    },
    successStatus: {
      background: '#f0fff4',
      border: '1px solid #9ae6b4',
      color: '#22543d'
    },
    warningStatus: {
      background: '#fffaf0',
      border: '1px solid #fbd38d',
      color: '#744210'
    },
    errorStatus: {
      background: '#fee',
      border: '1px solid #feb2b2',
      color: '#c53030'
    },
    errorMessage: {
      fontSize: '16px',
      color: '#4a5568',
      marginBottom: '20px',
      lineHeight: '1.5',
      padding: '20px',
      background: '#fff5f5',
      borderRadius: '8px',
      border: '1px solid #feb2b2'
    }
  };

  const handleMouseEnter = (e) => {
    e.target.style.transform = 'translateY(-2px)';
    if (e.target.classList.contains('btn-primary')) {
      e.target.style.boxShadow = '0 5px 15px rgba(16, 185, 129, 0.3)';
    } else {
      e.target.style.boxShadow = '0 5px 15px rgba(0, 0, 0, 0.1)';
    }
  };

  const handleMouseLeave = (e) => {
    e.target.style.transform = 'translateY(0)';
    e.target.style.boxShadow = 'none';
  };

  // LOADING STATE
  if (loading) {
    return (
      <div style={styles.container}>
        <style>
          {`
            @keyframes pulse {
              0% { transform: scale(1); }
              50% { transform: scale(1.05); }
              100% { transform: scale(1); }
            }
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}
        </style>
        <div style={styles.card}>
          <div style={styles.icon}>
            <div style={styles.loadingSpinner}>⏳</div>
          </div>
          <h1 style={styles.loadingTitle}>Loading...</h1>
          <p style={styles.detailText}>Please wait...</p>
        </div>
      </div>
    );
  }

  // ERROR STATE
  if (!paymentData.success) {
    return (
      <div style={styles.container}>
        <style>
          {`
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(30px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}
        </style>
        <div style={styles.card}>
          <div style={styles.icon}>
            <div style={styles.errorIcon}>✕</div>
          </div>
          
          <h1 style={styles.errorTitle}>Payment Error</h1>
          
          <div style={styles.errorMessage}>
            <p style={{ margin: 0 }}>
              {paymentData.message || 'An error occurred while processing your payment. Please try again or contact support.'}
            </p>
            {paymentData.error && (
              <p style={{ margin: '10px 0 0 0', fontSize: '14px', color: '#718096' }}>
                Error code: {paymentData.error}
              </p>
            )}
          </div>

          <div style={styles.actionButtons}>
            <button 
              onClick={handleReturnHome} 
              style={{...styles.btn, ...styles.btnPrimary}}
              onMouseEnter={handleMouseEnter}
              onMouseLeave={handleMouseLeave}
              className="btn-primary"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  // SUCCESS STATE
  return (
    <div style={styles.container}>
      <style>
        {`
          @keyframes slideUp {
            from {
              opacity: 0;
              transform: translateY(30px);
            }
            to {
              opacity: 1;
              transform: translateY(0);
            }
          }
          
          @media (max-width: 480px) {
            .pay-success-card {
              padding: 24px !important;
            }
            .action-buttons {
              flex-direction: column !important;
            }
            .btn {
              width: 100% !important;
            }
            .detail-row {
              flex-direction: column !important;
              align-items: flex-start !important;
              gap: 4px !important;
            }
          }
        `}
      </style>
      
      <div style={styles.card} className="pay-success-card">
        <div style={styles.icon}>
          <div style={styles.successCheckmark}>✓</div>
        </div>
        
        <h1 style={styles.successTitle}>Payment Successful!</h1>
        
        <div style={styles.paymentDetails}>
          <p style={styles.detailText}>
            Your payment for request <strong style={styles.highlight}>#{paymentData.requestId}</strong> was completed successfully.
          </p>
          
          {paymentData.studentName && (
            <div style={styles.detailRow}>
              <span style={styles.detailLabel}>Student:</span>
              <strong style={styles.detailValue}>{decodeURIComponent(paymentData.studentName)}</strong>
            </div>
          )}
          
          <div style={styles.detailRow}>
            <span style={styles.detailLabel}>Amount paid:</span>
            <strong style={styles.detailValue}>₱{parseFloat(paymentData.amount).toFixed(2)}</strong>
          </div>
          
          <div style={{...styles.detailRow, borderBottom: 'none'}}>
            <span style={styles.detailLabel}>Payment method:</span>
            <strong style={styles.detailValue}>{paymentData.paymentMethod}</strong>
          </div>
        </div>

        {paymentData.smsSent && (
          <div style={{...styles.statusMessage, ...styles.successStatus, marginBottom: '20px'}}>
            <span style={{ fontSize: '16px' }}>✓</span> SMS confirmation has been sent to your registered number.
          </div>
        )}

        <div style={styles.actionButtons} className="action-buttons">
          <button 
            onClick={handleViewDashboard} 
            style={{...styles.btn, ...styles.btnPrimary}}
            className="btn btn-primary"
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            View Dashboard
          </button>
        </div>

        {paymentData.isDuplicate && (
          <div style={{...styles.statusMessage, ...styles.warningStatus}}>
            ⚠️ Note: This payment was already processed previously.
          </div>
        )}
      </div>
    </div>
  );
};

export default Pay_Success;