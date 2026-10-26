/**
 * Utilidades seguras de creación de nodos DOM.
 * Evita por completo el uso de `innerHTML` con datos de usuario o de la API,
 * asignando cadenas exclusivamente mediante `textContent` o atributos seguros.
 */

/**
 * Crea un elemento HTML con propiedades, atributos y nodos hijos seguros.
 * @param {string} tag Nombre de la etiqueta HTML
 * @param {Record<string, any>} [props] Propiedades o atributos
 * @param {...(Node | string | null | undefined | false)} children Hijos (nodos o texto seguro)
 * @returns {HTMLElement}
 */
export function el(tag, props = {}, ...children) {
  const element = document.createElement(tag);
  if (props) {
    for (const [key, value] of Object.entries(props)) {
      if (value === undefined || value === null || value === false) continue;
      if (key === 'className') {
        element.className = String(value);
      } else if (key === 'text') {
        element.textContent = String(value);
      } else if (key === 'dataset' && typeof value === 'object') {
        for (const [dKey, dVal] of Object.entries(value)) {
          if (dVal !== undefined && dVal !== null) {
            element.dataset[dKey] = String(dVal);
          }
        }
      } else if (key.startsWith('on') && typeof value === 'function') {
        const eventName = key.slice(2).toLowerCase();
        element.addEventListener(eventName, value);
      } else if (key === 'disabled' || key === 'required' || key === 'hidden' || key === 'checked') {
        element[key] = Boolean(value);
      } else if (key === 'value') {
        element.value = String(value);
      } else {
        element.setAttribute(key, String(value));
      }
    }
  }

  for (const child of children.flat()) {
    if (child === null || child === undefined || child === false) continue;
    if (child instanceof Node) {
      element.appendChild(child);
    } else {
      element.appendChild(document.createTextNode(String(child)));
    }
  }

  return element;
}

/**
 * Limpia todos los hijos de un contenedor de forma segura.
 * @param {Element} container
 */
export function clearElement(container) {
  while (container.firstChild) {
    container.removeChild(container.firstChild);
  }
}
