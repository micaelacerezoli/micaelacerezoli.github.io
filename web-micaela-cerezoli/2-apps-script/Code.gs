/******************************************************
 WEB PROFESIONAL - MICAELA CEREZOLI
 Innovación Pública · Facilitación · Participación

 Versión 2: Apps Script funciona como "motor" de la web
 publicada en GitHub Pages. Responde a:
   GET  ?accion=articulos   → Cuaderno de Facilitación
   GET  ?accion=productos   → Tienda (hoja "Productos")
   POST {accion:'contacto'} → Formulario de contacto
   POST {accion:'checkout'} → Crea el pago en Mercado Pago
   POST ?accion=webhook     → Aviso de Mercado Pago (registra la venta)

 La clave de Mercado Pago NO va en este archivo:
 Configuración del proyecto (⚙) > Propiedades de la secuencia de comandos >
 agregar  MP_ACCESS_TOKEN  =  APP_USR-xxxxxxxx...
*******************************************************/

const CONFIG = {

  // DIRECCIÓN DE LA WEB PÚBLICA (GitHub Pages)
  SITIO_URL: 'https://micaelacerezoli.github.io/',

  // CONTACTO
  EMAIL_CONTACTO: 'Cerezoli.min@gmail.com',

  // PLANILLA PRINCIPAL (la del Cuaderno). Ahí también se crean
  // las hojas "Productos", "Contactos" y "Ventas".
  CUADERNO_SPREADSHEET_ID: '1pjPPsmg6IaQaAXN9-5GfLcoA1PZkgdi18emVa5sOnN0',
  CUADERNO_SHEET_NAME: 'Cuaderno',

  // OPCIONAL: otra planilla para los contactos. Vacío = usa la principal.
  CONTACTOS_SPREADSHEET_ID: '',

  PRODUCTOS_SHEET_NAME: 'Productos',
  VENTAS_SHEET_NAME: 'Ventas',
  CONTACTOS_SHEET_NAME: 'Contactos'
};


/* =====================================================
   ENTRADAS DE LA WEB
===================================================== */

function doGet(e) {
  const accion = (e && e.parameter && e.parameter.accion) || '';

  if (accion === 'articulos') return json_({ ok: true, articulos: obtenerArticulos() });
  if (accion === 'productos') return json_({ ok: true, productos: obtenerProductos() });

  // Quien entre a la dirección vieja del script, va a la web nueva
  return HtmlService.createHtmlOutput(
    '<meta http-equiv="refresh" content="0;url=' + CONFIG.SITIO_URL + '">' +
    '<p style="font-family:sans-serif">La web se mudó a <a href="' + CONFIG.SITIO_URL + '" target="_top">' +
    CONFIG.SITIO_URL + '</a></p>'
  ).setTitle('Micaela Cerezoli | Innovación Pública y Facilitación');
}


function doPost(e) {
  let datos = {};
  try {
    datos = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (err) {
    datos = {};
  }
  const param = (e && e.parameter) || {};

  try {
    // Aviso de Mercado Pago
    if (param.accion === 'webhook' || datos.type === 'payment' || param.topic === 'payment') {
      const idPago = (datos.data && datos.data.id) || param['data.id'] || param.id;
      if (idPago) registrarPago_(String(idPago));
      return json_({ ok: true });
    }

    if (datos.accion === 'contacto') return json_(guardarContacto(datos));
    if (datos.accion === 'checkout') return json_(crearPago(datos.id, datos.volver));

    return json_({ ok: false, error: 'Acción desconocida' });

  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: err.message });
  }
}


function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}


function planilla_() {
  return SpreadsheetApp.openById(CONFIG.CUADERNO_SPREADSHEET_ID);
}


/* =====================================================
   CUADERNO DE FACILITACIÓN
   Columnas: Fecha | Categoría | Título | Resumen | URL | Tiempo | Publicar (sí/no)
===================================================== */

