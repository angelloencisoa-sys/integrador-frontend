import { el, clearElement } from './shared/dom.js';
import { authStore } from './core/auth.store.js';
import { cartStore } from './core/cart.store.js';
import { catalogStore } from './core/catalog.store.js';
import { STORE_INFO, createStoreMapLink } from './shared/store-info.js';
import { navigateTo, handleCurrentRoute, setRouteChangeListener } from './router.js';

/**
 * Inicializa el shell principal de "La Bodega" (encabezado, buscador global,
 * menú móvil, estado de sesión, contador de carrito, pie de página y avisos toast).
 * Equivalente exacto de `App` (`app.ts` / `app.html`).
 */
function bootstrapApp() {
  const storeContact = document.getElementById('store-contact');
  storeContact.append(
    el('span', { text: STORE_INFO.direccion }),
    el('span', { text: `Referencia: ${STORE_INFO.referencia}` }),
    el('span', { text: STORE_INFO.horario }),
    createStoreMapLink()
  );
  const topbar = document.getElementById('topbar');
  const mainNav = document.getElementById('main-nav');
  const navHome = document.getElementById('nav-home');
  const navProductos = document.getElementById('nav-productos');
  const mobileAccount = document.getElementById('mobile-account');
  const desktopAccount = document.getElementById('desktop-account');
  const siteSearch = document.getElementById('site-search');
  const globalSearchInput = document.getElementById('global-search-input');
  const mobileSearchBtn = document.getElementById('mobile-search-btn');
  const desktopCartText = document.getElementById('desktop-cart-text');
  const mobileCartText = document.getElementById('mobile-cart-text');
  const menuBtn = document.getElementById('menu-btn');
  const siteFooter = document.getElementById('site-footer');
  const toast = document.getElementById('toast');
  const toastText = document.getElementById('toast-text');
  const toastClose = document.getElementById('toast-close');

  let menuOpen = false;
  let searchingOpen = false;

  function setMenu(open) {
    menuOpen = Boolean(open);
    mainNav.classList.toggle('open', menuOpen);
    menuBtn.setAttribute('aria-expanded', String(menuOpen));
    menuBtn.textContent = menuOpen ? '×' : '☰';
  }

  function setSearching(open) {
    searchingOpen = Boolean(open);
    siteSearch.classList.toggle('expanded', searchingOpen);
    if (searchingOpen) {
      globalSearchInput.focus();
    }
  }

  function handleLogout() {
    authStore.logout();
    setMenu(false);
    navigateTo('/');
  }

  function renderAccountLinks() {
    clearElement(mobileAccount);
    clearElement(desktopAccount);

    if (authStore.authenticated) {
      const userName = authStore.firstName;

      mobileAccount.append(
        el('a', {
          href: '/pedidos',
          dataset: { nav: 'true' },
          text: 'Mis pedidos',
          onClick: () => setMenu(false)
        }),
        el('span', { text: `Hola, ${userName}` }),
        el('button', {
          type: 'button',
          className: 'text-button',
          text: 'Cerrar sesión',
          onClick: handleLogout
        })
      );

      desktopAccount.append(
        el('a', {
          href: '/pedidos',
          dataset: { nav: 'true' },
          text: 'Mis pedidos',
          onClick: () => setMenu(false)
        }),
        el('span', { text: `Hola, ${userName}` }),
        el('button', {
          type: 'button',
          text: 'Salir',
          onClick: handleLogout
        })
      );
    } else {
      mobileAccount.append(
        el('a', {
          href: '/ingresar',
          dataset: { nav: 'true' },
          text: 'Iniciar sesión',
          onClick: () => setMenu(false)
        }),
        el('a', {
          href: '/registro',
          dataset: { nav: 'true' },
          text: 'Crear mi cuenta',
          onClick: () => setMenu(false)
        })
      );

      desktopAccount.appendChild(
        el('a', {
          href: '/ingresar',
          dataset: { nav: 'true' },
          text: 'Ingresar'
        })
      );
    }
  }

  function renderCartAndToast() {
    const count = cartStore.count;
    desktopCartText.textContent = `Mi carrito · ${count}`;
    mobileCartText.textContent = `Bolsa ${count}`;

    const msg = cartStore.message;
    if (msg) {
      toastText.textContent = msg;
      toast.hidden = false;
    } else {
      toastText.textContent = '';
      toast.hidden = true;
    }
  }

  function updateShellForRoute(pathname) {
    const isHome = pathname === '/';
    topbar.hidden = !isHome;
    siteFooter.classList.toggle('compact', !isHome);

    navHome.classList.toggle('active', isHome);
    navProductos.classList.toggle('active', pathname.startsWith('/productos'));
    setMenu(false);
    setSearching(false);
  }

  // Event listeners
  menuBtn.addEventListener('click', () => setMenu(!menuOpen));
  mobileSearchBtn.addEventListener('click', () => setSearching(!searchingOpen));
  toastClose.addEventListener('click', () => cartStore.setMessage(''));

  siteSearch.addEventListener('submit', event => {
    event.preventDefault();
    const val = globalSearchInput.value.trim();
    setSearching(false);
    setMenu(false);
    const target = val ? `/productos?buscar=${encodeURIComponent(val)}` : '/productos';
    navigateTo(target);
  });

  // Intercept internal SPA links
  document.addEventListener('click', event => {
    const anchor = event.target.closest('a');
    if (!anchor) return;
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      anchor.target === '_blank' ||
      anchor.hasAttribute('download')
    ) {
      return;
    }

    const href = anchor.getAttribute('href');
    if (!href || href.startsWith('http://') || href.startsWith('https://') || href.startsWith('mailto:')) {
      return;
    }

    // Allow skip-link (#contenido) to focus main container without changing route
    if (href === '#contenido') {
      return;
    }

    event.preventDefault();
    setMenu(false);
    navigateTo(href);
  });

  window.addEventListener('popstate', () => {
    void handleCurrentRoute();
  });

  // Handle session expiration on protected routes
  authStore.onSessionExpired(() => {
    cartStore.setMessage('Tu sesión ha expirado. Inicia sesión nuevamente para continuar.');
    const path = window.location.pathname;
    if (/^(\/checkout|\/pedidos(?:\/\d+)?)$/.test(path)) {
      navigateTo(`/ingresar?continuar=${encodeURIComponent(path + window.location.search)}`, {
        replace: true
      });
    }
  });

  setRouteChangeListener(updateShellForRoute);
  authStore.subscribe(renderAccountLinks);
  cartStore.subscribe(renderCartAndToast);

  renderAccountLinks();
  renderCartAndToast();

  // Initial catalog load and route mount
  void catalogStore.refresh();
  void handleCurrentRoute();
}

bootstrapApp();
