#!/usr/bin/env node
/**
 * Servidor HTTP local sin dependencias externas (solo módulos nativos de Node.js).
 * - Sirve los archivos estáticos de FRONTEND_VANILLA en http://127.0.0.1:4200
 *   (origen permitido por ApiSecurityConfig.java en Spring Boot).
 * - Redirige todas las peticiones `/api/**` hacia el backend Spring Boot
 *   (por defecto `http://127.0.0.1:8080`, configurable mediante `API_TARGET`).
 * - Soporta rutas limpias SPA (`/productos`, `/carrito`, `/checkout`, `/pedidos`, etc.)
 *   sirviendo `index.html`.
 */
import http from 'node:http';
import https from 'node:https';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const HOST = process.env.HOST || '127.0.0.1';
const PORT = Number(process.env.PORT || 4200);
const API_TARGET = new URL(process.env.API_TARGET || 'http://127.0.0.1:8080');
if (!['http:', 'https:'].includes(API_TARGET.protocol)) throw new Error('API_TARGET debe usar HTTP o HTTPS');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.woff2': 'font/woff2'
};

function proxyApiRequest(req, res) {
  const options = {
    protocol: API_TARGET.protocol,
    hostname: API_TARGET.hostname,
    port: API_TARGET.port || (API_TARGET.protocol === 'https:' ? 443 : 80),
    method: req.method,
    path: req.url,
    headers: {
      ...req.headers,
      host: API_TARGET.host
    }
  };

  const transport = API_TARGET.protocol === 'https:' ? https : http;
  const proxyReq = transport.request(options, proxyRes => {
    proxyRes.on('error', () => res.destroy());
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', () => {
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({
      status: 502,
      mensaje: 'No pudimos conectar con el backend Spring Boot en ' + API_TARGET.origin
    }));
  });

  req.pipe(proxyReq, { end: true });
}

function serveStaticOrSpa(req, res) {
  let decodedPath;
  try {
    const parsedUrl = new URL(req.url || '/', `http://${HOST}:${PORT}`);
    decodedPath = decodeURIComponent(parsedUrl.pathname);
    if (decodedPath.includes('\0')) throw new URIError('Ruta inválida');
  } catch {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Ruta no válida');
    return;
  }
  // Sólo se publican los recursos de la tienda; excluir configuración, Git y scripts del servidor.
  const resource = decodedPath.replace(/\\/g, '/');
  if (resource.split('/').some(part => part.startsWith('.')) ||
      !(resource === '/' || resource === '/index.html' || resource === '/favicon.ico' ||
        resource === '/favicon.svg' || resource.startsWith('/assets/') ||
        resource.startsWith('/css/') || resource.startsWith('/js/') || !path.extname(resource))) {
    res.writeHead(404); res.end('Recurso no encontrado'); return;
  }
  const safePath = path.normalize(decodedPath).replace(/^(\.\.(\/|\\|$))+/, '');
  let filePath = path.join(__dirname, safePath);

  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    // Fallback SPA hacia index.html para rutas de cliente (/productos, /carrito, /pedidos, etc.)
    const ext = path.extname(safePath);
    if (ext && ext !== '.html') {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Recurso no encontrado');
      return;
    }
    filePath = path.join(__dirname, 'index.html');
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  res.writeHead(200, {
    'Content-Type': contentType,
    'Cache-Control': 'no-cache'
  });
  const stream = fs.createReadStream(filePath);
  stream.on('error', () => res.destroy());
  res.on('close', () => stream.destroy());
  stream.pipe(res);
}

const server = http.createServer((req, res) => {
  try {
    if ((req.url || '').startsWith('/api/') || req.url === '/api') {
      proxyApiRequest(req, res);
      return;
    }
    serveStaticOrSpa(req, res);
  } catch {
    if (res.headersSent) { res.destroy(); return; }
    res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('No pudimos atender la solicitud');
  }
});

server.listen(PORT, HOST, () => {
  console.log(`La Bodega (Vanilla JS) disponible en http://${HOST}:${PORT}`);
  console.log(`Proxy /api redirigiendo hacia ${API_TARGET.origin}`);
});
