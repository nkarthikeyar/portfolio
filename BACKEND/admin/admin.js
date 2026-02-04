const API_URL = window.BACKEND_URL || window.location.origin;
const ADMIN_KEY_STORAGE = 'adminKey';

const adminKeyInput = document.getElementById('adminKey');
const saveKeyBtn = document.getElementById('saveKeyBtn');
const keyStatus = document.getElementById('keyStatus');
const refreshBtn = document.getElementById('refreshBtn');
const usersList = document.getElementById('usersList');
const blogsList = document.getElementById('blogsList');
const pendingBlogsCount = document.getElementById('pendingBlogsCount');
const pendingUsersCount = document.getElementById('pendingUsersCount');

function getAdminKey() {
  return sessionStorage.getItem(ADMIN_KEY_STORAGE) || '';
}

function setAdminKey(value) {
  sessionStorage.setItem(ADMIN_KEY_STORAGE, value);
}

function setKeyStatus(message, isError) {
  keyStatus.textContent = message;
  keyStatus.style.color = isError ? '#f87171' : '#a7f3d0';
}

function authHeaders() {
  const key = getAdminKey();
  return {
    'Content-Type': 'application/json',
    'x-admin-key': key
  };
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

async function loadNotifications() {
  try {
    const data = await fetchJson(`${API_URL}/api/notifications`, {
      headers: authHeaders()
    });
    pendingBlogsCount.textContent = data.pendingBlogs || 0;
    pendingUsersCount.textContent = data.pendingUsers || 0;
  } catch (error) {
    console.error('Load notifications error:', error);
  }
}

async function loadPendingBlogs() {
  try {
    const data = await fetchJson(`${API_URL}/api/admin/blogs/pending`, {
      headers: authHeaders()
    });
    renderBlogs(data.blogs || []);
  } catch (error) {
    blogsList.innerHTML = `<div class="card">❌ ${error.message}</div>`;
  }
}

async function loadPendingUsers() {
  try {
    const data = await fetchJson(`${API_URL}/api/admin/users/pending`, {
      headers: authHeaders()
    });
    renderUsers(data.users || []);
  } catch (error) {
    usersList.innerHTML = `<div class="card">❌ ${error.message}</div>`;
  }
}

function renderBlogs(blogs) {
  if (!blogs.length) {
    blogsList.innerHTML = '<div class="card"><p style="color: #10b981; font-size: 18px;">✅ All Done! No pending blogs waiting for approval.</p></div>';
    return;
  }

  blogsList.innerHTML = blogs.map(blog => {
    const title = blog.title || 'Untitled';
    const author = blog.author?.name || 'Unknown';
    const email = blog.author?.email || 'N/A';
    const createdDate = new Date(blog.createdAt).toLocaleDateString();
    return `
      <div class="card" style="border-left: 4px solid #3b82f6;">
        <div class="card-content">
          <h3 style="color: #fff; margin-bottom: 10px;">📄 ${title}</h3>
          <div style="display: grid; gap: 8px; color: #cbd5e1; font-size: 14px;">
            <p><strong style="color: #3b82f6;">👤 From:</strong> ${author}</p>
            <p><strong style="color: #3b82f6;">📧 Email:</strong> ${email}</p>
            <p><strong style="color: #3b82f6;">🏷️ Category:</strong> ${blog.category || 'N/A'}</p>
            <p><strong style="color: #3b82f6;">📅 Submitted:</strong> ${createdDate}</p>
            <p><strong style="color: #3b82f6;">📝 Preview:</strong> ${blog.excerpt?.substring(0, 80) || 'No excerpt'}...</p>
          </div>
        </div>
        <div class="card-actions">
          <button onclick="approveBlog('${blog._id}')" style="background: #10b981; color: white;">✓ Approve & Publish</button>
          <button class="danger" onclick="rejectBlog('${blog._id}')" style="background: #ef4444; color: white;">✕ Reject</button>
        </div>
      </div>
    `;
  }).join('');
}

function renderUsers(users) {
  if (!users.length) {
    usersList.innerHTML = '<div class="card"><p>✅ No pending users.</p></div>';
    return;
  }

  usersList.innerHTML = users.map(user => {
    return `
      <div class="card">
        <div class="card-content">
          <h3>${user.name}</h3>
          <p><strong>Email:</strong> ${user.email}</p>
        </div>
        <div class="card-actions">
          <button onclick="approveUser('${user._id}')">✓ Approve</button>
          <button class="danger" onclick="rejectUser('${user._id}')">✕ Reject</button>
        </div>
      </div>
    `;
  }).join('');
}

async function approveUser(id) {
  try {
    await fetchJson(`${API_URL}/api/admin/users/${id}/approve`, {
      method: 'POST',
      headers: authHeaders()
    });
    await loadAll();
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

async function rejectUser(id) {
  try {
    await fetchJson(`${API_URL}/api/admin/users/${id}/reject`, {
      method: 'POST',
      headers: authHeaders()
    });
    await loadAll();
  } catch (error) {
    alert('❌ ' + error.message);
  }
}

async function approveBlog(id) {
  try {
    showNotification('Processing...', 'loading');
    await fetchJson(`${API_URL}/api/admin/blogs/${id}/approve`, {
      method: 'POST',
      headers: authHeaders()
    });
    showNotification('✅ Blog Approved & Published!', 'success');
    await loadAll();
  } catch (error) {
    showNotification('❌ ' + error.message, 'error');
  }
}

async function rejectBlog(id) {
  try {
    showNotification('Processing...', 'loading');
    await fetchJson(`${API_URL}/api/admin/blogs/${id}/reject`, {
      method: 'POST',
      headers: authHeaders()
    });
    showNotification('✗ Blog Rejected', 'error');
    await loadAll();
  } catch (error) {
    showNotification('❌ ' + error.message, 'error');
  }
}

async function loadAll() {
  if (!getAdminKey()) {
    setKeyStatus('Save admin key first.', true);
    return;
  }
  await Promise.all([
    loadNotifications(),
    loadPendingBlogs(),
    loadPendingUsers()
  ]);
}

saveKeyBtn.addEventListener('click', () => {
  const key = adminKeyInput.value.trim();
  if (!key) {
    setKeyStatus('Admin key is required.', true);
    return;
  }
  setAdminKey(key);
  setKeyStatus('✓ Admin key saved for this session.', false);
  adminKeyInput.value = '';
  loadAll();
});

refreshBtn.addEventListener('click', () => {
  if (!getAdminKey()) {
    setKeyStatus('Save admin key first.', true);
    return;
  }
  loadAll();
});

const savedKey = getAdminKey();
if (savedKey) {
  setKeyStatus('✓ Admin key loaded from session.', false);
  loadAll();
  setInterval(loadNotifications, 5000);
}

window.approveUser = approveUser;
window.rejectUser = rejectUser;
window.approveBlog = approveBlog;
window.rejectBlog = rejectBlog;
