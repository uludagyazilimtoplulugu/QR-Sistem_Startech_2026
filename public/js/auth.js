/**
 * Auth State Management
 */
const Auth = {
  user: null,

  init() {
    const token = localStorage.getItem('accessToken');
    const userStr = localStorage.getItem('user');
    if (token && userStr) {
      API.setToken(token);
      this.user = JSON.parse(userStr);
    }
  },

  isLoggedIn() {
    return !!this.user && !!API.accessToken;
  },

  setUser(user, accessToken) {
    this.user = user;
    API.setToken(accessToken);
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('user', JSON.stringify(user));
  },

  async logout() {
    await API.post('/auth/logout');
    this.user = null;
    API.clearToken();
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    window.location.hash = '#/login';
  },

  async refreshProfile() {
    const data = await API.get('/user/profile');
    if (data.user) {
      this.user = {
        id: data.user.id,
        email: data.user.email,
        fullName: data.user.fullName,
        role: data.user.role,
        totalPoints: data.user.totalPoints,
        assignedRoomId: data.user.assignedRoomId,
      };
      localStorage.setItem('user', JSON.stringify(this.user));
      App.updateNav();
    }
  },
};
