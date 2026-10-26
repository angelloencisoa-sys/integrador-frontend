import { CONFIG } from '../config.js';
import { catalogStore } from './catalog.store.js';
import { parseCart, reconcileCart, totalCents } from './cart-domain.js';

/**
 * Estado del carrito persistente en `localStorage` (`nova.cart.v1`).
 * Equivalente de `CartStore` en Angular.
 */
class CartStore {
  constructor() {
    this.catalog = catalogStore;
    this._entries = this._read();
    this._message = '';
    this._listeners = new Set();

    this.catalog.subscribe(() => {
      if (this.catalog.loading || this.catalog.error) {
        this._notify();
        return;
      }
      const actual = this._entries;
      const reconciled = reconcileCart(actual, this.catalog.products);
      if (JSON.stringify(actual) !== JSON.stringify(reconciled)) {
        this._entries = reconciled;
        this._save();
        this._message = 'Actualizamos tu carrito según la disponibilidad de los productos.';
      }
      this._notify();
    });
  }

  _read() {
    try {
      return parseCart(localStorage.getItem(CONFIG.CART_STORAGE_KEY));
    } catch {
      return [];
    }
  }

  _save() {
    try {
      localStorage.setItem(CONFIG.CART_STORAGE_KEY, JSON.stringify(this._entries));
    } catch {
      /* Carrito en memoria si localStorage está deshabilitado. */
    }
  }

  subscribe(listener) {
    this._listeners.add(listener);
    return () => this._listeners.delete(listener);
  }

  _notify() {
    this._listeners.forEach(fn => fn());
  }

  get entries() {
    return this._entries;
  }

  get message() {
    return this._message;
  }

  setMessage(msg) {
    this._message = msg || '';
    this._notify();
  }

  get lines() {
    const products = this.catalog.products;
    return this._entries.flatMap(e => {
      const producto = products.find(p => p.id === e.id);
      return producto ? [{ ...e, producto }] : [];
    });
  }

  get count() {
    return this._entries.reduce((sum, e) => sum + e.cantidad, 0);
  }

  get total() {
    return totalCents(this._entries, this.catalog.products) / 100;
  }

  quantity(id) {
    return this._entries.find(e => e.id === id)?.cantidad || 0;
  }

  add(product, amount = 1) {
    const current = this.quantity(product.id);
    const cantidad = Math.min(current + amount, product.disponible);
    if (cantidad <= current) {
      this.setMessage('Ya tienes la cantidad disponible de este producto.');
      return;
    }
    this.set(product, cantidad);
    this.setMessage(`${product.nombre} se añadió a tu carrito.`);
  }

  set(product, amount) {
    if (!Number.isFinite(amount)) return;
    const cantidad = Math.min(Math.max(0, Math.trunc(amount)), product.disponible);
    if (cantidad <= 0) {
      this.remove(product.id);
      return;
    }
    const exists = this._entries.some(e => e.id === product.id);
    this._entries = exists
      ? this._entries.map(e => (e.id === product.id ? { id: e.id, cantidad } : e))
      : [...this._entries, { id: product.id, cantidad }];
    this._save();
    this._notify();
  }

  remove(id) {
    this._entries = this._entries.filter(e => e.id !== id);
    this._save();
    this._notify();
  }

  /**
   * Descuenta únicamente las cantidades compradas tras confirmar un pedido,
   * preservando adiciones eventuales en otra pestaña/vista.
   * @param {{ productoId: number, cantidad: number }[]} boughtItems
   */
  deductPurchased(boughtItems) {
    this._entries = this._entries.flatMap(e => {
      const bought = boughtItems.find(i => i.productoId === e.id)?.cantidad || 0;
      return e.cantidad > bought ? [{ ...e, cantidad: e.cantidad - bought }] : [];
    });
    this._save();
    this._notify();
  }
}

export const cartStore = new CartStore();
