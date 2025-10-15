import React, { useState } from 'react';
import './Cash_Payment.css'; // Optional CSS file

const Cash_Payment = () => {
  const [formData, setFormData] = useState({
    studentInfo: {
      studentNumber: '',
      email: '',
      contactNo: '',
      surname: '',
      firstname: '',
      middlename: '',
      grade: '',
      section: ''
    },
    selectedDocs: [],
    paymentMethod: 'cash'
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState(null);

  // Handle input changes for student info
  const handleStudentInfoChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      studentInfo: {
        ...prev.studentInfo,
        [field]: value
      }
    }));
  };

  // Handle document selection
  const handleDocumentSelect = (documentId, documentName, price) => {
    setFormData(prev => {
      const existingDocIndex = prev.selectedDocs.findIndex(doc => doc.id === documentId);
      
      if (existingDocIndex > -1) {
        // Remove document if already selected
        const updatedDocs = prev.selectedDocs.filter(doc => doc.id !== documentId);
        return {
          ...prev,
          selectedDocs: updatedDocs
        };
      } else {
        // Add document
        return {
          ...prev,
          selectedDocs: [
            ...prev.selectedDocs,
            {
              id: documentId,
              name: documentName,
              price: price,
              quantity: 1
            }
          ]
        };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (!formData.studentInfo.studentNumber || !formData.studentInfo.email || !formData.studentInfo.contactNo) {
      alert('Please fill in all required fields');
      return;
    }

    if (formData.selectedDocs.length === 0) {
      alert('Please select at least one document');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch('http://localhost/capstone_project/public/php-backend/submit_request.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
        credentials: 'include'
      });

      const data = await response.json();

      if (data.success) {
        setResult({
          type: 'success',
          message: data.message,
          requestId: data.request_id,
          smsSent: data.sms_sent,
          grandTotal: data.grand_total
        });

        // Show success message with SMS status
        if (data.sms_sent) {
          alert(`✅ Request submitted successfully!\nRequest ID: ${data.request_id}\nSMS sent to your phone number.`);
        } else {
          alert(`✅ Request submitted successfully!\nRequest ID: ${data.request_id}\n(SMS notification was not sent)`);
        }

        // Reset form on success
        setFormData({
          studentInfo: {
            studentNumber: '',
            email: '',
            contactNo: '',
            surname: '',
            firstname: '',
            middlename: '',
            grade: '',
            section: ''
          },
          selectedDocs: [],
          paymentMethod: 'cash'
        });
      } else {
        setResult({
          type: 'error',
          message: data.message
        });
        alert(`❌ Error: ${data.message}`);
      }
    } catch (error) {
      console.error('Submission error:', error);
      setResult({
        type: 'error',
        message: 'Network error. Please try again.'
      });
      alert('❌ Network error. Please check your connection and try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Calculate total amount
  const totalAmount = formData.selectedDocs.reduce((total, doc) => total + (doc.price * doc.quantity), 0);

  // Available documents
  const availableDocuments = [
    { id: 1, name: 'Copy of Grades (Form 138)', price: 50 },
    { id: 2, name: 'Diploma', price: 100 },
    { id: 3, name: 'Certificate of Enrollment (COE)', price: 100 },
    { id: 4, name: 'Form 137', price: 150 },
    { id: 5, name: 'Good Moral Certificate', price: 50 }
  ];

  return (
    <div className="cash-payment-container">
      <div className="cash-payment-header">
        <h2>📄 Document Request - Cash Payment</h2>
        <p>Fill out the form below to request documents. You'll pay with cash at the registrar's office.</p>
      </div>

      <form onSubmit={handleSubmit} className="cash-payment-form">
        {/* Student Information */}
        <div className="form-section">
          <h3>👤 Student Information</h3>
          <div className="form-row">
            <div className="form-group">
              <label>Student Number *</label>
              <input
                type="text"
                value={formData.studentInfo.studentNumber}
                onChange={(e) => handleStudentInfoChange('studentNumber', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Email *</label>
              <input
                type="email"
                value={formData.studentInfo.email}
                onChange={(e) => handleStudentInfoChange('email', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Contact Number *</label>
              <input
                type="tel"
                value={formData.studentInfo.contactNo}
                onChange={(e) => handleStudentInfoChange('contactNo', e.target.value)}
                placeholder="09XXXXXXXXX"
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Surname *</label>
              <input
                type="text"
                value={formData.studentInfo.surname}
                onChange={(e) => handleStudentInfoChange('surname', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>First Name *</label>
              <input
                type="text"
                value={formData.studentInfo.firstname}
                onChange={(e) => handleStudentInfoChange('firstname', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Middle Name</label>
              <input
                type="text"
                value={formData.studentInfo.middlename}
                onChange={(e) => handleStudentInfoChange('middlename', e.target.value)}
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Grade Level *</label>
              <input
                type="text"
                value={formData.studentInfo.grade}
                onChange={(e) => handleStudentInfoChange('grade', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Section *</label>
              <input
                type="text"
                value={formData.studentInfo.section}
                onChange={(e) => handleStudentInfoChange('section', e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {/* Document Selection */}
        <div className="form-section">
          <h3>📋 Select Documents</h3>
          <div className="documents-grid">
            {availableDocuments.map(doc => (
              <div
                key={doc.id}
                className={`document-card ${
                  formData.selectedDocs.some(selected => selected.id === doc.id) ? 'selected' : ''
                }`}
                onClick={() => handleDocumentSelect(doc.id, doc.name, doc.price)}
              >
                <div className="document-info">
                  <h4>{doc.name}</h4>
                  <p className="document-price">₱{doc.price}.00</p>
                </div>
                <div className="document-check">
                  {formData.selectedDocs.some(selected => selected.id === doc.id) ? '✓' : '+'}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Payment Summary */}
        <div className="form-section">
          <h3>💰 Payment Summary</h3>
          <div className="payment-summary">
            <div className="selected-documents">
              <h4>Selected Documents:</h4>
              {formData.selectedDocs.length === 0 ? (
                <p>No documents selected</p>
              ) : (
                formData.selectedDocs.map(doc => (
                  <div key={doc.id} className="selected-doc">
                    <span>{doc.name}</span>
                    <span>₱{doc.price}.00</span>
                  </div>
                ))
              )}
            </div>
            <div className="total-amount">
              <strong>Total Amount: ₱{totalAmount}.00</strong>
            </div>
            <div className="payment-note">
              <p>💡 <strong>Payment Method:</strong> Cash</p>
              <p>You will pay the amount at the registrar's office when you pick up your documents.</p>
            </div>
          </div>
        </div>

        {/* Submit Button */}
        <div className="form-actions">
          <button 
            type="submit" 
            disabled={isSubmitting || formData.selectedDocs.length === 0}
            className="submit-btn"
          >
            {isSubmitting ? '🔄 Submitting...' : '📤 Submit Cash Payment Request'}
          </button>
        </div>
      </form>

      {/* Result Message */}
      {result && (
        <div className={`result-message ${result.type}`}>
          <h3>{result.type === 'success' ? '✅ Success' : '❌ Error'}</h3>
          <p>{result.message}</p>
          {result.requestId && (
            <p><strong>Request ID:</strong> {result.requestId}</p>
          )}
          {result.smsSent !== undefined && (
            <p><strong>SMS Status:</strong> {result.smsSent ? '✅ Sent to your phone' : '❌ Not Sent'}</p>
          )}
          {result.grandTotal && (
            <p><strong>Total Amount:</strong> ₱{result.grandTotal}.00</p>
          )}
        </div>
      )}
    </div>
  );
};

export default Cash_Payment;