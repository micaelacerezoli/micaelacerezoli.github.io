(function () {
  'use strict';

  var CFG = window.CONFIG_WEB || {};
  var API = CFG.APPS_SCRIPT_URL || '';
  var reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Año ---------- */
  document.getElementById('anio').textContent = new Date().getFullYear();

  /* ---------- Menú móvil ---------- */
  var menuBtn = document.querySelector('.menu-btn');
  var menu = document.getElementById('menu');
  menuBtn.addEventListener('click', function () {
    var abierto = menu.classList.toggle('abierto');
    menuBtn.setAttribute('aria-expanded', abierto);
    menuBtn.textContent = abierto ? 'Cerrar' : 'Menú';
  });
  menu.addEventListener('click', function (e) {
    if (e.target.tagName === 'A') {
      menu.classList.remove('abierto');
      menuBtn.setAttribute('aria-expanded', 'false');
      menuBtn.textContent = 'Menú';
    }
  });

  /* ---------- Portada: los píxeles grises toman color ---------- */
  var colores = ['#1E9BD7', '#F2C230', '#E8731C', '#24A866', '#C43FB8', '#2C3E50'];
  var grilla = document.querySelector('.pixeles');
  if (grilla) {
    var celdas = [];
    for (var i = 0; i < 90; i++) {
      var c = document.createElement('i');
      grilla.appendChild(c);
      celdas.push(c);
    }
    var pintar = function () {
      celdas.forEach(function (cel, n) {
        if (Math.random() < 0.55) {
          var color = colores[Math.floor(Math.random() * colores.length)];
          if (reducido) { cel.style.backgroundColor = color; return; }
          setTimeout(function () { cel.style.backgroundColor = color; }, 400 + n * 14 + Math.random() * 500);
        }
      });
    };
    if (document.readyState === 'complete') pintar(); else window.addEventListener('load', pintar);
  }

  /* ---------- CV ---------- */
  if (CFG.CV_URL) {
    var cv = document.getElementById('btnCV');
    cv.href = CFG.CV_URL;
    cv.hidden = false;
  }

  /* ---------- Utilidades ---------- */
  function esc(t) {
    var d = document.createElement('div');
    d.textContent = t == null ? '' : String(t);
    return d.innerHTML;
  }
  function urlSegura(u) {
    return /^https?:\/\//i.test(u || '') ? u : '#';
  }
  function apiGet(accion) {
    return fetch(API + '?accion=' + encodeURIComponent(accion)).then(function (r) { return r.json(); });
  }
  function apiPost(datos) {
    // text/plain evita la verificación previa (CORS) que Apps Script no responde
    return fetch(API, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify(datos) })
      .then(function (r) { return r.json(); });
  }
  var pesos = new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });

  /* ---------- Cuaderno de ideas y herramientas (íconos) ---------- */
  var cajaArt = document.getElementById('articulos');
  var imgsCami = ['img/cami-pizarra.webp', 'img/cami-dado.webp', 'img/cami-mesa.webp', 'img/cami-senala.webp', 'img/cami-ideas.webp', 'img/cami-pensando.webp'];
  var dlg = document.getElementById('lectura');

  if (API) {
    apiGet('articulos').then(function (res) {
      var lista = (res && res.articulos) || [];
      if (!lista.length) return; // quedan los temas base
      cajaArt.innerHTML = lista.map(function (a, n) {
        var meta = [a.fecha, a.tiempo].filter(Boolean).join(', ');
        return '<li><button type="button" class="icono"' +
          ' data-titulo="' + esc(a.titulo) + '" data-resumen="' + esc(a.resumen) + '"' +
          ' data-cat="' + esc(a.categoria) + '" data-meta="' + esc(meta) + '"' +
          ' data-url="' + esc(a.url ? urlSegura(a.url) : '') + '">' +
          '<span class="icono-img"><img src="' + imgsCami[n % imgsCami.length] + '" alt="" loading="lazy"></span>' +
          '<span class="icono-txt">' + esc(a.titulo) + '</span></button></li>';
      }).join('');
    }).catch(function () { /* quedan los temas base */ });
  }

  cajaArt.addEventListener('click', function (e) {
    var b = e.target.closest('.icono');
    if (!b) return;
    document.getElementById('lecturaImg').src = b.querySelector('img').getAttribute('src');
    document.getElementById('lecturaCat').textContent = b.dataset.cat || '';
    document.getElementById('lecturaTitulo').textContent = b.dataset.titulo || '';
    document.getElementById('lecturaTexto').textContent = b.dataset.resumen || '';
    document.getElementById('lecturaMeta').textContent = b.dataset.meta || (b.dataset.url ? '' : 'Artículo en preparación.');
    var link = document.getElementById('lecturaLink');
    link.hidden = !b.dataset.url || b.dataset.url === '#';
    link.href = b.dataset.url || '#';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  dlg.addEventListener('click', function (e) {
    if (e.target === dlg || e.target.hasAttribute('data-cerrar')) dlg.close();
  });

  /* ---------- Tienda ---------- */
  var cajaProd = document.getElementById('productos');

  function tarjetaProducto(p) {
    var precio = Number(p.precio) || 0;
    var accion;
    if (!CFG.TIENDA_ABIERTA) {
      accion = '<p class="proximo">Próximamente</p>' +
        '<a class="btn btn-linea" href="#contacto" data-consulta="' + esc(p.nombre) + '">Avisame cuando esté</a>';
      precio = 0;
    } else if (p.link_mp) {
      accion = '<a class="btn btn-mp" href="' + esc(urlSegura(p.link_mp)) + '" target="_blank" rel="noopener">Comprar con Mercado Pago</a>';
    } else if (precio > 0) {
      accion = '<button class="btn btn-mp" type="button" data-comprar="' + esc(p.id) + '">Comprar con Mercado Pago</button>';
    } else {
      accion = '<a class="btn btn-linea" href="#contacto" data-consulta="' + esc(p.nombre) + '">Consultar</a>';
    }
    return '<article class="producto">' +
      '<div class="producto-img">' + (p.imagen ? '<img src="' + esc(p.imagen) + '" alt="" loading="lazy">' : '') + '</div>' +
      '<div class="producto-cuerpo">' +
        (p.tipo ? '<span class="tipo">' + esc(p.tipo) + '</span>' : '') +
        '<h3>' + esc(p.nombre) + '</h3>' +
        '<p>' + esc(p.descripcion) + '</p>' +
        (precio > 0 ? '<div class="precio">' + pesos.format(precio) + ' <small>ARS</small></div>' : '') +
        accion +
      '</div></article>';
  }

  if (API) {
    apiGet('productos').then(function (res) {
      var lista = (res && res.productos) || [];
      if (lista.length) cajaProd.innerHTML = lista.map(tarjetaProducto).join('');
    }).catch(function () { /* quedan los productos de ejemplo */ });
  }

  document.addEventListener('click', function (e) {
    var consulta = e.target.closest('[data-consulta]');
    if (consulta) {
      document.getElementById('tipo').value = 'Juegos y kits (tienda)';
      var msj = document.getElementById('mensaje');
      if (!msj.value) msj.value = 'Hola Mica, me interesa: ' + consulta.getAttribute('data-consulta') + '. Avisame cuando esté disponible.';
      return;
    }
    var btn = e.target.closest('[data-comprar]');
    if (!btn) return;
    var texto = btn.textContent;
    btn.disabled = true;
    btn.textContent = 'Abriendo Mercado Pago…';
    apiPost({ accion: 'checkout', id: btn.getAttribute('data-comprar'), volver: location.origin + location.pathname })
      .then(function (res) {
        if (res && res.ok && res.url) { location.href = res.url; return; }
        throw new Error((res && res.error) || 'sin respuesta');
      })
      .catch(function (err) {
        btn.disabled = false;
        btn.textContent = texto;
        alertaPago('No se pudo iniciar el pago (' + err.message + '). Probá de nuevo o escribime desde el formulario de contacto.', '#B42318');
      });
  });

  /* Mensaje al volver de Mercado Pago */
  function alertaPago(texto, color) {
    var av = document.getElementById('avisoPago');
    av.textContent = texto;
    av.style.setProperty('--c', color);
    av.hidden = false;
  }
  var pago = new URLSearchParams(location.search).get('pago');
  if (pago) {
    var msjs = {
      ok: ['¡Gracias por tu compra! El pago fue aprobado. Te escribo por email con los próximos pasos.', '#24A866'],
      pendiente: ['Tu pago quedó pendiente. Cuando Mercado Pago lo acredite, te escribo por email.', '#F2C230'],
      error: ['El pago no se completó. Podés intentarlo de nuevo o escribirme.', '#B42318']
    };
    var m = msjs[pago] || msjs.error;
    alertaPago(m[0], m[1]);
    document.getElementById('tienda').scrollIntoView();
  }

  /* ---------- Formulario de contacto ---------- */
  var form = document.getElementById('formContacto');
  var estado = document.getElementById('estado');
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    estado.className = '';
    var datos = {
      accion: 'contacto',
      nombre: form.nombre.value.trim(),
      organizacion: form.organizacion.value.trim(),
      email: form.email.value.trim(),
      tipo: form.tipo.value,
      mensaje: form.mensaje.value.trim(),
      sitio: form.sitio.value
    };
    if (!datos.nombre || !datos.mensaje || !/^\S+@\S+\.\S+$/.test(datos.email)) {
      estado.className = 'error';
      estado.textContent = 'Completá nombre, un email válido y tu mensaje.';
      return;
    }
    var boton = form.querySelector('button[type=submit]');
    boton.disabled = true;
    estado.textContent = 'Enviando consulta…';
    apiPost(datos).then(function (res) {
      if (!res || !res.ok) throw new Error((res && res.error) || 'sin respuesta');
      estado.className = 'ok';
      estado.textContent = '¡Gracias! Tu consulta fue enviada. Te respondo a la brevedad.';
      form.reset();
    }).catch(function (err) {
      estado.className = 'error';
      estado.textContent = 'No se pudo enviar (' + err.message + '). Probá de nuevo en unos minutos.';
    }).finally(function () { boton.disabled = false; });
  });
})();