function obtenerArticulos() {
  try {
    const hoja = planilla_().getSheetByName(CONFIG.CUADERNO_SHEET_NAME);
    if (!hoja) return [];

    const datos = hoja.getDataRange().getValues();
    const articulos = [];

    for (let i = 1; i < datos.length; i++) {
      const fila = datos[i];
      if (!esSi_(fila[6])) continue;

      const fecha = fila[0] instanceof Date
        ? Utilities.formatDate(fila[0], Session.getScriptTimeZone(), 'dd/MM/yyyy')
        : String(fila[0] || '');

      articulos.push({
        fecha: fecha,
        categoria: String(fila[1] || ''),
        titulo: String(fila[2] || ''),
        resumen: String(fila[3] || ''),
        url: String(fila[4] || ''),
        tiempo: String(fila[5] || '')
      });
    }

    return articulos.reverse(); // más recientes primero

  } catch (error) {
    console.error(error);
    return [];
  }
}


/* =====================================================
   TIENDA · hoja "Productos"
   Columnas: id | nombre | descripcion | precio | tipo | imagen | link_mp | activo
   - precio: número en pesos, sin puntos ni $ (ej: 15000). Vacío = "Consultar".
   - link_mp: opcional. Si pegás un link de pago de Mercado Pago, se usa ese.
   - activo: "sí" para mostrarlo en la web.
===================================================== */

function obtenerProductos() {
  const hoja = planilla_().getSheetByName(CONFIG.PRODUCTOS_SHEET_NAME);
  if (!hoja) return [];

  const datos = hoja.getDataRange().getValues();
  const productos = [];

  for (let i = 1; i < datos.length; i++) {
    const f = datos[i];
    if (!f[0] || !esSi_(f[7])) continue;
    productos.push({
      id: String(f[0]).trim(),
      nombre: String(f[1] || ''),
      descripcion: String(f[2] || ''),
      precio: Number(f[3]) || 0,
      tipo: String(f[4] || ''),
      imagen: String(f[5] || ''),
      link_mp: String(f[6] || '')
    });
  }
  return productos;
}


function buscarProducto_(id) {
  return obtenerProductos().filter(function (p) { return p.id === String(id); })[0];
}


/* =====================================================
   MERCADO PAGO · Checkout Pro
   El precio SIEMPRE se toma de la planilla, nunca de la web.
===================================================== */

function crearPago(id, volver) {
  const token = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!token) throw new Error('Falta configurar MP_ACCESS_TOKEN');

  const p = buscarProducto_(id);
  if (!p || p.precio <= 0) throw new Error('Producto no disponible');

  // Solo se vuelve a la web propia
  const base = (volver && String(volver).indexOf(CONFIG.SITIO_URL) === 0) ? volver : CONFIG.SITIO_URL;

  const preferencia = {
    items: [{
      id: p.id,
      title: p.nombre,
      description: p.descripcion.substring(0, 250),
      quantity: 1,
      unit_price: p.precio,
      currency_id: 'ARS'
    }],
    back_urls: {
      success: base + '?pago=ok#tienda',
      pending: base + '?pago=pendiente#tienda',
      failure: base + '?pago=error#tienda'
    },
    auto_return: 'approved',
    notification_url: ScriptApp.getService().getUrl() + '?accion=webhook',
    external_reference: p.id + '-' + new Date().getTime(),
    statement_descriptor: 'MICAELA CEREZOLI'
  };

  const resp = UrlFetchApp.fetch('https://api.mercadopago.com/checkout/preferences', {
    method: 'post',
    contentType: 'application/json',
    headers: { Authorization: 'Bearer ' + token },
    payload: JSON.stringify(preferencia),
    muteHttpExceptions: true
  });

  const cuerpo = JSON.parse(resp.getContentText());
  if (resp.getResponseCode() >= 300) {
    console.error(cuerpo);
    throw new Error('Mercado Pago rechazó el pedido');
  }
  return { ok: true, url: cuerpo.init_point };
}


