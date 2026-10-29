/**
 * Student Information Management System - Presentation Tier (Vercel)
 * Unified REST API Client & UI Controller
 */

// Configuration State
const DEFAULT_API_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
  ? 'http://localhost:5000'
  : 'https://three-tier-student-system-hgyd.onrender.com';

let API_BASE_URL = localStorage.getItem('STUDENT_API_URL') || DEFAULT_API_URL;
let currentStudents = [];
let pendingDeleteId = null;
let isEditMode = false;

// DOM Elements
const apiUrlInput = document.getElementById('apiUrlInput');
const saveApiBtn = document.getElementById('saveApiBtn');
const refreshBtn = document.getElementById('refreshBtn');
const overallStatusBadge = document.getElementById('overallStatusBadge');
const dbStatusDetails = document.getElementById('dbStatusDetails');
const backendDot = document.getElementById('backendDot');
const dbDot = document.getElementById('dbDot');

const studentForm = document.getElementById('studentForm');
const formTitle = document.getElementById('formTitle');
const formModeBadge = document.getElementById('formModeBadge');
const submitBtn = document.getElementById('submitBtn');
const cancelEditBtn = document.getElementById('cancelEditBtn');
const editOriginalId = document.getElementById('editOriginalId');

const studentIdInput = document.getElementById('studentId');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const departmentInput = document.getElementById('department');
const semesterInput = document.getElementById('semester');
const contactInput = document.getElementById('contact');

const searchInput = document.getElementById('searchInput');
const semesterFilter = document.getElementById('semesterFilter');
const recordCount = document.getElementById('recordCount');
const studentsTableBody = document.getElementById('studentsTableBody');

const deleteModal = document.getElementById('deleteModal');
const deleteModalText = document.getElementById('deleteModalText');
const confirmDeleteBtn = document.getElementById('confirmDeleteBtn');
const cancelDeleteBtn = document.getElementById('cancelDeleteBtn');
const toastContainer = document.getElementById('toastContainer');

// ==========================================
// Toast Notification Engine
// ==========================================
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  const icon = type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️';
  toast.innerHTML = `<span>${icon}</span><span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ==========================================
// Health & Connectivity Check
// ==========================================
async function checkConnectivity() {
  overallStatusBadge.textContent = 'Checking...';
  overallStatusBadge.className = 'status-indicator';
  dbStatusDetails.textContent = `Connecting to ${API_BASE_URL}...`;

  try {
    const startTime = performance.now();
    const res = await fetch(`${API_BASE_URL}/api/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    });
    const latency = Math.round(performance.now() - startTime);

    if (res.ok) {
      const data = await res.json();
      const isDbOk = data.database && data.database.connected;

      backendDot.className = 'pill-dot active';
      dbDot.className = isDbOk ? 'pill-dot active' : 'pill-dot error';

      overallStatusBadge.textContent = 'Online';
      overallStatusBadge.className = 'status-indicator healthy';

      dbStatusDetails.textContent = `API: ${latency}ms | DB: ${data.database.status} (${data.database.databaseName})`;
    } else {
      throw new Error(`HTTP ${res.status}`);
    }
  } catch (err) {
    backendDot.className = 'pill-dot error';
    dbDot.className = 'pill-dot error';
    overallStatusBadge.textContent = 'Offline / Error';
    overallStatusBadge.className = 'status-indicator error';
    dbStatusDetails.textContent = `Could not reach ${API_BASE_URL}. Ensure backend on Render is awake.`;
  }
}

// ==========================================
// API Operations (CRUD)
// ==========================================

// 1. Fetch Students (Read)
async function fetchStudents() {
  const searchTerm = searchInput.value.trim();
  const url = searchTerm
    ? `${API_BASE_URL}/api/students?search=${encodeURIComponent(searchTerm)}`
    : `${API_BASE_URL}/api/students`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.message || `Server responded with ${res.status}`);
    }
    const result = await res.json();
    currentStudents = result.data || [];
    renderStudentsTable();
  } catch (err) {
    console.error('Fetch error:', err);
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="loading-state">
          <p style="color: var(--danger); font-weight: 600;">⚠️ Failed to load records from Render API</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">${escapeHtml(err.message)}</p>
          <button class="btn btn-secondary btn-sm" style="margin-top: 10px;" onclick="fetchStudents()">Try Again</button>
        </td>
      </tr>
    `;
    recordCount.textContent = '0';
  }
}

// 2. Render Table with optional semester filter
function renderStudentsTable() {
  const semFilterValue = semesterFilter.value;
  let filtered = currentStudents;

  if (semFilterValue !== 'all') {
    filtered = filtered.filter(s => String(s.semester) === semFilterValue);
  }

  recordCount.textContent = filtered.length;

  if (filtered.length === 0) {
    studentsTableBody.innerHTML = `
      <tr>
        <td colspan="7" class="empty-state">
          <p>No student records found.</p>
          <p style="font-size: 0.8rem; margin-top: 4px;">Use the form on the left to add a new record to MongoDB Atlas.</p>
        </td>
      </tr>
    `;
    return;
  }

  studentsTableBody.innerHTML = filtered.map(student => `
    <tr>
      <td><span class="student-id-tag">${escapeHtml(student.studentId)}</span></td>
      <td><strong>${escapeHtml(student.name)}</strong></td>
      <td>${escapeHtml(student.department)}</td>
      <td><span class="sem-pill">Sem ${student.semester}</span></td>
      <td>${escapeHtml(student.email)}</td>
      <td>${escapeHtml(student.contact || '—')}</td>
      <td>
        <div class="action-buttons">
          <button class="btn-action-edit" onclick="startEditStudent('${escapeHtml(student.studentId)}')">Edit</button>
          <button class="btn-action-delete" onclick="promptDelete('${escapeHtml(student.studentId)}', '${escapeHtml(student.name)}')">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');
}

