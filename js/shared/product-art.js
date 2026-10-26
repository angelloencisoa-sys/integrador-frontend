import { el } from './dom.js';
import { getProductImage } from './product-images.js';

/**
 * Clasifica el tipo de ilustración del producto según su nombre.
 * Equivalente exacto de `ProductArt` en `product-art.ts`.
 * @param {any} product
 * @returns {'oil' | 'milk' | 'cookie' | 'water' | 'rice'}
 */
export function getProductArtKind(product) {
  const name = String(product?.nombre || '').toLowerCase();
  if (name.includes('aceite')) return 'oil';
  if (name.includes('leche')) return 'milk';
  if (name.includes('galleta') || name.includes('oreo')) return 'cookie';
  if (name.includes('agua ')) return 'water';
  return 'rice';
}

/**
 * Obtiene la etiqueta corta para la ilustración por defecto (bolsa de abarrotes).
 * @param {any} product
 * @returns {string}
 */
export function getProductArtLabel(product) {
  const rawName = String(product?.nombre || '');
  const lower = rawName.toLowerCase();
  if (lower.includes('arroz')) return 'ARROZ';
  if (lower.includes('azúcar') || lower.includes('azucar')) return 'AZÚCAR';
  return (rawName.split(' ')[0] || 'PRODUCTO').toUpperCase();
}

/**
 * Muestra la fotografía local o una ilustración de respaldo del producto.
 * @param {any} product
 * @param {boolean} [catalogAsset=false]
 * @returns {HTMLElement}
 */
export function createProductArt(product, catalogAsset = false) {
  const imageSrc = getProductImage(product);
  if (imageSrc) {
    const container = el('div', { className: 'product-art product-art--photo' });
    const photo = el('img', {
      src: imageSrc,
      alt: product.nombre || 'Producto',
      className: 'product-photo',
      width: '800',
      height: '800',
      loading: catalogAsset ? 'lazy' : 'eager',
      decoding: 'async',
      onError: () => container.replaceWith(createProductIllustration(product, catalogAsset))
    });
    container.append(photo);
    return container;
  }
  return createProductIllustration(product, catalogAsset);
}

function createProductIllustration(product, catalogAsset) {
  const kind = getProductArtKind(product);
  const objectContainer = el('div', { className: 'object' });

  if (kind === 'oil') {
    objectContainer.append(
      el('div', { className: 'shadow oil-shadow' }),
      el('div', { className: 'oil-neck' }),
      el('div', { className: 'oil-cap' }),
      el('div', { className: 'oil-bottle' }),
      el('span', { className: 'oil-label', text: 'ACEITE' })
    );
  } else if (kind === 'milk') {
    objectContainer.append(
      el('div', { className: 'shadow milk-shadow' }),
      el('div', { className: 'milk-box' }),
      el('div', { className: 'milk-cap' }),
      el('span', { className: 'milk-label', text: 'LECHE' })
    );
  } else if (kind === 'cookie') {
    const cookieSvg = `/assets/figma/${catalogAsset ? 'cookie-catalog' : 'cookie'}.svg`;
    objectContainer.append(
      el('div', { className: 'cookie-pack' }),
      el('span', { className: 'cookie-label', text: 'GALLETAS' }),
      el('img', {
        src: cookieSvg,
        alt: '',
        className: 'cookie',
        width: '54',
        height: '54'
      })
    );
  } else if (kind === 'water') {
    objectContainer.append(
      el('div', { className: 'water-bottle' }),
      el('div', { className: 'water-cap' }),
      el('span', { className: 'water-label', text: 'AGUA' })
    );
  } else {
    const label = getProductArtLabel(product);
    const labelSpan = el('span', {
      className: label === 'ARROZ' ? 'rice-label original-rice' : 'rice-label',
      text: label
    });
    objectContainer.append(
      el('div', { className: 'shadow rice-shadow' }),
      el('div', { className: 'rice-bag' }),
      el('div', { className: 'rice-seal' }),
      labelSpan
    );
  }

  const visual = el(
    'div',
    {
      className: `visual visual--${kind}`,
      'aria-hidden': 'true'
    },
    objectContainer
  );

  return el('div', { className: 'product-art' }, visual);
}
