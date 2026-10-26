import { productImages } from './product-images.data.js';

const normalize = value => String(value || '').normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

/** El código comercial es estable aunque cambie el ID o el nombre del catálogo. */
export function getProductImage(product) {
  const code = String(product?.codigo || '').trim().toUpperCase();
  const entry = code
    ? productImages.find(image => image.codigo === code)
    : productImages.find(image => normalize(image.nombre) === normalize(product?.nombre)
      && normalize(image.marca) === normalize(product?.marca));
  return entry ? `/assets/productos/${entry.archivo}` : null;
}
