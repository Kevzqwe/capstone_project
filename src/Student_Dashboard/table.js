// public/js/table.js

// Helper functions
function formatDate(dateString) {
  if (!dateString) return 'N/A';
  
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return 'Invalid Date';
    
    return date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    });
  } catch (error) {
    return 'N/A';
  }
}

function getStatusClass(status) {
  if (!status) return 'status-unknown';
  const statusLower = status.toLowerCase();
  return `status-${statusLower}`;
}

function getPaymentClass(paymentMethod) {
  if (!paymentMethod) return 'payment-unknown';
  const methodLower = paymentMethod.toLowerCase();
  return `payment-${methodLower}`;
}

function formatPaymentMethod(method) {
  if (!method) return 'Unknown';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

// Normalize API data keys to handle both snake_case and PascalCase
function normalizeKeys(obj) {
  const normalized = {};
  for (const key in obj) {
    // Keep original key and add lowercase version
    normalized[key] = obj[key];
    const lowerKey = key.toLowerCase();
    if (lowerKey !== key) {
      normalized[lowerKey] = obj[key];
    }
  }
  return normalized;
}

// Prevent multiple simultaneous calls
let isLoading = false;

// Main function
export async function RequestHistoryTable() {
  console.log('🔄 RequestHistoryTable function called');

  // Prevent duplicate calls
  if (isLoading) {
    console.log('⏸️ Already loading, skipping duplicate call');
    return;
  }

  const container = document.getElementById('requestHistoryTableContainer');
  if (!container) {
    console.error('❌ Request history container not found');
    return;
  }

  isLoading = true;

  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading request history...</p>
    </div>
  `;

  try {
    const response = await fetch('https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/request_history.php?action=getRequestHistory', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    console.log('📡 Response status:', response.status);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    console.log('📊 Full API response:', result);

    // Handle authentication error
    if (result.status === 'error') {
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-lock"></i>
          <h3>Authentication Required</h3>
          <p>${result.message || 'Please log in to view your request history.'}</p>
          <a href="https://mediumaquamarine-heron-545485.hostingersite.com/index.html" class="login-btn">
            <i class="fas fa-sign-in-alt"></i> Go to Login
          </a>
        </div>
      `;
      return;
    }

    if (result.status === 'success' && result.data && result.data.length > 0) {
      console.log(`✅ Rendering ${result.data.length} document entries`);
      // Normalize all data keys
      const normalizedData = result.data.map(normalizeKeys);
      renderTable(container, normalizedData);
    } else {
      console.log('ℹ️ No data found');
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No document requests found</h3>
          <p>${result.message || 'You haven\'t made any document requests yet.'}</p>
        </div>
      `;
    }
  } catch (error) {
    console.error('💥 Error loading request history:', error);
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error loading request history</h3>
        <p>${error.message}</p>
        <button class="retry-btn" onclick="window.RequestHistoryTable()">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

// === Render Table Function ===
function renderTable(container, requests) {
  console.log('📋 Raw requests data:', requests);

  // Group requests by Request_ID to handle multiple documents per request
  const grouped = {};
  requests.forEach((r) => {
    const id = r.Request_ID || r.request_id;
    if (!grouped[id]) {
      grouped[id] = { 
        request_id: id,
        date_requested: r.Date_Requested || r.date_requested,
        status: r.Status || r.status,
        payment_method: r.Payment_Method || r.payment_method,
        documents: [],
        total_amount: 0
      };
    }
    
    // Add document details
    const subtotal = parseFloat(r.Subtotal || r.subtotal || 0);
    grouped[id].total_amount += subtotal;
    
    grouped[id].documents.push({
      document_type: r.Document_Type || r.document_type,
      quantity: r.Quantity || r.quantity,
      unit_price: r.Unit_Price || r.unit_price,
      subtotal: subtotal
    });
  });

  const uniqueRequests = Object.values(grouped);
  console.log('📦 Grouped requests:', uniqueRequests);

  container.innerHTML = `
    <div class="table-container">
      <div class="table-wrapper">
        <table class="modern-table">
          <thead>
            <tr>
              <th class="col-id">ID</th>
              <th class="col-docs">DOCUMENTS</th>
              <th class="col-date">DATE</th>
              <th class="col-status">STATUS</th>
              <th class="col-amount">AMOUNT</th>
              <th class="col-payment">PAYMENT</th>
              <th class="col-actions">ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            ${uniqueRequests.map(req => {
              // Create a summary of documents
              const docSummary = req.documents.length === 1 
                ? req.documents[0].document_type 
                : `${req.documents.length} docs`;
              
              return `
              <tr class="table-row">
                <td class="request-id">#${req.request_id}</td>
                <td class="documents-summary">
                  <div class="doc-main">${docSummary}</div>
                </td>
                <td class="date">${formatDate(req.date_requested)}</td>
                <td class="status">
                  <span class="status-badge ${getStatusClass(req.status)}">${req.status || 'Pending'}</span>
                </td>
                <td class="amount">₱${req.total_amount.toFixed(2)}</td>
                <td class="payment">
                  <span class="payment-method ${getPaymentClass(req.payment_method)}">
                    ${formatPaymentMethod(req.payment_method)}
                  </span>
                </td>
                <td class="actions">
                  <button class="view-btn" onclick="openRequestModal(${req.request_id})" 
                    data-request='${JSON.stringify(req).replace(/'/g, "&#39;")}'>
                    <i class="fas fa-eye"></i>
                    <span class="btn-text">View</span>
                  </button>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <!-- Modal Structure -->
    <div id="requestModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Request Details</h2>
          <button class="close-btn" onclick="closeRequestModal()">
            <i class="fas fa-times"></i>
          </button>
        </div>
        <div class="modal-body" id="modalBody">
          <!-- Modal content will be inserted here -->
        </div>
      </div>
    </div>

    <style>
      * {
        box-sizing: border-box;
      }

      .loading-container {
        text-align: center;
        padding: 40px;
        color: #666;
      }

      .spinner {
        border: 4px solid #f3f3f3;
        border-top: 4px solid #3498db;
        border-radius: 50%;
        width: 40px;
        height: 40px;
        animation: spin 1s linear infinite;
        margin: 0 auto 20px;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .empty-state, .error-state {
        text-align: center;
        padding: 60px 20px;
        color: #666;
      }

      .empty-state i, .error-state i {
        font-size: 64px;
        margin-bottom: 20px;
        color: #bdc3c7;
      }

      .error-state i {
        color: #e74c3c;
      }

      .retry-btn, .login-btn {
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 15px;
        transition: background 0.3s;
        text-decoration: none;
        display: inline-flex;
        align-items: center;
        gap: 8px;
      }

      .retry-btn:hover, .login-btn:hover {
        background: #2980b9;
      }

      .table-container {
        background: white;
        border-radius: 12px;
        box-shadow: 0 2px 20px rgba(0,0,0,0.1);
        overflow: hidden;
        margin: 20px 0;
      }

      .table-wrapper {
        overflow-x: auto;
        -webkit-overflow-scrolling: touch;
      }

      .modern-table {
        width: 100%;
        border-collapse: collapse;
        background: white;
        font-size: 0.9rem;
      }

      .modern-table th {
        background: #34495e;
        color: white;
        padding: 14px 10px;
        text-align: left;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        white-space: nowrap;
      }

      .modern-table td {
        padding: 12px 10px;
        border-bottom: 1px solid #ecf0f1;
        vertical-align: middle;
        font-size: 0.85rem;
      }

      .table-row:hover {
        background: #f8f9fa;
        transition: background 0.2s;
      }

      /* Column Width Control - Desktop */
      .col-id { width: 8%; }
      .col-docs { width: 22%; }
      .col-date { width: 14%; }
      .col-status { width: 12%; }
      .col-amount { width: 12%; }
      .col-payment { width: 12%; }
      .col-actions { width: 12%; text-align: center; }

      .request-id {
        font-weight: 600;
        color: #2c3e50;
        white-space: nowrap;
        font-size: 0.85rem;
      }

      .documents-summary {
        max-width: 200px;
      }

      .doc-main {
        font-weight: 500;
        color: #2c3e50;
        line-height: 1.3;
        font-size: 0.85rem;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .date {
        white-space: nowrap;
        font-size: 0.8rem;
        color: #555;
      }

      .status-badge {
        padding: 5px 10px;
        border-radius: 12px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.3px;
        display: inline-block;
        white-space: nowrap;
      }

      .status-ready { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
      .status-pending { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
      .status-completed { background: #d1ecf1; color: #0c5460; border: 1px solid #b8dae3; }
      .status-rejected { background: #f8d7da; color: #721c24; border: 1px solid #f1b0b7; }
      .status-unknown { background: #e2e3e5; color: #383d41; border: 1px solid #d6d8db; }

      .amount {
        font-weight: 600;
        color: #27ae60;
        font-size: 0.85rem;
        white-space: nowrap;
      }

      .payment-method {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 500;
        display: inline-block;
        white-space: nowrap;
      }

      .payment-cash { background: #e8f5e8; color: #27ae60; border: 1px solid #d4edda; }
      .payment-gcash { background: #e8f4fd; color: #2980b9; border: 1px solid #d6eaf8; }
      .payment-maya { background: #f0e8ff; color: #8e44ad; border: 1px solid #e8d6ff; }
      .payment-unknown { background: #f8f9fa; color: #6c757d; border: 1px solid #e9ecef; }

      .view-btn {
        background: #3498db;
        color: white;
        border: none;
        padding: 7px 14px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 5px;
        transition: all 0.2s;
        font-weight: 500;
        white-space: nowrap;
      }

      .view-btn:hover {
        background: #2980b9;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(52, 152, 219, 0.3);
      }

      .view-btn i {
        font-size: 0.85rem;
      }

      .btn-text {
        display: inline;
      }

      /* Modal Styles */
      .modal {
        display: none;
        position: fixed;
        z-index: 1000;
        left: 0;
        top: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.5);
        backdrop-filter: blur(5px);
        align-items: center;
        justify-content: center;
      }

      .modal-content {
        background: white;
        margin: 5% auto;
        width: 90%;
        max-width: 700px;
        max-height: 90vh;
        border-radius: 12px;
        box-shadow: 0 10px 50px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease-out;
        display: flex;
        flex-direction: column;
      }

      @keyframes modalSlideIn {
        from { transform: translateY(-50px); opacity: 0; }
        to { transform: translateY(0); opacity: 1; }
      }

      .modal-header {
        padding: 20px;
        border-bottom: 1px solid #ecf0f1;
        display: flex;
        justify-content: space-between;
        align-items: center;
        background: #f8f9fa;
        border-radius: 12px 12px 0 0;
        flex-shrink: 0;
      }

      .modal-header h2 {
        margin: 0;
        color: #2c3e50;
        font-size: 1.3rem;
      }

      .close-btn {
        background: none;
        border: none;
        font-size: 1.5rem;
        color: #7f8c8d;
        cursor: pointer;
        padding: 5px;
        border-radius: 4px;
        transition: all 0.2s;
        width: 32px;
        height: 32px;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .close-btn:hover {
        color: #e74c3c;
        background: #f8f9fa;
      }

      .modal-body {
        padding: 20px;
        overflow-y: auto;
        flex: 1;
      }

      .request-details {
        display: flex;
        flex-direction: column;
        gap: 20px;
      }

      .detail-section h3 {
        color: #2c3e50;
        font-size: 1rem;
        margin: 0 0 15px 0;
        padding-bottom: 10px;
        border-bottom: 2px solid #ecf0f1;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 15px;
      }

      .detail-item {
        display: flex;
        flex-direction: column;
        gap: 5px;
      }

      .detail-item label {
        font-weight: 600;
        color: #7f8c8d;
        font-size: 0.75rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .detail-item span {
        color: #2c3e50;
        font-size: 0.9rem;
      }

      .total-amount {
        font-size: 1.2rem !important;
        font-weight: 700;
        color: #27ae60 !important;
      }

      .documents-list {
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .document-item {
        background: #f8f9fa;
        padding: 15px;
        border-radius: 8px;
        border-left: 4px solid #3498db;
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .document-name {
        font-weight: 600;
        color: #2c3e50;
        font-size: 0.95rem;
      }

      .document-details {
        color: #7f8c8d;
        font-size: 0.8rem;
        margin-top: 4px;
      }

      .document-price {
        text-align: right;
        flex-shrink: 0;
      }

      .document-subtotal {
        font-weight: 600;
        color: #27ae60;
        font-size: 1rem;
      }

      /* Mobile Optimizations - MAXIMIZED SPACE */
      @media (max-width: 768px) {
        .table-container {
          margin: 0;
          border-radius: 0;
          box-shadow: none;
        }

        .modern-table {
          font-size: 0.7rem;
          /* REMOVED min-width to let table fit screen */
        }

        .modern-table th {
          padding: 10px 5px;
          font-size: 0.65rem;
          letter-spacing: 0.1px;
        }

        .modern-table td {
          padding: 10px 5px;
          font-size: 0.7rem;
        }

        /* Maximized column widths for mobile - uses full screen */
        .col-id { width: 8%; min-width: 35px; }
        .col-docs { width: 40%; }
        .col-date { width: 20%; }
        .col-status { width: 17%; }
        .col-amount { display: none; } /* Hidden on mobile */
        .col-payment { display: none; } /* Hidden on mobile */
        .col-actions { width: 15%; text-align: center; }

        /* Hide Amount and Payment columns on mobile */
        .amount,
        .payment {
          display: none;
        }

        .request-id {
          font-size: 0.7rem;
          font-weight: 700;
        }

        .documents-summary {
          max-width: none;
        }

        .doc-main {
          font-size: 0.72rem;
          white-space: normal;
          line-height: 1.3;
          word-break: break-word;
        }

        .date {
          font-size: 0.68rem;
          line-height: 1.2;
        }

        .status-badge {
          padding: 4px 6px;
          font-size: 0.62rem;
          letter-spacing: 0.2px;
        }

        .view-btn {
          padding: 6px 10px;
          font-size: 0.7rem;
          gap: 3px;
        }

        .view-btn i {
          font-size: 0.75rem;
        }

        .btn-text {
          display: inline;
        }

        .modal-content {
          width: 95%;
          margin: 5% auto;
          max-height: 85vh;
        }

        .modal-header {
          padding: 15px;
        }

        .modal-header h2 {
          font-size: 1.1rem;
        }

        .modal-body {
          padding: 15px;
        }

        .detail-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .detail-section h3 {
          font-size: 0.95rem;
        }

        .document-item {
          flex-direction: column;
          align-items: flex-start;
          padding: 12px;
        }

        .document-price {
          text-align: left;
          width: 100%;
        }

        .document-name {
          font-size: 0.9rem;
        }

        .document-details {
          font-size: 0.75rem;
        }
      }

      /* Extra Small Devices - MAXIMIZED */
      @media (max-width: 480px) {
        .table-container {
          margin: 0;
          border-radius: 0;
        }

        .modern-table th {
          padding: 9px 4px;
          font-size: 0.63rem;
        }

        .modern-table td {
          padding: 9px 4px;
          font-size: 0.7rem;
        }

        .request-id {
          font-size: 0.7rem;
        }

        .doc-main {
          font-size: 0.7rem;
        }

        .date {
          font-size: 0.66rem;
        }

        .status-badge {
          padding: 4px 6px;
          font-size: 0.6rem;
        }

        .view-btn {
          padding: 5px 9px;
          font-size: 0.7rem;
        }

        .view-btn i {
          font-size: 0.7rem;
        }

        .modal-header h2 {
          font-size: 1rem;
        }

        .close-btn {
          font-size: 1.3rem;
          width: 28px;
          height: 28px;
        }

        .detail-item label {
          font-size: 0.7rem;
        }

        .detail-item span {
          font-size: 0.8rem;
        }

        .total-amount {
          font-size: 1rem !important;
        }
      }
    </style>
  `;

  // Initialize modal functions
  initializeModalFunctions();
}

// Modal functions
function initializeModalFunctions() {
  window.openRequestModal = function(requestId) {
    const modal = document.getElementById('requestModal');
    const modalBody = document.getElementById('modalBody');
    
    const viewBtn = document.querySelector(`button[onclick="openRequestModal(${requestId})"]`);
    if (!viewBtn) {
      console.error('View button not found for request ID:', requestId);
      return;
    }
    
    const req = JSON.parse(viewBtn.getAttribute('data-request'));
    console.log('Opening modal for request:', req);
    
    // Build documents section HTML
    let documentsHTML = '';
    if (req.documents && req.documents.length > 0) {
      documentsHTML = `
        <div class="detail-section">
          <h3>Requested Documents</h3>
          <div class="documents-list">
            ${req.documents.map(d => `
              <div class="document-item">
                <div>
                  <div class="document-name">${d.document_type || 'N/A'}</div>
                  <div class="document-details">
                    Quantity: ${d.quantity || 0} × ₱${parseFloat(d.unit_price || 0).toFixed(2)}
                  </div>
                </div>
                <div class="document-price">
                  <div class="document-subtotal">₱${parseFloat(d.subtotal || 0).toFixed(2)}</div>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }
    
    modalBody.innerHTML = `
      <div class="request-details">
        <div class="detail-section">
          <h3>Request Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Request ID:</label>
              <span>#${req.request_id}</span>
            </div>
            <div class="detail-item">
              <label>Date Requested:</label>
              <span>${formatDate(req.date_requested)}</span>
            </div>
            <div class="detail-item">
              <label>Status:</label>
              <span class="status-badge ${getStatusClass(req.status)}">${req.status || 'Pending'}</span>
            </div>
            <div class="detail-item">
              <label>Payment Method:</label>
              <span class="payment-method ${getPaymentClass(req.payment_method)}">
                ${formatPaymentMethod(req.payment_method)}
              </span>
            </div>
            <div class="detail-item">
              <label>Total Amount:</label>
              <span class="total-amount">₱${req.total_amount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        ${documentsHTML}
      </div>
    `;
    
    modal.style.display = 'block';
  };

  window.closeRequestModal = function() {
    const modal = document.getElementById('requestModal');
    modal.style.display = 'none';
  };

  // Close modal when clicking outside
  window.onclick = function(event) {
    const modal = document.getElementById('requestModal');
    if (event.target === modal) {
      window.closeRequestModal();
    }
  };
}

// Make functions globally available
window.RequestHistoryTable = RequestHistoryTable;
