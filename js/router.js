import { authStore } from './core/auth.store.js';
import { mountHomePage } from './pages/home.js';
import { mountCatalogPage } from './pages/catalog.js';
import { mountDetailPage } from './pages/detail.js';
import { mountCartPage } from './pages/cart.js';
import { mountAuthPage } from './pages/auth.js';
import { mountCheckoutPage } from './pages/checkout.js';
import { mountOrdersPage } from './pages/orders.js';
import { mountOrderDetailPage } from './pages/order-detail.js';

let currentCleanup = null;
let onRouteChangeCallback = null;
let navigationId = 0;

/**
 * Registra un listener que se invoca cada vez que cambia la ruta activa.
 * @param {(pathname: string) => void} cb
 */
export function setRouteChangeListener(cb) {
  onRouteChangeCallback = cb;
}

/**
 * Navega programáticamente usando la History API sin recargar el navegador.
 * @param {string} url
 * @param {{ replace?: boolean }} [options]
 */
export function navigateTo(url, options = {}) {
  const resolved = new URL(url, window.location.origin);
  const fullPath = `${resolved.pathname}${resolved.search}${resolved.hash}`;

  if (options.replace) {
    window.history.replaceState({}, '', fullPath);
  } else if (fullPath !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.pushState({}, '', fullPath);
  }

  void handleCurrentRoute();
}

/**
 * Evalúa la URL actual, aplica `checkoutGuard` en rutas protegidas y monta la página correspondiente.
 * Equivalente exacto de `app.routes.ts` y `withInMemoryScrolling`.
 */
export async function handleCurrentRoute() {
  const activeNavigation = ++navigationId;
  const pathname = window.location.pathname || '/';
  const search = window.location.search || '';
  const hash = window.location.hash || '';
  const queryParams = new URLSearchParams(search);
  const mainEl = document.getElementById('contenido');
  if (!mainEl) return;

  // Determine route match
  let route = null;
  let params = {};

  if (pathname === '/' || pathname === '/index.html') {
    route = { mount: mountHomePage, title: 'La Bodega · Cerca de ti', protected: false };
  } else if (pathname === '/productos') {
    route = { mount: mountCatalogPage, title: 'Productos · La Bodega', protected: false };
  } else if (/^\/productos\/([^/]+)$/.test(pathname)) {
    const match = pathname.match(/^\/productos\/([^/]+)$/);
    params = { id: decodeURIComponent(match[1]) };
    route = { mount: mountDetailPage, title: 'Detalle del producto · La Bodega', protected: false };
  } else if (pathname === '/carrito') {
    route = { mount: mountCartPage, title: 'Tu carrito · La Bodega', protected: false };
  } else if (pathname === '/ingresar') {
    route = {
      mount: (container, ctx) => mountAuthPage(container, { ...ctx, register: false }),
      title: 'Ingresar · La Bodega',
      protected: false
    };
  } else if (pathname === '/registro') {
    route = {
      mount: (container, ctx) => mountAuthPage(container, { ...ctx, register: true }),
      title: 'Crear cuenta · La Bodega',
      protected: false
    };
  } else if (pathname === '/checkout') {
    route = { mount: mountCheckoutPage, title: 'Revisa tu compra · La Bodega', protected: true };
  } else if (pathname === '/pedidos') {
    route = { mount: mountOrdersPage, title: 'Mis pedidos · La Bodega', protected: true };
  } else if (/^\/pedidos\/([^/]+)$/.test(pathname)) {
    const match = pathname.match(/^\/pedidos\/([^/]+)$/);
    params = { id: decodeURIComponent(match[1]) };
    route = { mount: mountOrderDetailPage, title: 'Tu pedido · La Bodega', protected: true };
  } else {
    // Wildcard redirect '**' -> ''
    window.history.replaceState({}, '', '/');
    return await handleCurrentRoute();
  }

  // checkoutGuard: exige sesión válida antes de entrar a /checkout, /pedidos o /pedidos/:id
  if (route.protected) {
    const ok = await authStore.ensureSession();
    // Una navegación posterior es la única que puede montar o redirigir.
    if (activeNavigation !== navigationId) return;
    if (!ok) {
      const targetUrl = `${pathname}${search}`;
      window.history.replaceState({}, '', `/ingresar?continuar=${encodeURIComponent(targetUrl)}`);
      return await handleCurrentRoute();
    }
  }

  if (typeof currentCleanup === 'function') {
    try {
      currentCleanup();
    } catch {
      /* ignore cleanup error */
    }
    currentCleanup = null;
  }

  document.title = route.title;

  if (typeof onRouteChangeCallback === 'function') {
    onRouteChangeCallback(pathname === '/index.html' ? '/' : pathname);
  }

  currentCleanup = route.mount(mainEl, { params, queryParams }) || null;

  // Scroll restoration or anchor scrolling
  if (hash && hash.length > 1) {
    const anchorId = decodeURIComponent(hash.slice(1));
    requestAnimationFrame(() => {
      if (activeNavigation !== navigationId) return;
      const target = document.getElementById(anchorId);
      if (target) {
        target.scrollIntoView({ behavior: 'smooth' });
      }
    });
  } else {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}
