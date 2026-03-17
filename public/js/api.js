/**
 * API Fetch Wrapper - JWT otomatik yonetimi
 */
const API = {
  baseUrl: '/api',
  accessToken: null,

  setToken(token) {
    this.accessToken = token;
  },

  clearToken() {
    this.accessToken = null;
  },

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      let res = await fetch(url, { ...options, headers, credentials: 'include' });

      // Token expired - try refresh
      if (res.status === 401 && this.accessToken) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          res = await fetch(url, { ...options, headers, credentials: 'include' });
        } else {
          Auth.logout();
          return { error: 'session_expired', message: 'Oturum suresi doldu' };
        }
      }

      const data = await res.json();
      if (!res.ok) {
        return { ...data, _status: res.status };
      }
      return data;
    } catch (err) {
      console.error('API Error:', err);
      return { error: 'network_error', message: 'Baglanti hatasi' };
    }
  },

  async refreshToken() {
    try {
      const res = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        this.accessToken = data.accessToken;
        localStorage.setItem('accessToken', data.accessToken);
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  },

  // Shorthand methods
  get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  },

  post(endpoint, body) {
    return this.request(endpoint, { method: 'POST', body: JSON.stringify(body) });
  },

  put(endpoint, body) {
    return this.request(endpoint, { method: 'PUT', body: JSON.stringify(body) });
  },

  del(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  },

  async upload(endpoint, formData) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {};
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }
    // Content-Type bilerek eklenmez (multipart boundary otomatik ayarlanir)
    try {
      const res = await fetch(url, { method: 'POST', headers, body: formData, credentials: 'include' });
      return await res.json();
    } catch (err) {
      return { error: 'upload_error', message: 'Yukleme hatasi' };
    }
  },
};
