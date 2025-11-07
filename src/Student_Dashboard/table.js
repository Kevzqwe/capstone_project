// public/js/table.js

// API Configuration - FIXED: Use correct backend URL
const API_BASE_URL = 'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/request_history.php';

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
    console.log('📡 Fetching from:', `${API_BASE_URL}?action=getRequestHistory`);
    
    const response = await fetch(`${API_BASE_URL}?action=getRequestHistory`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
    });

    console.log('📥 Response status:', response.status);
    console.log('📥 Response headers:', [...response.headers.entries()]);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Response error:', errorText);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      console.error('❌ Non-JSON response:', text);
      throw new Error('Server returned non-JSON response');
    }

    const result = await response.json();
    console.log('📊 Full API response:', result);

    if (result.status === 'success' && result.data && result.data.length > 0) {
      console.log(`✅ Rendering ${result.data.length} requests`);
      renderTable(container, result.data);
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
        <button class="retry-btn" onclick="window.RequestHistoryTable()">Retry</button>
      </div>
    `;
  } finally {
    isLoading = false;
  }
}

// === Render Table Function ===
function renderTable(container, requests) {
  console.log('📋 Rendering table with requests:', requests);

  container.innerHTML = `
    <div class="table-container">
      <div class="table-wrapper">
        <table class="modern-table">
          <thead>
            <tr>
              <th>Request ID</th>
              <th>Student Name</th>
              <th>Grade & Section</th>
              <th>Date Requested</th>
              <th>Scheduled Pick Up</th>
              <th>Status</th>
              <th>Total Amount</th>
              <th>Payment Method</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            ${requests.map(req => `
              <tr class="table-row">
                <td class="request-id">#${req.Request_ID}</td>
                <td class="student-name">${req.Student_Name || 'N/A'}</td>
                <td class="grade-section">${req.Grade_Level || ''} - ${req.Section || ''}</td>
                <td class="date">${formatDate(req.Date_Requested)}</td>
                <td class="date">${formatDate(req.Rescheduled_Pick_Up || req.Scheduled_Pick_Up)}</td>
                <td class="status">
                  <span class="status-badge ${getStatusClass(req.Status)}">${req.Status || 'Pending'}</span>
                </td>
                <td class="amount">₱${parseFloat(req.Total_Amount || 0).toFixed(2)}</td>
                <td class="payment">
                  <span class="payment-method ${getPaymentClass(req.Payment_Method)}">
                    ${formatPaymentMethod(req.Payment_Method)}
                  </span>
                </td>
                <td class="actions">
                  <button class="view-btn" onclick="openRequestModal(${req.Request_ID})" 
                    data-request='${JSON.stringify(req).replace(/'/g, "&#39;")}'>
                    <i class="fas fa-eye"></i>
                    View
                  </button>
                </td>
              </tr>
            `).join('')}
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

      .retry-btn {
        background: #3498db;
        color: white;
        border: none;
        padding: 10px 20px;
        border-radius: 5px;
        cursor: pointer;
        margin-top: 15px;
        transition: background 0.3s;
      }

      .retry-btn:hover {
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
        padding: 16px 12px;
        text-align: left;
        font-weight: 600;
        font-size: 0.85rem;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        white-space: nowrap;
      }

      .modern-table td {
        padding: 16px 12px;
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

      .student-name {
        font-weight: 500;
        color: #34495e;
      }

      .grade-section {
        color: #7f8c8d;
        font-size: 0.85rem;
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
        padding: 8px 16px;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.8rem;
        display: flex;
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
        padding: 24px;
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
        padding: 24px;
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

      @media (max-width: 768px) {
        .modern-table th, .modern-table td {
          padding: 12px 8px;
          font-size: 0.8rem;
        }

        .view-btn span {
          display: none;
        }

        .detail-grid {
          grid-template-columns: 1fr;
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
    
    modalBody.innerHTML = `
      <div class="request-details">
        <div class="detail-section">
          <h3>Request Information</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Request ID:</label>
              <span>#${req.Request_ID}</span>
            </div>
            <div class="detail-item">
              <label>Student Name:</label>
              <span>${req.Student_Name || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Grade Level:</label>
              <span>${req.Grade_Level || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Section:</label>
              <span>${req.Section || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Contact Number:</label>
              <span>${req.Contact_No || 'N/A'}</span>
            </div>
            <div class="detail-item">
              <label>Email:</label>
              <span>${req.Email || 'N/A'}</span>
            </div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Request Details</h3>
          <div class="detail-grid">
            <div class="detail-item">
              <label>Date Requested:</label>
              <span>${formatDate(req.Date_Requested)}</span>
            </div>
            <div class="detail-item">
              <label>Scheduled Pick Up:</label>
              <span>${formatDate(req.Scheduled_Pick_Up)}</span>
            </div>
            ${req.Rescheduled_Pick_Up ? `
            <div class="detail-item">
              <label>Rescheduled Pick Up:</label>
              <span>${formatDate(req.Rescheduled_Pick_Up)}</span>
            </div>
            ` : ''}
            <div class="detail-item">
              <label>Status:</label>
              <span class="status-badge ${getStatusClass(req.Status)}">${req.Status || 'Pending'}</span>
            </div>
            <div class="detail-item">
              <label>Payment Method:</label>
              <span class="payment-method ${getPaymentClass(req.Payment_Method)}">
                ${formatPaymentMethod(req.Payment_Method)}
              </span>
            </div>
            <div class="detail-item">
              <label>Total Amount:</label>
              <span class="total-amount">₱${parseFloat(req.Total_Amount || 0).toFixed(2)}</span>
            </div>
          </div>
        </div>
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
