# Avance de campo · Encuesta Bolívar, Carchi

Tablero que muestra el avance de las encuestas por supervisor, por día y por parroquia,
con un mapa interactivo. Se conecta directamente a KoboToolbox: cada 15 minutos
GitHub descarga las encuestas, las resume y vuelve a publicar la página.
No hay que descargar ni subir bases a mano.

## Qué hay en la carpeta

| Archivo | Para qué sirve |
|---|---|
| `index.html` | La página del tablero |
| `assets/styles.css`, `assets/app.js` | Diseño y funcionamiento del tablero |
| `assets/leaflet/` | Librería del mapa |
| `assets/parroquias_bolivar.geojson` | Límites de las 6 parroquias (INEC, DPA 2012) |
| `data/encuestas.json` | Datos que lee el tablero (al inicio, datos de ejemplo) |
| `scripts/actualizar_kobo.py` | Descarga las encuestas de Kobo y crea `data/encuestas.json` |
| `.github/workflows/actualizar.yml` | Tarea automática de GitHub que ejecuta el script y publica la página |

## Puesta en marcha (una sola vez, unos 10 minutos)

### 1. Crear el repositorio
1. En GitHub, botón **New repository**.
2. Nombre: por ejemplo `avance-campo-bolivar`. Visibilidad: **Public** (GitHub Pages gratis solo funciona con repositorios públicos).
3. Crear el repositorio.

### 2. Subir los archivos
1. En el repositorio: **Add file → Upload files**.
2. Arrastra todo el contenido de esta carpeta (`index.html`, `README.md` y las carpetas `assets`, `data`, `scripts`).
3. **Commit changes**.

La carpeta `.github` empieza con punto y en Windows o Mac a veces no se sube al arrastrar. Si no aparece en el repositorio:
1. **Add file → Create new file**.
2. En el nombre escribe exactamente: `.github/workflows/actualizar.yml`
3. Pega el contenido del archivo `.github/workflows/actualizar.yml` de esta carpeta (si no lo ves, activa "mostrar archivos ocultos") y haz **Commit changes**.

### 3. Activar la página
**Settings → Pages → Build and deployment → Source: GitHub Actions.**

### 4. Conectar con Kobo
En **Settings → Secrets and variables → Actions**:

Pestaña **Secrets** → **New repository secret**:

| Nombre | Valor |
|---|---|
| `KOBO_TOKEN` | Tu clave API de Kobo: en Kobo, menú de tu cuenta → **Configuración de la cuenta → Seguridad → API Key → Mostrar** |
| `KOBO_ASSET_UID` | El código del formulario. Está en la dirección del proyecto: `https://kf.kobotoolbox.org/#/forms/`**`aBcD1234xyz`**`/summary` |

Pestaña **Variables** (solo si hace falta):

| Nombre | Cuándo usarla |
|---|---|
| `KOBO_URL` | Si tu cuenta está en el servidor europeo, pon `https://eu.kobotoolbox.org`. Si usas `kf.kobotoolbox.org`, no la crees. |
| `META` | Si la meta cambia. Por defecto es 700. |

### 5. Primera actualización
**Actions → Actualizar tablero desde Kobo → Run workflow.** Espera 1 o 2 minutos.
La página queda en: `https://TU-USUARIO.github.io/avance-campo-bolivar/`

Ese es el enlace que compartes con los supervisores.

## En los días de campo

- El tablero se actualiza solo cada 15 minutos (GitHub a veces se demora unos minutos más).
- Para actualizar al instante: **Actions → Actualizar tablero desde Kobo → Run workflow**.
- La página abierta vuelve a leer los datos cada 2 minutos; no hace falta recargarla.
- Las encuestas que marques como **No aprobadas** en Kobo (estado de validación) no se cuentan.
- Solo se cuentan las encuestas donde F1 = "Sí" (vota en Bolívar).

## Privacidad

La página es pública: cualquiera con el enlace puede verla. Por eso el script **solo publica**
fecha, supervisor, parroquia, zona, sexo, edad y la ubicación GPS redondeada (unos 100 metros),
sin relacionar la ubicación con la persona. **Nunca publica respuestas de opinión ni de intención de voto.**
La clave de Kobo queda guardada como secreto en GitHub y no aparece en la página.

Recomendación: crea en Kobo un usuario aparte, compártele el proyecto solo con permiso de
"Ver envíos" y usa la clave API de ese usuario.

## Si algo falla

- **El tablero sigue mostrando "datos de ejemplo"**: revisa que los secretos `KOBO_TOKEN` y `KOBO_ASSET_UID` estén bien escritos y vuelve a ejecutar **Run workflow**.
- **La tarea sale en rojo en Actions**: abre la ejecución y revisa el paso "Descargar encuestas de Kobo"; un error 401 o 403 significa clave incorrecta o sin permiso sobre el proyecto; un 404, código de formulario incorrecto.
- **La página no abre**: confirma que en Settings → Pages la fuente sea "GitHub Actions".
