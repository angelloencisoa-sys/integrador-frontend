import { el, clearElement } from '../shared/dom.js';
import { formatMoney, formatDateTime } from '../shared/format.js';
import { CONFIG } from '../config.js';
import { ordersApi, orderStatus } from '../core/orders.api.js';
import { cartStore } from '../core/cart.store.js';
import { catalogStore } from '../core/catalog.store.js';

/**
 * Renderiza el detalle, seguimiento en vivo (polling cada 5 s), subida de comprobante,
 * cancelación y QR autenticado de un pedido (`/pedidos/:id`).
 * Equivalente exacto de `OrderDetailPage` (`order-detail.ts` / `order-detail.html`).
 *
 * @param {HTMLElement} container
 * @param {{ params: { id: string } }} context
 */
export function mountOrderDetailPage(container, { params }) {
  clearElement(container);

  const id = Number(params.id);
  let destroyed = false;
  let order = null;
  let errorText = '';
  let loadErrorText = '';
  let pending = false;
  let qrUrl = '';
  let qrRequested = false;
  let pollInFlight = false;
  let selectedFile = null;
  let operacion = '';
  // Conservar el formulario mantiene FileList, valor y selección entre actualizaciones.
  let receiptForm = null;
  let fileInput = null;
  let operationInput = null;
  let submitReceiptBtn = null;
  let fileName = null;

  const page = el('div', { className: 'container order-page' });
  container.appendChild(page);

  function revokeQrUrl() {
    if (qrUrl) {
      URL.revokeObjectURL(qrUrl);
      qrUrl = '';
    }
  }

  function acceptOrder(p) {
    order = p;
    if (p.estado !== 'PENDIENTE_PAGO') {
      cartStore.setMessage('');
    }
    if (
      p.codigoRecojo &&
      ['PAGADO', 'EN_PREPARACION', 'LISTO_PARA_RECOJO'].includes(p.estado) &&
      !qrRequested
    ) {
      qrRequested = true;
      ordersApi
        .qr(p.id)
        .then(blob => {
          if (destroyed) return;
          revokeQrUrl();
          qrUrl = URL.createObjectURL(blob);
          render();
        })
        .catch(() => {
          if (destroyed) return;
          qrRequested = false;
        });
    } else if (!['PAGADO', 'EN_PREPARACION', 'LISTO_PARA_RECOJO'].includes(p.estado)) {
      revokeQrUrl();
      qrRequested = false;
    }
    render();
  }

  async function pollOrder() {
    if (destroyed || pollInFlight) return;
    pollInFlight = true;
    try {
      const p = await ordersApi.get(id);
      if (destroyed) return;
      loadErrorText = '';
      acceptOrder(p);
    } catch (e) {
      if (destroyed) return;
      loadErrorText =
        e?.status === 403 || e?.status === 404
          ? 'Este pedido no está disponible para tu cuenta.'
          : 'No pudimos actualizar el pedido. Volveremos a intentarlo.';
      render();
    } finally {
      pollInFlight = false;
    }
  }

  function handleFileChoose(event) {
    const input = event.target;
    const f = input.files?.[0];
    selectedFile = null;
    if (!f) {
      render();
      return;
    }
    if (!CONFIG.ALLOWED_RECEIPT_TYPES.includes(f.type) || f.size > CONFIG.MAX_RECEIPT_BYTES) {
      errorText = 'Elige una imagen PNG o JPEG de hasta 3 MB.';
      input.value = '';
      render();
      return;
    }
    errorText = '';
    selectedFile = f;
    render();
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (!selectedFile || operacion.trim().length < 3 || pending) return;
    pending = true;
    errorText = '';
    render();
    try {
      const updated = await ordersApi.upload(id, selectedFile, operacion.trim());
      if (destroyed) return;
      selectedFile = null;
      if (fileInput) fileInput.value = '';
      pending = false;
      acceptOrder(updated);
    } catch (err) {
      if (destroyed) return;
      pending = false;
      errorText = err?.error?.mensaje || 'No pudimos enviar el comprobante. Inténtalo nuevamente.';
      render();
    }
  }

  async function handleCancel() {
    if (pending || !window.confirm('¿Cancelar este pedido y liberar los productos reservados?')) {
      return;
    }
    pending = true;
    errorText = '';
    render();
    try {
      const updated = await ordersApi.cancel(id);
      if (destroyed) return;
      pending = false;
      acceptOrder(updated);
      void catalogStore.refresh();
    } catch (err) {
      if (destroyed) return;
      pending = false;
      errorText = err?.error?.mensaje || 'No se pudo cancelar el pedido.';
      render();
    }
  }

  function render() {
    // Preserve focus/cursor if user is typing in operation input
    const activeId = document.activeElement?.id;
    const selectionStart = document.activeElement?.selectionStart;
    const selectionEnd = document.activeElement?.selectionEnd;

    clearElement(page);

    page.appendChild(
      el('a', { className: 'eyebrow', href: '/pedidos', dataset: { nav: 'true' }, text: '← MIS PEDIDOS' })
    );

    if (errorText || loadErrorText) {
      page.appendChild(
        el('p', { className: 'order-error', role: 'alert', text: errorText || loadErrorText })
      );
    }

    if (!order) {
      if (!errorText && !loadErrorText) {
        page.appendChild(el('p', { className: 'state', role: 'status', text: 'Consultando pedido…' }));
      }
      return;
    }

    const p = order;

    page.appendChild(
      el(
        'header',
        { className: 'page-heading' },
        el('h1', { text: orderStatus[p.estado] || p.estado }),
        el('p', { text: `${p.numero} · ${formatDateTime(p.creado, false)}` })
      )
    );

    if (p.demo) {
      page.appendChild(
        el('p', {
          className: 'demo-banner',
          text: 'DEMOSTRACIÓN · No realices transferencias. Este pedido, el pago y los datos de recojo son de prueba.'
        })
      );
    }

    const leftPanel = el('section', { className: 'panel' });

    if (p.estado === 'PENDIENTE_PAGO') {
      leftPanel.append(
        el('h2', { text: p.demo ? 'Prueba el envío de comprobante' : 'Paga con Yape' }),
        el('p', {
          text: `Reserva hasta ${formatDateTime(p.vence, true)}. Si el plazo terminó, cancela y crea otro pedido.`
        })
      );

      if (!p.demo) {
        leftPanel.append(
          el('p', { className: 'yape-number', text: p.telefonoYape }),
          el('p', {}, 'Titular: ', el('strong', { text: p.titular })),
          el(
            'p',
            {},
            'Verifica el destinatario y transfiere exactamente ',
            el('strong', { text: formatMoney(p.total) }),
            '. Si ya pagaste y el plazo terminó, contacta a la tienda; no pagues de nuevo.'
          )
        );
      } else {
        leftPanel.appendChild(
          el('p', {
            text: 'Adjunta una imagen PNG o JPEG de prueba. Referencia sugerida: DEMO-001. El personal simulará la aprobación desde JavaFX.'
          })
        );
      }

      if (!receiptForm) {
        fileInput = el('input', {
          id: 'receipt',
          type: 'file',
          accept: 'image/png,image/jpeg',
          disabled: pending,
          onChange: handleFileChoose
        });

        fileName = el('small', { id: 'receipt-name', className: 'section-description', role: 'status' });

        submitReceiptBtn = el('button', {
          type: 'submit',
          className: 'button',
          disabled: !selectedFile || operacion.trim().length < 3 || pending,
          text: pending ? 'Enviando…' : 'Enviar comprobante para revisión'
        });

        operationInput = el('input', {
          id: 'operation',
          name: 'operation',
          value: operacion,
          minlength: '3',
          maxlength: '100',
          required: true,
          placeholder: 'Ej.: DEMO-001',
          onInput: e => {
            operacion = e.target.value;
            submitReceiptBtn.disabled = !selectedFile || operacion.trim().length < 3 || pending;
          }
        });

        receiptForm = el(
          'form',
          { className: 'receipt-form', onSubmit: handleUpload },
          el('label', { for: 'receipt', text: 'Comprobante (PNG o JPEG, máximo 3 MB)' }),
          fileInput,
          fileName,
          el('label', {
            for: 'operation',
            text: p.demo ? 'Referencia de prueba' : 'Número de operación del comprobante'
          }),
          operationInput,
          submitReceiptBtn
        );

      }
      fileInput.disabled = pending;
      operationInput.disabled = pending;
      submitReceiptBtn.disabled = !selectedFile || operacion.trim().length < 3 || pending;
      submitReceiptBtn.textContent = pending ? 'Enviando…' : 'Enviar comprobante para revisión';
      fileName.textContent = selectedFile ? `Archivo seleccionado: ${selectedFile.name}` : '';
      fileName.hidden = !selectedFile;

      const cancelBtn = el('button', {
        type: 'button',
        className: 'text-button danger',
        disabled: pending,
        text: 'Cancelar pedido',
        onClick: handleCancel
      });

      leftPanel.append(receiptForm, cancelBtn);
    }

    if (p.estado === 'PENDIENTE_VERIFICACION') {
      leftPanel.append(
        el('h2', { text: 'Recibimos tu comprobante' }),
        el('p', {
          text: `El personal revisará ${
            p.demo ? 'la simulación' : 'el abono en la cuenta de la tienda'
          }. Tus productos siguen reservados. Esta página se actualiza automáticamente.`
        })
      );
    }

    if (p.codigoRecojo && ['PAGADO', 'EN_PREPARACION', 'LISTO_PARA_RECOJO'].includes(p.estado)) {
      leftPanel.append(
        el('h2', { text: 'Tu código de recojo' }),
        el(
          'p',
          {},
          'Muéstralo en la tienda cuando el pedido esté ',
          el('strong', { text: 'listo para recoger' }),
          '. Evita compartirlo.'
        )
      );
      if (qrUrl) {
        leftPanel.appendChild(
          el('img', {
            className: 'pickup-qr',
            src: qrUrl,
            alt: 'Código QR para recoger el pedido'
          })
        );
      }
      leftPanel.append(
        el('p', { className: 'pickup-code', text: p.codigoRecojo }),
        el('p', { text: p.direccion }),
        el('p', { text: p.horario })
      );
    }

    if (p.estado === 'ENTREGADO') {
      leftPanel.append(
        el('h2', { text: '¡Gracias por tu compra!' }),
        el('p', { text: 'Registramos la entrega de tus productos. El código ya fue utilizado.' })
      );
    }

    if (['CANCELADO', 'EXPIRADO', 'RECHAZADO', 'REEMBOLSADO'].includes(p.estado)) {
      leftPanel.append(
        el('h2', { text: 'Pedido cerrado' }),
        el('p', { text: p.observacion || 'Los productos reservados fueron liberados.' }),
        el('a', { className: 'button', href: '/productos', dataset: { nav: 'true' }, text: 'Volver a la tienda' })
      );
    }

    const historyList = el('ol', { className: 'order-history' });
    (p.eventos || []).forEach(ev => {
      historyList.appendChild(
        el(
          'li',
          {},
          el('strong', { text: orderStatus[ev.estado] || ev.estado }),
          el('p', { text: ev.mensaje }),
          el('small', { text: formatDateTime(ev.fecha, false) })
        )
      );
    });

    leftPanel.append(el('h2', { className: 'history-title', text: 'Seguimiento' }), historyList);

    const summary = el('aside', { className: 'summary panel' }, el('h2', { text: 'Tu pedido' }));
    (p.lineas || []).forEach(l => {
      const lineTotal = Math.round(Number(l.precio) * 100) * l.cantidad / 100;
      summary.appendChild(
        el(
          'div',
          { className: 'summary-row' },
          el('span', { text: `${l.cantidad} × ${l.nombre}` }),
          el('span', { text: formatMoney(lineTotal) })
        )
      );
    });

    summary.append(
      el('hr'),
      el(
        'div',
        { className: 'summary-row total' },
        el('strong', { text: 'Total' }),
        el('strong', { text: formatMoney(p.total) })
      ),
      el('p', { text: 'Recojo en tienda · sin costo adicional' })
    );

    page.appendChild(el('div', { className: 'purchase-layout' }, leftPanel, summary));

    if (activeId === 'operation' || activeId === 'receipt') {
      const restored = document.getElementById(activeId);
      if (restored) {
        restored.focus();
        if (activeId === 'operation' && typeof selectionStart === 'number' && typeof selectionEnd === 'number') {
          restored.setSelectionRange(selectionStart, selectionEnd);
        }
      }
    }
  }

  void pollOrder();
  const intervalId = window.setInterval(pollOrder, CONFIG.ORDER_POLL_MS);

  return () => {
    destroyed = true;
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    window.clearInterval(intervalId);
    revokeQrUrl();
  };
}
