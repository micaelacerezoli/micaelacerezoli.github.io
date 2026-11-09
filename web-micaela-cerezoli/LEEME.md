# Web de Micaela Cerezoli: cómo publicarla

Dirección final: **https://micaelacerezoli.github.io**

El paquete tiene dos carpetas:

- `1-subir-a-github`: la web (lo que ve la gente y lee Google).
- `2-apps-script`: el nuevo `Code.gs`, el "motor" que recibe consultas, muestra el Cuaderno, arma la tienda y cobra con Mercado Pago.

---

## Paso 1 · Subir la web a GitHub (10 minutos)

1. Entrá a https://github.com/micaelacerezoli/micaelacerezoli.github.io
2. Tocá **Add file → Upload files** (si el repositorio está vacío: el link "uploading an existing file").
3. Abrí la carpeta `1-subir-a-github` en tu computadora, seleccioná **todo lo que hay adentro** (`index.html`, `404.html`, `robots.txt`, `sitemap.xml` y las carpetas `css`, `js`, `img`, `video`) y arrastralo a la página. Importante: arrastrá el contenido, no la carpeta `1-subir-a-github`.
4. Abajo, en **Commit changes**, tocá el botón verde.
5. Andá a **Settings → Pages**. En *Source* elegí **Deploy from a branch**, rama **main**, carpeta **/ (root)** y **Save**.
6. Esperá 1 o 2 minutos y abrí https://micaelacerezoli.github.io

Para cambiar algo después: abrís el archivo en GitHub, tocás el lápiz ✏️, editás y **Commit changes**.

## Paso 2 · Tu foto y tu logo en buena calidad

- Tu foto ya está incluida (`img/micaela-cerezoli.jpg`). Para cambiarla, subí otra con el mismo nombre.
- Si tenés el logo original en alta calidad, subilo como `img/logo-micaela-cerezoli.jpg` (reemplaza al actual).
- Para el CV: compartí el PDF en Drive como "Cualquier persona con el enlace", y pegá el link en `js/config.js`, en `CV_URL`. Aparece el botón "Descargar mi CV".

## Paso 3 · Actualizar el Apps Script (15 minutos)

1. Abrí tu proyecto en script.google.com.
2. En `Código.gs`, borrá todo y pegá el contenido de `2-apps-script/Code.gs`. Guardá (💾).
3. Podés borrar el archivo `Index.html`, porque ahora la web vive en GitHub.
4. Arriba, en el desplegable de funciones, elegí **prepararPlanilla** y tocá **Ejecutar**. Crea en tu planilla del Cuaderno las hojas **Productos**, **Contactos** y **Ventas**.
5. Ejecutá **autorizarTodo** y aceptá los permisos (planilla, mail y conexión con Mercado Pago).
6. **Implementar → Administrar implementaciones → ✏️ (editar)** → en *Versión* elegí **Nueva versión** → *Quién tiene acceso*: **Cualquier usuario** → **Implementar**.
   Así la dirección `/exec` no cambia y la web sigue conectada.

> Quien entre a la dirección vieja del script es redirigido a la web nueva.

## Paso 4 · Cargar productos y precios

Por ahora la tienda está **en proceso**: se ven los productos con el botón "Avisame cuando esté". Para abrirla, en `js/config.js` cambiá `TIENDA_ABIERTA: false` por `TIENDA_ABIERTA: true`.


En la hoja **Productos**:

| columna | qué va |
|---|---|
| id | un nombre corto sin espacios, ej. `raices-imprimible` |
| nombre / descripcion / tipo | lo que se ve en la tarjeta |
| precio | número en pesos sin puntos ni $, ej. `15000`. Vacío = botón "Consultar" |
| imagen | ej. `img/cami-mesa.webp` o un link a una imagen |
| link_mp | opcional: un link de pago que hayas creado en Mercado Pago |
| activo | `sí` para mostrarlo |

Los cambios se ven en la web al recargarla. No hace falta tocar GitHub.

## Paso 5 · Conectar Mercado Pago

1. Entrá a https://www.mercadopago.com.ar/developers → **Tus integraciones → Crear aplicación** (tipo *Pagos online*, *Checkout Pro*).
2. En **Credenciales de producción** copiá el **Access Token** (empieza con `APP_USR-`).
3. En Apps Script: **⚙ Configuración del proyecto → Propiedades de la secuencia de comandos → Agregar propiedad**
   - Propiedad: `MP_ACCESS_TOKEN`
   - Valor: el token que copiaste
4. Ejecutá **probarMercadoPago** (con algún producto con precio). En el registro aparece un link de pago para probar.

El token nunca queda en la web ni en GitHub. Cada venta aprobada se anota en la hoja **Ventas** y te llega un mail.
Si preferís no usar la clave, alcanza con pegar un link de pago en la columna `link_mp`.

## Cuaderno de ideas y herramientas

Cada fila de la hoja **Cuaderno** con `sí` en la columna Publicar aparece como un ícono con Cami. Al tocarlo se abre el resumen y el botón al artículo completo (columna URL). Ya están cargados los dos artículos publicados hoy; cuando sumes filas con `sí`, aparecen solas.

## Paso 6 · Que Google encuentre la web

1. Entrá a https://search.google.com/search-console con tu cuenta de Google.
2. **Agregar propiedad → Prefijo de URL** → `https://micaelacerezoli.github.io/`
3. Verificación: elegí **Archivo HTML**, descargalo y subilo a la raíz del repositorio en GitHub (igual que en el paso 1). Volvé y tocá **Verificar**.
4. Menú **Sitemaps** → escribí `sitemap.xml` → **Enviar**.
5. Arriba, en *Inspeccionar URL*, pegá la dirección de la web y tocá **Solicitar indexación**.

Google suele tardar entre unos días y dos semanas en mostrarla. Ayuda mucho compartir el link en LinkedIn, en tu firma de mail y en perfiles donde ya estás.

## Si más adelante querés dominio propio (ej. micaelacerezoli.com.ar)

Se registra en NIC Argentina (costo anual bajo) y se conecta en **Settings → Pages → Custom domain**. En ese caso hay que cambiar la dirección en `index.html`, `robots.txt`, `sitemap.xml` y en `CONFIG.SITIO_URL` del Apps Script.
