import { el, clearElement } from '../shared/dom.js';
import { formatMoney } from '../shared/format.js';
import { catalogStore } from '../core/catalog.store.js';
import { cartStore } from '../core/cart.store.js';
import { createProductArt } from '../shared/product-art.js';
import { createQuantityControl } from '../shared/quantity.js';

/**
 * Renderiza la página de Detalle de Producto (`/productos/:id`).
 * Equivalente exacto de `DetailPage` (`detail.ts` / `detail.html`).
 *
 * @param {HTMLElement} container
 * @param {{ params: { id: string } }} context
 */
export function mountDetailPage(container, { params }) {
  clearElement(container);

  const productId = Number(params.id);
  let amount = 1;
  let activeTab = 'front';

  const page = el('div', { className: 'container detail-page' });
  container.appendChild(page);

  function render() {
    clearElement(page);
    const product = catalogStore.products.find(p => p.id === productId);

    const breadcrumb = el(
      'nav',
      { className: 'breadcrumb', 'aria-label': 'Ruta del producto' },
      el('a', { href: '/', dataset: { nav: 'true' }, text: 'Inicio' }),
      ' / ',
      el('a', { href: '/productos', dataset: { nav: 'true' }, text: 'Productos' })
    );

    if (product) {
      breadcrumb.append(
        ' / ',
        el('a', {
          href: `/productos?categoria=${encodeURIComponent(product.categoriaId)}`,
          dataset: { nav: 'true' },
          text: product.categoriaNombre
        }),
        ` / ${product.nombre}`
      );
    }
    page.appendChild(breadcrumb);

    if (catalogStore.loading) {
      page.appendChild(el('p', { className: 'state', role: 'status', text: 'Cargando producto…' }));
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

    if (!product) {
      page.appendChild(
        el(
          'div',
          { className: 'state' },
          el('h1', { text: 'Producto no disponible' }),
          el('p', { text: 'Este producto ya no forma parte del catálogo.' }),
          el('a', {
            className: 'button',
            href: '/productos',
            dataset: { nav: 'true' },
            text: 'Volver al catálogo'
          })
        )
      );
      return;
    }

    if (amount > product.disponible && product.disponible > 0) {
      amount = product.disponible;
    }

    // Gallery
    const galleryVisual =
      activeTab === 'front'
        ? createProductArt(product, false)
        : el(
            'div',
            { className: 'gallery-info panel' },
            el('h2', { text: activeTab === 'unit' ? 'Presentación' : 'Información' }),
            el('p', {
              text:
                activeTab === 'unit'
                  ? product.nombre
                  : product.descripcion || 'Consulta la presentación y las indicaciones del producto en tienda.'
            }),
            el('p', { text: `${product.marca || ''} · ${product.unidadMedida}` })
          );

    const galleryTabs = el(
      'div',
      { className: 'gallery-tabs', role: 'group', 'aria-label': 'Información del producto' },
      el('button', {
        type: 'button',
        className: activeTab === 'front' ? 'active' : '',
        text: 'Vista frontal',
        onClick: () => {
          activeTab = 'front';
          render();
        }
      }),
      el('button', {
        type: 'button',
        className: activeTab === 'unit' ? 'active' : '',
        text: 'Presentación',
        onClick: () => {
          activeTab = 'unit';
          render();
        }
      }),
      el('button', {
        type: 'button',
        className: activeTab === 'info' ? 'active' : '',
        text: 'Información',
        onClick: () => {
          activeTab = 'info';
          render();
        }
      })
    );

    const gallery = el(
      'div',
      { className: 'gallery' },
      galleryVisual,
      galleryTabs,
      el('small', { className: 'art-caption', text: 'Imagen referencial del producto.' })
    );

    // Detail copy
    const detailCopy = el(
      'div',
      { className: 'detail-copy' },
      el('span', { className: 'eyebrow', text: `${product.categoriaNombre} / ${product.marca || ''}` }),
      el('h1', { text: product.nombre }),
      el('p', { text: product.descripcion || 'Un básico para tu compra de todos los días.' }),
      el('strong', { className: 'detail-price', text: formatMoney(product.precioVenta) }),
      el('small', { text: 'Precio de venta del catálogo de la tienda' }),
      el('p', {
        className: 'availability',
        text: product.disponible > 0 ? `Disponible: ${product.disponible} unidades` : 'Agotado por el momento'
      })
    );

    if (product.disponible > 0) {
      const qtyControl = createQuantityControl({
        value: amount,
        max: product.disponible,
        label: product.nombre,
        onChange: nextVal => {
          amount = nextVal;
        }
      });

      const addBtn = el('button', {
        type: 'button',
        className: 'button button-orange',
        disabled: cartStore.quantity(product.id) >= product.disponible,
        text: 'Añadir al carrito',
        onClick: () => {
          cartStore.add(product, amount);
        }
      });

      detailCopy.append(
        el('label', { text: 'Cantidad' }),
        el('div', { className: 'detail-actions' }, qtyControl, addBtn)
      );
    }

    detailCopy.append(
      el('p', { className: 'detail-note', text: '✓ Podrás revisar cantidades y total en el carrito.' }),
      el('p', { className: 'detail-note', text: '✓ Compra para recojo en tienda.' }),
      el('small', { text: `Código: ${product.codigo} · Unidad: ${product.unidadMedida}` })
    );

    const detailGrid = el('section', { className: 'detail-grid' }, gallery, detailCopy);

    const extraInfo = el(
      'section',
      { className: 'extra-info' },
      el(
        'div',
        {},
        el('h2', { text: 'Descripción' }),
        el('p', { text: product.descripcion || `${product.nombre} de ${product.marca || 'la bodega'}.` })
      ),
      el(
        'div',
        {},
        el('h2', { text: 'Antes de confirmar' }),
        el('p', {
          text: 'Agregar productos al carrito no reserva existencias. La disponibilidad y el precio pueden cambiar antes de finalizar la compra.'
        })
      )
    );

    page.append(detailGrid, extraInfo);

    const related = catalogStore.products
      .filter(p => p.id !== product.id && p.categoriaId === product.categoriaId)
      .slice(0, 3);

    if (related.length) {
      const relatedLinks = el('div');
      related.forEach(rel => {
        relatedLinks.appendChild(
          el('a', {
            href: `/productos/${encodeURIComponent(rel.id)}`,
            dataset: { nav: 'true' },
            text: `${rel.nombre} →`
          })
        );
      });
      page.appendChild(
        el('section', { className: 'related' }, el('h2', { text: 'También te puede interesar' }), relatedLinks)
      );
    }
  }

  render();
  const unsubCatalog = catalogStore.subscribe(render);
  const unsubCart = cartStore.subscribe(render);

  return () => {
    unsubCatalog();
    unsubCart();
  };
}
