// ========================================
// MEDICARE – Auth & API Utilities
// ========================================

const API_BASE = '/api';

// ── Token Management ──
function getToken() {
    return localStorage.getItem('medicare_token');
}

function setToken(token) {
    localStorage.setItem('medicare_token', token);
}

function getUser() {
    const token = getToken();
    if (!token) return null;
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload;
    } catch {
        return null;
    }
}

function logout() {
    localStorage.removeItem('medicare_token');
    localStorage.removeItem('medicare_user_name');
    window.location.href = '/login.html';
}

function getUserName() {
    return localStorage.getItem('medicare_user_name') || getUser()?.name || 'User';
}

// ── Authenticated Fetch Wrapper ──
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (response.status === 401 || response.status === 403) {
            logout();
            return null;
        }

        if (!response.ok) {
            throw new Error(data.error || 'Something went wrong');
        }

        return data;
    } catch (err) {
        if (err.message !== 'Failed to fetch') {
            showToast(err.message, 'error');
        }
        throw err;
    }
}

// ── Page Protection ──
function requireAuth(allowedRoles = []) {
    const user = getUser();
    if (!user) {
        window.location.href = '/login.html';
        return false;
    }
    if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
        window.location.href = '/login.html';
        return false;
    }
    return true;
}

// ── Role-based Redirect ──
function redirectByRole(role) {
    switch (role) {
        case 'patient':
            window.location.href = '/dashboard.html';
            break;
        case 'doctor_user':
            window.location.href = '/doctor_dashboard.html';
            break;
        case 'admin':
            window.location.href = '/admin_dashboard.html';
            break;
        default:
            window.location.href = '/login.html';
    }
}

// ── Toast Notifications ──
function showToast(message, type = 'info') {
    const existing = document.querySelectorAll('.toast');
    existing.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);

    setTimeout(() => toast.remove(), 4000);
}

// ── Navbar Renderer ──
function renderNavbar(activePage = '') {
    const user = getUser();
    const userName = getUserName();

    let navLinks = '';

    if (user?.role === 'patient') {
        navLinks = `
            <a href="/dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
            <a href="/doctor_booking.html" class="${activePage === 'booking' ? 'active' : ''}">Find & Book Doctor</a>
            <a href="/reminders.html" class="${activePage === 'reminders' ? 'active' : ''}">Reminders</a>
            <a href="/chatbot.html" class="${activePage === 'chatbot' ? 'active' : ''}">AI Chat</a>
        `;
    } else if (user?.role === 'doctor_user') {
        navLinks = `
            <a href="/doctor_dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
        `;
    } else if (user?.role === 'admin') {
        navLinks = `
            <a href="/admin_dashboard.html" class="${activePage === 'dashboard' ? 'active' : ''}">Dashboard</a>
        `;
    }

    return `
        <nav class="navbar">
            <div class="navbar-brand">
                <span class="brand-icon"><i class="fas fa-heartbeat"></i></span>
                MEDICARE
            </div>
            <div class="navbar-nav">
                ${navLinks}
            </div>
            <div class="navbar-user">
                <span class="user-name">👋 ${userName}</span>
                <button class="btn btn-logout" onclick="logout()">Logout</button>
            </div>
        </nav>
    `;
}

// ── Date Formatters ──
function formatDate(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

function formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const h12 = hour % 12 || 12;
    return `${h12}:${m} ${ampm}`;
}

function formatDateTime(dateStr) {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
}

// ── Push Notification Setup ──
function urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
        .replace(/\-/g, '+')
        .replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}

async function setupPushNotifications() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        console.warn('Push notifications not supported by the browser.');
        return;
    }

    try {
        // Register Service Worker
        const registration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered');

        // Request Notification Permission
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
            console.log('Notification permission not granted');
            return;
        }

        // Check for existing subscription
        let subscription = await registration.pushManager.getSubscription();
        
        if (!subscription) {
            // Get VAPID public key from backend
            const response = await apiFetch('/patient/vapidPublicKey');
            if (!response || !response.publicKey) return;

            const convertedVapidKey = urlBase64ToUint8Array(response.publicKey);

            // Subscribe the user
            subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: convertedVapidKey
            });
        }

        // Always sync subscription to backend, especially if the database was reset
        await apiFetch('/patient/push-subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription)
        });
        console.log('Push subscription saved and synced to server.');
    } catch (err) {
        console.error('Push setup failed:', err);
    }
}

// Automatically setup if the user is authenticated as a patient
if (getUser() && getUser().role === 'patient') {
    // Slight delay to allow DOM to render before requesting permission
    setTimeout(setupPushNotifications, 1000);
}