function registrarPago_(idPago) {
  const token = PropertiesService.getScriptProperties().getProperty('MP_ACCESS_TOKEN');
  if (!token) return;

  const resp = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments/' + encodeURIComponent(idPago), {
    headers: { Authorization: 'Bearer ' + token },
    muteHttpExceptions: true
  });
  if (resp.getResponseCode() !== 200) return;

  const pago = JSON.parse(resp.getContentText());
  const item = (pago.additional_info && pago.additional_info.items && pago.additional_info.items[0]) || {};
  const comprador = pago.payer || {};

  const hoja = hojaConEncabezado_(planilla_(), CONFIG.VENTAS_SHEET_NAME,
    ['Fecha', 'ID pago', 'Estado', 'Producto', 'Monto', 'Email comprador', 'Nombre comprador', 'Referencia']);

  const fila = [
    new Date(), String(pago.id), pago.status, item.title || pago.description || '',
    pago.transaction_amount, comprador.email || '',
    ((comprador.first_name || '') + ' ' + (comprador.last_name || '')).trim(),
    pago.external_reference || ''
  ];

  // Si Mercado Pago avisa dos veces el mismo pago, se actualiza la fila
  const existente = hoja.getRange('B:B').createTextFinder(String(pago.id)).matchEntireCell(true).findNext();
  let estadoAnterior = '';
  if (existente) {
    estadoAnterior = hoja.getRange(existente.getRow(), 3).getValue();
    hoja.getRange(existente.getRow(), 1, 1, fila.length).setValues([fila]);
  } else {
    hoja.appendRow(fila);
  }

  if (pago.status === 'approved' && estadoAnterior !== 'approved') {
    MailApp.sendEmail({
      to: CONFIG.EMAIL_CONTACTO,
      subject: 'Nueva venta en la web: ' + fila[3],
      body: 'Se aprobó un pago en Mercado Pago.\n\n' +
        'Producto: ' + fila[3] + '\nMonto: $' + fila[4] + '\n' +
        'Comprador: ' + fila[6] + ' <' + fila[5] + '>\nID de pago: ' + fila[1] +
        '\n\nEl detalle quedó en la hoja "Ventas".'
    });
  }
}


/* =====================================================
   FORMULARIO DE CONTACTO
===================================================== */

function guardarContacto(datos) {
  if (datos && datos.sitio) return { ok: true }; // trampa para robots

  const limpiar = function (t, max) { return String(t || '').trim().substring(0, max); };
  const d = {
    nombre: limpiar(datos.nombre, 120),
    organizacion: limpiar(datos.organizacion, 160),
    email: limpiar(datos.email, 160),
    tipo: limpiar(datos.tipo, 120),
    mensaje: limpiar(datos.mensaje, 4000)
  };

  if (!d.nombre || !d.mensaje || !/^\S+@\S+\.\S+$/.test(d.email)) {
    throw new Error('Completá nombre, email y mensaje.');
  }

  MailApp.sendEmail({
    to: CONFIG.EMAIL_CONTACTO,
    subject: 'Nueva consulta desde la web - ' + d.nombre,
    replyTo: d.email,
    body:
      'NUEVA CONSULTA DESDE LA WEB\n\n' +
      'Nombre: ' + d.nombre + '\n' +
      'Organización: ' + (d.organizacion || '-') + '\n' +
      'Email: ' + d.email + '\n' +
      'Tipo de consulta: ' + (d.tipo || '-') + '\n\n' +
      'Mensaje:\n' + d.mensaje
  });

  const ss = CONFIG.CONTACTOS_SPREADSHEET_ID
    ? SpreadsheetApp.openById(CONFIG.CONTACTOS_SPREADSHEET_ID)
    : planilla_();
  hojaConEncabezado_(ss, CONFIG.CONTACTOS_SHEET_NAME,
    ['Fecha', 'Nombre', 'Organización', 'Email', 'Tipo', 'Mensaje'])
    .appendRow([new Date(), d.nombre, d.organizacion, d.email, d.tipo, d.mensaje]);

  return { ok: true, mensaje: '¡Gracias! Tu consulta fue enviada correctamente.' };
}


