# La Bodega · Repositorio frontend independiente

Conversión completa del frontend Angular 22 de **Comercial Nova ("La Bodega")** a **HTML5 semántico, CSS3 nativo y JavaScript con módulos ES (`type="module"`)**, sin frameworks, sin librerías externas por CDN, sin `node_modules` ni proceso de compilación.

## 1. Requisitos e inicio rápido

1. Prepara la base PostgreSQL del backend: local (`sgcivorp_local`) o el proyecto compartido de Supabase, según las instrucciones de ese repositorio.
2. Clona el repositorio backend por separado e inicia su API en `http://127.0.0.1:8080` (`iniciar-api.cmd` en Windows o `bash iniciar-api.sh` en Linux). Para revisar pedidos, inicia también su panel JavaFX. La ubicación de ese repositorio no afecta al frontend.
3. En esta carpeta (`INTEGRADOR_FRONTEND`), inicia el servidor HTTP local:
   - **Windows (doble clic o consola):**
     ```cmd
     iniciar-web.cmd
     ```
   - **Con Node.js (sin instalar paquetes):**
     ```bash
     node server.mjs
     ```
   - **Con Python 3 (alternativa sin Node.js):**
     ```bash
     python3 server.py
     ```
4. Abre en tu navegador: **`http://127.0.0.1:4200`** (o `http://localhost:4200`).

> **Nota importante:** No abras `index.html` con doble clic mediante `file://`, ya que los módulos ES (`type="module"`), el enrutamiento SPA (`History API`) y la política CORS del backend (`http://localhost:4200,http://127.0.0.1:4200`) requieren servir la aplicación por HTTP.

## 2. Configuración de la URL de la API y conexión con Spring Boot

- El archivo central de configuración es **`js/config.js`**.
- Por defecto, `server.mjs` y `server.py` escuchan en el puerto `4200` y redirigen automáticamente cualquier petición `/api/**` hacia `http://127.0.0.1:8080` (igual que hacía `proxy.conf.cjs` en Angular).
- Si deseas apuntar a otro puerto o servidor de API al iniciar el servidor local:
  - En PowerShell:
    ```powershell
    $env:API_TARGET='http://127.0.0.1:8081'
    node server.mjs
    ```
- También puedes configurar `API_BASE_URL: 'http://127.0.0.1:8080'` directamente en `js/config.js` si sirves los archivos desde cualquier servidor estático en `http://127.0.0.1:4200` o `http://localhost:4200`, ya que `ApiSecurityConfig.java` autoriza explícitamente ambos orígenes mediante CORS.

## 3. Estructura de carpetas

### Ubicación y horario

`js/shared/store-info.js` centraliza el enlace compartido por la bodega, el mapa y los datos confirmados: **Asociación de Vivienda La Planicie de la Era / Zona de La Era de Pando, Ate, Lima 15487**, con la referencia **Pista nueva-Santa Clara, al costado de Ceviche69**, con atención **lunes a sábado, de 8 a. m. a 8 p. m.** Se muestran en inicio y contacto, también en móvil. El mapa incrustado usa las coordenadas proporcionadas (-12.012667, -76.876944) y el enlace conserva el acceso original de Google Maps.

El backend publica los datos de recojo y `mapaUrl` en `GET /api/tienda`. Se configuran en `configuracion-tienda.properties` o con `TIENDA_DIRECCION`, `TIENDA_HORARIO` y `TIENDA_MAPA_URL`; API y panel requieren reinicio. Si cambian los datos del comercio, actualizar también la información pública de `store-info.js`. Los pedidos anteriores conservan la dirección y el horario con los que se crearon. El modo de pago continúa en DEMO hasta configurar titular y número Yape reales.

### Checkout y pago con QR

El checkout separa contacto, recojo y pago en tarjetas; el resumen incluye fotografías, cantidades y precios. Al confirmar el pedido se muestra un único QR para Yape o Plin, el total y el titular **Jorge Reyes**. Mientras no se entregue el archivo, aparece «QR pendiente de incorporar». Para incorporarlo, guardar la imagen en `assets/` y definir su ruta en `PAYMENT_INFO.qrSrc`, en `js/shared/purchase-ui.js`. El QR de pago es independiente del QR autenticado de recojo que se genera después de aprobar el pago.

La tienda usa textos comerciales sin etiquetas de demostración. La simulación permanece activa internamente en el backend (`TIENDA_DEMO=true`), con revisión manual del comprobante y sus registros de auditoría originales. Los eventos internos de simulación se presentan con mensajes comerciales en la tienda; no se modifica su contenido almacenado. Los pedidos anteriores conservan sus datos; los nuevos toman el titular configurado en el backend.

