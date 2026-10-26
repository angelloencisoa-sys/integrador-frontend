import { el } from './dom.js';

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
 * Crea el nodo DOM para la ilustración referencial de un producto (`<div class="product-art">`).
 * @param {any} product
 * @param {boolean} [catalogAsset=false]
 * @returns {HTMLElement}
 */
export function createProductArt(product, catalogAsset = false) {
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
