import { buildApiUrl, inspectApiTarget } from '../config.js';
import { sessionState } from './auth.store.js';

export class ApiError extends Error {
  /**
   * @param {number} status
   * @param {any} errorBody
   * @param {string} message
   */
  constructor(status, errorBody, message) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.error = errorBody;
  }
}

/**
 * Cliente HTTP centralizado basado en `fetch`.
 * - Adjunta `Authorization: Bearer <token>` únicamente a rutas protegidas del backend configurado.
 * - Nunca envía el token a dominios externos ni a rutas públicas (`/api/catalogo/**`, `/api/tienda`, `/login`, `/registro`).
 * - Si el backend responde 401 en una ruta distinta de `/login`, descarta el token de `sessionStorage`.
 * - No fija `Content-Type` manualmente cuando el cuerpo es `FormData` para preservar el boundary multipart.
 *
 * @param {string} path Ruta (ej. `/api/catalogo/productos`)
 * @param {RequestInit & { responseType?: 'json' | 'blob' }} [options]
 */
export async function apiFetch(path, options = {}) {
  const targetUrl = path.startsWith('http://') || path.startsWith('https://')
    ? path
    : buildApiUrl(path);

  const { isBackendApi, needsToken } = inspectApiTarget(targetUrl);
  const headers = new Headers(options.headers || {});
  const token = sessionState.get();

  if (needsToken && token) {
    headers.set('Authorization', `Bearer ${token}`);
  } else {
    headers.delete('Authorization');
  }

  let body = options.body;
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
  if (body !== undefined && body !== null && !isFormData && typeof body !== 'string') {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    body = JSON.stringify(body);
  } else if (isFormData) {
    headers.delete('Content-Type');
  }

  let response;
  try {
    response = await fetch(targetUrl, {
      ...options,
      headers,
      body
    });
  } catch (networkErr) {
    throw new ApiError(0, null, 'No pudimos conectar con la tienda. Inténtalo nuevamente.');
  }

  if (isBackendApi && response.status === 401 && !targetUrl.endsWith('/login')) {
    sessionState.set(null, 'expired');
  }

  if (!response.ok) {
    let errorPayload = null;
    try {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        errorPayload = await response.json();
      } else {
        const text = await response.text();
        errorPayload = text ? { mensaje: text } : null;
      }
    } catch {
      errorPayload = null;
    }
    const msg = errorPayload?.mensaje || `Error HTTP ${response.status}`;
    throw new ApiError(response.status, errorPayload, msg);
  }

  if (options.responseType === 'blob') {
    return await response.blob();
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return await response.json();
  }
  return await response.text();
}
