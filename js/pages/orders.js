import { el, clearElement } from '../shared/dom.js';
import { formatMoney, formatDateTime } from '../shared/format.js';
import { ordersApi, orderStatus } from '../core/orders.api.js';

/**
 * Renderiza la página de Mis Pedidos (`/pedidos`).
 * Equivalente exacto de `OrdersPage` (`orders.ts` / `orders.html`).
 *
 * @param {HTMLElement} container
 */
export function mountOrdersPage(container) {
  clearElement(container);

  let destroyed = false;
  let orders = [];
  let loading = false;
  let errorText = '';

  const page = el('div', { className: 'container order-page' });
  container.appendChild(page);

  async function load() {
    if (loading) return;
    loading = true;
    errorText = '';
    render();
    try {
      const items = await ordersApi.list();
      if (destroyed) return;
      orders = Array.isArray(items) ? items : [];
      loading = false;
      render();
    } catch {
      if (destroyed) return;
      loading = false;
      errorText = 'No pudimos cargar tus pedidos. Inténtalo nuevamente.';
      render();
    }
  }

  function render() {
    clearElement(page);

    page.appendChild(
      el(
        'header',
        { className: 'page-heading' },
        el('span', { className: 'eyebrow', text: 'TU CUENTA' }),
        el('h1', { text: 'Mis pedidos' }),
        el('p', { text: 'Consulta el pago, la preparación y el recojo de tus compras.' }),
        el('button', {
          type: 'button',
          className: 'text-button',
          disabled: loading,
          text: 'Actualizar pedidos',
          onClick: () => load()
        })
      )
    );

    if (errorText) {
      page.appendChild(el('p', { className: 'order-error', role: 'alert', text: errorText }));
    }

    if (loading) {
      page.appendChild(el('p', { role: 'status', text: 'Cargando pedidos…' }));
    }

    orders.forEach(order => {
      const leftCol = el(
        'div',
        {},
        el('small', { text: formatDateTime(order.creado, false) }),
        el('h2', { text: order.numero }),
        el('span', { className: 'status-pill', text: orderStatus[order.estado] || order.estado })
      );

      const rightCol = el(
        'div',
        {},
        el('strong', { text: formatMoney(order.total) }),
        el('p', { text: 'Ver detalle →' })
      );

      page.appendChild(
        el(
          'a',
          {
            className: 'panel order-card',
            href: `/pedidos/${encodeURIComponent(order.id)}`,
            dataset: { nav: 'true' }
          },
          leftCol,
          rightCol
        )
      );
    });

    if (!loading && !errorText && !orders.length) {
      page.appendChild(
        el(
          'section',
          { className: 'state' },
          el('h2', { text: 'Aún no tienes pedidos' }),
          el('p', { text: 'Elige tus productos y confirma tu compra.' }),
          el('a', { className: 'button', href: '/productos', dataset: { nav: 'true' }, text: 'Ver productos' })
        )
      );
    }
  }

  void load();

  return () => {
    destroyed = true;
  };
}
