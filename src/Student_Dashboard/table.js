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

// Pagination state
let currentPage = 1;
let rowsPerPage = 10;
let allRequests = [];

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
      
      // Group requests by Request_ID to handle multiple documents per request
      const grouped = {};
      normalizedData.forEach((r) => {
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

      allRequests = Object.values(grouped);
      
      // Sort by date_requested in descending order (most recent first)
      allRequests.sort((a, b) => {
        const dateA = new Date(a.date_requested);
        const dateB = new Date(b.date_requested);
        return dateB - dateA; // Descending order
      });
      
      // Sort by request_id in descending order as secondary sort (highest ID first)
      allRequests.sort((a, b) => {
        const dateA = new Date(a.date_requested);
        const dateB = new Date(b.date_requested);
        
        // If dates are equal, sort by ID
        if (dateA.getTime() === dateB.getTime()) {
          return b.request_id - a.request_id;
        }
        
        return dateB - dateA;
      });
      
      console.log('📅 Sorted requests (most recent first):', allRequests);
      
      currentPage = 1;
      renderTable(container, allRequests);
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
  console.log('📋 Rendering table with requests:', requests);

  const totalPages = Math.ceil(requests.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedRequests = requests.slice(startIndex, endIndex);

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
            ${paginatedRequests.map(req => {
              // Create a summary of documents
              const docSummary = req.documents.length === 1 
                ? req.documents[0].document_type 
                : `${req.documents.length} documents`;
              
              return `
              <tr class="table-row">
                <td class="request-id" data-label="Request ID">#${req.request_id}</td>
                <td class="documents-summary" data-label="Documents">
                  <div class="doc-main">${docSummary}</div>
                  ${req.documents.length > 1 ? `
                    <div class="doc-list">
                      ${req.documents.map(d => d.document_type).join(', ')}
                    </div>
                  ` : ''}
                </td>
                <td class="date" data-label="Date Requested">${formatDate(req.date_requested)}</td>
                <td class="status" data-label="Status">
                  <span class="status-badge ${getStatusClass(req.status)}">${req.status || 'Pending'}</span>
                </td>
                <td class="amount" data-label="Total Amount">₱${req.total_amount.toFixed(2)}</td>
                <td class="payment" data-label="Payment Method">
                  <span class="payment-method ${getPaymentClass(req.payment_method)}">
                    ${formatPaymentMethod(req.payment_method)}
                  </span>
                </td>
                <td class="actions" data-label="Actions">
                  <button class="view-btn" onclick="openRequestModal(${req.request_id})" 
                    data-request='${JSON.stringify(req).replace(/'/g, "&#39;")}'>
                    <i class="fas fa-eye"></i>
                    View Details
                  </button>
                </td>
              </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
      
      <!-- Pagination Controls -->
      <div class="pagination-container">
        <div class="pagination-info">
          Showing ${startIndex + 1} to ${Math.min(endIndex, requests.length)} of ${requests.length} entries
        </div>
        <div class="pagination-controls">
          <button class="pagination-btn" onclick="goToPage(1)" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-double-left"></i>
          </button>
          <button class="pagination-btn" onclick="goToPage(${currentPage - 1})" ${currentPage === 1 ? 'disabled' : ''}>
            <i class="fas fa-angle-left"></i>
          </button>
          ${generatePageNumbers(currentPage, totalPages)}
          <button class="pagination-btn" onclick="goToPage(${currentPage + 1})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-right"></i>
          </button>
          <button class="pagination-btn" onclick="goToPage(${totalPages})" ${currentPage === totalPages ? 'disabled' : ''}>
            <i class="fas fa-angle-double-right"></i>
          </button>
        </div>
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
        padding: 12px 10px;
        text-align: left;
        font-weight: 600;
        font-size: 0.8rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }

      .modern-table td {
        padding: 12px 10px;
        border-bottom: 1px solid #ecf0f1;
        vertical-align: middle;
      }

      .table-row:hover {
        background: #f8f9fa;
        transition: background 0.2s;
      }

      .request-id {
        font-weight: 600;
        color: #2c3e50;
      }

      .documents-summary {
        max-width: 300px;
      }

      .doc-main {
        font-weight: 500;
        color: #2c3e50;
        margin-bottom: 4px;
      }

      .doc-list {
        font-size: 0.8rem;
        color: #7f8c8d;
        line-height: 1.4;
      }

      .status-badge {
        padding: 6px 12px;
        border-radius: 20px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        display: inline-block;
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
      }

      .payment-method {
        padding: 4px 8px;
        border-radius: 4px;
        font-size: 0.75rem;
        font-weight: 500;
        display: inline-block;
      }

      .payment-cash { background: #e8f5e8; color: #27ae60; border: 1px solid #d4edda; }
      .payment-gcash { background: #e8f4fd; color: #2980b9; border: 1px solid #d6eaf8; }
      .payment-maya { background: #f0e8ff; color: #8e44ad; border: 1px solid #e8d6ff; }
      .payment-unknown { background: #f8f9fa; color: #6c757d; border: 1px solid #e9ecef; }

      .view-btn {
        background: #3498db;
        color: white;
        border: none;
        padding: 8px 14px;
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

      /* Pagination Styles */
      .pagination-container {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        background: #f8f9fa;
        border-top: 1px solid #ecf0f1;
        flex-wrap: wrap;
        gap: 15px;
      }

      .pagination-info {
        color: #7f8c8d;
        font-size: 0.85rem;
      }

      .pagination-controls {
        display: flex;
        align-items: center;
        gap: 5px;
        flex-direction: row;
      }

      .pagination-btn {
        background: white;
        border: 1px solid #ddd;
        color: #34495e;
        padding: 8px 12px;
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.2s;
        font-size: 0.85rem;
        min-width: 38px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
      }

      .pagination-btn:hover:not(:disabled) {
        background: #3498db;
        color: white;
        border-color: #3498db;
      }

      .pagination-btn:disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .pagination-btn.active {
        background: #3498db;
        color: white;
        border-color: #3498db;
        font-weight: 600;
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
      }

      .modal-content {
        background: white;
        margin: 5% auto;
        width: 90%;
        max-width: 700px;
        border-radius: 12px;
        box-shadow: 0 10px 50px rgba(0,0,0,0.3);
        animation: modalSlideIn 0.3s ease-out;
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
      }

      .close-btn:hover {
        color: #e74c3c;
        background: #f8f9fa;
      }

      .modal-body {
        padding: 20px;
        max-height: 60vh;
        overflow-y: auto;
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
      }

      .document-subtotal {
        font-weight: 600;
        color: #27ae60;
        font-size: 1.1rem;
      }

      /* Mobile Responsive - Card Layout */
      @media (max-width: 768px) {
        .table-container {
          box-shadow: none;
          background: transparent;
        }

        .table-wrapper {
          overflow-x: visible;
        }

        .modern-table {
          display: block;
          background: transparent;
        }

        .modern-table thead {
          display: none;
        }

        .modern-table tbody {
          display: block;
        }

        .modern-table tr {
          display: block;
          background: white;
          margin-bottom: 20px;
          border-radius: 12px;
          box-shadow: 0 2px 12px rgba(0,0,0,0.08);
          padding: 20px;
          border: 1px solid #e8e8e8;
        }

        .modern-table td {
          display: block;
          text-align: left;
          padding: 10px 0;
          border: none;
          position: relative;
        }

        .modern-table td:before {
          content: attr(data-label);
          font-weight: 600;
          color: #95a5a6;
          font-size: 0.7rem;
          text-transform: uppercase;
          letter-spacing: 0.8px;
          display: block;
          margin-bottom: 6px;
        }

        .request-id {
          font-size: 1.3rem;
          padding-top: 0;
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid #ecf0f1;
        }

        .request-id:before {
          content: none;
        }

        .documents-summary {
          max-width: 100%;
        }

        .doc-main {
          font-size: 0.9rem;
        }

        .doc-list {
          font-size: 0.75rem;
        }

        .date {
          color: #2c3e50;
          font-size: 0.9rem;
        }

        .status-badge {
          padding: 6px 14px;
          font-size: 0.7rem;
        }

        .amount {
          font-size: 1rem;
        }

        .payment-method {
          font-size: 0.75rem;
          padding: 5px 10px;
        }

        .view-btn {
          padding: 8px 16px;
          font-size: 0.8rem;
          width: 100%;
          justify-content: center;
        }

        .pagination-container {
          flex-direction: column;
          padding: 15px;
          gap: 15px;
          background: white;
          border-radius: 0;
          box-shadow: none;
        }

        .pagination-info {
          font-size: 0.8rem;
          text-align: center;
          color: #7f8c8d;
          order: 1;
        }

        .pagination-controls {
          gap: 6px;
          flex-wrap: nowrap;
          flex-direction: row !important;
          justify-content: flex-start;
          width: 100%;
          order: 2;
          overflow-x: auto;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: thin;
          padding-bottom: 5px;
        }

        .pagination-controls::-webkit-scrollbar {
          height: 6px;
        }

        .pagination-controls::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }

        .pagination-controls::-webkit-scrollbar-thumb {
          background: #888;
          border-radius: 10px;
        }

        .pagination-controls::-webkit-scrollbar-thumb:hover {
          background: #555;
        }

        .pagination-btn {
          padding: 10px 12px;
          font-size: 0.85rem;
          min-width: 40px;
          flex-shrink: 0;
        }

        .detail-grid {
          grid-template-columns: 1fr;
        }

        .modal-content {
          width: 95%;
          margin: 10% auto;
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
      }

      /* Tablet adjustments */
      @media (min-width: 769px) and (max-width: 1024px) {
        .modern-table th, .modern-table td {
          padding: 11px 8px;
          font-size: 0.82rem;
        }

        .pagination-btn {
          padding: 7px 11px;
        }
      }
    </style>
  `;

  // Initialize modal functions
  initializeModalFunctions();
}

// Generate page numbers for pagination
function generatePageNumbers(currentPage, totalPages) {
  let pages = '';
  const maxVisible = 5;
  
  let startPage = Math.max(1, currentPage - Math.floor(maxVisible / 2));
  let endPage = Math.min(totalPages, startPage + maxVisible - 1);
  
  if (endPage - startPage < maxVisible - 1) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  
  for (let i = startPage; i <= endPage; i++) {
    pages += `
      <button class="pagination-btn ${i === currentPage ? 'active' : ''}" 
              onclick="goToPage(${i})">
        ${i}
      </button>
    `;
  }
  
  return pages;
}

// Pagination navigation
window.goToPage = function(page) {
  const totalPages = Math.ceil(allRequests.length / rowsPerPage);
  if (page < 1 || page > totalPages) return;
  
  currentPage = page;
  const container = document.getElementById('requestHistoryTableContainer');
  renderTable(container, allRequests);
};

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
