import { apiFetch } from './api.js';

/**
 * Textos legibles para cada estado de pedido devuelto por el backend.
 * Equivalente exacto de `orderStatus` en `orders.api.ts`.
 */
export const orderStatus = Object.freeze({
  PENDIENTE_PAGO: 'Esperando tu comprobante',
  PENDIENTE_VERIFICACION: 'Revisando tu pago',
  PAGADO: 'Pago aprobado',
  EN_PREPARACION: 'Preparando tu pedido',
  LISTO_PARA_RECOJO: 'Listo para recoger',
  ENTREGADO: 'Pedido entregado',
  CANCELADO: 'Pedido cancelado',
  EXPIRADO: 'Reserva vencida',
  RECHAZADO: 'Comprobante rechazado',
  REEMBOLSADO: 'Reembolso confirmado'
});

/**
 * Cliente de API para datos de tienda, creación de pedidos, cancelación,
 * subida de comprobantes multipart y descarga autenticada de QR/comprobantes.
 */
export const ordersApi = {
  /** Obtiene datos públicos de la tienda (`GET /api/tienda`). */
  shop() {
    return apiFetch('/api/tienda', { method: 'GET' });
  },

  /** Lista los pedidos del cliente autenticado (`GET /api/pedidos`). */
  list() {
    return apiFetch('/api/pedidos', { method: 'GET' });
  },

  /** Obtiene el detalle de un pedido (`GET /api/pedidos/{id}`). */
  get(id) {
    return apiFetch(`/api/pedidos/${encodeURIComponent(id)}`, { method: 'GET' });
  },

  /**
   * Crea un pedido con clave idempotente UUID y precios esperados (`POST /api/pedidos`).
   * @param {string} clave UUID de idempotencia
   * @param {{ productoId: number, cantidad: number, precioEsperado: number }[]} items
   */
  create(clave, items) {
    return apiFetch('/api/pedidos', {
      method: 'POST',
      body: { clave, items }
    });
  },

  /** Cancela un pedido en estado `PENDIENTE_PAGO` (`POST /api/pedidos/{id}/cancelar`). */
  cancel(id) {
    return apiFetch(`/api/pedidos/${encodeURIComponent(id)}/cancelar`, {
      method: 'POST',
      body: {}
    });
  },

  /**
   * Sube el comprobante PNG/JPEG mediante `FormData` (`POST /api/pedidos/{id}/comprobante`).
   * @param {number} id
   * @param {File} file
   * @param {string} operacion
   */
  upload(id, file, operacion) {
    const body = new FormData();
    body.append('archivo', file);
    body.append('operacion', operacion);
    return apiFetch(`/api/pedidos/${encodeURIComponent(id)}/comprobante`, {
      method: 'POST',
      body
    });
  },

  /**
   * Obtiene la imagen PNG del código QR de recojo como `Blob` autenticado (`GET /api/pedidos/{id}/qr`).
   * @param {number} id
   * @returns {Promise<Blob>}
   */
  qr(id) {
    return apiFetch(`/api/pedidos/${encodeURIComponent(id)}/qr`, {
      method: 'GET',
      responseType: 'blob'
    });
  },

  /**
   * Obtiene el comprobante del pedido como `Blob` autenticado (`GET /api/pedidos/{id}/comprobante`).
   * @param {number} id
   * @returns {Promise<Blob>}
   */
  receiptBlob(id) {
    return apiFetch(`/api/pedidos/${encodeURIComponent(id)}/comprobante`, {
      method: 'GET',
      responseType: 'blob'
    });
  }
};
