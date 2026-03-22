/**
 * SPA Router & App Controller
 */
const App = {
  currentPage: null,

  async init() {
    // Service Worker kayit
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {});
    }

    Auth.init();
    await I18n.init();

    // Event listeners
    document.getElementById('btn-logout').addEventListener('click', () => Auth.logout());
    document.getElementById('btn-lang').addEventListener('click', () => I18n.toggle());

    // Hash router
    window.addEventListener('hashchange', () => this.route());
    this.route();
  },

  async route() {
    const hash = window.location.hash || '#/login';
    const path = hash.slice(1); // Remove #

    // Cleanup previous page
    if (this.currentPage) {
      QR.destroy();
      Scanner.destroy();
      if (this._eventPollInterval) {
        clearInterval(this._eventPollInterval);
        this._eventPollInterval = null;
      }
    }

    // Auth guard
    if (!Auth.isLoggedIn() && !['/login', '/register', '/forgot-password'].includes(path)) {
      window.location.hash = '#/login';
      return;
    }

    if (Auth.isLoggedIn() && ['/login', '/register', '/forgot-password'].includes(path)) {
      // Kayıt görevli direkt kayıt sayfasına gitsin
      if (Auth.user && Auth.user.role === 'kayit_gorevli') {
        window.location.hash = '#/registration-desk';
      } else {
        window.location.hash = '#/dashboard';
      }
      return;
    }

    // Kayıt görevli dashboard'a erişmesin, kayıt sayfasına yönlensin
    if (Auth.isLoggedIn() && Auth.user && Auth.user.role === 'kayit_gorevli' && path === '/dashboard') {
      window.location.hash = '#/registration-desk';
      return;
    }

    // Route map
    const routes = {
      '/login': { page: 'login', auth: false },
      '/register': { page: 'register', auth: false },
      '/forgot-password': { page: 'forgot-password', auth: false },
      '/dashboard': { page: 'dashboard', auth: true },
      '/scan': { page: 'scan', auth: true, roles: ['participant'] },
      '/my-qr': { page: 'my-qr', auth: true, roles: ['mentor', 'startup'] },
      '/leaderboard': { page: 'leaderboard', auth: true, roles: ['admin'] },
      '/registration-desk': { page: 'registration-desk', auth: true, roles: ['kayit_gorevli', 'admin'] },
      '/room-gate': { page: 'room-gate', auth: true, roles: ['gorevli'] },
      '/admin': { page: 'admin', auth: true, roles: ['admin'] },
    };

    const route = routes[path] || routes['/dashboard'];

    // Role guard
    if (route.roles && Auth.user && !route.roles.includes(Auth.user.role)) {
      window.location.hash = '#/dashboard';
      return;
    }

    // Etkinlik aktif değilse admin ve kayıt görevli dışındaki rolleri dashboard'da tut
    if (route.auth && route.page !== 'dashboard' && Auth.user && Auth.user.role !== 'admin' && Auth.user.role !== 'kayit_gorevli') {
      try {
        const ev = await API.get('/event/status');
        if (!ev.event?.is_active) {
          window.location.hash = '#/dashboard';
          return;
        }
      } catch (e) {}
    }

    // Show/hide nav
    const showNav = route.auth;
    document.getElementById('top-nav').classList.toggle('hidden', !showNav);
    document.getElementById('bottom-nav').classList.toggle('hidden', !showNav);

    if (showNav) {
      this.updateNav();
    }

    // Load page
    await this.loadPage(route.page);
    this.updateBottomNav(path);
  },

  async loadPage(pageName) {
    const content = document.getElementById('app-content');
    try {
      const res = await fetch(`/pages/${pageName}.html`);
      if (!res.ok) throw new Error('Page not found');
      const html = await res.text();
      content.innerHTML = html;
      this.currentPage = pageName;

      // Init page-specific JS
      I18n.updatePage();
      this.initPage(pageName);
    } catch (err) {
      content.innerHTML = '<div class="page"><h2>Sayfa bulunamadı</h2></div>';
    }
  },

  initPage(pageName) {
    switch (pageName) {
      case 'login': this.initLoginPage(); break;
      case 'register': this.initRegisterPage(); break;
      case 'forgot-password': this.initForgotPasswordPage(); break;
      case 'dashboard': this.initDashboardPage(); break;
      case 'scan': this.initScanPage(); break;
      case 'my-qr': this.initMyQrPage(); break;
      case 'leaderboard': this.initLeaderboardPage(); break;
      case 'registration-desk': this.initRegistrationDeskPage(); break;
      case 'room-gate': this.initRoomGatePage(); break;
      case 'admin': this.initAdminPage(); break;
    }
  },

  updateNav() {
    if (!Auth.user) return;
    document.getElementById('nav-username').textContent = Auth.user.fullName;
    const badge = document.getElementById('nav-role-badge');
    badge.textContent = Utils.roleLabel(Auth.user.role);
    badge.className = `role-badge ${Auth.user.role}`;

    const pointsEl = document.getElementById('nav-points');
    if (Auth.user.role === 'participant') {
      pointsEl.textContent = `⭐ ${Auth.user.totalPoints || 0}`;
      pointsEl.classList.remove('hidden');
    } else {
      pointsEl.classList.add('hidden');
    }

    // Role-based nav items
    document.querySelectorAll('.nav-participant').forEach(el => {
      el.classList.toggle('hidden', Auth.user.role !== 'participant');
    });
    document.querySelectorAll('.nav-mentor-startup').forEach(el => {
      el.classList.toggle('hidden', Auth.user.role !== 'mentor' && Auth.user.role !== 'startup');
    });
    document.querySelectorAll('.nav-gorevli').forEach(el => {
      el.classList.toggle('hidden', Auth.user.role !== 'gorevli');
    });
    document.querySelectorAll('.nav-kayit-gorevli').forEach(el => {
      el.classList.toggle('hidden', Auth.user.role !== 'kayit_gorevli' && Auth.user.role !== 'admin');
    });
    // Kayıt görevli ana sayfa butonunu görmesin
    if (Auth.user.role === 'kayit_gorevli') {
      document.querySelector('.nav-item[data-page="dashboard"]')?.classList.add('hidden');
    }
    document.querySelectorAll('.nav-admin').forEach(el => {
      el.classList.toggle('hidden', Auth.user.role !== 'admin');
    });
  },

  updateBottomNav(path) {
    document.querySelectorAll('.nav-item').forEach(item => {
      const href = item.getAttribute('href');
      item.classList.toggle('active', href === `#${path}`);
    });
  },

  // ===================== PAGE INITIALIZERS =====================

  initLoginPage() {
    const form = Utils.$('#login-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = Utils.$('#login-email').value;
      const password = Utils.$('#login-password').value;
      const btn = Utils.$('#login-btn');
      btn.disabled = true;
      btn.textContent = '...';

      const data = await API.post('/auth/login', { email, password });
      if (data.error) {
        Toast.error(data.message);
        btn.disabled = false;
        btn.textContent = I18n.t('auth.login_btn') || 'Giriş Yap';
      } else {
        Auth.setUser(data.user, data.accessToken);
        Toast.success(data.message);
        window.location.hash = '#/dashboard';
      }
    });
  },

  initRegisterPage() {
    const form = Utils.$('#register-form');
    if (!form) return;
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const fullName = Utils.$('#reg-name').value;
      const email = Utils.$('#reg-email').value;
      const password = Utils.$('#reg-password').value;
      const btn = Utils.$('#register-btn');
      btn.disabled = true;

      const data = await API.post('/auth/register', { fullName, email, password });
      if (data.error) {
        Toast.error(data.message);
        btn.disabled = false;
      } else {
        Auth.setUser(data.user, data.accessToken);
        Toast.success(data.message);
        window.location.hash = '#/dashboard';
      }
    });
  },

  initForgotPasswordPage() {
    const stepEmail = Utils.$('#fp-step-email');
    const stepCode = Utils.$('#fp-step-code');

    Utils.$('#fp-email-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = Utils.$('#fp-email').value;
      const data = await API.post('/auth/forgot-password', { email });
      Toast.info(data.message);
      if (!data.error) {
        stepEmail.classList.add('hidden');
        stepCode.classList.remove('hidden');
      }
    });

    Utils.$('#fp-code-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = Utils.$('#fp-email').value;
      const code = Utils.$('#fp-code').value;
      const newPassword = Utils.$('#fp-new-password').value;
      const data = await API.post('/auth/reset-password', { email, code, newPassword });
      if (data.error) {
        Toast.error(data.message);
      } else {
        Toast.success(data.message);
        window.location.hash = '#/login';
      }
    });
  },

  // Polling interval reference (temizlik icin)
  _eventPollInterval: null,

  async initDashboardPage() {
    await Auth.refreshProfile();

    // Onceki polling varsa temizle
    if (this._eventPollInterval) {
      clearInterval(this._eventPollInterval);
      this._eventPollInterval = null;
    }

    // Etkinlik durumunu kontrol et (public endpoint — tum roller erisebilir)
    const eventData = await API.get('/event/status');
    const isActive = eventData.event?.is_active;

    const passiveEl = Utils.$('#passive-container');
    const activeEl = Utils.$('#active-container');

    if (!isActive && Auth.user.role !== 'admin') {
      if (passiveEl) passiveEl.classList.remove('hidden');
      if (activeEl) activeEl.classList.add('hidden');

      // Role göre sadece ilgili rehber kartını göster
      const role = Auth.user.role;
      const guideParticipant = Utils.$('#guide-participant');
      const guideMentor = Utils.$('#guide-mentor');
      const guideGorevli = Utils.$('#guide-gorevli');
      if (guideParticipant) guideParticipant.style.display = (role === 'participant') ? '' : 'none';
      if (guideMentor) guideMentor.style.display = (role === 'mentor' || role === 'startup') ? '' : 'none';
      if (guideGorevli) guideGorevli.style.display = (role === 'gorevli') ? '' : 'none';

      // Etkinlik pasifken dashboard dışı nav linklerini gizle
      document.querySelectorAll('.nav-item[data-page]:not([data-page="dashboard"])').forEach(el => {
        el.classList.add('hidden');
      });

      // Her 5 saniyede event durumunu kontrol et
      this._eventPollInterval = setInterval(async () => {
        const check = await API.get('/event/status');
        if (check.event?.is_active) {
          clearInterval(this._eventPollInterval);
          this._eventPollInterval = null;
          // Nav linklerini tekrar göster
          this.updateNav();
          // Sayfayı yeniden yükle — aktif içeriği göster
          this.initDashboardPage();
        }
      }, 5000);
      return;
    }

    if (passiveEl) passiveEl.classList.add('hidden');
    if (activeEl) activeEl.classList.remove('hidden');

    // Stats — sadece katilimci gorecek
    const statsEl = Utils.$('#dash-stats');
    if (statsEl) {
      if (Auth.user.role === 'participant') {
        statsEl.classList.remove('hidden');
        const pointsEl = Utils.$('#dash-points');
        if (pointsEl) pointsEl.textContent = Auth.user.totalPoints || 0;
        // Girilen oda sayisini getir
        const roomsEl = Utils.$('#dash-rooms');
        if (roomsEl) {
          const txData2 = await API.get('/user/transactions?limit=100');
          if (txData2.transactions) {
            const roomCount = txData2.transactions.filter(t => t.type === 'room_exit' || t.description?.includes('Oda')).length;
            roomsEl.textContent = roomCount;
          }
        }
      }
    }

    // Son islemler
    const txData = await API.get('/user/transactions?limit=10');
    const txList = Utils.$('#dash-transactions');
    if (txList && txData.transactions) {
      txList.innerHTML = txData.transactions.map(tx => `
        <div class="list-item">
          <div class="list-item-info">
            <div class="list-item-name">${Utils.escapeHtml(tx.description || tx.type)}</div>
            <div class="list-item-sub">${Utils.formatDate(tx.created_at)}</div>
          </div>
          <span class="${tx.points >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700">
            ${Utils.formatPoints(tx.points)}
          </span>
        </div>
      `).join('');

      if (txData.transactions.length === 0) {
        txList.innerHTML = '<div class="empty-state"><div class="emoji">📋</div><p>Henüz işlem yok</p></div>';
      }
    }

    // Gorevli: Odadaki katilimcilar
    if (Auth.user.role === 'gorevli') {
      const gorevliSection = Utils.$('#gorevli-room-section');
      if (gorevliSection) {
        gorevliSection.classList.remove('hidden');
        this.loadDashActiveParticipants();
      }
    }

    // Mentor/Startup: Bekleyen onaylar
    if (Auth.user.role === 'mentor' || Auth.user.role === 'startup') {
      const approvalSection = Utils.$('#approval-section');
      if (approvalSection) {
        approvalSection.classList.remove('hidden');
        this.loadPendingApprovals();
      }
    }

    // Surpriz kod alani (sadece katilimcilar)
    if (Auth.user.role === 'participant') {
      const surpriseSection = Utils.$('#surprise-section');
      if (surpriseSection) surpriseSection.classList.remove('hidden');

      Utils.$('#surprise-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = Utils.$('#surprise-code-input').value;
        const data = await API.post('/surprise/redeem', { code });
        if (data.error) {
          Toast.error(data.message);
        } else {
          Toast.success(data.message);
          Utils.$('#surprise-code-input').value = '';
          await Auth.refreshProfile();
          const pointsEl = Utils.$('#dash-points');
          if (pointsEl) pointsEl.textContent = Auth.user.totalPoints || 0;
          // Son islemleri de guncelle
          const txData = await API.get('/user/transactions?limit=10');
          const txList = Utils.$('#dash-transactions');
          if (txList && txData.transactions) {
            txList.innerHTML = txData.transactions.map(tx => `
              <div class="list-item">
                <div class="list-item-info">
                  <div class="list-item-name">${Utils.escapeHtml(tx.description || tx.type)}</div>
                  <div class="list-item-sub">${Utils.formatDate(tx.created_at)}</div>
                </div>
                <span class="${tx.points >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700">
                  ${Utils.formatPoints(tx.points)}
                </span>
              </div>
            `).join('');
          }
        }
      });
    }
  },

  async loadPendingApprovals() {
    const data = await API.get('/approval/pending');
    const list = Utils.$('#pending-list');
    if (!list || !data.pending) return;

    list.innerHTML = data.pending.map(item => `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-name">${Utils.escapeHtml(item.participant_name)}</div>
          <div class="list-item-sub">${Utils.escapeHtml(item.participant_email)} · ${item.points_to_award} puan</div>
        </div>
        <div class="list-item-actions">
          <button class="btn btn-success btn-sm" onclick="App.handleApproval('${item.id}', true)">✓</button>
          <button class="btn btn-danger btn-sm" onclick="App.handleApproval('${item.id}', false)">✕</button>
        </div>
      </div>
    `).join('');

    if (data.pending.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Bekleyen onay yok</p></div>';
    }
  },

  async handleApproval(id, approve) {
    const endpoint = approve ? `/approval/${id}/approve` : `/approval/${id}/reject`;
    const data = await API.post(endpoint);
    if (data.error) {
      Toast.error(data.message);
    } else {
      Toast.success(data.message);
      this.loadPendingApprovals();
    }
  },

  initMyQrPage() {
    QR.generate('qr-display');
  },

  initScanPage() {
    // Tabs
    const tabs = Utils.$$('.scan-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');

        const target = tab.dataset.target;
        Utils.$$('.scan-panel').forEach(p => p.classList.add('hidden'));
        Utils.$(`#${target}`)?.classList.remove('hidden');

        if (target === 'my-qr-panel') {
          Scanner.destroy();
          QR.generate('qr-display');
        } else if (target === 'scan-panel') {
          QR.destroy();
          // DOM repaint icin kisa bekleme
          setTimeout(() => {
            Scanner.start('qr-reader', async (content) => {
              const data = await API.post('/scan/qr', { qrContent: content });
              if (data.error || data._status) {
                Toast.error(data.message);
              } else if (data.status === 'success') {
                Toast.success(data.message);
                Auth.refreshProfile();
              } else if (data.status === 'pending') {
                Toast.pending(data.message);
              } else if (data.status === 'warning') {
                Toast.warning(data.message);
              } else {
                Toast.info(data.message);
              }
            });
          }, 150);
        }
      });
    });

    // Varsayilan: QR kodum
    QR.generate('qr-display');

    // Manuel kod girisi (tek alan — surpriz veya karsilikli tarama)
    Utils.$('#code-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = Utils.$('#code-input').value.trim();
      if (!code) return;
      const btn = e.target.querySelector('button[type="submit"]');
      if (btn) { btn.disabled = true; btn.textContent = '...'; }

      const data = await API.post('/code/redeem', { code });
      if (data.error || data.status === 'error') {
        Toast.error(data.message);
      } else if (data.status === 'success') {
        Toast.success(data.message);
        Auth.refreshProfile();
        Utils.$('#code-input').value = '';
      } else if (data.status === 'pending') {
        Toast.pending(data.message);
        Utils.$('#code-input').value = '';
      } else if (data.status === 'warning') {
        Toast.warning(data.message);
      } else {
        Toast.info(data.message);
      }

      if (btn) { btn.disabled = false; btn.textContent = I18n.t('scan.verify') || 'Onayla'; }
    });
  },

  async initLeaderboardPage() {
    const data = await API.get('/leaderboard');
    if (data.error) {
      Toast.error(data.message);
      return;
    }

    const list = Utils.$('#leaderboard-list');
    if (list && data.participants) {
      list.innerHTML = data.participants.map((p, i) => `
        <div class="list-item">
          <span class="rank-number ${i < 3 ? `top-${i+1}` : ''}">${i + 1}</span>
          <div class="list-item-info">
            <div class="list-item-name">${Utils.escapeHtml(p.full_name)}</div>
          </div>
          <span style="font-weight:800; color: var(--warning);">⭐ ${p.total_points}</span>
        </div>
      `).join('');
    }

    // Mentor & Startup listesi
    const msList = Utils.$('#ms-list');
    if (msList && data.mentorsAndStartups) {
      msList.innerHTML = data.mentorsAndStartups.map(p => `
        <div class="list-item">
          <div class="list-item-info">
            <div class="list-item-name">${Utils.escapeHtml(p.full_name)}</div>
            <div class="list-item-sub">${Utils.roleLabel(p.role)}</div>
          </div>
        </div>
      `).join('');
    }
  },

  initRegistrationDeskPage() {
    const form = Utils.$('#reg-check-form');
    const resultEl = Utils.$('#reg-result');
    if (!form || !resultEl) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = Utils.$('#reg-check-email').value.trim().toLowerCase();
      if (!email) return;

      const btn = form.querySelector('button[type="submit"]');
      btn.disabled = true;
      btn.textContent = '...';

      const data = await API.get(`/registration/check?email=${encodeURIComponent(email)}`);
      btn.disabled = false;
      btn.textContent = 'Kontrol Et';
      resultEl.classList.remove('hidden');

      if (data.status === 'registered') {
        resultEl.innerHTML = `
          <div class="card" style="border-left:4px solid var(--success)">
            <div class="text-success" style="font-weight:700">✓ Kayıtlı Kullanıcı</div>
            <div class="mt-8">${Utils.escapeHtml(data.user.fullName)} · ${Utils.roleLabel(data.user.role)}</div>
          </div>`;
      } else if (data.status === 'whitelisted') {
        resultEl.innerHTML = `
          <div class="card" style="border-left:4px solid var(--warning)">
            <div class="text-warning" style="font-weight:700">⏳ Whitelist'te — Henüz Kayıt Olmamış</div>
            <div class="mt-8">Rol: ${Utils.roleLabel(data.role)}</div>
          </div>`;
      } else if (data.status === 'not_found') {
        resultEl.innerHTML = `
          <div class="card" style="border-left:4px solid var(--danger)">
            <div class="text-danger" style="font-weight:700">✕ Bulunamadı</div>
            <div class="mt-16">
              <button class="btn btn-primary" id="reg-add-btn">Katılımcı Olarak Ekle</button>
            </div>
          </div>`;
        Utils.$('#reg-add-btn')?.addEventListener('click', async () => {
          const addBtn = Utils.$('#reg-add-btn');
          addBtn.disabled = true;
          addBtn.textContent = '...';
          const addData = await API.post('/registration/add', { email, role: 'participant' });
          if (addData.error) {
            Toast.error(addData.message);
            addBtn.disabled = false;
            addBtn.textContent = 'Katılımcı Olarak Ekle';
          } else {
            Toast.success('Eklendi — kişi artık kayıt olabilir');
            resultEl.innerHTML = `
              <div class="card" style="border-left:4px solid var(--success)">
                <div class="text-success" style="font-weight:700">✓ Whitelist'e Eklendi</div>
                <div class="mt-8">${Utils.escapeHtml(email)} — katılımcı olarak kayıt olabilir</div>
              </div>`;
          }
        });
      } else if (data.error) {
        resultEl.innerHTML = `<div class="text-danger">${Utils.escapeHtml(data.message)}</div>`;
      }
    });
  },

  _currentRoomId: null,

  async initRoomGatePage() {
    await Auth.refreshProfile();
    const roomId = Auth.user.assignedRoomId;
    this._currentRoomId = roomId;

    if (!roomId) {
      Utils.$('#room-gate-content').innerHTML =
        '<div class="empty-state"><p>Size atanmış bir oda yok. Admin tarafından atanmanız gerekiyor.</p></div>';
      return;
    }

    // Oda bilgisini goster
    const rooms = await API.get('/rooms/list');
    const room = rooms.rooms?.find(r => r.id === roomId);
    if (room) {
      Utils.$('#room-name').textContent = room.name;
      Utils.$('#room-type').textContent = room.type === 'interview' ? 'Mülakat' : 'Case Study';
      Utils.$('#room-limit').textContent = room.entry_limit;
      Utils.$('#room-exit-points').textContent = room.exit_points;
    }

    // QR tarama ile giris
    const btnOpen = Utils.$('#btn-room-scan');
    const btnClose = Utils.$('#btn-room-scan-stop');

    btnOpen?.addEventListener('click', () => {
      Scanner.start('room-qr-reader', async (content) => {
        const data = await API.post('/rooms/enter', { qrContent: content, roomId });
        if (data.error || data._status) {
          Toast.error(data.message);
        } else {
          Toast.success(data.message);
          this.loadActiveParticipants();
        }
      });
      btnOpen.classList.add('hidden');
      btnClose.classList.remove('hidden');
    });

    btnClose?.addEventListener('click', () => {
      Scanner.destroy();
      btnClose.classList.add('hidden');
      btnOpen.classList.remove('hidden');
    });

    // Aktif katilimcilari yukle
    this.loadActiveParticipants();
  },

  async loadActiveParticipants() {
    const list = Utils.$('#active-participants-list');
    if (!list) return;
    const data = await API.get('/rooms/active-participants');
    if (data.error) {
      list.innerHTML = '<div class="text-danger">' + Utils.escapeHtml(data.message) + '</div>';
      return;
    }
    if (!data.participants || data.participants.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Odada kimse yok</p></div>';
      return;
    }
    list.innerHTML = data.participants.map(p => `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-name">${Utils.escapeHtml(p.full_name)}</div>
          <div class="list-item-sub">${Utils.escapeHtml(p.email)} · ${p.entry_number}. giris · ${Utils.formatDate(p.entered_at)}</div>
        </div>
        <button class="btn btn-success btn-sm" onclick="App.confirmRoomExit('${p.user_id}')">Tamamla</button>
      </div>
    `).join('');
  },

  async confirmRoomExit(participantId) {
    if (!this._currentRoomId) return;
    const data = await API.post('/rooms/exit', { participantId, roomId: this._currentRoomId });
    if (data.error) {
      Toast.error(data.message);
    } else {
      Toast.success(data.message);
      this.loadActiveParticipants();
    }
  },

  async loadDashActiveParticipants() {
    const list = Utils.$('#dash-active-participants');
    if (!list) return;
    const data = await API.get('/rooms/active-participants');
    if (data.error) {
      list.innerHTML = '<div class="text-muted">' + Utils.escapeHtml(data.message) + '</div>';
      return;
    }
    this._currentRoomId = data.roomId;
    if (!data.participants || data.participants.length === 0) {
      list.innerHTML = '<div class="empty-state"><p>Odada kimse yok</p></div>';
      return;
    }
    list.innerHTML = data.participants.map(p => `
      <div class="list-item">
        <div class="list-item-info">
          <div class="list-item-name">${Utils.escapeHtml(p.full_name)}</div>
          <div class="list-item-sub">${p.entry_number}. giris · ${Utils.formatDate(p.entered_at)}</div>
        </div>
        <button class="btn btn-success btn-sm" onclick="App.confirmRoomExitFromDash('${p.user_id}')">Tamamla</button>
      </div>
    `).join('');
  },

  async confirmRoomExitFromDash(participantId) {
    if (!this._currentRoomId) return;
    const data = await API.post('/rooms/exit', { participantId, roomId: this._currentRoomId });
    if (data.error) {
      Toast.error(data.message);
    } else {
      Toast.success(data.message);
      this.loadDashActiveParticipants();
    }
  },

  async initAdminPage() {
    // Tab sistem
    const tabs = Utils.$$('.admin-tab');
    tabs.forEach(tab => {
      tab.addEventListener('click', () => {
        tabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        Utils.$$('.admin-panel').forEach(p => p.classList.add('hidden'));
        Utils.$(`#${tab.dataset.target}`)?.classList.remove('hidden');
        this.loadAdminSection(tab.dataset.target);
      });
    });

    // Ilk tab'i yukle
    this.loadAdminSection('admin-event');

    // Event butonlari
    Utils.$('#btn-start-event')?.addEventListener('click', async () => {
      const data = await API.post('/admin/event/start');
      if (data.error) Toast.error(data.message);
      else Toast.success(data.message);
      this.loadAdminSection('admin-event');
    });

    Utils.$('#btn-stop-event')?.addEventListener('click', async () => {
      const data = await API.post('/admin/event/stop');
      if (data.error) Toast.error(data.message);
      else Toast.warning(data.message);
      this.loadAdminSection('admin-event');
    });

    // Whitelist form
    Utils.$('#wl-add-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = Utils.$('#wl-email').value;
      const role = Utils.$('#wl-role').value;
      const data = await API.post('/admin/whitelist', { email, role });
      if (data.error) Toast.error(data.message);
      else { Toast.success(data.message); Utils.$('#wl-email').value = ''; this.loadAdminSection('admin-whitelist'); }
    });

    // CSV upload
    Utils.$('#wl-csv-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = Utils.$('#wl-csv-file').files[0];
      if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      const data = await API.upload('/admin/whitelist/csv', fd);
      if (data.error) Toast.error(data.message);
      else { Toast.success(data.message); this.loadAdminSection('admin-whitelist'); }
    });

    // Excel upload
    Utils.$('#wl-excel-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const file = Utils.$('#wl-excel-file').files[0];
      if (!file) return;
      const fd = new FormData(); fd.append('file', file);
      const data = await API.upload('/admin/whitelist/excel', fd);
      if (data.error) Toast.error(data.message);
      else { Toast.success(data.message); this.loadAdminSection('admin-whitelist'); }
    });

    // Room create form
    Utils.$('#room-create-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = Utils.$('#room-name-input').value;
      const type = Utils.$('#room-type-input').value;
      const entryLimit = Utils.$('#room-limit-input').value;
      const exitPoints = Utils.$('#room-points-input').value;
      const data = await API.post('/admin/rooms', { name, type, entryLimit, exitPoints });
      if (data.error) Toast.error(data.message);
      else { Toast.success(data.message); this.loadAdminSection('admin-rooms'); }
    });

    // Surprise code create
    Utils.$('#surprise-create-form')?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const code = Utils.$('#sc-code-input').value;
      const pointsValue = Utils.$('#sc-points-input').value;
      const count = Utils.$('#sc-count-input')?.value;
      const data = await API.post('/admin/surprise-codes', { code: code || undefined, pointsValue, count: parseInt(count) || 1 });
      if (data.error) Toast.error(data.message);
      else { Toast.success(data.message); this.loadAdminSection('admin-surprise'); }
    });
  },

  async loadAdminSection(section) {
    switch (section) {
      case 'admin-event': {
        const data = await API.get('/event/status');
        const el = Utils.$('#event-status');
        if (el && data.event) {
          el.textContent = data.event.is_active ? '🟢 Aktif' : '🔴 Pasif';
        }
        break;
      }
      case 'admin-whitelist': {
        const data = await API.get('/admin/whitelist');
        const list = Utils.$('#wl-list');
        if (list && data.whitelist) {
          list.innerHTML = data.whitelist.map(w => `
            <div class="list-item">
              <div class="list-item-info">
                <div class="list-item-name">${Utils.escapeHtml(w.email)}</div>
                <div class="list-item-sub">${Utils.roleLabel(w.role)}</div>
              </div>
              <button class="btn btn-danger btn-sm" onclick="App.deleteWhitelist('${w.id}')">Sil</button>
            </div>
          `).join('');
        }
        break;
      }
      case 'admin-rooms': {
        const [roomData, userData] = await Promise.all([
          API.get('/admin/rooms'),
          API.get('/admin/users'),
        ]);
        const list = Utils.$('#room-list');
        const gorevliler = (userData.users || []).filter(u => u.role === 'gorevli');
        if (list && roomData.rooms) {
          list.innerHTML = roomData.rooms.map(r => `
            <div class="card">
              <div class="flex justify-between items-center mb-16">
                <div>
                  <strong>${Utils.escapeHtml(r.name)}</strong>
                  <span class="role-badge ${r.is_active ? 'participant' : ''}" style="margin-left:8px">${r.is_active ? 'Aktif' : 'Pasif'}</span>
                </div>
                <button class="btn btn-danger btn-sm" onclick="App.deleteRoom('${r.id}')">Sil</button>
              </div>
              <div class="text-muted" style="font-size:13px">
                Tür: ${r.type === 'interview' ? 'Mülakat' : 'Case Study'} | Giriş: ${r.entry_limit} puan | Çıkış: +${r.exit_points} puan
              </div>
              ${r.staff?.length ? `<div class="mt-8 text-success" style="font-size:13px">✓ Görevli: ${r.staff.map(s => Utils.escapeHtml(s.full_name)).join(', ')}</div>` : '<div class="mt-8 text-danger" style="font-size:13px">✕ Görevli atanmamış</div>'}
              <div class="flex gap-8 mt-8">
                <select id="staff-select-${r.id}" class="form-input" style="flex:1;font-size:13px">
                  <option value="">-- Görevli Seç --</option>
                  ${gorevliler.map(g => `<option value="${g.id}">${Utils.escapeHtml(g.full_name)} (${Utils.escapeHtml(g.email)})</option>`).join('')}
                </select>
                <button class="btn btn-primary btn-sm" onclick="App.assignStaff('${r.id}')">Ata</button>
              </div>
            </div>
          `).join('');
        }
        break;
      }
      case 'admin-points': {
        const data = await API.get('/admin/point-config');
        const list = Utils.$('#point-list');
        if (list && data.config) {
          list.innerHTML = data.config.map(c => `
            <div class="list-item">
              <div class="list-item-info">
                <div class="list-item-name">${Utils.roleLabel(c.role)}</div>
              </div>
              <div class="flex gap-8 items-center">
                <input type="number" class="form-input" style="width:80px" value="${c.points_value}" id="pc-${c.role}">
                <button class="btn btn-primary btn-sm" onclick="App.updatePointConfig('${c.role}')">Kaydet</button>
              </div>
            </div>
          `).join('');
        }
        break;
      }
      case 'admin-surprise': {
        const data = await API.get('/admin/surprise-codes');
        const list = Utils.$('#surprise-list');
        if (list && data.codes) {
          list.innerHTML = `
            <div id="surprise-copy-bar" class="hidden flex gap-8 mb-16" style="align-items:center">
              <span id="surprise-selected-count" style="font-size:13px;color:var(--text-muted)">0 seçili</span>
              <button class="btn btn-primary btn-sm" onclick="App.copySelectedCodes()">Seçilenleri Kopyala</button>
            </div>
          ` + data.codes.map(c => `
            <div class="list-item">
              ${!c.is_used ? `<input type="checkbox" class="surprise-check" data-code="${Utils.escapeHtml(c.code)}" onchange="App.updateCopyBar()" style="width:18px;height:18px;cursor:pointer;accent-color:var(--primary);flex-shrink:0">` : ''}
              <div class="list-item-info" style="cursor:pointer${!c.is_used ? ';margin-left:8px' : ''}" onclick="App.copyCode('${Utils.escapeHtml(c.code)}')">
                <div class="list-item-name" style="font-family:monospace">${Utils.escapeHtml(c.code)}</div>
                <div class="list-item-sub">${c.points_value} puan ${c.is_used ? `· Kullanan: ${Utils.escapeHtml(c.used_by_name || '?')}` : '· Kullanılmadı'}</div>
              </div>
              <div class="list-item-actions">
                <button class="btn btn-danger btn-sm" onclick="App.deleteSurpriseCode('${c.id}')">Sil</button>
              </div>
            </div>
          `).join('');
        }
        break;
      }
      case 'admin-monitoring': {
        const [txData, suspData, usersData] = await Promise.all([
          API.get('/admin/transactions?limit=50'),
          API.get('/admin/suspicious'),
          API.get('/admin/users'),
        ]);

        const suspList = Utils.$('#suspicious-list');
        if (suspList && suspData.suspicious) {
          if (suspData.suspicious.length) {
            suspList.innerHTML = `<div class="card" style="border-color:var(--danger)"><div class="card-title text-danger">⚠️ Şüpheli Aktivite</div>` +
              suspData.suspicious.map(s => `<div class="list-item"><div class="list-item-info"><div class="list-item-name">${Utils.escapeHtml(s.full_name)}</div><div class="list-item-sub">${s.scan_count} tarama/saat</div></div></div>`).join('') +
              '</div>';
          } else {
            suspList.innerHTML = '<div class="text-success mb-16">✓ Şüpheli aktivite yok</div>';
          }
        }

        // Kullanıcı puanları listesi
        const userList = Utils.$('#admin-user-list');
        if (userList && usersData.users) {
          const participants = usersData.users.filter(u => u.role === 'participant');
          if (participants.length) {
            userList.innerHTML = participants.sort((a, b) => b.total_points - a.total_points).map(u => `
              <div class="list-item">
                <div class="list-item-info">
                  <div class="list-item-name">${Utils.escapeHtml(u.full_name)}</div>
                  <div class="list-item-sub">${Utils.escapeHtml(u.email)}</div>
                </div>
                <div class="flex gap-8 items-center">
                  <input type="number" class="form-input" style="width:70px;font-size:13px;padding:4px 6px" value="${u.total_points}" id="up-${u.id}">
                  <button class="btn btn-primary btn-sm" onclick="App.adjustUserPoints('${u.id}')">Kaydet</button>
                </div>
              </div>
            `).join('');
          } else {
            userList.innerHTML = '<div class="empty-state"><p>Henüz katılımcı yok</p></div>';
          }
        }

        const txList = Utils.$('#admin-tx-list');
        if (txList && txData.transactions) {
          txList.innerHTML = txData.transactions.map(tx => `
            <div class="list-item">
              <div class="list-item-info">
                <div class="list-item-name">${Utils.escapeHtml(tx.scanner_name || '?')} ${tx.scanned_name ? '→ ' + Utils.escapeHtml(tx.scanned_name) : ''}</div>
                <div class="list-item-sub">${tx.type} · ${Utils.formatDate(tx.created_at)}</div>
              </div>
              <span class="${tx.points >= 0 ? 'text-success' : 'text-danger'}" style="font-weight:700">${Utils.formatPoints(tx.points)}</span>
            </div>
          `).join('');
        }
        break;
      }
    }
  },

  // Admin action helpers
  async deleteWhitelist(id) {
    const data = await API.del(`/admin/whitelist/${id}`);
    if (data.error) Toast.error(data.message);
    else { Toast.success('Silindi'); this.loadAdminSection('admin-whitelist'); }
  },

  async deleteRoom(id) {
    const data = await API.del(`/admin/rooms/${id}`);
    if (data.error) Toast.error(data.message);
    else { Toast.success('Oda silindi'); this.loadAdminSection('admin-rooms'); }
  },

  async updatePointConfig(role) {
    const input = Utils.$(`#pc-${role}`);
    if (!input) return;
    const data = await API.put('/admin/point-config', { role, pointsValue: parseInt(input.value) });
    if (data.error) Toast.error(data.message);
    else Toast.success('Guncellendi');
  },

  async assignStaff(roomId) {
    const select = Utils.$(`#staff-select-${roomId}`);
    if (!select || !select.value) { Toast.error('Görevli seçin'); return; }
    const data = await API.put(`/admin/rooms/${roomId}/staff`, { staffId: select.value });
    if (data.error) Toast.error(data.message);
    else { Toast.success(data.message); this.loadAdminSection('admin-rooms'); }
  },

  async deleteSurpriseCode(id) {
    const data = await API.del(`/admin/surprise-codes/${id}`);
    if (data.error) Toast.error(data.message);
    else { Toast.success('Kod silindi'); this.loadAdminSection('admin-surprise'); }
  },

  async adjustUserPoints(userId) {
    const input = Utils.$(`#up-${userId}`);
    if (!input) return;
    const points = parseInt(input.value);
    if (isNaN(points)) { Toast.error('Geçerli bir puan girin'); return; }
    const data = await API.put(`/admin/users/${userId}/points`, { points });
    if (data.error) Toast.error(data.message);
    else { Toast.success(data.message); this.loadAdminSection('admin-monitoring'); }
  },

  copyCode(code) {
    navigator.clipboard.writeText(code).then(() => Toast.success('Kopyalandı: ' + code));
  },

  updateCopyBar() {
    const checks = document.querySelectorAll('.surprise-check:checked');
    const bar = Utils.$('#surprise-copy-bar');
    const countEl = Utils.$('#surprise-selected-count');
    if (bar) {
      if (checks.length > 0) {
        bar.classList.remove('hidden');
        if (countEl) countEl.textContent = checks.length + ' seçili';
      } else {
        bar.classList.add('hidden');
      }
    }
  },

  copySelectedCodes() {
    const checks = document.querySelectorAll('.surprise-check:checked');
    const codes = Array.from(checks).map(c => c.dataset.code);
    if (codes.length === 0) { Toast.error('Kod seçiniz'); return; }
    navigator.clipboard.writeText(codes.join('\n')).then(() => {
      Toast.success(codes.length + ' kod kopyalandı');
      checks.forEach(c => c.checked = false);
      this.updateCopyBar();
    });
  },
};

// ===================== APP START =====================
document.addEventListener('DOMContentLoaded', () => App.init());
