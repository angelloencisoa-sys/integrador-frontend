import { el, clearElement } from '../shared/dom.js';
import { catalogStore } from '../core/catalog.store.js';
import { cartStore } from '../core/cart.store.js';
import { createProductCard } from '../shared/product-card.js';

const ICONS = ['▧', '◒', '◧', '✦', '◌', '♡'];

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function getHomeCategories() {
  const all = catalogStore.categories;
  const terms = ['abarrote', 'bebida', 'lácteo', 'galleta', 'limpieza', 'cuidado'];
  const matches = terms.flatMap(term => {
    const c = all.find(cat => normalizeText(cat.nombre).includes(normalizeText(term)));
    return c ? [c] : [];
  });
  return [...matches, ...all.filter(c => !matches.includes(c))].slice(0, 6);
}

function getFeaturedProducts() {
  const all = catalogStore.products;
  const terms = ['arroz extra', 'aceite vegetal', 'leche evaporada', 'galletas oreo'];
  const matches = terms.flatMap(term => {
    const p = all.find(prod => String(prod.nombre || '').toLowerCase().includes(term));
    return p ? [p] : [];
  });
  return [...matches, ...all.filter(p => !matches.includes(p))].slice(0, 4);
}

/**
 * Renderiza la página de Inicio (`/`).
 * Equivalente exacto de `HomePage` (`home.ts` / `home.html`).
 * @param {HTMLElement} container
 */
