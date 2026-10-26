import { apiFetch } from './api.js';

/**
 * Estado reactivo del catálogo público (`/api/catalogo/productos` y `/api/catalogo/categorias`).
 * Equivalente de `CatalogStore` en Angular.
 */
class CatalogStore {
  constructor() {
    this._products = [];
    this._categories = [];
    this._loading = true;
    this._error = '';
    this._listeners = new Set();
  }

  get products() {
    return this._products;
  }

  get categories() {
    return this._categories;
  }

  get loading() {
    return this._loading;
  }

  get error() {
    return this._error;
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach(fn => fn());
  }

  async refresh() {
    this._loading = true;
    this._error = '';
    this._notify();

    try {
      const [productos, categorias] = await Promise.all([
        apiFetch('/api/catalogo/productos', { method: 'GET' }),
        apiFetch('/api/catalogo/categorias', { method: 'GET' })
      ]);
      this._products = Array.isArray(productos) ? productos : [];
      this._categories = Array.isArray(categorias) ? categorias : [];
      this._loading = false;
      this._error = '';
      this._notify();
    } catch {
      this._loading = false;
      this._error = 'No pudimos cargar los productos. Revisa tu conexión e inténtalo nuevamente.';
      this._notify();
    }
  }
}

export const catalogStore = new CatalogStore();
