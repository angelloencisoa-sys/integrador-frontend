/**
 * Funciones puras del dominio del carrito de invitado.
 * Conserva exactamente las reglas de validación, reconciliación de stock
 * y cálculo de totales en céntimos de `cart-domain.ts`.
 */

/**
 * Parsea y sanea el JSON almacenado en `localStorage`.
 * - Recupera un carrito corrupto devolviendo `[]`.
 * - Rechaza cantidades negativas, decimales o IDs no enteros positivos.
 * - Fusiona entradas duplicadas del mismo producto hasta un tope de 999.
 *
 * @param {string | null} raw
 * @returns {{ id: number, cantidad: number }[]}
 */
export function parseCart(raw) {
  try {
    const parsed = JSON.parse(raw || '[]');
    if (!Array.isArray(parsed)) return [];
    const quantities = new Map();
    for (const entry of parsed.slice(0, 500)) {
      if (
        entry &&
        Number.isSafeInteger(entry.id) &&
        entry.id > 0 &&
        Number.isSafeInteger(entry.cantidad) &&
        entry.cantidad > 0
      ) {
        quantities.set(entry.id, Math.min(999, (quantities.get(entry.id) || 0) + entry.cantidad));
      }
    }
    return [...quantities].map(([id, cantidad]) => ({ id, cantidad }));
  } catch {
    return [];
  }
}

/**
 * Ajusta las cantidades del carrito según el stock disponible del catálogo
 * y descarta productos retirados o agotados.
 *
 * @param {{ id: number, cantidad: number }[]} entries
 * @param {any[]} products
 * @returns {{ id: number, cantidad: number }[]}
 */
export function reconcileCart(entries, products) {
  const available = new Map(products.map(p => [p.id, p.disponible]));
  return entries
    .map(e => ({ id: e.id, cantidad: Math.min(e.cantidad, available.get(e.id) || 0) }))
    .filter(e => e.cantidad > 0);
}

/**
 * Calcula el total en céntimos enteros para evitar errores de coma flotante.
 *
 * @param {{ id: number, cantidad: number }[]} entries
 * @param {any[]} products
 * @returns {number}
 */
export function totalCents(entries, products) {
  const prices = new Map(products.map(p => [p.id, Math.round(Number(p.precioVenta) * 100)]));
  return entries.reduce((sum, e) => sum + (prices.get(e.id) || 0) * e.cantidad, 0);
}
