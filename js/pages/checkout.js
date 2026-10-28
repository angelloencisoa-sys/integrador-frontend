import { el, clearElement } from '../shared/dom.js';
import { CONFIG } from '../config.js';
import { authStore } from '../core/auth.store.js';
import { cartStore } from '../core/cart.store.js';
import { catalogStore } from '../core/catalog.store.js';
import { ordersApi } from '../core/orders.api.js';
import { createStoreMapLink } from '../shared/store-info.js';
import { navigateTo } from '../router.js';
import { createCheckoutStep, createPaymentMethods, createPurchaseSummary } from '../shared/purchase-ui.js';

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

  const page = el('div', { className: 'container order-page checkout-review' });
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
        el('p', { text: 'Confirma tus datos y continúa al pago para recoger tu pedido en la bodega.' })
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
    const contactFields = el('dl', { className: 'checkout-contact' });
    for (const [label, value] of [
      ['Nombre', user?.nombreCompleto], ['Correo electrónico', user?.email], ['Teléfono', user?.telefono]
    ]) {
      contactFields.append(el('div', {}, el('dt', { text: label }), el('dd', { text: value || 'No registrado' })));
    }
    const contact = createCheckoutStep('01', 'Datos de contacto', 'Usaremos estos datos para coordinar tu pedido.', contactFields);
    const pickup = createCheckoutStep('02', 'Recojo en tienda', 'Recoge tu compra cuando te indiquemos que está lista.');
    if (shop) {
      const [address, ...reference] = String(shop.direccion || '').split(/\.\s*Referencia:\s*/i);
      const mapLink = createStoreMapLink(shop.mapaUrl);
      mapLink.classList.add('checkout-map-link');
      pickup.append(
        el('div', { className: 'checkout-address' },
          el('span', { className: 'checkout-field-label', text: 'Dirección de la bodega' }),
          el('p', { text: address }),
          reference.length ? el('p', { className: 'checkout-reference', text: `Referencia: ${reference.join('. Referencia: ')}` }) : null),
        el('div', { className: 'checkout-pickup-footer' },
          el('div', {}, el('span', { className: 'checkout-field-label', text: 'Horario de atención' }),
            el('p', { text: shop.horario })), mapLink));
    } else {
      pickup.append(el('p', { role: 'status', text: 'Cargando datos de recojo…' }));
    }
    const payment = createCheckoutStep('03', 'Pago con QR', 'Yape o Plin, elige la aplicación que prefieras.',
      createPaymentMethods(),
      el('p', { className: 'checkout-payment-note', text: 'Después de confirmar tu pedido verás el QR y podrás adjuntar tu comprobante. El personal revisará el pago antes de preparar tu compra.' }));
    const leftPanel = el('div', { className: 'checkout-sections' }, contact, pickup, payment,
      el('a', { className: 'text-button checkout-edit-cart', href: '/carrito', dataset: { nav: 'true' }, text: '← Modificar mi carrito' }));
    const summary = createPurchaseSummary(lines.map(line => ({
      producto: line.producto, nombre: line.producto.nombre, cantidad: line.cantidad, precio: line.producto.precioVenta
    })), cartStore.total);
    summary.append(
      el('button', {
        type: 'button', className: 'button button-orange', disabled: pending || !shop,
        text: pending ? 'Confirmando pedido…' : 'Confirmar pedido', onClick: submitOrder
      }),
      el('p', { className: 'purchase-next-step', text: 'Siguiente paso: pagar con Yape o Plin' }),
      el('div', { className: 'checkout-reservation' },
        el('strong', { text: 'Tus productos quedan reservados' }),
        el('p', { text: 'Tienes 10 minutos desde la confirmación para adjuntar el comprobante. Durante la revisión, tu reserva se mantiene.' })));

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
