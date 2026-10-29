# SGB – API REST del Sistema de Gestión para Barbería

**Evidencia:** GA7-220501096-AA5-EV04 – API del proyecto (testing con Postman)
**Base:** servicios web construidos en la evidencia GA7-220501096-AA5-EV03
**Proyecto formativo:** SGB – Sistema de Gestión para Barbería
**Aprendiz:** Andrés Cárdenas · **Ficha:** 3186668
**Programa:** Tecnología en Análisis y Desarrollo de Software (SENA)

## Descripción

API REST que implementa los servicios del SGB sobre la base de datos real `sgb`
(MySQL/MariaDB de XAMPP), y el frontend del proyecto conectado a esa API.

En esta evidencia se realiza el **testing de la API con Postman**: una colección completa
de 81 peticiones con 203 verificaciones automáticas, una colección de demostración con
18 pruebas representativas (P01 a P18) y un entorno de Postman con la URL base. La lista
de todos los endpoints está en [`ENDPOINTS.txt`](ENDPOINTS.txt).

| Módulo | Servicios | Requerimientos |
|---|---|---|
| Autenticación | Registro de clientes, inicio de sesión con JWT, perfil, cambio y recuperación de contraseña | RNF04, RNF08 |
| Usuarios | Gestión de cuentas y roles por el administrador | RNF10 / RNF11 |
| Servicios | Catálogo público y administración | RF03 |
| Horarios | Disponibilidad semanal de cada barbero | RF09 |
| Citas | Disponibilidad, agendar, reprogramar, confirmar, completar, cancelar y cancelación automática | RF03, RF06, RF07, RF10 |
| Pagos | Efectivo o transferencia con comprobante; verificación por el administrador | RF04 |
| Inventario | Productos y movimientos de entrada y salida con historial | RF11 |
| Notificaciones | Avisos automáticos al agendar, confirmar, cancelar, pagar y con stock bajo | RF01, RF05, RF08 |
| Reportes | Resumen mensual de ingresos y egresos e indicadores | RF02 |

**46 servicios en total.** La ficha completa de cada uno está en
[`DOCUMENTACION_SERVICIOS.md`](DOCUMENTACION_SERVICIOS.md), y la versión interactiva
(Swagger / OpenAPI 3) en **http://localhost:3000/api-docs**.

## Tecnologías

| Tecnología | Uso |
|---|---|
| Node.js (≥ 20) + Express 5 | Servidor y rutas de la API |
| MySQL / MariaDB (XAMPP) + mysql2 | Base de datos `sgb` con consultas parametrizadas y transacciones |
| jsonwebtoken (JWT) | Sesiones sin estado con roles |
| bcryptjs | Cifrado de contraseñas |
| multer | Subida de comprobantes de pago |
| swagger-ui-express + yaml | Documentación interactiva de la API |
| dotenv | Configuración desde `.env` |
| HTML, CSS y JavaScript + Chart.js | Frontend del SGB (carpeta `public/`) |
| Postman / newman | Pruebas de la API |
| Git / GitHub | Control de versiones |

## Requisitos

- Node.js 20 o superior
- XAMPP con **MySQL** iniciado (el proyecto usa el puerto **3307**) y **Apache** para phpMyAdmin
- La base de datos `sgb` del proyecto

## Instalación y ejecución

1. **Base de datos** (phpMyAdmin → pestaña **Importar**):
   - Si la base `sgb` **ya existe**: importar `database/migracion-ev03.sql`. Solo agrega lo
     que falta (tabla `movimiento_inventario` y columnas de categoría, unidad y stock mínimo);
     no borra datos y se puede ejecutar varias veces.
   - Si **no existe**: importar `database/sgb-estructura.sql`.
   - Opcional: importar `database/datos-demo.sql` para tener cuentas y datos de prueba.
2. **Configuración:** copiar `.env.example` como `.env` y revisar `DB_PORT` (3307) y
   `JWT_SECRET` (un texto largo y secreto).
3. **Dependencias:** `npm install`
4. **Iniciar:** `npm start`

   ```
   Conexion a la base de datos "sgb" (puerto 3307): OK
   Servidor escuchando en http://localhost:3000
   Documentacion de la API (Swagger): http://localhost:3000/api-docs
   ```

| Dirección | Qué es |
|---|---|
| http://localhost:3000 | Frontend del SGB (inicio de sesión y paneles por rol) |
| http://localhost:3000/api-docs | Documentación interactiva de la API (Swagger) |
| http://localhost:3000/api/salud | Estado de la API y de la base de datos |

### Cuentas de demostración (`datos-demo.sql`)

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@demo.com | Demo1234 |
| Barbero | barbero@demo.com | Demo1234 |
| Cliente | cliente@demo.com | Demo1234 |

## Estructura del proyecto