/* =====================================================
   AUXILIARES
===================================================== */

function esSi_(valor) {
  const v = String(valor || '').trim().toLowerCase();
  return v === 'sí' || v === 'si' || v === 'yes' || v === 'x' || v === 'true';
}

function hojaConEncabezado_(ss, nombre, encabezado) {
  let hoja = ss.getSheetByName(nombre);
  if (!hoja) {
    hoja = ss.insertSheet(nombre);
    hoja.appendRow(encabezado);
    hoja.setFrozenRows(1);
    hoja.getRange(1, 1, 1, encabezado.length).setFontWeight('bold');
  }
  return hoja;
}


/* =====================================================
   EJECUTAR UNA VEZ DESDE EL EDITOR
===================================================== */

// 1) Crea las hojas Productos, Contactos y Ventas con ejemplos.
function prepararPlanilla() {
  const ss = planilla_();
  const hoja = ss.getSheetByName(CONFIG.PRODUCTOS_SHEET_NAME);
  if (!hoja) {
    const h = hojaConEncabezado_(ss, CONFIG.PRODUCTOS_SHEET_NAME,
      ['id', 'nombre', 'descripcion', 'precio', 'tipo', 'imagen', 'link_mp', 'activo']);
    h.getRange(2, 1, 3, 8).setValues([
      ['raices-imprimible', 'Raíces: kit para imprimir',
        'Tableros A3, cartas y fichas para trabajar árbol de problemas, árbol de objetivos y priorización de alternativas en equipos.',
        '', 'Juego imprimible', 'img/cami-mesa.webp', '', 'sí'],
      ['stickers-cami', 'Stickers de Cami',
        'Plancha de stickers para tableros, láminas de votación y pizarras colaborativas.',
        '', 'Kit físico', 'img/cami-stickers.webp', '', 'sí'],
      ['taller-raices', 'Taller Raíces facilitado',
        'Una jornada para tu equipo de gobierno u organización, con el juego, la facilitación y el informe de resultados.',
        '', 'Taller', 'img/cami-pizarra.webp', '', 'sí']
    ]);
  }
  hojaConEncabezado_(ss, CONFIG.CONTACTOS_SHEET_NAME, ['Fecha', 'Nombre', 'Organización', 'Email', 'Tipo', 'Mensaje']);
  hojaConEncabezado_(ss, CONFIG.VENTAS_SHEET_NAME,
    ['Fecha', 'ID pago', 'Estado', 'Producto', 'Monto', 'Email comprador', 'Nombre comprador', 'Referencia']);
  Logger.log('Listo: hojas creadas en "' + ss.getName() + '"');
}

// 2) Autoriza permisos (planilla, mail y conexión externa).
function autorizarTodo() {
  Logger.log(planilla_().getName());
  Logger.log(MailApp.getRemainingDailyQuota() + ' mails disponibles hoy');
  UrlFetchApp.fetch('https://api.mercadopago.com', { muteHttpExceptions: true });
}

function probarCuaderno() {
  Logger.log(JSON.stringify(obtenerArticulos(), null, 2));
}

function probarProductos() {
  Logger.log(JSON.stringify(obtenerProductos(), null, 2));
}

// 3) Con un producto con precio cargado, genera un link de pago de prueba.
function probarMercadoPago() {
  const p = obtenerProductos().filter(function (x) { return x.precio > 0; })[0];
  if (!p) { Logger.log('Cargá un precio en algún producto primero.'); return; }
  Logger.log(JSON.stringify(crearPago(p.id, CONFIG.SITIO_URL)));
}
