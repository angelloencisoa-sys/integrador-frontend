import { el } from './dom.js';
import { formatMoney } from './format.js';
import { createProductArt } from './product-art.js';
import { cartStore } from '../core/cart.store.js';

/**
 * Crea la tarjeta de producto para inicio y catálogo.
 * Equivalente exacto de `ProductCard` (`product-card.ts`).
 *
 * @param {any} product
 * @param {boolean} [catalogAsset=false]
 * @returns {HTMLElement}
 */
export function createProductCard(product, catalogAsset = false) {
  const detailHref = `/productos/${encodeURIComponent(product.id)}`;

  const artLink = el(
    'a',
    {
      href: detailHref,
      dataset: { nav: 'true' },
      'aria-label': `Ver ${product.nombre}`
    },
    createProductArt(product, catalogAsset)
  );

  const eyebrow = el('span', {
    className: 'eyebrow',
    text: product.marca || product.categoriaNombre || ''
  });

  const nameLink = el('a', {
    className: 'product-name',
    href: detailHref,
    dataset: { nav: 'true' },
    text: product.nombre
  });

  const price = el('strong', {
    className: 'price',
    text: formatMoney(product.precioVenta)
  });

  const stockNote = el('small', {
    text: product.disponible > 0 ? 'Disponible' : 'Agotado por el momento'
  });

  const inCart = cartStore.quantity(product.id);
  const isDisabled = product.disponible <= inCart;
  const buttonLabel =
    product.disponible <= 0
      ? 'Agotado'
      : product.disponible <= inCart
        ? 'Máximo en carrito'
        : 'Añadir al carrito';

  const addButton = el('button', {
    type: 'button',
    className: 'add-button',
    disabled: isDisabled,
    text: buttonLabel,
    onClick: () => {
      cartStore.add(product);
    }
  });

  const info = el('div', { className: 'product-info' }, eyebrow, nameLink, price, stockNote, addButton);
  const article = el('article', { className: 'product-card' }, artLink, info);

  return el('div', { className: 'product-card-host' }, article);
}
