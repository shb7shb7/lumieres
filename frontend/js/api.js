// ── Configuration ────────────────────────────────────────────────────────────
// Remplacez cette URL par celle de votre service Render après déploiement
const API_BASE = window.API_BASE || 'https://VOTRE-SERVICE.onrender.com';

// ── Helpers ──────────────────────────────────────────────────────────────────
function getToken() { return localStorage.getItem('lum_token'); }
function setToken(t) { localStorage.setItem('lum_token', t); }
function clearToken() { localStorage.removeItem('lum_token'); }

async function apiFetch(path, options = {}) {
  const token = getToken();
  const res = await fetch(API_BASE + path, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(err.error || 'Erreur serveur');
  }
  return res.json();
}

// ── Auth ──────────────────────────────────────────────────────────────────────
async function login(email, password) {
  const data = await apiFetch('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  setToken(data.token);
  return data;
}

function logout() {
  clearToken();
  window.location.reload();
}

// ── Products ──────────────────────────────────────────────────────────────────
async function getProducts() { return apiFetch('/api/products'); }

async function createProduct(data) {
  return apiFetch('/api/products', { method: 'POST', body: JSON.stringify(data) });
}

async function updateProduct(id, data) {
  return apiFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(data) });
}

async function deleteProduct(id) {
  return apiFetch(`/api/products/${id}`, { method: 'DELETE' });
}

// ── Orders ────────────────────────────────────────────────────────────────────
async function placeOrder(data) {
  return apiFetch('/api/orders', { method: 'POST', body: JSON.stringify(data) });
}

async function getOrders() { return apiFetch('/api/orders'); }

async function updateOrderStatus(id, status) {
  return apiFetch(`/api/orders/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) });
}

// ── Stats ─────────────────────────────────────────────────────────────────────
async function getStats() { return apiFetch('/api/stats'); }
