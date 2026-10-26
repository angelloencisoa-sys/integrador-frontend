import { el, clearElement } from '../shared/dom.js';
import { catalogStore } from '../core/catalog.store.js';
import { cartStore } from '../core/cart.store.js';
import { createProductCard } from '../shared/product-card.js';
import { navigateTo } from '../router.js';

function normalizeText(str) {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Renderiza la página de Catálogo (`/productos`).
 * Equivalente exacto de `CatalogPage` (`catalog.ts` / `catalog.html`).
 *
 * @param {HTMLElement} container
 * @param {{ queryParams: URLSearchParams }} context
 */
export function mountCatalogPage(container, { queryParams }) {
  clearElement(container);

  let query = queryParams.get('buscar') || '';
  let category = Number(queryParams.get('categoria')) || 0;
  let sort = 'featured';
  let maxPrice = 100;
  let limit = 12;

  const heading = el(
    'header',
    { className: 'page-heading' },
    el('a', { className: 'eyebrow', href: '/', dataset: { nav: 'true' }, text: 'INICIO / PRODUCTOS' }),
    el('h1', { text: 'Encuentra lo que buscas' }),
    el('p', {
      text: 'Abarrotes, bebidas y artículos para tu hogar. Explora el catálogo y agrega tus favoritos al carrito.'
    })
  );

  const filtersAside = el('aside', { className: 'filters panel', 'aria-label': 'Filtros de productos' });

  const searchInput = el('input', {
    type: 'search',
    'aria-label': 'Buscar producto o marca',
    placeholder: '⌕ Buscar producto o marca',
    value: query,
    onInput: e => {
      query = e.target.value;
      limit = 12;
      syncUrl(true);
      renderResults();
    }
  });

  const sortSelect = el(
    'select',
    {
      'aria-label': 'Ordenar productos',
      onChange: e => {
        sort = e.target.value;
        renderResults();
      }
    },
    el('option', { value: 'featured', text: 'Ordenar: destacados' }),
    el('option', { value: 'low', text: 'Menor precio' }),
    el('option', { value: 'high', text: 'Mayor precio' }),
    el('option', { value: 'name', text: 'Nombre A–Z' })
  );
  sortSelect.value = sort;

  const toolbar = el('div', { className: 'catalog-toolbar' }, searchInput, sortSelect);
  const countDescription = el('p', { className: 'section-description' });
  const resultsBody = el('div');

  const resultsSection = el(
    'section',
    { className: 'results', 'aria-label': 'Resultados del catálogo' },
    toolbar,
    el('h2', { text: 'Productos para tu día a día' }),
    countDescription,
    resultsBody
  );

  const layout = el('div', { className: 'catalog-layout' }, filtersAside, resultsSection);
  const page = el('div', { className: 'container catalog-page' }, heading, layout);
  container.appendChild(page);

  function syncUrl(replace = false) {
    const params = new URLSearchParams();
    if (query) params.set('buscar', query);
    if (category) params.set('categoria', String(category));
    const qs = params.toString();
    const nextUrl = qs ? `/productos?${qs}` : '/productos';
    if (replace) {
      window.history.replaceState({}, '', nextUrl);
    } else {
      window.history.pushState({}, '', nextUrl);
    }
  }

  function resetFilters() {
    maxPrice = 100;
    sort = 'featured';
    query = '';
    category = 0;
    limit = 12;
    searchInput.value = '';
    sortSelect.value = 'featured';
    navigateTo('/productos');
  }

  function getFilteredProducts() {
    const term = normalizeText(query);
    const result = catalogStore.products.filter(
      p =>
        (!category || p.categoriaId === category) &&
        normalizeText(`${p.nombre} ${p.marca || ''}`).includes(term) &&
        Number(p.precioVenta) <= maxPrice
    );
    return [...result].sort((a, b) => {
      if (sort === 'low') return Number(a.precioVenta) - Number(b.precioVenta);
      if (sort === 'high') return Number(b.precioVenta) - Number(a.precioVenta);
      if (sort === 'name') return String(a.nombre).localeCompare(String(b.nombre), 'es');
      return a.id - b.id;
    });
  }

  function renderFilters() {
    clearElement(filtersAside);
    filtersAside.append(
      el('h3', { text: 'Filtrar productos' }),
      el('h4', { text: 'Categorías' })
    );

    const allLink = el(
      'a',
      {
        href: query ? `/productos?buscar=${encodeURIComponent(query)}` : '/productos',
        className: !category ? 'selected' : '',
        onClick: e => {
          e.preventDefault();
          category = 0;
          limit = 12;
          syncUrl(false);
          renderFilters();
          renderResults();
        }
      },
      el('span', { 'aria-hidden': 'true', text: !category ? '◉' : '○' }),
      ' Todos los productos'
    );
    filtersAside.appendChild(allLink);

    for (const c of catalogStore.categories) {
      const selected = category === c.id;
      const params = new URLSearchParams();
      if (query) params.set('buscar', query);
      params.set('categoria', String(c.id));
      const catLink = el(
        'a',
        {
          href: `/productos?${params.toString()}`,
          className: selected ? 'selected' : '',
          onClick: e => {
            e.preventDefault();
            category = c.id;
            limit = 12;
            syncUrl(false);
            renderFilters();
            renderResults();
          }
        },
        el('span', { 'aria-hidden': 'true', text: selected ? '◉' : '○' }),
        ` ${c.nombre}`
      );
      filtersAside.appendChild(catLink);
    }

    const priceLabel = el('label', {
      for: 'precio',
      text: `Precio máximo: S/ ${maxPrice}`
    });

    const priceRange = el('input', {
      id: 'precio',
      type: 'range',
      min: '0',
      max: '100',
      step: '1',
      value: String(maxPrice),
      onInput: e => {
        maxPrice = Number(e.target.value);
        priceLabel.textContent = `Precio máximo: S/ ${maxPrice}`;
        renderResults();
      }
    });

    const resetBtn = el('button', {
      type: 'button',
      className: 'text-button',
      text: 'Limpiar filtros',
      onClick: resetFilters
    });

    filtersAside.append(priceLabel, priceRange, resetBtn);
  }

  function renderResults() {
    const filtered = getFilteredProducts();
    const visible = filtered.slice(0, limit);
    countDescription.textContent = `${filtered.length} productos · Precio y disponibilidad del catálogo de la tienda.`;

    clearElement(resultsBody);

    if (catalogStore.loading) {
      resultsBody.appendChild(el('p', { className: 'state', role: 'status', text: 'Cargando productos…' }));
    } else if (catalogStore.error) {
      resultsBody.appendChild(
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
    } else if (!filtered.length) {
      resultsBody.appendChild(
        el(
          'div',
          { className: 'state' },
          el('h3', { text: 'No encontramos productos' }),
          el('p', { text: 'Prueba con otro nombre o cambia los filtros.' }),
          el('button', {
            type: 'button',
            className: 'button',
            text: 'Ver todos los productos',
            onClick: resetFilters
          })
        )
      );
    } else {
      const grid = el('div', { className: 'catalog-grid' });
      visible.forEach(prod => {
        grid.appendChild(createProductCard(prod, true));
      });
      resultsBody.appendChild(grid);

      if (visible.length < filtered.length) {
        resultsBody.appendChild(
          el('button', {
            type: 'button',
            className: 'button load-more',
            text: 'Ver más productos',
            onClick: () => {
              limit += 12;
              renderResults();
            }
          })
        );
      }
    }
  }

  renderFilters();
  renderResults();

  const unsubCatalog = catalogStore.subscribe(() => {
    renderFilters();
    renderResults();
  });
  const unsubCart = cartStore.subscribe(() => {
    renderResults();
  });

  return () => {
    unsubCatalog();
    unsubCart();
  };
}
