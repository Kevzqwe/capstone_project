import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Pay_Cancelled = () => {
  const navigate = useNavigate();

  useEffect(() => {
    console.log('Pay_Cancelled component loaded');
    // Optional: Log to confirm the page was reached
    document.title = 'Payment Cancelled - Document Request System';
  }, []);

  const handleRetryPayment = () => {
    navigate('/student-dashboard');
  };

  const handleContactSupport = () => {
    // You can update this with your actual support link or email
    window.location.href = 'mailto:support@yourdomain.com';
  };

  const styles = {
    container: {
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
      padding: '20px',
      fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif'
    },
    card: {
      background: 'white',
      borderRadius: '20px',
      padding: '40px',
      boxShadow: '0 20px 40px rgba(0, 0, 0, 0.1)',
      textAlign: 'center',
      maxWidth: '500px',
      width: '100%',
      animation: 'slideUp 0.5s ease-out'
    },
    icon: {
      width: '80px',
      height: '80px',
      borderRadius: '50%',
      background: '#ef4444',
      color: 'white',
      fontSize: '48px',
      fontWeight: 'bold',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 24px',
      boxShadow: '0 10px 20px rgba(239, 68, 68, 0.3)',
      lineHeight: '1'
    },
    title: {
      color: '#ef4444',
      fontSize: '32px',
      fontWeight: '700',
      marginBottom: '16px',
      lineHeight: '1.2'
    },
    subtitle: {
      color: '#6b7280',
      fontSize: '18px',
      fontWeight: '500',
      marginBottom: '24px'
    },
    message: {
      color: '#4a5568',
      fontSize: '16px',
      lineHeight: '1.6',
      marginBottom: '20px'
    },
    infoBox: {
      background: '#fef2f2',
      border: '2px solid #fecaca',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '24px',
      color: '#7f1d1d',
      fontSize: '14px',
      lineHeight: '1.5'
    },
    infoIcon: {
      marginRight: '8px',
      fontSize: '16px'
    },
    buttons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      marginTop: '28px',
      flexWrap: 'wrap'
    },
    btn: {
      padding: '12px 28px',
      border: '2px solid #ef4444',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      minWidth: '160px',
      textDecoration: 'none',
      display: 'inline-block',
      outline: 'none'
    },
    btnPrimary: {
      background: '#ef4444',
      color: 'white'
    },
    btnSecondary: {
      background: 'transparent',
      color: '#ef4444'
    }
  };

  const handleMouseEnter = (e, isPrimary) => {
    if (isPrimary) {
      e.target.style.background = '#dc2626';
      e.target.style.borderColor = '#dc2626';
      e.target.style.boxShadow = '0 5px 15px rgba(239, 68, 68, 0.3)';
    } else {
      e.target.style.background = '#fef2f2';
      e.target.style.boxShadow = '0 5px 15px rgba(239, 68, 68, 0.2)';
    }
    e.target.style.transform = 'translateY(-2px)';
  };

  const handleMouseLeave = (e, isPrimary) => {
    if (isPrimary) {
      e.target.style.background = '#ef4444';
      e.target.style.borderColor = '#ef4444';
    } else {
      e.target.style.background = 'transparent';
    }
    e.target.style.transform = 'translateY(0)';
    e.target.style.boxShadow = 'none';
  };

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
            .pay-cancelled-card {
              padding: 24px !important;
            }
            .pay-cancelled-title {
              font-size: 24px !important;
            }
            .pay-cancelled-buttons {
              flex-direction: column !important;
            }
            .pay-cancelled-btn {
              width: 100% !important;
            }
          }
        `}
      </style>

      <div style={styles.card} className="pay-cancelled-card">
        <div style={styles.icon}>❌</div>

        <h1 style={styles.title} className="pay-cancelled-title">
          Payment Cancelled
        </h1>

        <p style={styles.subtitle}>
          Your payment request has been cancelled
        </p>

        <p style={styles.message}>
          You have cancelled your payment transaction. Don't worry, no charges have been made to your account.
        </p>

        <div style={styles.infoBox}>
          <span style={styles.infoIcon}>ℹ️</span>
          <span>No charges have been made to your account.</span>
        </div>

        <p style={styles.message}>
          You can start a new document request anytime. If you need any assistance, feel free to contact our support team.
        </p>

        <div style={styles.buttons} className="pay-cancelled-buttons">
          <button
            onClick={handleRetryPayment}
            style={{ ...styles.btn, ...styles.btnPrimary }}
            className="pay-cancelled-btn"
            onMouseEnter={(e) => handleMouseEnter(e, true)}
            onMouseLeave={(e) => handleMouseLeave(e, true)}
          >
            Return to Dashboard
          </button>
          <button
            onClick={handleContactSupport}
            style={{ ...styles.btn, ...styles.btnSecondary }}
            className="pay-cancelled-btn"
            onMouseEnter={(e) => handleMouseEnter(e, false)}
            onMouseLeave={(e) => handleMouseLeave(e, false)}
          >
            Contact Support
          </button>
        </div>
      </div>
    </div>
  );
};

export default Pay_Cancelled;