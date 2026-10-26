/**
 * Configuración centralizada de la API y constantes de la tienda.
 *
 * Por defecto consume rutas relativas `/api` cuando se sirve desde el servidor
 * HTTP local incluido (`server.mjs` o `server.py` en http://127.0.0.1:4200),
 * o directamente hacia `http://127.0.0.1:8080/api` si se configura `API_BASE_URL`.
 * Ninguna credencial de PostgreSQL ni secreto se almacena en el navegador.
 */
export const CONFIG = Object.freeze({
  /**
   * Prefijo base de la API.
   * - '' (vacío) usa el mismo origen actual (ej. http://127.0.0.1:4200/api/...)
   *   con el proxy local integrado o un reverse proxy en producción.
   * - También puede apuntar a 'http://127.0.0.1:8080' porque Spring Boot
   *   permite CORS desde http://localhost:4200 y http://127.0.0.1:4200.
   */
  API_BASE_URL: window.__NOVA_API_BASE_URL__ ?? '',
  API_PREFIX: '/api',
  SESSION_TOKEN_KEY: 'nova.access',
  CART_STORAGE_KEY: 'nova.cart.v1',
  ORDER_INTENT_KEY: 'nova.order.intent',
  ORDER_POLL_MS: 5000,
  MAX_RECEIPT_BYTES: 3 * 1024 * 1024,
  ALLOWED_RECEIPT_TYPES: ['image/png', 'image/jpeg']
});

/**
 * Construye la URL completa hacia un endpoint de la API.
 * @param {string} path Ruta que inicia con `/api/`
 * @returns {string}
 */
export function buildApiUrl(path) {
  if (!path.startsWith('/')) {
    throw new Error(`La ruta de la API debe iniciar con '/': ${path}`);
  }
  const base = CONFIG.API_BASE_URL.replace(/\/+$/, '');
  return `${base}${path}`;
}

/**
 * Verifica si una URL o ruta corresponde exclusivamente al backend configurado
 * y si requiere el encabezado Authorization: Bearer.
 * Equivalente exacto de `authInterceptor` en Angular (`auth.store.ts`).
 *
 * @param {string} urlOrPath
 * @returns {{ isBackendApi: boolean, needsToken: boolean }}
 */
export function inspectApiTarget(urlOrPath) {
  let pathname = '';
  let sameBackend = false;

  try {
    const resolved = new URL(urlOrPath, window.location.origin);
    const configuredOrigin = CONFIG.API_BASE_URL
      ? new URL(CONFIG.API_BASE_URL, window.location.origin).origin
      : window.location.origin;
    sameBackend = resolved.origin === configuredOrigin && resolved.pathname.startsWith('/api/');
    pathname = resolved.pathname;
  } catch {
    sameBackend = false;
  }

  const isPublicEndpoint =
    pathname === '/api/tienda' ||
    pathname.startsWith('/api/catalogo/') ||
    pathname.endsWith('/login') ||
    pathname.endsWith('/registro');

  return {
    isBackendApi: sameBackend,
    needsToken: sameBackend && !isPublicEndpoint
  };
}
