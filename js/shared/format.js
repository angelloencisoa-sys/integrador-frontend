/**
 * Formateadores equivalentes a `MoneyPipe` (`money.pipe.ts`) y `DatePipe` de Angular.
 */

const penFormatter = new Intl.NumberFormat('es-PE', {
  style: 'currency',
  currency: 'PEN'
});

/**
 * Formatea un monto numérico en Soles peruanos (`S/ 0.00`).
 * @param {number | string} value
 * @returns {string}
 */
export function formatMoney(value) {
  const num = Number(value);
  return penFormatter.format(Number.isFinite(num) ? num : 0);
}

/**
 * Formatea una cadena ISO de fecha/hora a `dd/MM/yyyy HH:mm` o `dd/MM/yyyy HH:mm:ss`.
 * Equivalente a `date:'dd/MM/yyyy HH:mm'` y `date:'dd/MM/yyyy HH:mm:ss'`.
 * @param {string | null | undefined} isoString
 * @param {boolean} [includeSeconds=false]
 * @returns {string}
 */
export function formatDateTime(isoString, includeSeconds = false) {
  if (!isoString) return '';
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return String(isoString);
  const pad = n => String(n).padStart(2, '0');
  const day = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const year = date.getFullYear();
  const hours = pad(date.getHours());
  const minutes = pad(date.getMinutes());
  const seconds = pad(date.getSeconds());
  return includeSeconds
    ? `${day}/${month}/${year} ${hours}:${minutes}:${seconds}`
    : `${day}/${month}/${year} ${hours}:${minutes}`;
}
