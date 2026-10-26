import { el, clearElement } from '../shared/dom.js';
import { authStore } from '../core/auth.store.js';
import { navigateTo } from '../router.js';

const USERNAME_PATTERN = /^[A-Za-z0-9._-]{3,50}$/;
const PHONE_PATTERN = /^[0-9+ ()-]{7,15}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function sanitizeContinuePath(raw) {
  const path = raw || '/';
  return /^(\/checkout|\/pedidos(?:\/\d+)?)$/.test(path) ? path : '/';
}

/**
 * Renderiza la página de Inicio de Sesión (`/ingresar`) o Registro (`/registro`).
 * Equivalente exacto de `AuthPage` (`auth.ts` / `auth.html`).
 *
 * @param {HTMLElement} container
 * @param {{ register?: boolean, queryParams: URLSearchParams }} context
 */
export function mountAuthPage(container, { register = false, queryParams }) {
  clearElement(container);

  const continueTo = sanitizeContinuePath(queryParams.get('continuar'));
  let pending = false;
  let errorText = '';
  let showPassword = false;

  const values = {
    nombreCompleto: '',
    username: '',
    email: '',
    telefono: '',
    password: ''
  };

  const touched = {
    nombreCompleto: false,
    username: false,
    email: false,
    telefono: false,
    password: false
  };

  function validateField(name) {
    const val = String(values[name] || '');
    if (name === 'username') {
      if (!val) return { required: true };
      if (val.length > 50) return { maxlength: true };
      if (register && !USERNAME_PATTERN.test(val)) return { pattern: true };
      return null;
    }
    if (name === 'password') {
      if (!val) return { required: true };
      if (register && val.length < 8) return { minlength: true };
      if (register && val.length > 72) return { maxlength: true };
      return null;
    }
    if (!register) return null;

    if (name === 'nombreCompleto') {
      if (!val) return { required: true };
      if (val.length > 100) return { maxlength: true };
      return null;
    }
    if (name === 'email') {
      if (!val) return { required: true };
      if (!EMAIL_PATTERN.test(val)) return { email: true };
      if (val.length > 100) return { maxlength: true };
      return null;
    }
    if (name === 'telefono') {
      if (!val) return { required: true };
      if (!PHONE_PATTERN.test(val)) return { pattern: true };
      return null;
    }
    return null;
  }

  function getFieldMessage(name) {
    const e = validateField(name);
    if (!e) return '';
    if (e.required) return 'Completa este campo.';
    if (e.email) return 'Ingresa un correo válido.';
    if (e.minlength) return 'Usa al menos 8 caracteres.';
    if (e.maxlength) return 'El texto es demasiado largo.';
    return name === 'username'
      ? 'Usa de 3 a 50 letras, números, puntos, guiones o guiones bajos.'
      : 'Revisa el formato de este campo.';
  }

  function isInvalid(name) {
    return Boolean(touched[name] && validateField(name));
  }

  function isFormInvalid() {
    const fields = register
      ? ['nombreCompleto', 'username', 'email', 'telefono', 'password']
      : ['username', 'password'];
    return fields.some(f => Boolean(validateField(f)));
  }

  const intro = el(
    'div',
    { className: 'auth-intro' },
    el('span', { className: 'eyebrow', text: 'TU COMPRA, CERCA DE TI' }),
    el('h1', {
      text: register ? 'Tu primera compra empieza aquí.' : 'Qué bueno tenerte de vuelta.'
    }),
    el('p', {
      text:
        continueTo === '/checkout'
          ? 'Tu carrito está guardado. Ingresa o crea tu cuenta para continuar.'
          : 'Explora tu bodega y encuentra lo que necesitas para cada día.'
    }),
    el('img', {
      src: '/assets/figma/hero-desktop.svg',
      alt: 'Canasta de productos',
      width: '620',
      height: '390'
    })
  );

  const form = el('form', { novalidate: 'novalidate' });
  const panel = el(
    'div',
    { className: 'auth-panel panel' },
    el('a', {
      href: '/carrito',
      dataset: { nav: 'true' },
      className: 'text-button back-cart',
      text: '← Volver al carrito'
    }),
    el('h2', { text: register ? 'Crea tu cuenta' : 'Inicia sesión' }),
    el('p', {
      className: 'section-description',
      text: register
        ? 'Solo necesitamos unos datos para conocerte.'
        : 'Ingresa con tu usuario y contraseña.'
    }),
    form,
    el(
      'p',
      { className: 'auth-switch' },
      register ? '¿Ya tienes una cuenta? ' : '¿Todavía no tienes cuenta? ',
      el('a', {
        href: `${register ? '/ingresar' : '/registro'}?continuar=${encodeURIComponent(continueTo)}`,
        dataset: { nav: 'true' },
        text: register ? 'Inicia sesión' : 'Regístrate'
      })
    )
  );

  const section = el('section', { className: 'auth-page container' }, intro, panel);
  container.appendChild(section);

  // Build form controls with live validation updates
  const errorRefs = {};
  const inputRefs = {};

  function createFieldBlock({ id, name, label, type = 'text', autocomplete, placeholder, errorId }) {
    const labelEl = el('label', { for: id, text: label });
    const inputEl = el('input', {
      id,
      name,
      type,
      autocomplete,
      placeholder,
      value: values[name],
      'aria-invalid': isInvalid(name) ? 'true' : 'false',
      'aria-describedby': errorId,
      onInput: e => {
        values[name] = e.target.value;
        updateFieldError(name);
      },
      onBlur: () => {
        touched[name] = true;
        updateFieldError(name);
      }
    });
    const errorEl = el('small', {
      className: 'field-error',
      id: errorId,
      hidden: !isInvalid(name),
      text: isInvalid(name) ? getFieldMessage(name) : ''
    });
    inputRefs[name] = inputEl;
    errorRefs[name] = { errorEl, errorId };
    return [labelEl, inputEl, errorEl];
  }

  function updateFieldError(name) {
    const inputEl = inputRefs[name];
    const ref = errorRefs[name];
    if (!inputEl || !ref) return;
    const invalid = isInvalid(name);
    inputEl.setAttribute('aria-invalid', invalid ? 'true' : 'false');
    ref.errorEl.hidden = !invalid;
    ref.errorEl.textContent = invalid ? getFieldMessage(name) : '';
  }

  function updateAllFieldErrors() {
    Object.keys(inputRefs).forEach(updateFieldError);
  }

  if (register) {
    form.append(
      ...createFieldBlock({
        id: 'nombreCompleto',
        name: 'nombreCompleto',
        label: 'Nombre completo',
        autocomplete: 'name',
        placeholder: 'Tu nombre y apellido',
        errorId: 'nombre-error'
      })
    );
  }

  form.append(
    ...createFieldBlock({
      id: 'username',
      name: 'username',
      label: 'Usuario',
      autocomplete: 'username',
      placeholder: 'Tu nombre de usuario',
      errorId: 'usuario-error'
    })
  );

  if (register) {
    form.append(
      ...createFieldBlock({
        id: 'email',
        name: 'email',
        label: 'Correo electrónico',
        type: 'email',
        autocomplete: 'email',
        placeholder: 'correo@ejemplo.com',
        errorId: 'email-error'
      }),
      ...createFieldBlock({
        id: 'telefono',
        name: 'telefono',
        label: 'Celular',
        type: 'tel',
        autocomplete: 'tel',
        placeholder: '999 999 999',
        errorId: 'telefono-error'
      })
    );
  }

  // Password field with Mostrar/Ocultar button
  const pwLabel = el('label', { for: 'password', text: 'Contraseña' });
  const pwInput = el('input', {
    id: 'password',
    name: 'password',
    type: showPassword ? 'text' : 'password',
    autocomplete: register ? 'new-password' : 'current-password',
    placeholder: register ? 'Al menos 8 caracteres' : 'Tu contraseña',
    value: values.password,
    'aria-invalid': isInvalid('password') ? 'true' : 'false',
    'aria-describedby': 'password-error',
    onInput: e => {
      values.password = e.target.value;
      updateFieldError('password');
    },
    onBlur: () => {
      touched.password = true;
      updateFieldError('password');
    }
  });
  const togglePwBtn = el('button', {
    type: 'button',
    text: showPassword ? 'Ocultar' : 'Mostrar',
    onClick: () => {
      showPassword = !showPassword;
      pwInput.type = showPassword ? 'text' : 'password';
      togglePwBtn.textContent = showPassword ? 'Ocultar' : 'Mostrar';
    }
  });
  const pwError = el('small', {
    className: 'field-error',
    id: 'password-error',
    hidden: !isInvalid('password'),
    text: isInvalid('password') ? getFieldMessage('password') : ''
  });
  inputRefs.password = pwInput;
  errorRefs.password = { errorEl: pwError, errorId: 'password-error' };

  const formErrorPara = el('p', {
    className: 'form-error',
    role: 'alert',
    hidden: true
  });

  const submitBtn = el('button', {
    className: 'button button-orange submit',
    type: 'submit',
    text: register ? 'Crear mi cuenta' : 'Ingresar'
  });

  form.append(
    pwLabel,
    el('div', { className: 'password-field' }, pwInput, togglePwBtn),
    pwError,
    formErrorPara,
    submitBtn
  );

  function setError(msg) {
    errorText = msg || '';
    formErrorPara.hidden = !errorText;
    formErrorPara.textContent = errorText;
  }

  function setPendingState(isPending) {
    pending = isPending;
    submitBtn.disabled = pending;
    submitBtn.textContent = pending ? 'Un momento…' : register ? 'Crear mi cuenta' : 'Ingresar';
  }

  form.addEventListener('submit', async e => {
    e.preventDefault();
    setError('');
    Object.keys(touched).forEach(k => {
      touched[k] = true;
    });
    updateAllFieldErrors();

    if (isFormInvalid() || pending) return;

    if (register && new TextEncoder().encode(values.password).length > 72) {
      setError('La contraseña no debe superar 72 bytes. Usa menos caracteres.');
      return;
    }

    setPendingState(true);
    try {
      if (register) {
        await authStore.register({
          username: values.username,
          password: values.password,
          nombreCompleto: values.nombreCompleto,
          email: values.email,
          telefono: values.telefono
        });
      } else {
        await authStore.login(values.username, values.password);
      }
      navigateTo(continueTo);
    } catch (err) {
      if (err?.status === 0) {
        setError('No pudimos conectar con la tienda. Inténtalo nuevamente.');
      } else {
        setError(err?.error?.mensaje || 'No pudimos completar la solicitud. Revisa tus datos.');
      }
    } finally {
      setPendingState(false);
    }
  });

  return () => {};
}
