import { el } from './dom.js';
import { formatMoney } from './format.js';
import { createProductArt } from './product-art.js';

/** Datos de presentación; el modo contable del pedido sigue definido por el backend. */
export const PAYMENT_INFO = Object.freeze({
  titular: 'Jorge Reyes',
  // Incorporar aquí la ruta del único QR de Yape / Plin cuando el comercio lo entregue.
  qrSrc: ''
});

export function createPaymentMethods() {
  return el('div', { className: 'payment-methods', 'aria-label': 'Yape o Plin, un único QR' },
    el('span', { className: 'payment-brand payment-brand--yape', text: 'Yape' }),
    el('span', { className: 'payment-method-divider', text: 'o' }),
    el('span', { className: 'payment-brand payment-brand--plin', text: 'Plin' }),
    el('span', { className: 'payment-method-caption', text: 'Un solo QR' })
  );
}

export function createCheckoutStep(number, title, subtitle, ...children) {
  return el('section', { className: 'panel checkout-card' },
    el('header', { className: 'checkout-card-heading' },
      el('span', { className: 'checkout-step-number', 'aria-hidden': 'true', text: number }),
      el('div', {}, el('h2', { text: title }),
        subtitle ? el('p', { text: subtitle }) : null)
    ), ...children);
}

/** Normaliza las líneas del carrito y las del pedido sin recalcular su precio vigente. */
export function createPurchaseSummary(lines, total, title = 'Resumen de tu compra', totalLabel = 'Total a pagar') {
  const count = lines.reduce((sum, line) => sum + line.cantidad, 0);
  const summary = el('aside', { className: 'summary panel purchase-summary' },
    el('header', { className: 'purchase-summary-heading' },
      el('h2', { text: title }),
      el('span', { className: 'purchase-count', text: `${count} ${count === 1 ? 'unidad' : 'unidades'}` })));
  const list = el('ul', { className: 'purchase-items' });
  lines.forEach(line => {
    const lineTotal = Math.round(Number(line.precio) * 100) * line.cantidad / 100;
    list.append(el('li', { className: 'purchase-item' },
      el('div', { className: 'purchase-item-art', 'aria-hidden': 'true' },
        createProductArt(line.producto || { nombre: line.nombre }, true)),
      el('div', { className: 'purchase-item-copy' },
        el('strong', { text: line.nombre }),
        el('small', { text: `${line.cantidad} × ${formatMoney(line.precio)}` })),
      el('strong', { className: 'purchase-item-total', text: formatMoney(lineTotal) })));
  });
  summary.append(list,
    el('div', { className: 'purchase-costs' },
      el('div', { className: 'summary-row' }, el('span', { text: 'Productos' }), el('span', { text: formatMoney(total) })),
      el('div', { className: 'summary-row' }, el('span', { text: 'Recojo en tienda' }), el('span', { className: 'pickup-free', text: 'Sin costo' }))),
    el('div', { className: 'summary-row total purchase-grand-total' },
      el('strong', { text: totalLabel }), el('strong', { text: formatMoney(total) })));
  return summary;
}

export function createPaymentQr() {
  const placeholder = () => el('div', { className: 'payment-qr-placeholder', role: 'status' },
    el('span', { className: 'payment-qr-symbol', 'aria-hidden': 'true', text: 'QR' }),
    el('strong', { text: 'QR pendiente de incorporar' }),
    el('p', { text: 'Aquí encontrarás el código para pagar con Yape o Plin.' }));
  const frame = el('div', { className: 'payment-qr-frame' });
  frame.append(PAYMENT_INFO.qrSrc ? el('img', {
    src: PAYMENT_INFO.qrSrc, alt: 'QR único de pago para Yape y Plin', width: '220', height: '220',
    className: 'payment-qr-image', onError: () => frame.replaceChildren(placeholder())
  }) : placeholder());
  return frame;
}

/** El registro interno conserva la auditoría original; la tienda muestra estados comerciales. */
export function publicOrderEvent(event, demo) {
  if (!demo || !/demo|simulad|demostraci|prueba/i.test(event.mensaje || '')) return event.mensaje;
  return ({
    PENDIENTE_PAGO: 'Pedido confirmado. Productos reservados durante 10 minutos.',
    PAGADO: 'Pago aprobado por el personal.',
    REEMBOLSADO: 'Reembolso registrado por el personal.'
  })[event.estado] || 'Estado del pedido actualizado.';
}
