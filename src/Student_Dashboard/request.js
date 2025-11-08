import { useState, useEffect } from 'react';

// API Configuration - Updated to Hostinger
const API_BASE_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend';

// Custom hook for document request system
export const useDocumentRequest = () => {
  const [studentData, setStudentData] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize on mount
  useEffect(() => {
    console.log('🚀 useDocumentRequest hook mounted');
    
    // CRITICAL: Hide modal immediately on mount before anything else
    const modal = document.getElementById('documentModal');
    if (modal) {
      modal.style.display = 'none';
      console.log('✓ Modal hidden on mount');
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
    console.log('📡 Loading student data...');
    
    try {
      const response = await fetch(`${API_BASE_URL}/student_data.php?action=getStudentData&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include'
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const result = await response.json();
      console.log('📥 Raw API Response:', result);

      if (result.status === 'success' && result.data) {
        console.log('✅ API returned success with data');
        console.log('Raw data fields:', Object.keys(result.data));
        
        // ✅ FIX: Normalize the data to handle both uppercase and lowercase field names
        const normalizedData = {
          // Student ID - handle both formats
          student_id: result.data.Student_ID || result.data.student_id || '',
          Student_ID: result.data.Student_ID || result.data.student_id || '',
          
          // First Name
          first_name: result.data.First_Name || result.data.first_name || '',
          First_Name: result.data.First_Name || result.data.first_name || '',
          
          // Middle Name
          middle_name: result.data.Middle_Name || result.data.middle_name || '',
          Middle_Name: result.data.Middle_Name || result.data.middle_name || '',
          
          // Last Name
          last_name: result.data.Last_Name || result.data.last_name || '',
          Last_Name: result.data.Last_Name || result.data.last_name || '',
          
          // Full Name - construct if not provided
          full_name: result.data.full_name || 
                     `${result.data.First_Name || result.data.first_name || ''} ${result.data.Middle_Name || result.data.middle_name || ''} ${result.data.Last_Name || result.data.last_name || ''}`.replace(/\s+/g, ' ').trim(),
          
          // Email
          email: result.data.Email || result.data.email || '',
          Email: result.data.Email || result.data.email || '',
          
          // Contact Number
          contact_no: result.data.Contact_No || result.data.contact_no || '',
          Contact_No: result.data.Contact_No || result.data.contact_no || '',
          
          // Address
          address: result.data.Address || result.data.address || '',
          Address: result.data.Address || result.data.address || '',
          
          // Grade Level
          grade_level: result.data.Grade_level || result.data.grade_level || '',
          Grade_level: result.data.Grade_level || result.data.grade_level || '',
          
          // Grade Display
          grade_display: result.data.grade_display || 
                        `Grade ${result.data.Grade_level || result.data.grade_level || ''}`,
          
          // Section
          section: result.data.Section || result.data.section || '',
          Section: result.data.Section || result.data.section || '',
          
          // School Year
          School_Year: result.data.School_Year || result.data.school_year || '',
          school_year: result.data.School_Year || result.data.school_year || '',
          
          // Active Status
          is_Active: result.data.is_Active || result.data.is_active || 1,
          is_active: result.data.is_Active || result.data.is_active || 1,
          
          // Timestamps
          Created_At: result.data.Created_At || result.data.created_at || '',
          Updated_At: result.data.Updated_At || result.data.updated_at || ''
        };

        console.log('🔄 Normalized student data:', normalizedData);
        console.log('📋 Key values:');
        console.log('  - Student ID:', normalizedData.student_id);
        console.log('  - Full Name:', normalizedData.full_name);
        console.log('  - Email:', normalizedData.email);
        console.log('  - Contact:', normalizedData.contact_no);
        console.log('  - Grade:', normalizedData.grade_display);
        console.log('  - Section:', normalizedData.section);
        
        setStudentData(normalizedData);
        window.studentData = normalizedData;
        
        // Update page displays
        updatePageDisplays(normalizedData);
        
        console.log('✅ Student data loaded and stored successfully');
      } else {
        console.error('❌ Failed to load student data:', result.message);
        alert('Failed to load student data. Please refresh the page.');
      }
    } catch (error) {
      console.error('❌ Error loading student data:', error);
      alert('Error connecting to server. Please check your connection and try again.');
    }
  };

  const updatePageDisplays = (data) => {
    if (!data) {
      console.warn('⚠️ No data provided to updatePageDisplays');
      return;
    }

    console.log('🖼️ Updating page displays...');

    // Update sidebar student name
    const studentNameEl = document.getElementById('studentName');
    if (studentNameEl) {
      studentNameEl.textContent = data.full_name;
      console.log('✓ Updated sidebar name:', data.full_name);
    }

    // Update welcome name
    const welcomeNameEl = document.getElementById('welcomeName');
    if (welcomeNameEl) {
      welcomeNameEl.textContent = data.first_name || data.First_Name;
      console.log('✓ Updated welcome name:', data.first_name || data.First_Name);
    }

    // Update account page
    const accountNameEl = document.getElementById('accountName');
    if (accountNameEl) {
      accountNameEl.textContent = data.full_name;
      console.log('✓ Updated account name:', data.full_name);
    }

    const studentNoEl = document.querySelector('.student-no');
    if (studentNoEl) {
      studentNoEl.textContent = `Student No: ${data.student_id || data.Student_ID || 'undefined'}`;
      console.log('✓ Updated student number');
    }

    // Update account form fields
    const addressField = document.getElementById('address');
    if (addressField) {
      addressField.value = data.address || data.Address || '';
      console.log('✓ Updated address field');
    }

    const contactField = document.getElementById('contact');
    if (contactField) {
      contactField.value = data.contact_no || data.Contact_No || '';
      console.log('✓ Updated contact field');
    }

    const emailField = document.getElementById('email');
    if (emailField) {
      emailField.value = data.email || data.Email || '';
      console.log('✓ Updated email field');
    }

    const gradeField = document.getElementById('grade');
    if (gradeField) {
      const gradeDisplay = data.grade_display || `Grade ${data.grade_level || data.Grade_level}`;
      const section = data.section || data.Section || '';
      gradeField.value = section ? `${gradeDisplay} - ${section}` : gradeDisplay;
      console.log('✓ Updated grade field:', gradeField.value);
    }

    console.log('✅ Page displays updated');
  };

  const populateModalForm = () => {
    if (!window.studentData) {
      console.error('❌ No student data available to populate modal form');
      alert('Student data not loaded. Please refresh the page.');
      return;
    }

    console.log('═══════════════════════════════════');
    console.log('📝 POPULATING MODAL FORM');
    console.log('═══════════════════════════════════');
    console.log('Using student data:', window.studentData);

    // ✅ FIX: Updated field mapping to handle both uppercase and lowercase
    const fieldMapping = {
      'studentNumber': window.studentData.student_id || window.studentData.Student_ID || '',
      'emailField': window.studentData.email || window.studentData.Email || '',
      'contactNo': window.studentData.contact_no || window.studentData.Contact_No || '',
      'surname': window.studentData.last_name || window.studentData.Last_Name || '',
      'firstname': window.studentData.first_name || window.studentData.First_Name || '',
      'middlename': window.studentData.middle_name || window.studentData.Middle_Name || '',
      'gradeField': window.studentData.grade_display || `Grade ${window.studentData.grade_level || window.studentData.Grade_level || ''}`,
      'section': window.studentData.section || window.studentData.Section || ''
    };

    console.log('📋 Field mapping prepared:');
    Object.entries(fieldMapping).forEach(([key, value]) => {
      console.log(`  ${key}: "${value}"`);
    });

    // Populate and lock all student fields
    let successCount = 0;
    let failCount = 0;

    Object.entries(fieldMapping).forEach(([fieldId, value]) => {
      const element = document.getElementById(fieldId);
      if (element) {
        element.value = value || '';
        element.readOnly = true;
        element.style.backgroundColor = '#f5f5f5';
        element.style.cursor = 'not-allowed';
        console.log(`  ✓ ${fieldId}: "${value}"`);
        successCount++;
      } else {
        console.error(`  ❌ Element not found: ${fieldId}`);
        failCount++;
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
      console.log(`  ✓ date: "${today}"`);
      successCount++;
    } else {
      console.error('  ❌ Date field not found');
      failCount++;
    }

    console.log('═══════════════════════════════════');
    console.log(`✅ Modal populated: ${successCount} fields successful, ${failCount} failed`);
    console.log('═══════════════════════════════════');
  };

  const initDocumentRequestSystem = () => {
    console.log('⚙️ Initializing document request system...');
    setTodayDate();
    setupModal();
    setupDocumentHandlers();
    setupFormHandler();
    setupNavigation();
    setupMobileMenu();
    console.log('✅ Document request system initialized');
  };

  const setTodayDate = () => {
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById('date');
    if (dateField) {
      dateField.value = today;
      console.log('✓ Set today\'s date:', today);
    }
  };

  const resetForm = () => {
    console.log('🔄 Resetting form...');
    
    const form = document.getElementById('documentRequestForm');
    if (form) form.reset();

    document.querySelectorAll('.document-checkbox').forEach(cb => cb.checked = false);
    document.querySelectorAll('.dropdown-controls select').forEach(sel => sel.selectedIndex = 0);

    const totalEl = document.getElementById('totalAmount');
    if (totalEl) totalEl.textContent = '₱ 0.00';

    setTodayDate();

    // Re-populate student data after reset
    if (window.studentData) {
      console.log('Re-populating form after reset...');
      setTimeout(() => populateModalForm(), 100);
    }
    
    console.log('✓ Form reset complete');
  };

  const setupModal = () => {
    const modal = document.getElementById('documentModal');
    const openBtn = document.getElementById('openModalBtn');
    const closeBtn = document.getElementById('closeModalBtn');
    
    if (!modal) {
      console.error('❌ Modal element not found');
      return;
    }
    if (!openBtn) {
      console.error('❌ Open button not found');
      return;
    }
    if (!closeBtn) {
      console.error('❌ Close button not found');
      return;
    }

    console.log('🎭 Setting up modal...');

    // CRITICAL: Ensure modal is hidden initially
    modal.style.display = 'none';

    // Remove existing listeners first by cloning
    const newOpenBtn = openBtn.cloneNode(true);
    openBtn.parentNode.replaceChild(newOpenBtn, openBtn);

    const newCloseBtn = closeBtn.cloneNode(true);
    closeBtn.parentNode.replaceChild(newCloseBtn, closeBtn);

    // Add open modal event
    newOpenBtn.addEventListener('click', () => {
      console.log('🔓 Opening modal...');
      modal.style.display = 'flex';
      
      // ✅ FIX: Populate form when modal opens with a slight delay
      setTimeout(() => {
        if (window.studentData) {
          console.log('Student data available, populating form...');
          populateModalForm();
        } else {
          console.error('❌ Student data not loaded yet - cannot populate form');
          alert('Loading student data... Please try again in a moment.');
        }
      }, 100);
    });
    
    // Add close modal events
    newCloseBtn.addEventListener('click', closeModal);
    modal.addEventListener('click', e => { 
      if (e.target === modal) {
        console.log('Clicked outside modal, closing...');
        closeModal();
      }
    });
    
    document.addEventListener('keydown', e => { 
      if (e.key === 'Escape' && modal.style.display === 'flex') {
        console.log('ESC pressed, closing modal...');
        closeModal();
      }
    });
    
    console.log('✓ Modal setup complete');
  };

  const closeModal = () => {
    console.log('🔒 Closing modal...');
    const modal = document.getElementById('documentModal');
    if (!modal) return;
    modal.style.display = 'none';
    resetForm();
    console.log('✓ Modal closed');
  };

  const setupDocumentHandlers = () => {
    console.log('📄 Setting up document handlers...');
    
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
        console.log(`Checkbox ${index + 1} (${e.target.id}) changed:`, e.target.checked);
        updateTotal();
      });
    });
    
    console.log('✓ Document handlers setup complete');
    
    // Initial total calculation
    updateTotal();
  };

  // Separated handler function for event delegation
  const handleCheckboxChange = (e) => {
    if (e.target.classList.contains('document-checkbox')) {
      console.log('Checkbox changed via delegation:', e.target.id, 'Checked:', e.target.checked);
      updateTotal();
    }
  };

  const updateTotal = () => {
    let total = 0;
    const checkboxes = document.querySelectorAll('.document-checkbox:checked');
    
    console.log('💰 Updating total...');
    console.log(`Found ${checkboxes.length} checked checkbox(es)`);
    
    checkboxes.forEach((cb, index) => {
      const price = parseFloat(cb.dataset.price || 0);
      console.log(`  ${index + 1}. ${cb.id}: ₱${price}`);
      total += price;
    });
    
    console.log(`Total calculated: ₱${total.toFixed(2)}`);
    
    const totalEl = document.getElementById('totalAmount');
    if (totalEl) {
      totalEl.textContent = '₱ ' + total.toFixed(2);
      console.log('✓ Total display updated');
    } else {
      console.error('❌ Total amount element not found!');
    }
  };

  const setupFormHandler = () => {
    console.log('📋 Setting up form handler...');
    
    const form = document.getElementById('documentRequestForm');
    if (!form) {
      console.error('❌ Form not found');
      return;
    }

    // Remove any existing listeners first by cloning the form
    const newForm = form.cloneNode(true);
    form.parentNode.replaceChild(newForm, form);

    // Add the single event listener to the new form
    newForm.addEventListener('submit', handleFormSubmit);
    
    console.log('✓ Form handler setup complete');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    
    console.log('📤 Form submission triggered');
    
    // DOUBLE SUBMISSION PREVENTION
    if (isSubmitting) {
      console.log('⚠️ Already submitting, ignoring duplicate request');
      return;
    }

    if (!validateForm()) {
      console.log('❌ Form validation failed');
      return;
    }

    const formData = collectFormData();
    await submitForm(formData);
  };

  const validateForm = () => {
    console.log('🔍 Validating form...');
    
    // Check if at least one document is selected
    if (!document.querySelector('.document-checkbox:checked')) {
      alert('Please select at least one document.');
      console.log('❌ No documents selected');
      return false;
    }

    // Check required fields
    const required = ['studentNumber', 'emailField', 'contactNo', 'surname', 'firstname', 'gradeField', 'section'];
    for (let id of required) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        alert(`Please fill in all required fields. Missing: ${id}`);
        el?.focus();
        console.log(`❌ Required field missing: ${id}`);
        return false;
      }
    }

    // Check payment method
    if (!document.querySelector('input[name="payment"]:checked')) {
      alert('Please select a payment method.');
      console.log('❌ No payment method selected');
      return false;
    }

    console.log('✅ Form validation passed');
    return true;
  };

  const collectFormData = () => {
    console.log('📦 Collecting form data...');
    
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

    console.log('Student info collected:', student);

    const selectedDocs = [];
    document.querySelectorAll('.document-checkbox:checked').forEach(cb => {
      const documentId = cb.dataset.id;

      if (!documentId) {
        console.error('Missing data-id for checkbox:', cb.id);
        return;
      }

      const doc = {
        id: parseInt(documentId),
        document: cb.nextElementSibling?.textContent || '',
        quantity: 1,
        price: parseFloat(cb.dataset.price || 0),
        assessment: document.getElementById(cb.id + '-assessment')?.value || '',
        semester: document.getElementById(cb.id + '-semester')?.value || ''
      };
      
      selectedDocs.push(doc);
      console.log('Document added:', doc);
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

    console.log('📦 Complete form data:', formData);
    return formData;
  };

  const submitForm = async (data) => {
    const btn = document.querySelector('.submit-btn');
    if (!btn) {
      console.error('❌ Submit button not found');
      return;
    }

    console.log('🚀 Submitting form to server...');

    // Set submitting state to prevent duplicates
    setIsSubmitting(true);
    const originalText = btn.textContent;
    btn.textContent = 'Submitting...';
    btn.disabled = true;

    try {
      console.log('📡 Sending request to:', `${API_BASE_URL}/document_request.php`);
      console.log('📤 Request payload:', JSON.stringify(data, null, 2));

      const res = await fetch(`${API_BASE_URL}/document_request.php`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(data)
      });

      console.log('📥 Response status:', res.status);
      console.log('📥 Response OK:', res.ok);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const text = await res.text();
      console.log('📥 Raw server response:', text);

      if (!text || text.trim().length === 0) {
        throw new Error('Server returned empty response');
      }

      const trimmed = text.trim();
      if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
        console.error('❌ Non-JSON response:', trimmed.substring(0, 200));
        throw new Error('Server returned non-JSON response');
      }

      let json;
      try {
        json = JSON.parse(text);
        console.log('✅ Parsed JSON response:', json);
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        throw new Error('Invalid JSON response from server');
      }

      if (json.success) {
        console.log('✅ Request submitted successfully!');
        
        const grandTotal = parseFloat(json.grand_total) || 0;
        const totalDisplay = json.grand_total ? `\nTotal: ₱${grandTotal.toFixed(2)}` : '';

        if (json.payment_redirect && json.checkout_url) {
          // Online payment (GCash/Maya)
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
          console.log('💾 Payment data stored:', paymentData);

          alert(`✅ ${json.message}${totalDisplay}\n\nRedirecting to ${paymentMethodName} payment...`);

          setTimeout(() => {
            console.log('🔀 Redirecting to:', json.checkout_url);
            window.location.href = json.checkout_url;
          }, 1500);
        } else {
          // Cash payment
          console.log('💵 Cash payment selected');
          alert(`✅ ${json.message}${totalDisplay}`);
          closeModal();
          
          if (json.request_id) {
            setTimeout(() => {
              const successUrl = `/Pay_Success?success=1&request_id=${json.request_id}&amount=${grandTotal.toFixed(2)}&payment_method=Cash&student_name=${encodeURIComponent(json.student_name || '')}`;
              console.log('🔀 Redirecting to:', successUrl);
              window.location.href = successUrl;
            }, 1000);
          }
        }
      } else {
        console.error('❌ Server returned error:', json.message);
        alert(`❌ ${json.message || 'Unknown error occurred'}`);
      }

    } catch (err) {
      console.error('❌ Submit error:', err);
      alert('⚠️ Server error: ' + err.message);
    } finally {
      setIsSubmitting(false);
      btn.textContent = originalText;
      btn.disabled = false;
      console.log('🔓 Submit button re-enabled');
    }
  };

  const setupNavigation = () => {
    console.log('🧭 Setting up navigation...');
    
    // Clone all nav links to remove old listeners
    document.querySelectorAll('.nav-link').forEach(link => {
      const newLink = link.cloneNode(true);
      link.parentNode.replaceChild(newLink, link);
    });

    // Add new listeners
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', e => {
        e.preventDefault();
        const targetPage = link.dataset.page;
        console.log('Navigation to:', targetPage);
        
        document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
        const target = document.getElementById(targetPage);
        target?.classList.add('active');
      });
    });
    
    console.log('✓ Navigation setup complete');
  };

  const setupMobileMenu = () => {
    console.log('📱 Setting up mobile menu...');
    
    const menu = document.getElementById('menuToggle');
    const sidebar = document.getElementById('sidebar');
    
    if (!menu || !sidebar) {
      console.warn('⚠️ Mobile menu or sidebar not found');
      return;
    }

    // Clone to remove old listeners
    const newMenu = menu.cloneNode(true);
    menu.parentNode.replaceChild(newMenu, menu);

    newMenu.addEventListener('click', () => {
      sidebar.classList.toggle('mobile-open');
      console.log('Mobile menu toggled');
    });
    
    console.log('✓ Mobile menu setup complete');
  };

  return {
    studentData,
    loadStudentData
  };
};

export default useDocumentRequest;
