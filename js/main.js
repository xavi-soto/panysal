/* =========================================================
   PAN Y SAL — interacciones (vanilla JS, sin dependencias)
   ========================================================= */
(function () {
  'use strict';

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 1. Wordmarks a todo el ancho (fit-text) ---------- */
  var fitEls = Array.prototype.slice.call(document.querySelectorAll('[data-fit]'));

  function fitText() {
    fitEls.forEach(function (el) {
      var styles = getComputedStyle(el);
      var available = el.clientWidth - parseFloat(styles.paddingLeft) - parseFloat(styles.paddingRight);
      if (available <= 0) return;

      // Medimos el texto a un tamaño de referencia con un span temporal
      var probe = document.createElement('span');
      probe.textContent = el.textContent;
      probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font-size:100px;' +
        'font-family:' + styles.fontFamily + ';letter-spacing:' + styles.letterSpacing + ';text-transform:uppercase;';
      document.body.appendChild(probe);
      var w = probe.getBoundingClientRect().width;
      probe.remove();
      if (!w) return;

      // 0.97 deja aire para el contorno desplazado (text-shadow)
      var size = Math.floor((available / w) * 100 * 0.97);
      el.style.fontSize = size + 'px';
    });
  }

  var resizeRaf;
  function onResize() {
    cancelAnimationFrame(resizeRaf);
    resizeRaf = requestAnimationFrame(fitText);
  }

  fitText();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fitText);
  window.addEventListener('resize', onResize);

  /* ---------- 2. Menú hamburguesa ---------- */
  var burger = document.querySelector('.burger');
  var menu = document.getElementById('menu-movil');
  var desktopMQ = window.matchMedia('(min-width: 1025px)');

  function setMenu(open) {
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    menu.classList.toggle('is-open', open);
    document.body.classList.toggle('menu-open', open);
    if (open) {
      menu.removeAttribute('inert');
      var first = menu.querySelector('a');
      if (first) setTimeout(function () { first.focus(); }, 200);
    } else {
      menu.setAttribute('inert', '');
    }
  }

  if (burger && menu) {
    menu.setAttribute('inert', '');
    burger.addEventListener('click', function () {
      setMenu(burger.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && menu.classList.contains('is-open')) {
        setMenu(false);
        burger.focus();
      }
    });
    desktopMQ.addEventListener('change', function (e) { if (e.matches) setMenu(false); });
  }

  /* ---------- 3. Cabecera con sombra al hacer scroll ---------- */
  var header = document.querySelector('.site-header');
  var hero = document.getElementById('inicio');
  if (header && hero && 'IntersectionObserver' in window) {
    var sentinel = document.createElement('div');
    sentinel.style.cssText = 'position:absolute;top:0;left:0;width:1px;height:1px;';
    hero.prepend(sentinel);
    new IntersectionObserver(function (entries) {
      header.classList.toggle('is-scrolled', !entries[0].isIntersecting);
    }).observe(sentinel);
  }

  /* ---------- 4. Fade-in al hacer scroll ---------- */
  var reveals = document.querySelectorAll('.reveal');

  // Pequeño escalonado entre hermanos (tarjetas de un mismo grid)
  reveals.forEach(function (el) {
    var siblings = Array.prototype.filter.call(el.parentElement.children, function (c) {
      return c.classList.contains('reveal');
    });
    var i = siblings.indexOf(el);
    if (i > 0) el.style.setProperty('--d', Math.min(i % 3, 2) * 0.09 + 's');
  });

  if (reduceMotion || !('IntersectionObserver' in window)) {
    reveals.forEach(function (el) { el.classList.add('is-visible'); });
  } else {
    var io = new IntersectionObserver(function (entries, obs) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          obs.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    reveals.forEach(function (el) { io.observe(el); });
  }

  /* ---------- 5. Nav activa según sección visible ---------- */
  var navLinks = document.querySelectorAll('.nav__link[href^="#"]');
  var sections = ['como-funciona', 'carta', 'reparto']
    .map(function (id) { return document.getElementById(id); })
    .filter(Boolean);

  if (navLinks.length && 'IntersectionObserver' in window) {
    var spy = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        navLinks.forEach(function (a) {
          var active = a.getAttribute('href') === '#' + entry.target.id;
          if (a.classList.contains('btn--outline')) {
            a.setAttribute('aria-current', active ? 'true' : 'false');
          }
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });
    sections.forEach(function (s) { spy.observe(s); });
  }

  /* ---------- 6. Pedido a domicilio (carrito + formulario, maqueta sin backend) ---------- */
  var cart = [];                         // [{ name, qty }] en el orden en que se añaden
  var form = document.getElementById('order');
  var list = form ? form.querySelector('.order-list') : null;
  var empty = form ? form.querySelector('.order-empty') : null;
  var msg = form ? form.querySelector('.booking__msg') : null;
  var fab = document.querySelector('.cart-fab');
  var fabCount = fab ? fab.querySelector('.cart-fab__count') : null;
  var addBtns = document.querySelectorAll('.add-btn');

  function find(name) {
    for (var i = 0; i < cart.length; i++) if (cart[i].name === name) return cart[i];
    return null;
  }
  function total() {
    return cart.reduce(function (n, it) { return n + it.qty; }, 0);
  }
  function setQty(name, qty) {
    var it = find(name);
    if (qty <= 0) { cart = cart.filter(function (x) { return x.name !== name; }); }
    else if (it) { it.qty = qty; }
    else { cart.push({ name: name, qty: qty }); }
    render();
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function render() {
    var n = total();

    // Botones "Añadir" de la carta
    addBtns.forEach(function (b) {
      var it = find(b.dataset.dish);
      var count = b.querySelector('.add-btn__count');
      b.classList.toggle('is-added', !!it);
      count.hidden = !it;
      count.textContent = it ? '×' + it.qty : '';
      b.querySelector('.add-btn__label').textContent = it ? 'Añadido' : 'Añadir';
    });

    // Botón flotante
    if (fab) {
      fab.hidden = n === 0;
      fabCount.textContent = n;
    }

    // Resumen dentro del formulario
    if (!list) return;
    list.innerHTML = '';
    cart.forEach(function (it) {
      var li = el('li', 'order-item');
      li.appendChild(el('span', 'order-item__name', it.name));
      var qty = el('div', 'order-item__qty');
      var minus = el('button', 'qty-btn', '−');
      minus.type = 'button';
      minus.setAttribute('aria-label', 'Quitar uno de ' + it.name);
      minus.addEventListener('click', function () { setQty(it.name, it.qty - 1); });
      var plus = el('button', 'qty-btn', '+');
      plus.type = 'button';
      plus.setAttribute('aria-label', 'Añadir otro de ' + it.name);
      plus.addEventListener('click', function () { setQty(it.name, it.qty + 1); });
      qty.appendChild(minus);
      qty.appendChild(el('span', 'order-item__n', String(it.qty)));
      qty.appendChild(plus);
      li.appendChild(qty);
      list.appendChild(li);
    });
    empty.hidden = n > 0;
  }

  addBtns.forEach(function (b) {
    b.addEventListener('click', function () {
      var it = find(b.dataset.dish);
      setQty(b.dataset.dish, it ? it.qty + 1 : 1);
      if (fab && !reduceMotion) {
        fab.classList.remove('is-bump');
        void fab.offsetWidth;            // reinicia la animación
        fab.classList.add('is-bump');
      }
      if (msg) msg.textContent = '';
    });
  });

  // El botón flotante se oculta cuando ya estás viendo el formulario
  if (fab && form && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (entries) {
      fab.classList.toggle('is-away', entries[0].isIntersecting);
    }, { threshold: 0.15 }).observe(form);
  }

  if (form) {
    render();
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!total()) {
        msg.textContent = 'Tu pedido está vacío: añade algún plato desde La Carta.';
        return;
      }
      var missing = ['nombre', 'telefono', 'direccion'].filter(function (f) { return !form[f].value.trim(); });
      if (missing.length) {
        msg.textContent = 'Nos falta tu nombre, teléfono y dirección para poder llevártelo.';
        form[missing[0]].focus();
        return;
      }
      var text = 'Próximamente en tu plataforma de delivery favorita.';
      form.reset();
      cart = [];
      render();
      msg.textContent = text;
    });
  }
})();
