# OpenFeriaMap — Mapa Interactivo de Ferias

Aplicación web progresiva (PWA) para crear, explorar y gestionar mapas interactivos de ferias y eventos populares. Diseñada para funcionar en navegadores web y compatible con dispositivos Android mediante WebView.

---

## Objetivo

Permitir que cualquier persona pueda mapear los puntos de interés de una feria (casetas, cacharritos, baños, puestos, estacionamientos) y compartirlos con la comunidad. Incluye sistema de roles (root, moderador, verificador, usuario), reseñas con puntuación, y verificación de mapas por parte de staff.

---

## Base de datos

**Nombre:** `db_openferiamap`  
**Motor:** MySQL / MariaDB  
**Codificación:** utf8mb4  
**Conexión:** `api/conexion.php` (usuario `root`, sin contraseña por defecto)

### Tablas

| Tabla | Descripción |
|---|---|
| `usuarios` | Usuarios registrados (nombre, email, password, rol, fecha_registro) |
| `ferias` | Mapas de ferias (nombre, localidad, año, estado, verificación, zona, centro, color) |
| `puntos_interes` | Puntos/zonas dentro de una feria (nombre, categoría, coordenadas, sinopsis, imagen) |
| `resenas` | Reseñas de puntos (puntuación 1-5, comentario, autor, fecha) |

---

## Estructura de archivos

### Raíz

| Archivo | Descripción |
|---|---|
| `index.html` | Página principal. Contiene la UI completa: mapa Leaflet, panel de ferias, modales (login, registro, crear mapa, admin, settings, editar puntos), barra de filtros, botones flotantes y toolbar de edición. |
| `README.md` | Este archivo. |

### `api/` — Backend PHP

| Archivo | Descripción |
|---|---|
| `conexion.php` | Conexión PDO a MySQL. Crea la base de datos y tablas automáticamente si no existen. Ejecuta migraciones y crea el usuario semilla `admin@openferiamap.com` / `openferiamap` con rol `root`. |
| `login.php` | Verifica credenciales y devuelve datos del usuario (incluyendo rol). |
| `register.php` | Registra un nuevo usuario. El primer usuario registrado obtiene rol `root`. |
| `crear_feria.php` | Crea un nuevo mapa de feria. Los usuarios no-staff se crean con verificación `pendiente`. |
| `obtener_ferias.php` | Lista ferias según rol del usuario (filtra aprobadas para público, muestra todas para staff). |
| `actualizar_feria.php` | Edita nombre, localidad, zona, color, estado de una feria. Verifica propiedad o rol staff. |
| `eliminar_feria.php` | Elimina una feria. Requiere contraseña del usuario para confirmar. |
| `crear_punto.php` | Añade un punto de interés (marcador o recuadro/zona) a una feria. |
| `obtener_puntos.php` | Lista los puntos de una feria. Devuelve promedio de reseñas y número de reseñas vía subquery. |
| `actualizar_punto.php` | Edita nombre, categoría, sinopsis e imagen de un punto. Verifica propiedad o rol staff. |
| `eliminar_punto.php` | Elimina un punto. Verifica propiedad o rol staff. |
| `guardar_resena.php` | Guarda una reseña con puntuación (1-5), comentario y autor. |
| `obtener_resenas.php` | Obtiene reseñas de un punto con nombre del autor (JOIN con usuarios). |
| `eliminar_resena.php` | Elimina una reseña. Permite al autor o a staff borrarla. |
| `actualizar_perfil.php` | Actualiza email y/o contraseña del usuario autenticado. |
| `subir_imagen.php` | Sube imágenes (jpg, png, gif, webp) al directorio `uploads/`. Devuelve la URL pública. |

### `api/admin/` — Endpoints de administración

| Archivo | Descripción |
|---|---|
| `obtener_usuarios.php` | Lista todos los usuarios (solo root/moderador). |
| `cambiar_rol.php` | Cambia el rol de un usuario (solo root/moderador). |
| `obtener_pendientes.php` | Lista ferias pendientes de verificación. |
| `verificar_feria.php` | Aprueba o rechaza una feria con motivo opcional (verificador, root, moderador). |

### `js/` — Frontend JavaScript

| Archivo | Descripción |
|---|---|
| `state.js` | Objeto global `App` con `App.state`, `App.consts` (colores, badges) y `App.utils`. |
| `api.js` | Funciones `App.api.*` para llamar a todos los endpoints REST con `fetch()`. |
| `auth.js` | `App.auth.*`: login, register, logout, sesión en localStorage, verificación de roles. |
| `map.js` | `App.map.*`: inicialización de Leaflet, renderizado de puntos/recuadros/perímetros, dibujo interactivo (vértices, marcadores), filtrado por categoría. |
| `ui.js` | `App.ui.*`: toda la interfaz de usuario — modales, panel de ferias, lista expandible de puntos inline, reseñas, admin panel, settings, edición de puntos. |
| `main.js` | Inicialización y binding de eventos. Punto de entrada. |

### `css/`

| Archivo | Descripción |
|---|---|
| `style.css` | Estilos completos de la aplicación: diseño responsive, modales, panel de ferias, filtros, acordeón, reseñas, admin, editor, animaciones. |

### `uploads/`

Directorio para las imágenes subidas por los usuarios (se crea automáticamente).

---

## Roles de usuario

| Rol | Permisos |
|---|---|
| `root` | Acceso total. Puede cambiar roles, aprobar/rechazar ferias, editar/borrar cualquier contenido. |
| `moderador` | Puede cambiar roles de usuarios (excepto root/moderador), gestionar verificación de ferias, editar/borrar puntos y reseñas. |
| `verificador` | Solo puede aprobar/rechazar ferias pendientes. No puede editar contenido ni cambiar roles. |
| `usuario` | Crea sus propios mapas (quedan pendientes de verificación), añade puntos, escribe reseñas. |

---

## Compatibilidad Android

La aplicación está diseñada para funcionar en WebView de Android. Para empaquetarla como app:

1. Copiar todo el contenido a `assets/` de un proyecto Android
2. Configurar WebView con `setJavaScriptEnabled(true)` y `setDomStorageEnabled(true)`
3. Asegurar que la URL base apunta al servidor local o remoto con los archivos PHP
4. El backend requiere MySQL/MariaDB accesible desde el dispositivo o un servidor remoto

También puede funcionar como PWA añadiendo un manifest y service worker.

---

## Requisitos del servidor

- PHP 7.4+
- MySQL 5.7+ / MariaDB 10.3+
- Extensiones: PDO, MySQL, fileinfo (para subida de imágenes), JSON
- Permisos de escritura en `uploads/`

---

## Desarrollo local (XAMPP)

1. Clonar el repositorio en `C:\xampp\htdocs\openferiamap`
2. Iniciar Apache y MySQL desde el panel de XAMPP
3. Abrir `http://localhost/openferiamap` en el navegador
4. La base de datos y tablas se crean automáticamente al cargar la página
5. Usuario admin por defecto: `admin@openferiamap.com` / `openferiamap`