### Fotografías de productos

Las 51 imágenes locales están en `assets/productos/`, en WebP de hasta 800 × 800 px (calidad 85). Los originales permanecen en `../Productos-img`. El componente compartido las muestra sobre fondo blanco, conserva las transparencias y ajusta la imagen completa sin recortarla en inicio, catálogo, detalle y carrito.

`js/shared/product-images.data.js` asocia cada archivo con el **código comercial** del catálogo, sin depender de los IDs de base de datos. Para productos sin código, se requiere coincidencia exacta del nombre y marca normalizados. Si falta una fotografía o falla su carga, se conserva la ilustración de respaldo.

Para regenerar las imágenes y el mapa con Pillow: `python tools/convert-product-images.py`. El script utiliza los originales y `../docs/revision-precios/catalogo-actualizado.csv`; el detalle de tamaños queda en `assets/productos/conversion.json`. Conversión inicial: 71 055 208 bytes → 2 777 330 bytes (96,09 % menos).

Las fotos suministradas se consideran referenciales: por ejemplo, Cheetos está rotulado como 61 g en el archivo y como 50 g en el catálogo; las imágenes de Field y Chomp muestran un paquete individual aunque el catálogo vende sixpacks. No se modificaron nombres, presentaciones, precios ni existencias.

```text
INTEGRADOR_FRONTEND/
├── index.html                  # Documento principal HTML5 semántico (shell SPA)
├── favicon.svg                 # Ícono vectorial de la pestaña
├── favicon.ico                 # Ícono alternativo clásico
├── iniciar-web.cmd             # Script de arranque para Windows (Node.js o Python 3)
├── iniciar-web.sh              # Script de arranque para Linux / macOS
├── server.mjs                  # Servidor HTTP local + proxy /api + fallback SPA (Node.js nativo)
├── server.py                   # Servidor HTTP local + proxy /api + fallback SPA (Python 3 nativo)
├── README.md                   # Instrucciones de uso y correspondencia arquitectónica
├── assets/
│   ├── figma/                  # Ilustraciones SVG originales (hero-desktop, hero-mobile, map, cookie)
│   └── fonts/                  # Tipografía local Open Sans (400, 600, 700 en formato WOFF2)
├── css/
│   ├── styles.css              # Variables CSS (--green, --orange, etc.), reset, botones, paneles y grillas
│   ├── layout.css              # Topbar, header responsivo, buscador, menú móvil, footer y toast
│   ├── components.css          # Ilustraciones CSS/SVG de productos, tarjetas de producto y selector de cantidad
│   └── pages.css               # Estilos específicos de Inicio, Catálogo, Detalle, Carrito, Auth, Checkout y Pedidos
└── js/
    ├── config.js               # Configuración centralizada de API_BASE_URL, claves de storage y límites
    ├── router.js               # Enrutador SPA con History API, checkoutGuard y restauración de scroll
    ├── app.js                  # Inicialización del shell, menú móvil, buscador global, sesión y avisos toast
    ├── core/
    │   ├── api.js              # Cliente fetch centralizado con Bearer token selectivo, soporte Blob y manejo 401
    │   ├── auth.store.js       # Estado de sesión en sessionStorage ('nova.access') y perfil (/api/auth/*)
    │   ├── cart-domain.js      # Funciones puras del carrito (parseCart, reconcileCart, totalCents en céntimos)
    │   ├── cart.store.js       # Carrito reactivo en localStorage ('nova.cart.v1') reconciliado con stock
    │   ├── catalog.store.js    # Carga de productos y categorías públicas (/api/catalogo/*)
    │   └── orders.api.js       # Llamadas de tienda, pedidos, cancelación, comprobante FormData y QR Blob
    ├── shared/
    │   ├── dom.js              # Creación segura de elementos DOM con textContent (prevención XSS, sin innerHTML)
    │   ├── format.js           # Formateo de moneda PEN (Intl.NumberFormat) y fechas (dd/MM/yyyy HH:mm)
    │   ├── product-art.js      # Ilustración referencial de productos (arroz, aceite, leche, galleta, agua)
    │   ├── product-card.js     # Tarjeta de producto con control de stock agotado y máximo en carrito
    │   └── quantity.js         # Control numérico de cantidad (− / input / +) limitado al stock disponible
    └── pages/
        ├── home.js             # Vista de Inicio (/): hero, beneficios, categorías, destacados, pasos y mapa
        ├── catalog.js          # Vista de Catálogo (/productos): filtros, rango de precio, búsqueda, orden y paginación
        ├── detail.js           # Vista de Detalle (/productos/:id): pestañas, stock, cantidad y relacionados
        ├── cart.js             # Vista de Carrito (/carrito): edición de cantidades, eliminación y resumen
        ├── auth.js             # Vista de Login (/ingresar) y Registro (/registro): validaciones y redirección
        ├── checkout.js         # Vista de Checkout (/checkout): datos de tienda, aviso DEMO, clave UUID idempotente
        ├── orders.js           # Vista de Mis Pedidos (/pedidos): historial, estados y etiquetas DEMO
        └── order-detail.js     # Vista de Detalle de Pedido (/pedidos/:id): polling 5 s, comprobante, QR Blob y cancelación
```

