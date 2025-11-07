import { useState, useEffect } from 'react';

// API Configuration - Updated to Hostinger
const API_BASE_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend';

// Custom hook for document request system
export const useDocumentRequest = () => {
  const [studentData, setStudentData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize on mount
  useEffect(() => {
    // CRITICAL: Hide modal immediately on mount before anything else
    const modal = document.getElementById('documentModal');
    if (modal) {
      modal.style.display = 'none';
    }

    initDocumentRequestSystem();
    loadStudentData();

    // Cleanup function to remove event listeners
    return () => {
      cleanupEventListeners();
    };
  }, []);

  // Clean up all event listeners
  const cleanupEventListeners = () => {
    const form = document.getElementById('documentRequestForm');
    if (form) {
      const newForm = form.cloneNode(true);
      form.parentNode.replaceChild(newForm, form);
    }
  };

  // Load student data from database
  const loadStudentData = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/student_data.php?action=getStudentData&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('Student data loaded:', result);

      if (result.status === 'success' && result.data) {
        setStudentData(result.data);
        window.studentData = result.data;
        updatePageDisplays(result.data);
      } else {
        console.error('Failed to load student data:', result.message, result.debug);
      }
    } catch (error) {
      console.error('Error loading student data:', error);
    }
  };

  const updatePageDisplays = (data) => {
    if (!data) return;

    // Update sidebar student name
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) {
      studentNameEl.textContent = data.full_name;
    }

    // Update welcome name
    const welcomeNameEl = document.getElementById('welcomeName');
    if (welcomeNameEl) {
      welcomeNameEl.textContent = data.first_name;
    }

    // Update account page
    const accountNameEl = document.getElementById('accountName');
    if (accountNameEl) {
      accountNameEl.textContent = data.full_name;
    }

    const studentNoEl = document.querySelector('.student-no');
    if (studentNoEl) {
      studentNoEl.textContent = `Student No: ${data.student_id}`;
    }

    // Update account form fields
    const addressField = document.getElementById('address');
    if (addressField && data.address) {
      addressField.value = data.address;
    }

    const contactField = document.getElementById('contact');
    if (contactField && data.contact_no) {
      contactField.value = data.contact_no;
    }

    const emailField = document.getElementById('email');
    if (emailField && data.email) {
      emailField.value = data.email;
    }

    const gradeField = document.getElementById('grade');
    if (gradeField) {
      const gradeDisplay = data.grade_display || data.grade_level;
      gradeField.value = `${gradeDisplay} - ${data.section}`;
    }
  };

  const populateModalForm = () => {
    if (!window.studentData) return;

    const fieldMapping = {
      'studentNumber': window.studentData.student_id,
      'emailField': window.studentData.email,
      'contactNo': window.studentData.contact_no,
      'surname': window.studentData.last_name,
      'firstname': window.studentData.first_name,
      'middlename': window.studentData.middle_name,
      'gradeField': window.studentData.grade_display || window.studentData.grade_level,
      'section': window.studentData.section
    };

    // Populate and lock all student fields
    Object.entries(fieldMapping).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = value || '';
        element.readOnly = true;
        element.style.backgroundColor = '#f5f5f5';
        element.style.cursor = 'not-allowed';
      }
    });

    // Lock the date field and set to today
    const dateField = document.getElementById('date');
    if (dateField) {
      const today = new Date().toISOString().split('T')[0];
      dateField.value = today;
      dateField.readOnly = true;
      dateField.style.backgroundColor = '#f5f5f5';
      dateField.style.cursor = 'not-allowed';
    }

    console.log('Modal form populated and locked');
  };

  const initDocumentRequestSystem = () => {
    setTodayDate();
    setupModal();
    setupDocumentHandlers();
    setupFormHandler();
    setupNavigation();
    setupMobileMenu();
  };

  const setTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('date');
    if (dateField) dateField.value = today;
  };

  const resetForm = () => {
    const form = document.getElementById('documentRequestForm');
    if (form) form.reset();

    document.querySelectorAll('.document-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.dropdown-controls select').forEach(sel => sel.selectedIndex = 0);

    const totalEl = document.getElementById('totalAmount');
    if (totalEl) totalEl.textContent = '₱ 0.00';

    setTodayDate();

    // Re-populate student data after reset
    if (window.studentData) {
      populateModalForm();
    }
  };

  const setupModal = () => {
    const modal = document.getElementById('documentModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    if (!modal || !openBtn || !closeBtn) return;

    // CRITICAL: Ensure modal is hidden initially
    modal.style.display = 'none';

    // Remove existing listeners first
    const newOpenBtn = openBtn.cloneNode(true);
    openBtn.parentNode.replaceChild(newOpenBtn, openBtn);

    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    newOpenBtn.addEventListener('click', () => {
      modal.style.display = 'flex';
      // Populate form when modal opens
      setTimeout(() => {
        if (window.studentData) {
          populateModalForm();
        }
      }, 50);
    });
    
    newCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { if (e.target === modal) closeModal(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
  };

  const closeModal = () => {
    const modal = document.getElementById('documentModal');
    if (!modal) return;
    modal.style.display = 'none';
    resetForm();
  };

  const setupDocumentHandlers = () => {
    console.log('=== SETTING UP DOCUMENT HANDLERS ===');
    
    // Method 1: Event delegation on modal (most reliable)
    const modal = document.getElementById('documentModal');
    if (modal) {
      // Remove old listener if exists
      modal.removeEventListener('change', handleCheckboxChange);
      // Add new listener
      modal.addEventListener('change', handleCheckboxChange);
      console.log('✓ Event delegation listener added to modal');
    }

    // Method 2: Direct listeners on each checkbox (backup)
    const checkboxes = document.querySelectorAll('.document-checkbox');
    console.log(`Found ${checkboxes.length} checkboxes`);
    
    checkboxes.forEach((cb, index) => {
      // Clone to remove old listeners
      const newCb = cb.cloneNode(true);
      cb.parentNode.replaceChild(newCb, cb);
      
      // Add new listener
      newCb.addEventListener('change', (e) => {
        console.log(`Direct listener - Checkbox ${index + 1} (${e.target.id}) changed:`, e.target.checked);
        updateTotal();
      });
    });
    
    console.log('✓ Direct listeners added to all checkboxes');
    
    // Initial total calculation
    updateTotal();
  };

  // Separated handler function for event delegation
  const handleCheckboxChange = (e) => {
    if (e.target.classList.contains('document-checkbox')) {
      console.log('Event delegation - Checkbox changed:', e.target.id, 'Checked:', e.target.checked);
      updateTotal();
    }
  };

  const updateTotal = () => {
    let total = 0;
    const checkboxes = document.querySelectorAll('.document-checkbox:checked');
    
    console.log('=== UPDATING TOTAL ===');
    console.log('Checked checkboxes found:', checkboxes.length);
    
    checkboxes.forEach((cb, index) => {
      const price = parseFloat(cb.dataset.price || 0);
      console.log(`${index + 1}. Checkbox ID: ${cb.id}, data-price: ${cb.dataset.price}, Parsed: ${price}`);
      total += price;
    });
    
    console.log('Total calculated:', total);
    
    const totalEl = document.getElementById('totalAmount');
    if (totalEl) {
      totalEl.textContent = '₱ ' + total.toFixed(2);
      console.log('✓ Total display updated to:', totalEl.textContent);
    } else {
      console.error('❌ Total element (#totalAmount) not found!');
    }
  };

  const setupFormHandler = () => {
    const form = document.getElementById('documentRequestForm');
    if (!form) return;

    // Remove any existing listeners first by cloning the form
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add the single event listener to the new form
    newForm.addEventListener('submit', handleFormSubmit);
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    // DOUBLE SUBMISSION PREVENTION - Check if already submitting
    if (isSubmitting) {
      console.log('⚠️ Submission already in progress, skipping duplicate request...');
      return;
    }

    if (!validateForm()) return;

    const formData = collectFormData();
    await submitForm(formData);
  };

  const validateForm = () => {
    if (!document.querySelector('.document-checkbox:checked')) {
      alert('Please select at least one document.');
      return false;
    }

    const required = ['studentNumber', 'emailField', 'contactNo', 'surname', 'firstname', 'gradeField', 'section'];
    for (let id of required) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        alert('Please fill in all required fields.');
        el?.focus();
        return false;
      }
    }

    if (!document.querySelector('input[name="payment"]:checked')) {
      alert('Please select a payment method.');
      return false;
    }

    return true;
  };

  const collectFormData = () => {
    const student = {};
    const fieldMapping = {
      'studentNumber': 'studentNumber',
      'emailField': 'email',
      'contactNo': 'contactNo',
      'surname': 'surname',
      'firstname': 'firstname',
      'middlename': 'middlename',
      'gradeField': 'grade',
      'section': 'section',
      'date': 'date'
    };

    Object.entries(fieldMapping).forEach(([elementId, dbField]) => {
      const el = document.getElementById(elementId);
      student[dbField] = el?.value || '';
    });

    const selectedDocs = [];
    document.querySelectorAll('.document-checkbox:checked').forEach(cb => {
      const documentId = cb.dataset.id;

      if (!documentId) {
        console.error('Missing data-id for checkbox:', cb.id);
        return;
      }

      selectedDocs.push({
        id: parseInt(documentId),
        document: cb.nextElementSibling?.textContent || '',
        quantity: 1,
        price: parseFloat(cb.dataset.price || 0),
        assessment: document.getElementById(cb.id + '-assessment')?.value || '',
        semester: document.getElementById(cb.id + '-semester')?.value || ''
      });
    });

    const payment = document.querySelector('input[name="payment"]:checked')?.value || '';
    const total = selectedDocs.reduce((sum, d) => sum + d.price * d.quantity, 0);

    const formData = {
      studentInfo: student,
      selectedDocs: selectedDocs,
      paymentMethod: payment,
      total: total,
      submissionDate: new Date().toISOString()
    };

    console.log('Collected form data:', JSON.stringify(formData, null, 2));
    return formData;
  };

  const submitForm = async (data) => {
    const btn = document.querySelector('.submit-btn');
    if (!btn) return;

    // Set submitting state to prevent duplicates
    setIsSubmitting(true);
    const orig = btn.textContent;
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    try {
      console.log('Submitting data:', JSON.stringify(data, null, 2));

      const res = await fetch(`${API_BASE_URL}/document_request.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      console.log('Response status:', res.status);
      console.log('Response ok:', res.ok);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      console.log('Raw server response:', text);

      if (!text || text.trim().length === 0) {
        throw new Error('Server returned empty response');
      }

      const trimmed = text.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        throw new Error('Server returned non-JSON response: ' + trimmed.substring(0, 200));
      }

      let json;
      try {
        json = JSON.parse(text);
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      console.log('Parsed response:', json);

      if (json.success) {
        const grandTotal = parseFloat(json.grand_total) || 0;
        const totalDisplay = json.grand_total ? `\nTotal: ₱${grandTotal.toFixed(2)}` : '';

        if (json.payment_redirect && json.checkout_url) {
          const paymentMethodName = json.payment_method === 'gcash' ? 'GCash' :
            json.payment_method === 'maya' ? 'Maya' : 'Payment';

          const paymentData = {
            session_id: json.paymongo_session_id,
            student_name: json.student_name,
            amount: grandTotal.toFixed(2),
            payment_method: paymentMethodName,
            timestamp: Date.now()
          };

          localStorage.setItem('pending_payment', JSON.stringify(paymentData));
          
          console.log('✓ Payment data stored in localStorage:', paymentData);

          alert(`✅ ${json.message}${totalDisplay}\n\nRedirecting to ${paymentMethodName} payment...`);

          setTimeout(() => {
            console.log('Redirecting to:', json.checkout_url);
            window.location.href = json.checkout_url;
          }, 1500);
        } else {
          // CASH PAYMENT
          alert(`✅ ${json.message}${totalDisplay}`);
          closeModal();
          
          if (json.request_id) {
            setTimeout(() => {
              window.location.href = `/Pay_Success?success=1&request_id=${json.request_id}&amount=${grandTotal.toFixed(2)}&payment_method=Cash&student_name=${encodeURIComponent(json.student_name || '')}`;
            }, 1000);
          }
        }
      } else {
        alert(`❌ ${json.message || 'Unknown error occurred'}`);
      }

    } catch (err) {
      console.error('Submit error:', err);
      alert('⚠️ Server error: ' + err.message);
    } finally {
      setIsSubmitting(false);
      btn.textContent = orig;
      btn.disabled = false;
    }
  };

  const setupNavigation = () => {
    document.querySelectorAll('.nav-link').forEach(link => {
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);
    });

    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(link.dataset.page);
        target?.classList.add('active');
      });
    });
  };

  const setupMobileMenu = () => {
    const menu = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    if (!menu || !sidebar) return;

    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);

    newMenu.addEventListener('click', () => sidebar.classList.toggle('mobile-open'));
  };

  return {
    studentData,
    loadStudentData
  };
};

export default useDocumentRequest;
