import { el, clearElement } from '../shared/dom.js';
import { formatMoney } from '../shared/format.js';
import { cartStore } from '../core/cart.store.js';
import { catalogStore } from '../core/catalog.store.js';
import { createProductArt } from '../shared/product-art.js';
import { createQuantityControl } from '../shared/quantity.js';

/**
 * Renderiza la página del Carrito (`/carrito`).
 * Equivalente exacto de `CartPage` (`cart.ts` / `cart.html`).
 *
 * @param {HTMLElement} container
 */
export function mountCartPage(container) {
  clearElement(container);

  const page = el('div', { className: 'container cart-page' });
  container.appendChild(page);

  function render() {
    clearElement(page);

    page.appendChild(
      el(
        'header',
        { className: 'page-heading' },
        el('a', { className: 'eyebrow', href: '/', dataset: { nav: 'true' }, text: 'INICIO / CARRITO' }),
        el('h1', { text: 'Tu carrito' }),
        el('p', { text: 'Revisa tus productos antes de continuar al pago.' })
      )
    );

    if (catalogStore.loading) {
      page.appendChild(el('p', { className: 'state', role: 'status', text: 'Consultando disponibilidad…' }));
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
          { className: 'state empty-cart' },
          el('span', { className: 'empty-symbol', 'aria-hidden': 'true', text: '▧' }),
          el('h2', { text: 'Tu carrito está esperando' }),
          el('p', { text: 'Agrega tus productos favoritos y prepara tu próxima compra.' }),
          el('a', { className: 'button', href: '/productos', dataset: { nav: 'true' }, text: 'Explorar productos' })
        )
      );
      return;
    }

    const cartList = el(
      'section',
      { className: 'cart-list panel' },
      el('h2', { text: `Productos seleccionados (${cartStore.count} unidades)` })
    );

    lines.forEach(line => {
      const detailUrl = `/productos/${encodeURIComponent(line.id)}`;
      const artLink = el('a', { href: detailUrl, dataset: { nav: 'true' } }, createProductArt(line.producto, false));

      const description = el(
        'div',
        { className: 'cart-description' },
        el('span', { className: 'eyebrow', text: line.producto.marca || '' }),
        el('a', { className: 'product-title', href: detailUrl, dataset: { nav: 'true' }, text: line.producto.nombre }),
        el('small', { text: `Precio unitario · ${formatMoney(line.producto.precioVenta)}` }),
        el('button', {
          type: 'button',
          className: 'text-button',
          'aria-label': `Quitar ${line.producto.nombre}`,
          text: 'Quitar',
          onClick: () => cartStore.remove(line.id)
        })
      );

      const qtyControl = createQuantityControl({
        value: line.cantidad,
        max: line.producto.disponible,
        label: line.producto.nombre,
        onChange: nextQty => cartStore.set(line.producto, nextQty)
      });

      const lineSubtotal = Math.round(Number(line.producto.precioVenta) * 100) * line.cantidad / 100;
      const amountBox = el(
        'div',
        { className: 'cart-amount' },
        qtyControl,
        el('strong', { text: formatMoney(lineSubtotal) })
      );

      cartList.appendChild(el('article', { className: 'cart-row' }, artLink, description, amountBox));
    });

    cartList.appendChild(
      el('a', {
        className: 'text-button keep-shopping',
        href: '/productos',
        dataset: { nav: 'true' },
        text: '← Seguir comprando'
      })
    );

    const summary = el(
      'aside',
      { className: 'summary panel' },
      el('h2', { text: 'Resumen del pedido' }),
      el(
        'div',
        { className: 'summary-row' },
        el('span', { text: `Productos (${cartStore.count})` }),
        el('span', { text: formatMoney(cartStore.total) })
      ),
      el(
        'div',
        { className: 'summary-row' },
        el('span', { text: 'Modalidad' }),
        el('span', { text: 'Recojo en tienda' })
      ),
      el('hr'),
      el(
        'div',
        { className: 'summary-row total' },
        el('strong', { text: 'Total de productos' }),
        el('strong', { text: formatMoney(cartStore.total) })
      ),
      el('p', { text: 'Podrás revisar tus datos antes de continuar. Tu carrito aún no reserva productos.' }),
      el('a', {
        className: 'button button-orange',
        href: '/checkout',
        dataset: { nav: 'true' },
        text: 'Continuar al pago'
      }),
      el('small', { text: 'Inicia sesión o regístrate en el siguiente paso. Tu carrito se conservará.' })
    );

    page.appendChild(el('div', { className: 'purchase-layout' }, cartList, summary));
  }

  render();
  const unsubCatalog = catalogStore.subscribe(render);
  const unsubCart = cartStore.subscribe(render);

  return () => {
    unsubCatalog();
    unsubCart();
  };
}