// 3. Create or Update Student (Create / Update)
studentForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const studentData = {
    studentId: studentIdInput.value.trim().toUpperCase(),
    name: nameInput.value.trim(),
    email: emailInput.value.trim().toLowerCase(),
    department: departmentInput.value,
    semester: Number(semesterInput.value),
    contact: contactInput.value.trim()
  };

  // Basic client validation
  if (!studentData.studentId || !studentData.name || !studentData.email || !studentData.department || !studentData.semester) {
    showToast('Please fill in all required fields.', 'error');
    return;
  }

  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner" style="width: 16px; height: 16px; margin: 0 6px 0 0; display: inline-block; vertical-align: middle;"></span> Saving...';

  try {
    let res;
    if (isEditMode) {
      // Update existing student
      const idToUpdate = editOriginalId.value;
      res = await fetch(`${API_BASE_URL}/api/students/${encodeURIComponent(idToUpdate)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
    } else {
      // Create new student
      res = await fetch(`${API_BASE_URL}/api/students`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentData)
      });
    }

    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Operation failed on server.');
    }

    showToast(result.message || (isEditMode ? 'Student updated successfully!' : 'Student added successfully!'), 'success');
    resetForm();
    await fetchStudents();
    await checkConnectivity();
  } catch (err) {
    console.error('Submit error:', err);
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `<span class="btn-text">${isEditMode ? 'Update Student' : 'Add Student'}</span>`;
  }
});

// 4. Start Edit Mode
window.startEditStudent = function (studentId) {
  const student = currentStudents.find(s => s.studentId === studentId);
  if (!student) return;

  isEditMode = true;
  editOriginalId.value = student.studentId;
  studentIdInput.value = student.studentId;
  studentIdInput.disabled = true; // Student ID acts as immutable primary key in edit
  nameInput.value = student.name;
  emailInput.value = student.email;
  departmentInput.value = student.department;
  semesterInput.value = student.semester;
  contactInput.value = student.contact || '';

  formTitle.textContent = 'Edit Student Details';
  formModeBadge.textContent = 'Update Mode';
  formModeBadge.style.color = '#38bdf8';
  submitBtn.innerHTML = '<span class="btn-text">Update Student</span>';
  cancelEditBtn.style.display = 'inline-block';

  studentForm.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Reset Form & Exit Edit Mode
function resetForm() {
  studentForm.reset();
  isEditMode = false;
  editOriginalId.value = '';
  studentIdInput.disabled = false;
  formTitle.textContent = 'Add New Student';
  formModeBadge.textContent = 'Create Mode';
  formModeBadge.style.color = '';
  submitBtn.innerHTML = '<span class="btn-text">Add Student</span>';
  cancelEditBtn.style.display = 'none';
}

cancelEditBtn.addEventListener('click', resetForm);

// 5. Delete Student (Delete)
window.promptDelete = function (id, name) {
  pendingDeleteId = id;
  deleteModalText.innerHTML = `Are you sure you want to delete student <strong>${escapeHtml(name)}</strong> (<code>${escapeHtml(id)}</code>)? This action will permanently remove the record from MongoDB Atlas.`;
  deleteModal.style.display = 'flex';
};

cancelDeleteBtn.addEventListener('click', () => {
  pendingDeleteId = null;
  deleteModal.style.display = 'none';
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (!pendingDeleteId) return;

  confirmDeleteBtn.disabled = true;
  confirmDeleteBtn.textContent = 'Deleting...';

  try {
    const res = await fetch(`${API_BASE_URL}/api/students/${encodeURIComponent(pendingDeleteId)}`, {
      method: 'DELETE'
    });
    const result = await res.json();

    if (!res.ok) {
      throw new Error(result.message || 'Failed to delete record.');
    }

    showToast(result.message || 'Student record deleted successfully.', 'success');
    deleteModal.style.display = 'none';
    pendingDeleteId = null;
    await fetchStudents();
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    confirmDeleteBtn.disabled = false;
    confirmDeleteBtn.textContent = 'Delete Record';
  }
});

// ==========================================
// Event Listeners for Filters & Toolbar
// ==========================================
let searchDebounceTimer;
searchInput.addEventListener('input', () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    fetchStudents();
  }, 300);
});

semesterFilter.addEventListener('change', renderStudentsTable);

refreshBtn.addEventListener('click', async () => {
  await checkConnectivity();
  await fetchStudents();
  showToast('Refreshed data from cloud backend.', 'info');
});

// API Base URL persistence
apiUrlInput.value = API_BASE_URL;
saveApiBtn.addEventListener('click', () => {
  let newUrl = apiUrlInput.value.trim();
  if (newUrl.endsWith('/')) {
    newUrl = newUrl.slice(0, -1);
  }
  if (!newUrl) {
    showToast('Please enter a valid URL', 'error');
    return;
  }
  API_BASE_URL = newUrl;
  localStorage.setItem('STUDENT_API_URL', newUrl);
  showToast(`Backend API URL updated to: ${newUrl}`, 'info');
  checkConnectivity();
  fetchStudents();
});

// Initialize on page load
window.addEventListener('DOMContentLoaded', async () => {
  await checkConnectivity();
  await fetchStudents();
});