## 4. Tabla de equivalencia Angular → Vanilla HTML/CSS/JS

| Funcionalidad / Archivo Angular | Equivalente en `INTEGRADOR_FRONTEND` | Detalles conservados |
|---|---|---|
| `src/index.html`, `src/app/app.html`, `src/app/app.ts` | `index.html`, `js/app.js` | Topbar, header, buscador global, menú móvil, contador de carrito, saludo de usuario, footer compacto y toast |
| `src/styles/_tokens.scss`, `src/styles.scss`, `src/app/app.scss` | `css/styles.css`, `css/layout.css` | Paleta `--green`, `--orange`, `--cream`, `--warm`, `--sage`, tipografía Open Sans local y media queries |
| `proxy.conf.cjs` y configuración de entorno | `js/config.js`, `server.mjs`, `server.py` | URL de API centralizada y proxy `/api/**` hacia `http://127.0.0.1:8080` |
| `src/app/app.routes.ts` y `checkoutGuard` | `js/router.js` | Rutas `/`, `/productos`, `/productos/:id`, `/carrito`, `/ingresar`, `/registro`, `/checkout`, `/pedidos`, `/pedidos/:id` y guardia de sesión |
| `SessionState`, `authInterceptor`, `AuthStore` (`auth.store.ts`) | `js/core/auth.store.js`, `js/core/api.js` | Token en `sessionStorage` (`nova.access`), envío de `Authorization: Bearer` solo a rutas protegidas del backend y limpieza ante `401` |
| `parseCart`, `reconcileCart`, `totalCents` (`cart-domain.ts`) | `js/core/cart-domain.js` | Saneamiento de JSON corrupto, fusión de duplicados, ajuste por stock y cálculo exacto en céntimos |
| `CartStore` (`cart.store.ts`) | `js/core/cart.store.js` | Persistencia en `localStorage` (`nova.cart.v1`), reconciliación automática con el catálogo y descuento de unidades compradas |
| `CatalogStore` (`catalog.store.ts`) | `js/core/catalog.store.js` | Carga concurrente de `/api/catalogo/productos` y `/api/catalogo/categorias`, estados de carga, error y reintento |
| `OrdersApi` y `orderStatus` (`orders.api.ts`) | `js/core/orders.api.js` | `/api/tienda`, `/api/pedidos`, cancelación, subida multipart `FormData` y descarga de `/qr` como `Blob` autenticado |
| `MoneyPipe` (`money.pipe.ts`) y `DatePipe` | `js/shared/format.js` | Formato `es-PE` (`PEN`) y fechas `dd/MM/yyyy HH:mm` / `dd/MM/yyyy HH:mm:ss` |
| `ProductArt` (`product-art.ts`, `product-art.scss`) | `js/shared/product-art.js`, `css/components.css` | Lienzo de 260×210 px con variantes visuales (`oil`, `milk`, `cookie`, `water`, `rice`) |
| `ProductCard` (`product-card.ts`, `product-card.scss`) | `js/shared/product-card.js`, `css/components.css` | Tarjeta con precio, disponibilidad, bloqueo cuando está agotado o en máximo de carrito |
| `Quantity` (`quantity.ts`) | `js/shared/quantity.js`, `css/components.css` | Selector `−` / `input[type=number]` / `+` acotado entre `1` y `disponible` |
| `HomePage` (`home.ts`, `home.html`, `home.scss`) | `js/pages/home.js`, `css/pages.css` | Hero responsive, 6 categorías priorizadas, 4 destacados, compra en 3 pasos y sección de tienda |
| `CatalogPage` (`catalog.ts`, `catalog.html`, `catalog.scss`) | `js/pages/catalog.js`, `css/pages.css` | Filtro por categoría, precio máximo (`range`), búsqueda sin tildes, ordenamiento y paginación de 12 en 12 |
| `DetailPage` (`detail.ts`, `detail.html`, `detail.scss`) | `js/pages/detail.js`, `css/pages.css` | Migas de pan, pestañas (`Vista frontal`, `Presentación`, `Información`), selector de cantidad y relacionados |
| `CartPage` (`cart.ts`, `cart.html`, `cart.scss`) | `js/pages/cart.js`, `css/pages.css` | Edición de cantidades por línea, quitar producto, subtotal, total y carrito vacío |
| `AuthPage` (`auth.ts`, `auth.html`, `auth.scss`) | `js/pages/auth.js`, `css/pages.css` | Login y registro con validaciones de patrón, longitud y límite de 72 bytes UTF-8 en contraseña |
| `CheckoutPage` (`checkout.ts`, `checkout.html`) | `js/pages/checkout.js`, `css/pages.css` | Verificación de rol `CLIENTE`, aviso `DEMO`, clave idempotente UUID en `sessionStorage` (`nova.order.intent`) y recarga en `409` |
| `OrdersPage` (`orders.ts`, `orders.html`, `orders.scss`) | `js/pages/orders.js`, `css/pages.css` | Lista de pedidos del cliente, píldora de estado, etiqueta `DEMO` y botón de actualización |
| `OrderDetailPage` (`order-detail.ts`, `order-detail.html`) | `js/pages/order-detail.js`, `css/pages.css` | Seguimiento automático cada 5 s, subida PNG/JPEG (máx. 3 MB), cancelación en `PENDIENTE_PAGO`, QR con `URL.createObjectURL` y `URL.revokeObjectURL` |