```
ANDRESCARDENAS_AA5_EV04/
├── database/
│   ├── sgb-estructura.sql        Base sgb desde cero (solo estructura)
│   ├── migracion-ev03.sql        Cambios para una base sgb existente
│   └── datos-demo.sql            Cuentas y datos de prueba
├── docs/
│   └── openapi.yaml              Especificación OpenAPI 3 (Swagger)
├── pruebas/
│   ├── SGB_API_EV04.postman_collection.json                 Colección completa (81 peticiones)
│   ├── SGB_API_EV04_Demostracion.postman_collection.json    18 pruebas para capturas y video
│   ├── SGB_Local.postman_environment.json                   Entorno de Postman (baseUrl)
│   └── comprobante-prueba.png    Imagen para probar pagos por transferencia
├── public/                       Frontend del SGB conectado a la API
│   ├── js/api.js                 Cliente de la API (sesión, token, errores)
│   └── ...                       Páginas, estilos y paneles por rol
├── src/
│   ├── config/                   Configuración (.env) y conexión a MySQL
│   ├── middlewares/              Autenticación JWT/roles, errores, subida de archivos
│   ├── models/                   Consultas SQL por tabla
│   ├── controllers/              Reglas de negocio de cada módulo
│   ├── routes/                   Rutas /api/... de cada módulo
│   ├── jobs/                     Cancelación automática de citas (RF06)
│   ├── utils/                    Validación, fechas, errores, notificaciones
│   └── app.js                    Configuración de Express
├── uploads/comprobantes/         Comprobantes subidos (no se versionan)
├── server.js                     Punto de entrada
├── DOCUMENTACION_SERVICIOS.md    Documentación de cada servicio
├── ENDPOINTS.txt                 Lista de endpoints de la API (entregable)
├── ENLACE_REPOSITORIO.txt        Enlace al repositorio (entregable)
└── .env.example                  Plantilla de configuración
```

Arquitectura en capas: **rutas → controladores → modelos → base de datos**, con
middlewares para autenticación, roles, validación y errores.

## Seguridad aplicada

- Contraseñas con **bcrypt** (formato `$2a$`, compatible con la API Java del proyecto).
  Las contraseñas antiguas sin cifrar se cifran solas en el primer inicio de sesión.
- Sesiones con **JWT** (8 horas) y **permisos por rol** en cada servicio. Un usuario
  desactivado pierde el acceso de inmediato.
- Límite de **5 intentos** de inicio de sesión por correo cada 15 minutos.
- **Consultas parametrizadas** (sin inyección SQL) y **transacciones con bloqueo**: dos
  reservas simultáneas no pueden ocupar la misma hora, y el stock nunca queda negativo.
- Validación de todos los datos de entrada, con mensajes por campo.
- Los comprobantes de pago se descargan solo con un token autorizado (no son públicos).
- El frontend **escapa los datos** antes de mostrarlos (evita inyección de código, XSS).
- `.env` y los comprobantes subidos no se suben al repositorio.

## Pruebas con Postman

| Archivo (carpeta `pruebas/`) | Contenido |
|---|---|
| `SGB_API_EV04.postman_collection.json` | **81 peticiones con 203 verificaciones** en 11 carpetas: casos exitosos, validaciones, permisos por rol, conflictos de agenda, pagos, inventario, notificaciones, reportes y errores generales |
| `SGB_API_EV04_Demostracion.postman_collection.json` | **18 pruebas (P01–P18)**, dos por módulo, cada una con su descripción; se usan para las capturas y el video |
| `SGB_Local.postman_environment.json` | Entorno **SGB - Local** con `baseUrl = http://localhost:3000` y las cuentas demo |

### Cómo ejecutarlas

1. Iniciar la API (`npm start`) con la base `sgb` y `datos-demo.sql` cargados.
2. En Postman: **Import** → seleccionar los tres archivos de `pruebas/`.
3. Arriba a la derecha elegir el entorno **SGB - Local**.
4. Para que Postman encuentre la imagen del pago por transferencia: **Settings → General →
   Working directory** = carpeta del proyecto.
5. Clic derecho sobre la colección → **Run collection** → **Run**. Las peticiones deben
   ejecutarse en orden, porque unas guardan datos (tokens, ids) que usan las siguientes.

También se pueden ejecutar desde la terminal:

```
npx newman run pruebas/SGB_API_EV04.postman_collection.json -e pruebas/SGB_Local.postman_environment.json --working-dir .
```

**Resultado:** colección completa 81/81 peticiones y 203/203 verificaciones aprobadas;
colección de demostración 18/18 pruebas aprobadas. Cada ejecución usa una fecha futura
aleatoria y correos únicos, así que se puede repetir sin borrar datos.

## Estándares de codificación

Según el documento de estándares del proyecto (GA7-220501096-AA1-EV02):

- Variables y funciones en `camelCase`, con verbo al inicio (`registrarMovimiento`).
- Clases en `PascalCase` (`Validador`, `ErrorApi`) y constantes en `MAYUSCULAS_CON_GUION_BAJO`.
- Archivos en `kebab-case` (`cita-controller.js`).
- `const` / `let` (nunca `var`), comparación estricta `===` y plantillas de texto.
- Comentario de encabezado en cada módulo y comentarios en la lógica de negocio.

## Control de versiones

- **Git** con repositorio remoto en **GitHub**.
- Flujo **GitHub Flow**: rama `feature/pruebas-postman` integrada a `main` con un pull request.
- Mensajes con **Conventional Commits** (`feat:`, `test:`, `docs:`, `chore:`).

## Autor

Andrés Cárdenas – Aprendiz SENA, ficha 3186668.
