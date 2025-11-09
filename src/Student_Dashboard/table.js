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
              <th>Request ID</th>
              <th>Documents</th>
              <th>Date Requested</th>
              <th>Status</th>
              <th>Total Amount</th>
              <th>Payment Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${uniqueRequests.map(req => {
              // Create a summary of documents
              const docSummary = req.documents.length === 1 
                ? req.documents[0].document_type 
                : `${req.documents.length} documents`;
              
              return `
              <tr class="table-row">
                <td class="request-id">#${req.request_id}</td>
                <td class="documents-summary">
                  <div class="doc-main">${docSummary}</div>
                  ${req.documents.length > 1 ? `
                    <div class="doc-list">
                      ${req.documents.map(d => d.document_type).join(', ')}
                    </div>
                  ` : ''}
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
                    <span class="btn-text">View Details</span>
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
        min-width: 100%;
      }

      .modern-table th {
        background: #34495e;
        color: white;
        padding: 16px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
        position: sticky;
        top: 0;
        z-index: 10;
      }

      .modern-table td {
        padding: 16px 12px;
        border-bottom: 1px solid #ecf0f1;
        vertical-align: middle;
        font-size: 0.85rem;
      }

      .table-row:hover {
        background: #f8f9fa;
        transition: background 0.2s;
      }

      .request-id {
        font-weight: 600;
        color: #2c3e50;
        white-space: nowrap;
      }

      .documents-summary {
        min-width: 150px;
        max-width: 250px;
      }

      .doc-main {
        font-weight: 500;
        color: #2c3e50;
        margin-bottom: 4px;
        line-height: 1.3;
      }

      .doc-list {
        font-size: 0.8rem;
        color: #7f8c8d;
        line-height: 1.4;
      }

      .date {
        white-space: nowrap;
        font-size: 0.8rem;
      }

      .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
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
        font-size: 1rem;
        white-space: nowrap;
      }

      .payment-method {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
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
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        display: inline-flex;
        align-items: center;
        gap: 6px;
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
        font-size: 0.9rem;
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
        padding: 24px;
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
        font-size: 1.5rem;
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
        padding: 24px;
        max-height: 60vh;
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
        font-size: 1.1rem;
        margin-bottom: 15px;
        padding-bottom: 10px;
        border-bottom: 2px solid #ecf0f1;
      }

      .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .detail-item span {
        color: #2c3e50;
        font-size: 1rem;
      }

      .total-amount {
        font-size: 1.3rem !important;
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
        font-size: 1rem;
      }

      .document-details {
        color: #7f8c8d;
        font-size: 0.9rem;
        margin-top: 4px;
      }

      .document-price {
        text-align: right;
        flex-shrink: 0;
      }

      .document-subtotal {
        font-weight: 600;
        color: #27ae60;
        font-size: 1.1rem;
      }

      /* Mobile Optimizations - Tablets and Below */
      @media (max-width: 768px) {
        .modern-table th,
        .modern-table td {
          padding: 12px 8px;
          font-size: 0.8rem;
        }

        .modern-table th {
          font-size: 0.75rem;
          padding: 10px 6px;
        }

        .documents-summary {
          min-width: 120px;
          max-width: 180px;
        }

        .doc-main {
          font-size: 0.8rem;
        }

        .doc-list {
          font-size: 0.7rem;
        }

        .status-badge {
          padding: 5px 10px;
          font-size: 0.7rem;
        }

        .payment-method {
          padding: 3px 6px;
          font-size: 0.7rem;
        }

        .amount {
          font-size: 0.9rem;
        }

        .view-btn {
          padding: 6px 12px;
          font-size: 0.75rem;
          gap: 4px;
        }

        .btn-text {
          display: none;
        }

        .view-btn i {
          font-size: 1rem;
        }

        .detail-grid {
          grid-template-columns: 1fr;
          gap: 12px;
        }

        .modal-content {
          width: 95%;
          margin: 10% auto;
          max-height: 85vh;
        }

        .modal-header {
          padding: 15px;
        }

        .modal-header h2 {
          font-size: 1.2rem;
        }

        .modal-body {
          padding: 15px;
        }

        .detail-section h3 {
          font-size: 1rem;
        }

        .document-item {
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
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
          font-size: 0.8rem;
        }
      }

      /* Extra Small Devices - Phones */
      @media (max-width: 480px) {
        .table-container {
          margin: 10px 0;
          border-radius: 8px;
        }

        .modern-table th,
        .modern-table td {
          padding: 10px 6px;
        }

        .modern-table th {
          padding: 8px 4px;
          font-size: 0.7rem;
        }

        .modern-table td {
          font-size: 0.75rem;
        }

        .documents-summary {
          min-width: 100px;
          max-width: 150px;
        }

        .doc-main {
          font-size: 0.75rem;
        }

        .doc-list {
          font-size: 0.65rem;
        }

        .status-badge {
          padding: 4px 8px;
          font-size: 0.65rem;
        }

        .payment-method {
          font-size: 0.65rem;
        }

        .amount {
          font-size: 0.8rem;
        }

        .view-btn {
          padding: 5px 10px;
        }

        .modal-content {
          width: 95%;
          margin: 5% auto;
        }

        .modal-header {
          padding: 12px;
        }

        .modal-header h2 {
          font-size: 1rem;
        }

        .close-btn {
          font-size: 1.3rem;
          width: 28px;
          height: 28px;
        }

        .modal-body {
          padding: 12px;
        }

        .detail-item label {
          font-size: 0.75rem;
        }

        .detail-item span {
          font-size: 0.85rem;
        }

        .total-amount {
          font-size: 1.1rem !important;
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
