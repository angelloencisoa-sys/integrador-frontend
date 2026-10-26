import { el } from './dom.js';

/**
 * Crea el selector numérico de cantidad con botones `−` y `+` y validación contra stock máximo.
 * Equivalente exacto de `Quantity` (`quantity.ts` y `quantity.spec.ts`).
 *
 * @param {{
 *   value: number,
 *   max: number,
 *   label?: string,
 *   onChange: (newValue: number) => void
 * }} options
 * @returns {HTMLElement}
 */
export function createQuantityControl({ value = 1, max = 1, label = 'producto', onChange }) {
  let currentValue = Number.isFinite(value) ? Math.max(1, Math.min(max, Math.trunc(value))) : 1;

  const decreaseBtn = el('button', {
    type: 'button',
    'aria-label': `Disminuir cantidad de ${label}`,
    disabled: currentValue <= 1,
    text: '−',
    onClick: () => {
      if (currentValue > 1) {
        emitChange(currentValue - 1);
      }
    }
  });

  const input = el('input', {
    type: 'number',
    min: '1',
    max: String(max),
    value: String(currentValue),
    'aria-label': `Cantidad de ${label}`,
    onChange: event => {
      event.stopPropagation();
      const raw = event.target.value;
      const n = Number(raw);
      const next = Number.isFinite(n)
        ? Math.min(max, Math.max(1, Math.trunc(n)))
        : currentValue;
      input.value = String(next);
      emitChange(next);
    }
  });

  const increaseBtn = el('button', {
    type: 'button',
    'aria-label': `Aumentar cantidad de ${label}`,
    disabled: currentValue >= max,
    text: '+',
    onClick: () => {
      if (currentValue < max) {
        emitChange(currentValue + 1);
      }
    }
  });

  function emitChange(nextVal) {
    currentValue = nextVal;
    input.value = String(currentValue);
    decreaseBtn.disabled = currentValue <= 1;
    increaseBtn.disabled = currentValue >= max;
    if (typeof onChange === 'function') {
      onChange(currentValue);
    }
  }

  return el(
    'div',
    { className: 'quantity-host' },
    el('div', { className: 'quantity' }, decreaseBtn, input, increaseBtn)
  );
}
