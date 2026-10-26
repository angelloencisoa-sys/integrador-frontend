import { el, clearElement } from '../shared/dom.js';
import { formatMoney } from '../shared/format.js';
import { CONFIG } from '../config.js';
import { authStore } from '../core/auth.store.js';
import { cartStore } from '../core/cart.store.js';
import { catalogStore } from '../core/catalog.store.js';
import { ordersApi } from '../core/orders.api.js';
import { navigateTo } from '../router.js';

function generateUUID() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  // Fallback RFC4122 v4 UUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Renderiza la página de Checkout (`/checkout`).
 * Equivalente exacto de `CheckoutPage` (`checkout.ts` / `checkout.html`).
 *
 * @param {HTMLElement} container
 */
export function mountCheckoutPage(container) {
  clearElement(container);

  let destroyed = false;
  let shop = null;
  let pending = false;
  let errorText = '';

  const page = el('div', { className: 'container order-page' });
  container.appendChild(page);

  async function loadShop() {
    errorText = '';
    render();
    try {
      const data = await ordersApi.shop();
      if (destroyed) return;
      shop = data;
      render();
    } catch {
      if (destroyed) return;
      errorText = 'No pudimos consultar los datos de recojo. Reintenta.';
      render();
    }
  }

  async function submitOrder() {
    const lines = cartStore.lines;
    if (pending || !shop || !lines.length) return;

    if (authStore.user?.rol !== 'CLIENTE') {
      errorText = 'Usa una cuenta de cliente para comprar.';
      render();
      return;
    }

    const items = lines.map(l => ({
      productoId: l.id,
      cantidad: l.cantidad,
      precioEsperado: l.producto.precioVenta
    }));

    const fingerprint = JSON.stringify(items);
    let clave = generateUUID();

    try {
      const saved = JSON.parse(sessionStorage.getItem(CONFIG.ORDER_INTENT_KEY) || 'null');
      if (saved?.fingerprint === fingerprint && typeof saved.clave === 'string') {
        clave = saved.clave;
      }
      sessionStorage.setItem(CONFIG.ORDER_INTENT_KEY, JSON.stringify({ clave, fingerprint }));
    } catch {
      /* El botón permanece deshabilitado durante la solicitud. */
    }

    pending = true;
    errorText = '';
    render();

    try {
      const order = await ordersApi.create(clave, items);
      if (destroyed) return;

      cartStore.deductPurchased(items);
      try {
        sessionStorage.removeItem(CONFIG.ORDER_INTENT_KEY);
      } catch {
        /* ignore */
      }
      cartStore.setMessage('Pedido creado. Revisa las instrucciones y adjunta tu comprobante.');
      navigateTo(`/pedidos/${encodeURIComponent(order.id)}`);
    } catch (e) {
      if (destroyed) return;
      pending = false;
      if (e?.status === 0) {
        errorText = 'No se pudo confirmar la respuesta. Reintenta: conservamos la clave para evitar duplicados.';
      } else {
        errorText = e?.error?.mensaje || 'No se pudo crear el pedido. Revisa tu carrito.';
      }
      if (e?.status === 409) {
        catalogStore.refresh();
      }
      render();
    }
  }

  function render() {
    clearElement(page);

    page.appendChild(
      el(
        'header',
        { className: 'page-heading' },
        el('a', {
          className: 'eyebrow',
          href: '/carrito',
          dataset: { nav: 'true' },
          text: 'CARRITO / CONFIRMAR PEDIDO'
        }),
        el('h1', { text: 'Revisa tu compra' }),
        el('p', { text: 'Reserva tus productos y recógelos en la tienda.' })
      )
    );

    if (errorText) {
      page.appendChild(
        el(
          'div',
          { className: 'order-error', role: 'alert' },
          `${errorText} `,
          el('a', { href: '/pedidos', dataset: { nav: 'true' }, text: 'Ver mis pedidos' }),
          ' ',
          el('button', {
            type: 'button',
            className: 'text-button',
            text: 'Reintentar datos de tienda',
            onClick: () => loadShop()
          })
        )
      );
    }

    if (catalogStore.loading) {
      page.appendChild(el('p', { className: 'state', role: 'status', text: 'Consultando productos…' }));
      return;
    }

    if (catalogStore.error) {
      page.appendChild(
        el(
          'div',
          { className: 'state', role: 'alert' },
          el('p', { text: catalogStore.error }),
          el('button', {
            type: 'button',
            className: 'button',
            text: 'Reintentar',
            onClick: () => catalogStore.refresh()
          })
        )
      );
      return;
    }

    const lines = cartStore.lines;
    if (!lines.length) {
      page.appendChild(
        el(
          'section',
          { className: 'state' },
          el('h2', { text: 'Tu carrito está vacío' }),
          el('a', { className: 'button', href: '/productos', dataset: { nav: 'true' }, text: 'Explorar productos' }),
          ' · ',
          el('a', { href: '/pedidos', dataset: { nav: 'true' }, text: 'Mis pedidos' })
        )
      );
      return;
    }

    const user = authStore.user;
    const leftPanel = el(
      'section',
      { className: 'panel' },
      el('h2', { text: '1 · Datos de contacto' }),
      el(
        'p',
        {},
        el('strong', { text: user?.nombreCompleto || '' }),
        el('br'),
        user?.email || '',
        el('br'),
        user?.telefono || ''
      ),
      el('hr'),
      el('h2', { text: '2 · Recojo en tienda' })
    );

    if (shop) {
      leftPanel.append(
        el('p', { text: shop.direccion }),
        el('p', { text: shop.horario }),
        el('hr'),
        el('h2', { text: `3 · ${shop.demo ? 'Pago de demostración' : 'Pago con Yape'}` })
      );

      if (shop.demo) {
        leftPanel.appendChild(
          el('p', {
            className: 'demo-banner',
            text: 'MODO DEMOSTRACIÓN · No envíes dinero. Los datos de la tienda son referenciales. Podrás subir una imagen de prueba y simular su revisión.'
          })
        );
      } else {
        leftPanel.appendChild(
          el('p', {
            text: 'Después de crear el pedido verás los datos de Yape. El personal verificará el abono antes de preparar tu compra.'
          })
        );
      }

      leftPanel.appendChild(
        el('p', {
          text: 'Dispones de 10 minutos para adjuntar el comprobante. Los productos quedan reservados al confirmar el pedido. Una vez enviado el comprobante, la reserva se conserva durante la revisión.'
        })
      );
    } else {
      leftPanel.appendChild(el('p', { role: 'status', text: 'Cargando datos de tienda…' }));
    }

    leftPanel.appendChild(
      el('a', {
        className: 'text-button',
        href: '/carrito',
        dataset: { nav: 'true' },
        text: '← Modificar mi carrito'
      })
    );

    const summary = el('aside', { className: 'summary panel' }, el('h2', { text: 'Tu compra' }));

    lines.forEach(line => {
      const lineTotal = Math.round(Number(line.producto.precioVenta) * 100) * line.cantidad / 100;
      summary.appendChild(
        el(
          'div',
          { className: 'summary-row' },
          el('span', { text: `${line.cantidad} × ${line.producto.nombre}` }),
          el('span', { text: formatMoney(lineTotal) })
        )
      );
    });

    const submitLabel = pending
      ? 'Creando pedido…'
      : shop?.demo
        ? 'Crear pedido de prueba'
        : 'Confirmar y continuar a Yape';

    summary.append(
      el('hr'),
      el(
        'div',
        { className: 'summary-row total' },
        el('strong', { text: 'Total' }),
        el('strong', { text: formatMoney(cartStore.total) })
      ),
      el('p', { text: 'Recojo en tienda · sin costo adicional' }),
      el('button', {
        type: 'button',
        className: 'button button-orange',
        disabled: pending || !shop,
        text: submitLabel,
        onClick: submitOrder
      })
    );

    page.appendChild(el('div', { className: 'purchase-layout' }, leftPanel, summary));
  }

  void loadShop();
  const unsubCatalog = catalogStore.subscribe(render);
  const unsubCart = cartStore.subscribe(render);
  const unsubAuth = authStore.subscribe(render);

  return () => {
    destroyed = true;
    unsubCatalog();
    unsubCart();
    unsubAuth();
  };
}
