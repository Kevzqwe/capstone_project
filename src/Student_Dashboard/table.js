/* eslint-disable */

// === Helper functions ===
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
  } catch {
    return 'N/A';
  }
}

function getStatusClass(status) {
  if (!status) return 'status-unknown';
  return `status-${status.toLowerCase()}`;
}

function getPaymentClass(paymentMethod) {
  if (!paymentMethod) return 'payment-unknown';
  return `payment-${paymentMethod.toLowerCase()}`;
}

function formatPaymentMethod(method) {
  if (!method) return 'Unknown';
  return method.charAt(0).toUpperCase() + method.slice(1);
}

// === Prevent duplicate loads ===
let isLoading = false;

// === Normalize API data keys (robust mapping) ===
function normalizeKeys(obj) {
  const newObj = {};

  for (const key in obj) {
    const lowerKey = key.toLowerCase();

    switch (lowerKey) {
      case 'request_id':
        newObj.request_id = obj[key];
        break;
      case 'request_doc_id':
        newObj.request_doc_id = obj[key];
        break;
      case 'document_id':
        newObj.document_id = obj[key];
        break;
      case 'document_type':
        newObj.document_type = obj[key];
        break;
      case 'quantity':
        newObj.quantity = Number(obj[key]) || 0;
        break;
      case 'unit_price':
        newObj.unit_price = parseFloat(obj[key]) || 0;
        break;
      case 'subtotal':
        newObj.subtotal = parseFloat(obj[key]) || 0;
        break;
      case 'payment_method':
        newObj.payment_method = obj[key];
        break;
      case 'date_requested':
        newObj.date_requested = obj[key];
        break;
      case 'status':
        newObj.status = obj[key];
        break;
      case 'student_name':
      case 'grade_level':
      case 'section':
      case 'email':
      case 'contact_no':
      case 'scheduled_pick_up':
      case 'rescheduled_pick_up':
      case 'total_amount':
      case 'notes':
        newObj[lowerKey] = obj[key];
        break;
      default:
        newObj[lowerKey] = obj[key];
    }
  }

  // Default fallback values
  newObj.student_name = newObj.student_name || '—';
  newObj.grade_level = newObj.grade_level || '—';
  newObj.section = newObj.section || '—';
  newObj.total_amount = newObj.total_amount || newObj.subtotal || 0;
  newObj.payment_method = newObj.payment_method || 'unknown';
  newObj.status = newObj.status || 'Pending';
  newObj.date_requested = newObj.date_requested || null;

  return newObj;
}

// === Main function ===
export async function RequestHistoryTable() {
  console.log('🔄 RequestHistoryTable called');
  if (isLoading) return;

  const container = document.getElementById('requestHistoryTableContainer');
  if (!container) return console.error('❌ requestHistoryTableContainer not found');

  isLoading = true;

  container.innerHTML = `
    <div class="loading-container">
      <div class="spinner"></div>
      <p>Loading request history...</p>
    </div>
  `;

  try {
    const response = await fetch(
      'https://mediumaquamarine-heron-545485.hostingersite.com/php-backend/request_history.php?action=getRequestHistory',
      {
        method: 'GET',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
      }
    );

    console.log('📡 Response status:', response.status);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const result = await response.json();
    console.log('📊 API result:', result);

    if (result.status === 'error') {
      container.innerHTML = `
        <div class="error-state">
          <i class="fas fa-lock"></i>
          <h3>Authentication Required</h3>
          <p>${result.message || 'Please log in again.'}</p>
          <a href="https://mediumaquamarine-heron-545485.hostingersite.com/index.html" class="login-btn">
            <i class="fas fa-sign-in-alt"></i> Go to Login
          </a>
        </div>`;
      return;
    }

    if (result.status === 'success' && Array.isArray(result.data) && result.data.length > 0) {
      const normalizedData = result.data.map(normalizeKeys);
      renderTable(container, normalizedData);
    } else {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-inbox"></i>
          <h3>No document requests found</h3>
          <p>${result.message || 'You haven’t made any document requests yet.'}</p>
        </div>`;
    }
  } catch (err) {
    console.error('💥 RequestHistoryTable error:', err);
    container.innerHTML = `
      <div class="error-state">
        <i class="fas fa-exclamation-triangle"></i>
        <h3>Error loading request history</h3>
        <p>${err.message}</p>
        <button class="retry-btn" onclick="window.RequestHistoryTable()">
          <i class="fas fa-redo"></i> Retry
        </button>
      </div>`;
  } finally {
    isLoading = false;
  }
}

// === Render Table ===
function renderTable(container, requests) {
  console.log('📋 Rendering table:', requests.length, 'rows');

  // Group documents under their Request_ID
  const grouped = {};
  requests.forEach((r) => {
    const id = r.request_id;
    if (!grouped[id]) grouped[id] = { ...r, documents: [] };
    grouped[id].documents.push({
      document_type: r.document_type,
      quantity: r.quantity,
      unit_price: r.unit_price,
      subtotal: r.subtotal,
    });
  });

  // Calculate total per request
  const uniqueRequests = Object.values(grouped).map((req) => {
    const total = req.documents.reduce((sum, d) => sum + (parseFloat(d.subtotal) || 0), 0);
    return { ...req, total_amount: total };
  });

  // Render table HTML
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
            ${uniqueRequests.map(
              (req) => `
              <tr>
                <td>#${req.request_id}</td>
                <td>${req.student_name}</td>
                <td>${req.grade_level} - ${req.section}</td>
                <td>${formatDate(req.date_requested)}</td>
                <td>${formatDate(req.rescheduled_pick_up || req.scheduled_pick_up)}</td>
                <td><span class="status-badge ${getStatusClass(req.status)}">${req.status}</span></td>
                <td>₱${parseFloat(req.total_amount || 0).toFixed(2)}</td>
                <td><span class="payment-method ${getPaymentClass(req.payment_method)}">${formatPaymentMethod(req.payment_method)}</span></td>
                <td>
                  <button class="view-btn" onclick="openRequestModal(${req.request_id})" 
                    data-request='${JSON.stringify(req).replace(/'/g, "&#39;")}'>
                    <i class="fas fa-eye"></i> View
                  </button>
                </td>
              </tr>`
            ).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div id="requestModal" class="modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Request Details</h2>
          <button class="close-btn" onclick="closeRequestModal()"><i class="fas fa-times"></i></button>
        </div>
        <div class="modal-body" id="modalBody"></div>
      </div>
    </div>
  `;

  initializeModalFunctions();
}

