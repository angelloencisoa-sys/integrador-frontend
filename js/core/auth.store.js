import { CONFIG } from '../config.js';
import { apiFetch } from './api.js';

/**
 * Estado del token de acceso en `sessionStorage` (`nova.access`).
 * Equivalente de `SessionState` en Angular.
 */
class SessionState {
  constructor() {
    this._token = this._read();
    /** @type {Set<(token: string | null, reason?: string) => void>} */
    this._listeners = new Set();
  }

  _read() {
    try {
      return sessionStorage.getItem(CONFIG.SESSION_TOKEN_KEY);
    } catch {
      return null;
    }
  }

  get() {
    return this._token;
  }

  /**
   * @param {string | null} token
   * @param {string} [reason]
   */
  set(token, reason = 'manual') {
    const normalized = token || null;
    const hadToken = !!this._token;
    this._token = normalized;
    try {
      if (normalized) {
        sessionStorage.setItem(CONFIG.SESSION_TOKEN_KEY, normalized);
      } else {
        sessionStorage.removeItem(CONFIG.SESSION_TOKEN_KEY);
      }
    } catch {
      /* En memoria si sessionStorage está restringido. */
    }
    this._listeners.forEach(fn => fn(this._token, hadToken && !normalized ? reason : 'update'));
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }
}

export const sessionState = new SessionState();

/**
 * Gestión de autenticación y perfil del usuario conectado a `/api/auth/*`.
 * Equivalente de `AuthStore` y `checkoutGuard` en Angular.
 */
class AuthStore {
  constructor() {
    /** @type {import('./models.js').Profile | null} */
    this._user = null;
    /** @type {Promise<boolean> | undefined} */
    this._restoring = undefined;
    /** @type {Set<() => void>} */
    this._listeners = new Set();
    /** @type {Set<() => void>} */
    this._expiredListeners = new Set();

    sessionState.subscribe((token, reason) => {
      if (!token) {
        const wasLogged = !!this._user || reason === 'expired';
        this._user = null;
        this._notify();
        if (reason === 'expired' && wasLogged) {
          this._expiredListeners.forEach(fn => fn());
        }
      }
    });

    if (sessionState.get()) {
      void this.ensureSession();
    }
  }

  get token() {
    return sessionState.get();
  }

  get user() {
    return this._user;
  }

  get authenticated() {
    return !!sessionState.get() && !!this._user;
  }

  get firstName() {
    return this._user?.nombreCompleto?.split(' ')[0] || 'Mi cuenta';
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  onSessionExpired(listener) {
    this._expiredListeners.add(listener);
    return () => this._expiredListeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach(fn => fn());
  }

  /**
   * Inicia sesión con `POST /api/auth/login` y obtiene el perfil con `GET /api/auth/me`.
   * @param {string} username
   * @param {string} password
   */
  async login(username, password) {
    const response = await apiFetch('/api/auth/login', {
      method: 'POST',
      body: { username, password }
    });
    return await this._accept(response);
  }

  /**
   * Registra una cuenta CLIENTE con `POST /api/auth/registro` y carga su perfil.
   * @param {{ username: string, password: string, nombreCompleto: string, email: string, telefono: string }} values
   */
  async register(values) {
    const response = await apiFetch('/api/auth/registro', {
      method: 'POST',
      body: values
    });
    return await this._accept(response);
  }

  async _accept(response) {
    sessionState.set(response.accessToken, 'login');
    const profile = await apiFetch('/api/auth/me', { method: 'GET' });
    this._user = profile;
    this._notify();
    return profile;
  }

  /**
   * Verifica la sesión actual consultando `/api/auth/me`.
   * @returns {Promise<boolean>}
   */
  async ensureSession() {
    if (!sessionState.get()) {
      return false;
    }
    if (this._restoring) {
      return this._restoring;
    }
    this._restoring = apiFetch('/api/auth/me', { method: 'GET' })
      .then(profile => {
        this._user = profile;
        this._notify();
        return true;
      })
      .catch(() => {
        this.logout();
        return false;
      })
      .finally(() => {
        this._restoring = undefined;
      });
    return this._restoring;
  }

  logout() {
    sessionState.set(null, 'logout');
    this._user = null;
    this._notify();
  }
}

export const authStore = new AuthStore();
