import { el } from './dom.js';

// Ubicación, referencia de recojo y horario confirmados por el comercio.
export const STORE_INFO = Object.freeze({
  direccion: 'Asociación de Vivienda La Planicie de la Era / Zona de La Era de Pando, Ate, Lima 15487',
  referencia: 'Pista nueva-Santa Clara, al costado de Ceviche69',
  horario: 'Lunes a sábado, de 8:00 a. m. a 8:00 p. m.',
  mapaUrl: 'https://maps.app.goo.gl/fYfcULhRuRgEEYhZ7',
  mapaEmbedUrl: 'https://maps.google.com/maps?q=-12.012667,-76.876944&z=18&output=embed'
});

export function createStoreMapLink(url = STORE_INFO.mapaUrl, text = 'Cómo llegar · Google Maps') {
  return el('a', { href: url, target: '_blank', rel: 'noopener noreferrer', text });
}