// === Modal Functions ===
function initializeModalFunctions() {
  window.openRequestModal = function (requestId) {
    const modal = document.getElementById('requestModal');
    const modalBody = document.getElementById('modalBody');

    const btn = document.querySelector(`button[onclick="openRequestModal(${requestId})"]`);
    if (!btn) return console.error('Button not found for request', requestId);

    const req = JSON.parse(btn.getAttribute('data-request'));

    modalBody.innerHTML = `
      <div class="request-details">
        <div class="detail-section">
          <h3>Request Information</h3>
          <div class="detail-grid">
            <div><label>Request ID:</label><span>#${req.request_id}</span></div>
            <div><label>Student Name:</label><span>${req.student_name}</span></div>
            <div><label>Grade Level:</label><span>${req.grade_level}</span></div>
            <div><label>Section:</label><span>${req.section}</span></div>
            <div><label>Contact:</label><span>${req.contact_no || '—'}</span></div>
            <div><label>Email:</label><span>${req.email || '—'}</span></div>
          </div>
        </div>

        <div class="detail-section">
          <h3>Requested Documents</h3>
          <div class="documents-list">
            ${req.documents.map(
              (d) => `
              <div class="document-item">
                <div class="document-name">${d.document_type}</div>
                <div class="document-details">
                  Quantity: ${d.quantity} × ₱${parseFloat(d.unit_price).toFixed(2)} = ₱${parseFloat(d.subtotal).toFixed(2)}
                </div>
              </div>`
            ).join('')}
          </div>
        </div>

        <div class="detail-section">
          <h3>Request Details</h3>
          <div class="detail-grid">
            <div><label>Date Requested:</label><span>${formatDate(req.date_requested)}</span></div>
            <div><label>Scheduled Pick Up:</label><span>${formatDate(req.scheduled_pick_up)}</span></div>
            ${
              req.rescheduled_pick_up
                ? `<div><label>Rescheduled Pick Up:</label><span>${formatDate(req.rescheduled_pick_up)}</span></div>`
                : ''
            }
            <div><label>Status:</label><span class="status-badge ${getStatusClass(req.status)}">${req.status}</span></div>
            <div><label>Payment Method:</label><span class="payment-method ${getPaymentClass(req.payment_method)}">${formatPaymentMethod(req.payment_method)}</span></div>
            <div><label>Total Amount:</label><span class="total-amount">₱${parseFloat(req.total_amount || 0).toFixed(2)}</span></div>
            ${req.notes ? `<div style="grid-column: 1 / -1;"><label>Notes:</label><span>${req.notes}</span></div>` : ''}
          </div>
        </div>
      </div>
    `;

    modal.style.display = 'block';
  };

  window.closeRequestModal = function () {
    document.getElementById('requestModal').style.display = 'none';
  };

  window.onclick = function (e) {
    const modal = document.getElementById('requestModal');
    if (e.target === modal) window.closeRequestModal();
  };
}

// === Expose globally ===
window.RequestHistoryTable = RequestHistoryTable;