export function mountHomePage(container) {
  clearElement(container);

  // Hero section
  const hero = el(
    'section',
    { className: 'hero' },
    el(
      'div',
      { className: 'container hero-grid' },
      el(
        'div',
        { className: 'hero-copy' },
        el('span', { className: 'eyebrow', text: 'TU BODEGA DE SIEMPRE' }),
        el(
          'h1',
          {},
          'Todo lo que necesitas,',
          el('br', { className: 'desktop-break' }),
          ' cerca de ti.'
        ),
        el('p', {
          className: 'desktop-copy',
          text: 'Explora abarrotes, bebidas, lácteos y productos para el hogar. Agrégalos a tu carrito y prepara tu pedido desde casa.'
        }),
        el('p', {
          className: 'mobile-copy',
          text: 'Compra abarrotes, bebidas y más desde casa.'
        }),
        el(
          'div',
          { className: 'hero-actions' },
          el('a', { className: 'button', href: '/productos', dataset: { nav: 'true' }, text: 'Explorar productos' }),
          el('a', {
            className: 'button button-white secondary-action',
            href: '/carrito',
            dataset: { nav: 'true' },
            text: 'Ver carrito'
          })
        )
      ),
      el('img', {
        className: 'hero-desktop',
        src: '/assets/figma/hero-desktop.svg',
        alt: 'Canasta con productos de la bodega',
        width: '620',
        height: '390'
      }),
      el('img', {
        className: 'hero-mobile',
        src: '/assets/figma/hero-mobile.svg',
        alt: 'Canasta con productos de la bodega',
        width: '350',
        height: '175'
      })
    )
  );

  // Benefits section
  const benefits = el(
    'section',
    { className: 'benefits' },
    el(
      'div',
      { className: 'container benefits-grid' },
      el(
        'div',
        {},
        el('strong', { text: '⌕   Encuentra tus productos' }),
        el('small', { text: 'Catálogo organizado por categorías' })
      ),
      el(
        'div',
        {},
        el('strong', { text: '▣   Compra en línea' }),
        el('small', { text: 'Revisa tu carrito antes de continuar' })
      ),
      el(
        'div',
        {},
        el('strong', { text: '♡   Recojo en tienda' }),
        el('small', { text: 'Tu compra cotidiana, cerca de ti' })
      )
    )
  );

  // Categories section
  const categoryGrid = el('div', { className: 'category-grid' });
  const categoriesSection = el(
    'section',
    { className: 'categories-section container', id: 'categorias' },
    el(
      'div',
      { className: 'section-heading' },
      el('h2', { text: 'Compra por categoría' }),
      el('a', { href: '/productos', dataset: { nav: 'true' }, text: 'Ver todas →' })
    ),
    categoryGrid
  );

  // Featured section
  const featuredContent = el('div');
  const featuredSection = el(
    'section',
    { className: 'featured container' },
    el(
      'div',
      { className: 'section-heading' },
      el('h2', { text: 'Para tu día a día' }),
      el('a', { href: '/productos', dataset: { nav: 'true' }, text: 'Explorar catálogo →' })
    ),
    el('p', {
      className: 'section-description',
      text: 'Productos del catálogo de Comercial Nova. Consulta su precio y disponibilidad.'
    }),
    featuredContent,
    el('a', {
      className: 'button mobile-catalog',
      href: '/productos',
      dataset: { nav: 'true' },
      text: 'Ver todo el catálogo'
    })
  );

  // Steps section
  const stepsSection = el(
    'section',
    { className: 'steps-section' },
    el(
      'div',
      { className: 'container' },
      el('h2', { text: 'Compra en tres pasos' }),
      el('p', {
        className: 'section-description',
        text: 'Un recorrido claro desde el catálogo hasta tu próxima compra.'
      }),
      el(
        'div',
        { className: 'steps-grid' },
        el(
          'div',
          {},
          el('span', { text: '01' }),
          el('h3', { text: 'Elige' }),
          el('p', { text: 'Encuentra productos por nombre o categoría.' })
        ),
        el(
          'div',
          {},
          el('span', { text: '02' }),
          el('h3', { text: 'Agrega al carrito' }),
          el('p', { text: 'Revisa cantidades y el total antes de seguir.' })
        ),
        el(
          'div',
          {},
          el('span', { text: '03' }),
          el('h3', { text: 'Continúa con tu cuenta' }),
          el('p', { text: 'Ingresa o regístrate para continuar al pago.' })
        )
      )
    )
  );

  // Store section
  const storeSection = el(
    'section',
    { className: 'store-section', id: 'nosotros' },
    el(
      'div',
      { className: 'container store-grid' },
      el(
        'div',
        {},
        el('span', { className: 'eyebrow', text: 'TU BODEGA EN EL BARRIO' }),
        el('h2', { text: 'Tu pedido, para recoger en tienda.' }),
        el('p', {
          text: 'Comercial Nova, tu tienda de productos cotidianos. Explora el catálogo y prepara tu compra desde casa.'
        }),
        el('a', { className: 'button', href: '/productos', dataset: { nav: 'true' }, text: 'Explorar productos' })
      ),
      el(
        'figure',
        {},
        el('img', {
          src: '/assets/figma/map.svg',
          alt: 'Ilustración referencial de la ubicación de una bodega',
          width: '510',
          height: '220'
        }),
        el('figcaption', { text: 'Mapa ilustrativo. Dirección y horarios por confirmar.' })
      )
    )
  );

  container.append(hero, benefits, categoriesSection, featuredSection, stepsSection, storeSection);

  function renderDynamic() {
    clearElement(categoryGrid);
    const categories = getHomeCategories();
    categories.forEach((category, i) => {
      categoryGrid.appendChild(
        el(
          'a',
          {
            className: `category-tile category-${i}`,
            href: `/productos?categoria=${encodeURIComponent(category.id)}`,
            dataset: { nav: 'true' }
          },
          el('span', { 'aria-hidden': 'true', text: ICONS[i] || '▧' }),
          el('strong', { text: category.nombre })
        )
      );
    });

    clearElement(featuredContent);
    if (catalogStore.loading) {
      featuredContent.appendChild(el('p', { className: 'state', role: 'status', text: 'Cargando productos…' }));
    } else if (catalogStore.error) {
      featuredContent.appendChild(
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
    } else {
      const grid = el('div', { className: 'featured-grid' });
      getFeaturedProducts().forEach(product => {
        grid.appendChild(createProductCard(product, false));
      });
      featuredContent.appendChild(grid);
    }
  }

  renderDynamic();
  const unsubCatalog = catalogStore.subscribe(renderDynamic);
  const unsubCart = cartStore.subscribe(renderDynamic);

  return () => {
    unsubCatalog();
    unsubCart();
  };
}