## Correcciones verificadas (25/10/2026)

- El enrutador descarta validaciones anteriores si el usuario ya navegó a otra página.
- El formulario de comprobante conserva el archivo y la referencia durante la actualización
  automática y los reintentos. Muestra el nombre del archivo seleccionado.
- El servidor Node responde 400 a URLs mal codificadas sin detenerse y controla errores
  de lectura de archivos y de conexión con el backend.

Se verificó el recorrido de compra DEMO contra PostgreSQL de pruebas, con revisión de pago,
preparación, QR y entrega, a 1440, 390 y 320 px. Las pruebas también cubrieron un fallo temporal
al subir el comprobante, su reintento y la navegación con respuestas de sesión demoradas.
No se añadieron dependencias ni se modificaron estilos, recursos o contratos del backend.

## Repositorio independiente y VS Code

Este repositorio contiene sólo la tienda web HTML/CSS/JavaScript. No requiere npm, Angular ni acceso directo a Supabase. Abrir esta carpeta en VS Code y ejecutar `node server.mjs` o `python3 server.py` en su terminal. En Windows también se puede usar `python server.py`; Linux dispone de `bash iniciar-web.sh`.

`API_TARGET` es la URL HTTP o HTTPS de la API Spring Boot. Si el backend usa Supabase, el frontend conserva el mismo funcionamiento. No configurar `API_TARGET` con la URL de Supabase ni añadir contraseñas PostgreSQL al navegador. Los archivos `.env` no se cargan automáticamente; `.env.example` documenta las variables disponibles.

Para una API remota en Linux:

```bash
API_TARGET=https://API_DEL_EQUIPO node server.mjs
```

En PowerShell:

```powershell
$env:API_TARGET='https://API_DEL_EQUIPO'
node server.mjs
```

Si se publica en un hosting estático sin estos servidores, configurar en `js/config.js` la URL pública de la API (`API_BASE_URL`, sin añadir `/api`), habilitar el fallback de rutas a `index.html` y configurar `ALLOWED_ORIGINS` en el backend con el origen exacto del sitio. El navegador debe acceder a una API HTTPS si la tienda usa HTTPS.

Crear un repositorio frontend vacío en GitHub y ejecutar desde esta carpeta:

```bash
git init
git add .
git status
git commit -m "Preparar frontend del integrador"
git branch -M main
git remote add origin URL_DEL_REPOSITORIO_FRONTEND
git push -u origin main
```

Omitir `git init` y el agregado del remoto si ya existen. No subir `.env`, `.local`, credenciales ni `node_modules`. Los servidores locales sólo publican recursos de la tienda y bloquean el acceso a archivos de configuración y scripts del servidor.

Validación de los dos servidores, con Node.js, Python 3 y OpenSSL instalados: `node tests/servidores.mjs`. Cubre proxy HTTP/HTTPS, POST con autorización, HEAD, rutas SPA y bloqueo de archivos internos.
