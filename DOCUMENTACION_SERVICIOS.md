# Documentación de los servicios web — API SGB

**Evidencia:** GA7-220501096-AA5-EV03 – Diseño y desarrollo de servicios web (proyecto)  
**Proyecto:** SGB – Sistema de Gestión para Barbería · **Aprendiz:** Andrés Cárdenas · **Ficha:** 3186668

Este documento describe cada servicio (endpoint) de la API: qué hace, quién puede usarlo, qué recibe y qué responde. 
Los ejemplos de respuesta se capturaron ejecutando la API real. La versión interactiva está en **http://localhost:3000/api-docs** (Swagger).

## Convenciones generales

- **URL base:** `http://localhost:3000`
- **Formato:** JSON (`Content-Type: application/json`), salvo el registro de pagos por transferencia (`multipart/form-data`).
- **Respuesta:** `{ "exito": true|false, "mensaje": "...", "datos": ... }`. Los errores de validación agregan `errores: [{ "campo", "mensaje" }]`.
- **Autenticación:** `POST /api/auth/login` devuelve un token JWT (válido 8 horas). Se envía en el encabezado `Authorization: Bearer <token>`.
- **Roles:** Administrador, Barbero y Cliente. Cada servicio indica quién puede usarlo.

| Código | Significado |
|---|---|
| 200 | OK | 
| 201 | Creado |
| 400 | Datos inválidos o JSON mal escrito |
| 401 | Sin sesión o token inválido/vencido |
| 403 | El rol no tiene permiso |
| 404 | No existe (o pertenece a otro usuario) |
| 409 | Conflicto con una regla de negocio |
| 429 | Demasiados intentos de inicio de sesión |
| 500 / 503 | Error interno / base de datos no disponible |

## Índice de servicios

| # | Método | Ruta | Descripción | Acceso |
|---|---|---|---|---|
| 1 | `GET` | `/api/salud` | Estado de la API y la base de datos | Público (sin token) |
| 2 | `POST` | `/api/auth/registro` | Registrar una cuenta de cliente | Público (sin token) |
| 3 | `POST` | `/api/auth/login` | Iniciar sesión (obtener token JWT) | Público (sin token) |
| 4 | `POST` | `/api/auth/recuperar` | Solicitar código de recuperación | Público (sin token) |
| 5 | `POST` | `/api/auth/restablecer` | Restablecer contraseña con el código | Público (sin token) |
| 6 | `GET` | `/api/auth/perfil` | Ver mi perfil | Cualquier usuario con sesión |
| 7 | `PUT` | `/api/auth/perfil` | Editar mi perfil | Cualquier usuario con sesión |
| 8 | `PUT` | `/api/auth/contrasena` | Cambiar mi contraseña | Cualquier usuario con sesión |
| 9 | `GET` | `/api/usuarios/barberos` | Listar barberos activos | Cualquier usuario con sesión |
| 10 | `GET` | `/api/usuarios` | Listar usuarios | Administrador |
| 11 | `GET` | `/api/usuarios/{id}` | Consultar un usuario | Administrador |
| 12 | `POST` | `/api/usuarios` | Crear usuario | Administrador |
| 13 | `PUT` | `/api/usuarios/{id}` | Actualizar usuario | Administrador |
| 14 | `PATCH` | `/api/usuarios/{id}/estado` | Activar o desactivar usuario | Administrador |
| 15 | `GET` | `/api/servicios` | Listar servicios | Público (sin token); ?todos=true solo Administrador |
| 16 | `GET` | `/api/servicios/{id}` | Consultar un servicio | Público (sin token) |
| 17 | `POST` | `/api/servicios` | Crear servicio | Administrador |
| 18 | `PUT` | `/api/servicios/{id}` | Actualizar servicio | Administrador |
| 19 | `PATCH` | `/api/servicios/{id}/estado` | Activar o desactivar servicio | Administrador |
| 20 | `GET` | `/api/horarios/barbero/{idBarbero}` | Ver horario semanal de un barbero | Cualquier usuario con sesión |
| 21 | `PUT` | `/api/horarios/barbero/{idBarbero}` | Definir horario semanal | Barbero (el suyo) o Administrador |
| 22 | `GET` | `/api/citas/disponibilidad` | Consultar horas disponibles | Cualquier usuario con sesión |
| 23 | `POST` | `/api/citas` | Agendar cita | Cliente (a su nombre) o Administrador (indica idCliente) |
| 24 | `GET` | `/api/citas` | Listar citas | Cualquier usuario con sesión (cada rol ve solo lo suyo) |
| 25 | `GET` | `/api/citas/{id}` | Consultar una cita | Dueño de la cita, su barbero o Administrador |
| 26 | `PUT` | `/api/citas/{id}` | Reprogramar cita | Cliente (sus citas) o Administrador |
| 27 | `PATCH` | `/api/citas/{id}/estado` | Confirmar, completar o cancelar cita | Barbero/Administrador (confirmar y completar); los tres roles pueden cancelar lo suyo |
| 28 | `POST` | `/api/pagos` | Registrar pago de una cita | Cliente (sus citas) o Administrador |
| 29 | `GET` | `/api/pagos` | Listar pagos | Cualquier usuario con sesión (cada rol ve solo lo suyo) |
| 30 | `GET` | `/api/pagos/{id}` | Consultar un pago | Dueño, su barbero o Administrador |
| 31 | `GET` | `/api/pagos/{id}/comprobante` | Descargar comprobante | Dueño, su barbero o Administrador |
| 32 | `PATCH` | `/api/pagos/{id}/estado` | Verificar o rechazar pago | Administrador |
| 33 | `GET` | `/api/productos` | Listar productos | Administrador |
| 34 | `POST` | `/api/productos` | Crear producto | Administrador |
| 35 | `GET` | `/api/productos/{id}` | Consultar producto | Administrador |
| 36 | `PUT` | `/api/productos/{id}` | Actualizar producto | Administrador |
| 37 | `PATCH` | `/api/productos/{id}/estado` | Activar o desactivar producto | Administrador |
| 38 | `POST` | `/api/productos/{id}/movimientos` | Registrar entrada o salida | Administrador |
| 39 | `GET` | `/api/productos/{id}/movimientos` | Historial de un producto | Administrador |
| 40 | `GET` | `/api/productos/movimientos` | Historial general de movimientos | Administrador |
| 41 | `GET` | `/api/notificaciones` | Mis notificaciones | Cualquier usuario con sesión |
| 42 | `PATCH` | `/api/notificaciones/{id}/leida` | Marcar una como leída | Cualquier usuario con sesión |
| 43 | `PATCH` | `/api/notificaciones/leidas` | Marcar todas como leídas | Cualquier usuario con sesión |
| 44 | `GET` | `/api/reportes/resumen-mensual` | Resumen mensual de ingresos y egresos | Administrador |
| 45 | `GET` | `/api/reportes/indicadores` | Indicadores del panel | Administrador |
| 46 | `GET` | `/api/reportes/ingresos-por-mes` | Ingresos por mes de un año | Administrador |

## Salud

### 1. Estado de la API y la base de datos

`GET /api/salud`

Comprueba que el servidor responde y que la conexión con la base de datos sgb funciona.

**Acceso:** Público (sin token)

**Respuesta exitosa: 200**

Ejemplo (`GET /api/salud`):

```json
{
  "exito": true,
  "mensaje": "API del SGB activa",
  "baseDatos": "conectada",
  "documentacion": "/api-docs"
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 503 | La base de datos no esta disponible en este momento |

## Autenticación

### 2. Registrar una cuenta de cliente

`POST /api/auth/registro`

Crea un usuario con rol Cliente. La contraseña se guarda cifrada con bcrypt.

**Acceso:** Público (sin token)

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre (máx. 100) |
| `apellido` | string | Sí | Apellido (máx. 100) |
| `correo` | string | Sí | Correo único |
| `contrasena` | string | Sí | Mínimo 8 caracteres, con letras y números |
| `telefono` | string | No | Teléfono (opcional) |

Ejemplo de petición:

```json
{
  "nombre": "Laura",
  "apellido": "Gomez",
  "correo": "laura742037@correo.com",
  "contrasena": "Clave1234",
  "telefono": "3001234567"
}
```

**Respuesta exitosa: 201**

Ejemplo (`POST /api/auth/registro`):

```json
{
  "exito": true,
  "mensaje": "Cuenta creada correctamente. Ya puede iniciar sesion",
  "datos": {
    "id": 21,
    "idRol": 3,
    "rol": "Cliente",
    "nombre": "Laura",
    "apellido": "Gomez",
    "nombreCompleto": "Laura Gomez",
    "correo": "laura742037@correo.com",
    "telefono": "3001234567",
    "activo": true,
    "creadoEn": "2026-10-29 00:29:02"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 409 | Ya existe una cuenta con ese correo |

### 3. Iniciar sesión (obtener token JWT)

`POST /api/auth/login`

Valida correo y contraseña. Si son correctos responde "Autenticación satisfactoria" y entrega un token JWT que se envía en las demás peticiones con el encabezado Authorization: Bearer <token>. Tras 5 intentos fallidos el correo se bloquea 15 minutos.

**Acceso:** Público (sin token)

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `correo` | string | Sí | Correo registrado |
| `contrasena` | string | Sí | Contraseña |

Ejemplo de petición:

```json
{
  "correo": "cliente@demo.com",
  "contrasena": "Demo1234"
}
```

**Respuesta exitosa: 200**

Ejemplo (`POST /api/auth/login`):

```json
{
  "exito": true,
  "mensaje": "Autenticación satisfactoria",
  "datos": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "tipoToken": "Bearer",
    "expiraEn": "8h",
    "usuario": {
      "id": 3,
      "idRol": 3,
      "rol": "Cliente",
      "nombre": "Juan",
      "apellido": "Cliente",
      "nombreCompleto": "Juan Cliente",
      "correo": "cliente@demo.com",
      "telefono": "3000000003",
      "activo": true,
      "creadoEn": "2026-10-29 00:15:10"
    }
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Debe enviar correo y contrasena |
| 401 | Correo o contrasena incorrectos |
| 403 | Su cuenta esta desactivada. Contacte al administrador |
| 429 | Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo |

### 4. Solicitar código de recuperación

`POST /api/auth/recuperar`

Genera un código de 6 dígitos válido por 15 minutos (se guarda cifrado en usuario.token_recuperacion). Responde igual exista o no el correo. En modo desarrollo el código viene en la respuesta porque el proyecto no tiene servidor de correo.

**Acceso:** Público (sin token)

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `correo` | string | Sí | Correo de la cuenta |

Ejemplo de petición:

```json
{
  "correo": "laura742037@correo.com"
}
```

**Respuesta exitosa: 200**

Ejemplo (`POST /api/auth/recuperar`):

```json
{
  "exito": true,
  "mensaje": "Si el correo esta registrado, se genero un codigo de recuperacion valido por 15 minutos",
  "datos": {
    "codigo": "308538",
    "nota": "Solo en modo desarrollo; en produccion se enviaria por correo"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |

### 5. Restablecer contraseña con el código

`POST /api/auth/restablecer`

Cambia la contraseña si el código es correcto y no ha vencido. El código queda inutilizado.

**Acceso:** Público (sin token)

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `correo` | string | Sí | Correo de la cuenta |
| `codigo` | string | Sí | Código de 6 dígitos |
| `contrasenaNueva` | string | Sí | Mínimo 8 caracteres, letras y números |

Ejemplo de petición:

```json
{
  "correo": "laura742037@correo.com",
  "codigo": "308538",
  "contrasenaNueva": "Nueva1234"
}
```

**Respuesta exitosa: 200**

Ejemplo (`POST /api/auth/restablecer`):

```json
{
  "exito": true,
  "mensaje": "Contrasena restablecida. Ya puede iniciar sesion"
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 400 | El codigo no es valido o ya expiro |

### 6. Ver mi perfil

`GET /api/auth/perfil`

Devuelve los datos del usuario dueño del token.

**Acceso:** Cualquier usuario con sesión

**Respuesta exitosa: 200**

Ejemplo (`GET /api/auth/perfil`):

```json
{
  "exito": true,
  "datos": {
    "id": 3,
    "idRol": 3,
    "rol": "Cliente",
    "nombre": "Juan",
    "apellido": "Cliente",
    "nombreCompleto": "Juan Cliente",
    "correo": "cliente@demo.com",
    "telefono": "3000000003",
    "activo": true,
    "creadoEn": "2026-10-29 00:15:10"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |

### 7. Editar mi perfil

`PUT /api/auth/perfil`

El usuario actualiza su nombre, apellido o teléfono. El correo y el rol no se cambian aquí.

**Acceso:** Cualquier usuario con sesión

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | No | Nombre |
| `apellido` | string | No | Apellido |
| `telefono` | string | No | Teléfono |

Ejemplo de petición:

```json
{
  "telefono": "3000000003"
}
```

**Respuesta exitosa: 200**

Ejemplo (`PUT /api/auth/perfil`):

```json
{
  "exito": true,
  "mensaje": "Perfil actualizado",
  "datos": {
    "id": 3,
    "idRol": 3,
    "rol": "Cliente",
    "nombre": "Juan",
    "apellido": "Cliente",
    "nombreCompleto": "Juan Cliente",
    "correo": "cliente@demo.com",
    "telefono": "3000000003",
    "activo": true,
    "creadoEn": "2026-10-29 00:15:10"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |

### 8. Cambiar mi contraseña

`PUT /api/auth/contrasena`

Cambia la contraseña verificando primero la contraseña actual.

**Acceso:** Cualquier usuario con sesión

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `contrasenaActual` | string | Sí | Contraseña actual |
| `contrasenaNueva` | string | Sí | Mínimo 8 caracteres, letras y números |

Ejemplo de petición:

```json
{
  "contrasenaActual": "Demo1234",
  "contrasenaNueva": "Demo1234"
}
```

**Respuesta exitosa: 200**

Ejemplo (`PUT /api/auth/contrasena`):

```json
{
  "exito": true,
  "mensaje": "Contrasena actualizada"
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 400 | La contrasena actual no es correcta |
| 401 | Debe iniciar sesion (falta el token de acceso) |

## Usuarios

### 9. Listar barberos activos

`GET /api/usuarios/barberos`

Lista los barberos activos (id y nombre) para elegir al agendar una cita.

**Acceso:** Cualquier usuario con sesión

**Respuesta exitosa: 200**

Ejemplo (`GET /api/usuarios/barberos`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 2,
      "nombre": "Carlos",
      "apellido": "Barbero",
      "nombreCompleto": "Carlos Barbero"
    },
    {
      "id": 5,
      "nombre": "Pedro",
      "apellido": "Navaja",
      "nombreCompleto": "Pedro Navaja"
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |

### 10. Listar usuarios

`GET /api/usuarios`

Lista los usuarios con filtros opcionales. Para cada usuario incluye el número de citas completadas y el total pagado (verificado).

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `rol` | consulta | string | No | Administrador, Barbero o Cliente |
| `activo` | consulta | boolean | No | true / false |
| `buscar` | consulta | string | No | Texto en nombre o correo |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/usuarios?rol=Barbero`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 2,
      "idRol": 2,
      "rol": "Barbero",
      "nombre": "Carlos",
      "apellido": "Barbero",
      "nombreCompleto": "Carlos Barbero",
      "correo": "barbero@demo.com",
      "telefono": "3000000002",
      "activo": true,
      "creadoEn": "2026-10-29 00:15:10",
      "totalCitas": 0,
      "totalGastado": 0
    },
    {
      "id": 5,
      "idRol": 2,
      "rol": "Barbero",
      "nombre": "Pedro",
      "apellido": "Navaja",
      "nombreCompleto": "Pedro Navaja",
      "correo": "pedro3013405@barberia.com",
      "telefono": "3019998877",
      "activo": true,
      "creadoEn": "2026-10-29 00:16:54",
      "totalCitas": 0,
      "totalGastado": 0
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |

### 11. Consultar un usuario

`GET /api/usuarios/{id}`

Devuelve un usuario por su id.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del usuario |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/usuarios/2`):

```json
{
  "exito": true,
  "datos": {
    "id": 2,
    "idRol": 2,
    "rol": "Barbero",
    "nombre": "Carlos",
    "apellido": "Barbero",
    "nombreCompleto": "Carlos Barbero",
    "correo": "barbero@demo.com",
    "telefono": "3000000002",
    "activo": true,
    "creadoEn": "2026-10-29 00:15:10"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Usuario no encontrado |

### 12. Crear usuario

`POST /api/usuarios`

El administrador crea cuentas de cualquier rol (por ejemplo, barberos).

**Acceso:** Administrador

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre |
| `apellido` | string | Sí | Apellido |
| `correo` | string | Sí | Correo único |
| `contrasena` | string | Sí | Mínimo 8 caracteres, letras y números |
| `rol` | string | Sí | Administrador, Barbero o Cliente |
| `telefono` | string | No | Teléfono |

Ejemplo de petición:

```json
{
  "nombre": "Pedro",
  "apellido": "Navaja",
  "correo": "pedro742037@barberia.com",
  "contrasena": "Barbero123",
  "rol": "Barbero",
  "telefono": "3011112233"
}
```

**Respuesta exitosa: 201**

Ejemplo (`POST /api/usuarios`):

```json
{
  "exito": true,
  "mensaje": "Usuario creado",
  "datos": {
    "id": 22,
    "idRol": 2,
    "rol": "Barbero",
    "nombre": "Pedro",
    "apellido": "Navaja",
    "nombreCompleto": "Pedro Navaja",
    "correo": "pedro742037@barberia.com",
    "telefono": "3011112233",
    "activo": true,
    "creadoEn": "2026-10-29 00:29:02"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 409 | Ya existe una cuenta con ese correo |

### 13. Actualizar usuario

`PUT /api/usuarios/{id}`

Actualiza nombre, apellido, teléfono o rol. Un administrador no puede quitarse a sí mismo el rol.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del usuario |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | No | Nombre |
| `apellido` | string | No | Apellido |
| `telefono` | string | No | Teléfono |
| `rol` | string | No | Nuevo rol |

Ejemplo de petición:

```json
{
  "telefono": "3019998877"
}
```

**Respuesta exitosa: 200**

Ejemplo (`PUT /api/usuarios/22`):

```json
{
  "exito": true,
  "mensaje": "Usuario actualizado",
  "datos": {
    "id": 22,
    "idRol": 2,
    "rol": "Barbero",
    "nombre": "Pedro",
    "apellido": "Navaja",
    "nombreCompleto": "Pedro Navaja",
    "correo": "pedro742037@barberia.com",
    "telefono": "3019998877",
    "activo": true,
    "creadoEn": "2026-10-29 00:29:02"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Usuario no encontrado |
| 409 | No puede quitarse a si mismo el rol de administrador |

### 14. Activar o desactivar usuario

`PATCH /api/usuarios/{id}/estado`

Los usuarios no se borran: se desactivan. Un usuario inactivo no puede iniciar sesión y su token deja de funcionar de inmediato.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del usuario |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `activo` | boolean | Sí | true = activar, false = desactivar |

Ejemplo de petición:

```json
{
  "activo": true
}
```

**Respuesta exitosa: 200**

Ejemplo (`PATCH /api/usuarios/22/estado`):

```json
{
  "exito": true,
  "mensaje": "Usuario activado",
  "datos": {
    "id": 22,
    "idRol": 2,
    "rol": "Barbero",
    "nombre": "Pedro",
    "apellido": "Navaja",
    "nombreCompleto": "Pedro Navaja",
    "correo": "pedro742037@barberia.com",
    "telefono": "3019998877",
    "activo": true,
    "creadoEn": "2026-10-29 00:29:02"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Usuario no encontrado |
| 409 | No puede desactivar su propia cuenta |

## Servicios

### 15. Listar servicios

`GET /api/servicios`

Catálogo de servicios activos. Con todos=true (solo administrador) incluye los desactivados.

**Acceso:** Público (sin token); ?todos=true solo Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `todos` | consulta | boolean | No | Incluir desactivados (solo administrador) |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/servicios`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 8,
      "nombre": "Afeitado Clasico 3013405",
      "descripcion": "Afeitado con navaja y toalla caliente",
      "precio": 24000,
      "duracionMin": 30,
      "categoria": "Barba",
      "activo": true
    },
    {
      "id": 9,
      "nombre": "Afeitado Clasico 3031989",
      "descripcion": "Afeitado con navaja y toalla caliente",
      "precio": 24000,
      "duracionMin": 30,
      "categoria": "Barba",
      "activo": true
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 403 | Solo el administrador puede ver los servicios desactivados |

### 16. Consultar un servicio

`GET /api/servicios/{id}`

Devuelve un servicio activo por su id.

**Acceso:** Público (sin token)

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del servicio |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/servicios/8`):

```json
{
  "exito": true,
  "datos": {
    "id": 8,
    "nombre": "Afeitado Clasico 3013405",
    "descripcion": "Afeitado con navaja y toalla caliente",
    "precio": 24000,
    "duracionMin": 30,
    "categoria": "Barba",
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 404 | Servicio no encontrado |

### 17. Crear servicio

`POST /api/servicios`

Agrega un servicio al catálogo.

**Acceso:** Administrador

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre (máx. 100) |
| `precio` | number | Sí | Precio en pesos (≥ 0) |
| `duracionMin` | integer | Sí | Duración en minutos (5 a 480) |
| `categoria` | string | No | Categoría (ej. Corte, Barba) |
| `descripcion` | string | No | Descripción |

Ejemplo de petición:

```json
{
  "nombre": "Afeitado Clásico 742037",
  "descripcion": "Afeitado con navaja",
  "precio": 22000,
  "duracionMin": 30,
  "categoria": "Barba"
}
```

**Respuesta exitosa: 201**

Ejemplo (`POST /api/servicios`):

```json
{
  "exito": true,
  "mensaje": "Servicio creado",
  "datos": {
    "id": 10,
    "nombre": "Afeitado Clásico 742037",
    "descripcion": "Afeitado con navaja",
    "precio": 22000,
    "duracionMin": 30,
    "categoria": "Barba",
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |

### 18. Actualizar servicio

`PUT /api/servicios/{id}`

Reemplaza los datos del servicio. El precio nuevo no cambia el precio de las citas ya agendadas (se guarda el precio aplicado en cita_servicio).

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del servicio |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre |
| `precio` | number | Sí | Precio |
| `duracionMin` | integer | Sí | Duración en minutos |
| `categoria` | string | No | Categoría |
| `descripcion` | string | No | Descripción |

Ejemplo de petición:

```json
{
  "nombre": "Afeitado Clásico 742037",
  "descripcion": "Afeitado con navaja y toalla caliente",
  "precio": 24000,
  "duracionMin": 30,
  "categoria": "Barba"
}
```

**Respuesta exitosa: 200**

Ejemplo (`PUT /api/servicios/10`):

```json
{
  "exito": true,
  "mensaje": "Servicio actualizado",
  "datos": {
    "id": 10,
    "nombre": "Afeitado Clásico 742037",
    "descripcion": "Afeitado con navaja y toalla caliente",
    "precio": 24000,
    "duracionMin": 30,
    "categoria": "Barba",
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Servicio no encontrado |

### 19. Activar o desactivar servicio

`PATCH /api/servicios/{id}/estado`

Los servicios no se borran (las citas antiguas los usan): se desactivan y dejan de ofrecerse.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del servicio |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `activo` | boolean | Sí | true / false |

Ejemplo de petición:

```json
{
  "activo": true
}
```

**Respuesta exitosa: 200**

Ejemplo (`PATCH /api/servicios/10/estado`):

```json
{
  "exito": true,
  "mensaje": "Servicio activado",
  "datos": {
    "id": 10,
    "nombre": "Afeitado Clásico 742037",
    "descripcion": "Afeitado con navaja y toalla caliente",
    "precio": 24000,
    "duracionMin": 30,
    "categoria": "Barba",
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Servicio no encontrado |

## Horarios

### 20. Ver horario semanal de un barbero

`GET /api/horarios/barbero/{idBarbero}`

Franjas de atención por día de la semana (1 = lunes ... 7 = domingo).

**Acceso:** Cualquier usuario con sesión

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `idBarbero` | ruta | integer | Sí | Id del barbero |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/horarios/barbero/2`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 26,
      "idBarbero": 2,
      "diaSemana": 1,
      "nombreDia": "Lunes",
      "horaInicio": "09:00",
      "horaFin": "18:00"
    },
    {
      "id": 27,
      "idBarbero": 2,
      "diaSemana": 2,
      "nombreDia": "Martes",
      "horaInicio": "09:00",
      "horaFin": "18:00"
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 404 | Barbero no encontrado |

### 21. Definir horario semanal

`PUT /api/horarios/barbero/{idBarbero}`

Reemplaza todo el horario del barbero. Valida que la hora de fin sea posterior al inicio y que las franjas de un mismo día no se crucen. Una lista vacía deja al barbero sin horario.

**Acceso:** Barbero (el suyo) o Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `idBarbero` | ruta | integer | Sí | Id del barbero |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `horarios` | array | Sí | Lista de franjas { diaSemana (1-7), horaInicio "HH:MM", horaFin "HH:MM" } |

Ejemplo de petición:

```json
{
  "horarios": [
    {
      "diaSemana": 1,
      "horaInicio": "09:00",
      "horaFin": "18:00"
    },
    {
      "diaSemana": 2,
      "horaInicio": "09:00",
      "horaFin": "18:00"
    },
    {
      "diaSemana": 3,
      "horaInicio": "09:00",
      "horaFin": "18:00"
    },
    {
      "diaSemana": 4,
      "horaInicio": "09:00",
      "horaFin": "18:00"
    },
    {
      "diaSemana": 5,
      "horaInicio": "09:00",
      "horaFin": "18:00"
    },
    {
      "diaSemana": 6,
      "horaInicio": "09:00",
      "horaFin": "18:00"
    }
  ]
}
```

**Respuesta exitosa: 200**

Ejemplo (`PUT /api/horarios/barbero/2`):

```json
{
  "exito": true,
  "mensaje": "Horario actualizado",
  "datos": [
    {
      "id": 32,
      "idBarbero": 2,
      "diaSemana": 1,
      "nombreDia": "Lunes",
      "horaInicio": "09:00",
      "horaFin": "18:00"
    },
    {
      "id": 33,
      "idBarbero": 2,
      "diaSemana": 2,
      "nombreDia": "Martes",
      "horaInicio": "09:00",
      "horaFin": "18:00"
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Horario invalido |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Solo puede modificar su propio horario |
| 404 | Barbero no encontrado |

## Citas

### 22. Consultar horas disponibles

`GET /api/citas/disponibilidad`

Horas libres de un barbero en una fecha para la duración del servicio, cada 30 minutos, según su horario y sus citas pendientes o confirmadas.

**Acceso:** Cualquier usuario con sesión

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `idBarbero` | consulta | integer | Sí | Id del barbero |
| `fecha` | consulta | string | Sí | AAAA-MM-DD |
| `idServicio` | consulta | integer | Sí | Id del servicio |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/citas/disponibilidad?idBarbero=2&fecha=2027-03-08&idServicio=8`):

```json
{
  "exito": true,
  "datos": {
    "idBarbero": 2,
    "fecha": "2027-03-08",
    "idServicio": 8,
    "duracionMin": 30,
    "atiende": true,
    "horas": [
      "09:00",
      "09:30"
    ]
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 404 | Barbero no encontrado |
| 409 | El servicio no esta disponible |

### 23. Agendar cita

`POST /api/citas`

Agenda una cita en estado "pendiente". Valida: fecha futura, que el barbero atienda ese día y la cita quepa en su horario, y que ni el barbero ni el cliente tengan otra cita que se cruce (con bloqueo para reservas simultáneas). Guarda el precio aplicado. Si no se confirma a tiempo (60 min por defecto) se cancela sola. Notifica al cliente, al barbero y al administrador.

**Acceso:** Cliente (a su nombre) o Administrador (indica idCliente)

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `idBarbero` | integer | Sí | Id del barbero |
| `idServicio` | integer | Sí | Id del servicio |
| `fechaHora` | string | Sí | AAAA-MM-DDTHH:MM |
| `notas` | string | No | Notas para el barbero (máx. 500) |
| `idCliente` | integer | No | Solo administrador: cliente de la cita |

Ejemplo de petición:

```json
{
  "idBarbero": 2,
  "idServicio": 8,
  "fechaHora": "2027-03-08T10:00",
  "notas": "Corte bajito a los lados"
}
```

**Respuesta exitosa: 201**

Ejemplo (`POST /api/citas`):

```json
{
  "exito": true,
  "mensaje": "Cita agendada. Queda pendiente de confirmacion",
  "datos": {
    "id": 11,
    "idCliente": 3,
    "nombreCliente": "Juan Cliente",
    "correoCliente": "cliente@demo.com",
    "telefonoCliente": "3000000003",
    "idBarbero": 2,
    "nombreBarbero": "Carlos Barbero",
    "idServicio": 8,
    "nombreServicio": "Afeitado Clasico 3013405",
    "duracionMin": 30,
    "precio": 24000,
    "fechaHora": "2027-03-08 10:00:00",
    "fecha": "2027-03-08",
    "hora": "10:00",
    "estado": "pendiente",
    "expiraEn": "2026-10-29 01:29:03",
    "notas": "Corte bajito a los lados",
    "estadoPago": null,
    "metodoPago": null,
    "creadoEn": "2026-10-29 00:29:03"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | La fecha y hora de la cita deben ser futuras |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Los barberos no agendan citas; las agenda el cliente o el administrador |
| 404 | Barbero no encontrado |
| 409 | El barbero ya tiene una cita en ese horario |
| 409 | El cliente ya tiene otra cita en ese horario |
| 409 | El barbero no atiende en ese horario. Consulte la disponibilidad |

### 24. Listar citas

`GET /api/citas`

El cliente ve sus citas, el barbero las suyas y el administrador todas. Incluye nombres, precio y estado del pago.

**Acceso:** Cualquier usuario con sesión (cada rol ve solo lo suyo)

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `estado` | consulta | string | No | pendiente, confirmada, cancelada o completada |
| `desde` | consulta | string | No | AAAA-MM-DD |
| `hasta` | consulta | string | No | AAAA-MM-DD |
| `idBarbero` | consulta | integer | No | Solo administrador |
| `idCliente` | consulta | integer | No | Solo administrador |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/citas?estado=pendiente`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 11,
      "idCliente": 3,
      "nombreCliente": "Juan Cliente",
      "correoCliente": "cliente@demo.com",
      "telefonoCliente": "3000000003",
      "idBarbero": 2,
      "nombreBarbero": "Carlos Barbero",
      "idServicio": 8,
      "nombreServicio": "Afeitado Clasico 3013405",
      "duracionMin": 30,
      "precio": 24000,
      "fechaHora": "2027-03-08 10:00:00",
      "fecha": "2027-03-08",
      "hora": "10:00",
      "estado": "pendiente",
      "expiraEn": "2026-10-29 01:29:03",
      "notas": "Corte bajito a los lados",
      "estadoPago": null,
      "metodoPago": null,
      "creadoEn": "2026-10-29 00:29:03"
    },
    {
      "id": 6,
      "idCliente": 3,
      "nombreCliente": "Juan Cliente",
      "correoCliente": "cliente@demo.com",
      "telefonoCliente": "3000000003",
      "idBarbero": 2,
      "nombreBarbero": "Carlos Barbero",
      "idServicio": 8,
      "nombreServicio": "Afeitado Clasico 3013405",
      "duracionMin": 30,
      "precio": 24000,
      "fechaHora": "2027-01-19 16:00:00",
      "fecha": "2027-01-19",
      "hora": "16:00",
      "estado": "pendiente",
      "expiraEn": "2026-10-29 01:17:13",
      "notas": null,
      "estadoPago": "verificado",
      "metodoPago": "transferencia",
      "creadoEn": "2026-10-29 00:17:13"
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |

### 25. Consultar una cita

`GET /api/citas/{id}`

Devuelve una cita. Si pertenece a otra persona responde 404 (no revela que existe).

**Acceso:** Dueño de la cita, su barbero o Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id de la cita |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/citas/11`):

```json
{
  "exito": true,
  "datos": {
    "id": 11,
    "idCliente": 3,
    "nombreCliente": "Juan Cliente",
    "correoCliente": "cliente@demo.com",
    "telefonoCliente": "3000000003",
    "idBarbero": 2,
    "nombreBarbero": "Carlos Barbero",
    "idServicio": 8,
    "nombreServicio": "Afeitado Clasico 3013405",
    "duracionMin": 30,
    "precio": 24000,
    "fechaHora": "2027-03-08 10:00:00",
    "fecha": "2027-03-08",
    "hora": "10:00",
    "estado": "pendiente",
    "expiraEn": "2026-10-29 01:29:03",
    "notas": "Corte bajito a los lados",
    "estadoPago": null,
    "metodoPago": null,
    "creadoEn": "2026-10-29 00:29:03"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 404 | Cita no encontrada |

### 26. Reprogramar cita

`PUT /api/citas/{id}`

Cambia la fecha y hora (y opcionalmente el barbero o el servicio) de una cita pendiente o confirmada, con las mismas validaciones de agenda. No cambia el estado.

**Acceso:** Cliente (sus citas) o Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id de la cita |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `fechaHora` | string | Sí | AAAA-MM-DDTHH:MM |
| `idBarbero` | integer | No | Otro barbero |
| `idServicio` | integer | No | Otro servicio |

Ejemplo de petición:

```json
{
  "fechaHora": "2027-03-08T11:00"
}
```

**Respuesta exitosa: 200**

Ejemplo (`PUT /api/citas/11`):

```json
{
  "exito": true,
  "mensaje": "Cita reprogramada",
  "datos": {
    "id": 11,
    "idCliente": 3,
    "nombreCliente": "Juan Cliente",
    "correoCliente": "cliente@demo.com",
    "telefonoCliente": "3000000003",
    "idBarbero": 2,
    "nombreBarbero": "Carlos Barbero",
    "idServicio": 8,
    "nombreServicio": "Afeitado Clasico 3013405",
    "duracionMin": 30,
    "precio": 24000,
    "fechaHora": "2027-03-08 11:00:00",
    "fecha": "2027-03-08",
    "hora": "11:00",
    "estado": "pendiente",
    "expiraEn": "2026-10-29 01:29:03",
    "notas": "Corte bajito a los lados",
    "estadoPago": null,
    "metodoPago": null,
    "creadoEn": "2026-10-29 00:29:03"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Los barberos no reprograman citas |
| 404 | Cita no encontrada |
| 409 | No se puede reprogramar una cita completada |

### 27. Confirmar, completar o cancelar cita

`PATCH /api/citas/{id}/estado`

Transiciones permitidas: pendiente → confirmada o cancelada; confirmada → completada o cancelada. Las citas canceladas o completadas no cambian. Notifica a los involucrados (la cancelación también al administrador, RF05).

**Acceso:** Barbero/Administrador (confirmar y completar); los tres roles pueden cancelar lo suyo

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id de la cita |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `estado` | string | Sí | confirmada, cancelada o completada |

Ejemplo de petición:

```json
{
  "estado": "confirmada"
}
```

**Respuesta exitosa: 200**

Ejemplo (`PATCH /api/citas/11/estado`):

```json
{
  "exito": true,
  "mensaje": "Cita confirmada",
  "datos": {
    "id": 11,
    "idCliente": 3,
    "nombreCliente": "Juan Cliente",
    "correoCliente": "cliente@demo.com",
    "telefonoCliente": "3000000003",
    "idBarbero": 2,
    "nombreBarbero": "Carlos Barbero",
    "idServicio": 8,
    "nombreServicio": "Afeitado Clasico 3013405",
    "duracionMin": 30,
    "precio": 24000,
    "fechaHora": "2027-03-08 11:00:00",
    "fecha": "2027-03-08",
    "hora": "11:00",
    "estado": "confirmada",
    "expiraEn": null,
    "notas": "Corte bajito a los lados",
    "estadoPago": null,
    "metodoPago": null,
    "creadoEn": "2026-10-29 00:29:03"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | El cliente solo puede cancelar sus citas |
| 404 | Cita no encontrada |
| 409 | No se puede pasar una cita de "completada" a "cancelada" |

## Pagos

### 28. Registrar pago de una cita

`POST /api/pagos`

Efectivo: se registra pendiente y se paga en la barbería. Transferencia: se envía como multipart/form-data con la imagen del comprobante (JPG, PNG o WEBP, máx. 5 MB). El monto es el precio aplicado de la cita. Notifica al administrador.

**Acceso:** Cliente (sus citas) o Administrador

**Cuerpo (JSON, o multipart/form-data si lleva comprobante)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `idCita` | integer | Sí | Id de la cita |
| `metodoPago` | string | Sí | efectivo o transferencia |
| `comprobante` | file | No | Imagen del comprobante (solo transferencia) |

Ejemplo de petición:

```json
{
  "idCita": 11,
  "metodoPago": "efectivo"
}
```

**Respuesta exitosa: 201**

Ejemplo (`POST /api/pagos`):

```json
{
  "exito": true,
  "mensaje": "Pago en efectivo registrado. Se paga presencialmente en la barberia",
  "datos": {
    "id": 7,
    "idCita": 11,
    "idCliente": 3,
    "nombreCliente": "Juan Cliente",
    "idBarbero": 2,
    "nombreBarbero": "Carlos Barbero",
    "nombreServicio": "Afeitado Clasico 3013405",
    "fechaCita": "2027-03-08 11:00:00",
    "estadoCita": "confirmada",
    "monto": 24000,
    "metodoPago": "efectivo",
    "tieneComprobante": false,
    "urlComprobante": null,
    "estadoPago": "pendiente",
    "registradoEn": "2026-10-29 00:29:03"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Para transferencia debe adjuntar la imagen del comprobante (campo "comprobante") |
| 400 | El comprobante debe ser una imagen JPG, PNG o WEBP |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Los barberos no registran pagos |
| 404 | Cita no encontrada |
| 409 | Esta cita ya tiene un pago registrado |
| 409 | No se puede pagar una cita cancelada |

### 29. Listar pagos

`GET /api/pagos`

El cliente ve sus pagos, el barbero los de sus citas y el administrador todos.

**Acceso:** Cualquier usuario con sesión (cada rol ve solo lo suyo)

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `estado` | consulta | string | No | pendiente, verificado o rechazado |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/pagos`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 7,
      "idCita": 11,
      "idCliente": 3,
      "nombreCliente": "Juan Cliente",
      "idBarbero": 2,
      "nombreBarbero": "Carlos Barbero",
      "nombreServicio": "Afeitado Clasico 3013405",
      "fechaCita": "2027-03-08 11:00:00",
      "estadoCita": "confirmada",
      "monto": 24000,
      "metodoPago": "efectivo",
      "tieneComprobante": false,
      "urlComprobante": null,
      "estadoPago": "pendiente",
      "registradoEn": "2026-10-29 00:29:03"
    },
    {
      "id": 4,
      "idCita": 6,
      "idCliente": 3,
      "nombreCliente": "Juan Cliente",
      "idBarbero": 2,
      "nombreBarbero": "Carlos Barbero",
      "nombreServicio": "Afeitado Clasico 3013405",
      "fechaCita": "2027-01-19 16:00:00",
      "estadoCita": "pendiente",
      "monto": 24000,
      "metodoPago": "transferencia",
      "tieneComprobante": true,
      "urlComprobante": "/api/pagos/4/comprobante",
      "estadoPago": "verificado",
      "registradoEn": "2026-10-29 00:17:13"
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |

### 30. Consultar un pago

`GET /api/pagos/{id}`

Devuelve un pago.

**Acceso:** Dueño, su barbero o Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del pago |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/pagos/7`):

```json
{
  "exito": true,
  "datos": {
    "id": 7,
    "idCita": 11,
    "idCliente": 3,
    "nombreCliente": "Juan Cliente",
    "idBarbero": 2,
    "nombreBarbero": "Carlos Barbero",
    "nombreServicio": "Afeitado Clasico 3013405",
    "fechaCita": "2027-03-08 11:00:00",
    "estadoCita": "confirmada",
    "monto": 24000,
    "metodoPago": "efectivo",
    "tieneComprobante": false,
    "urlComprobante": null,
    "estadoPago": "pendiente",
    "registradoEn": "2026-10-29 00:29:03"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 404 | Pago no encontrado |

### 31. Descargar comprobante

`GET /api/pagos/{id}/comprobante`

Devuelve la imagen del comprobante. Los comprobantes no son archivos públicos: solo se descargan con un token autorizado.

**Acceso:** Dueño, su barbero o Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del pago |

**Respuesta exitosa: 200**

Devuelve la imagen (JPG, PNG o WEBP).

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 404 | Comprobante no encontrado |

### 32. Verificar o rechazar pago

`PATCH /api/pagos/{id}/estado`

El administrador revisa el pago (o el comprobante) y lo marca verificado o rechazado. Solo cuentan como ingresos los pagos verificados. Notifica al cliente.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del pago |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `estadoPago` | string | Sí | verificado o rechazado |

Ejemplo de petición:

```json
{
  "estadoPago": "verificado"
}
```

**Respuesta exitosa: 200**

Ejemplo (`PATCH /api/pagos/7/estado`):

```json
{
  "exito": true,
  "mensaje": "Pago verificado",
  "datos": {
    "id": 7,
    "idCita": 11,
    "idCliente": 3,
    "nombreCliente": "Juan Cliente",
    "idBarbero": 2,
    "nombreBarbero": "Carlos Barbero",
    "nombreServicio": "Afeitado Clasico 3013405",
    "fechaCita": "2027-03-08 11:00:00",
    "estadoCita": "confirmada",
    "monto": 24000,
    "metodoPago": "efectivo",
    "tieneComprobante": false,
    "urlComprobante": null,
    "estadoPago": "verificado",
    "registradoEn": "2026-10-29 00:29:03"
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Pago no encontrado |
| 409 | El pago ya fue verificado |

## Inventario

### 33. Listar productos

`GET /api/productos`

Productos del inventario con su stock y alerta de stock bajo.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `activos` | consulta | boolean | No | Solo activos |
| `stockBajo` | consulta | boolean | No | Solo bajo el mínimo |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/productos?stockBajo=true`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 8,
      "nombre": "Cera Mate 3013405",
      "descripcion": null,
      "categoria": "Styling",
      "unidad": "unidad",
      "precio": 32000,
      "stock": 3,
      "stockMinimo": 4,
      "stockBajo": true,
      "activo": true
    },
    {
      "id": 9,
      "nombre": "Cera Mate 3031989",
      "descripcion": null,
      "categoria": "Styling",
      "unidad": "unidad",
      "precio": 32000,
      "stock": 3,
      "stockMinimo": 4,
      "stockBajo": true,
      "activo": true
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |

### 34. Crear producto

`POST /api/productos`

Agrega un producto. Si trae stock inicial, queda registrado como primera entrada en el historial.

**Acceso:** Administrador

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre |
| `precio` | number | Sí | Precio de venta |
| `categoria` | string | No | Categoría |
| `unidad` | string | No | unidad, frasco, caja... |
| `stock` | integer | No | Stock inicial |
| `stockMinimo` | integer | No | Mínimo antes de alertar (por defecto 5) |
| `costoUnitario` | number | No | Costo de compra del stock inicial |
| `descripcion` | string | No | Descripción |

Ejemplo de petición:

```json
{
  "nombre": "Cera Mate 742037",
  "categoria": "Styling",
  "unidad": "unidad",
  "precio": 32000,
  "stock": 10,
  "stockMinimo": 4,
  "costoUnitario": 18000
}
```

**Respuesta exitosa: 201**

Ejemplo (`POST /api/productos`):

```json
{
  "exito": true,
  "mensaje": "Producto creado",
  "datos": {
    "id": 10,
    "nombre": "Cera Mate 742037",
    "descripcion": null,
    "categoria": "Styling",
    "unidad": "unidad",
    "precio": 32000,
    "stock": 10,
    "stockMinimo": 4,
    "stockBajo": false,
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |

### 35. Consultar producto

`GET /api/productos/{id}`

Devuelve un producto.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del producto |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/productos/10`):

```json
{
  "exito": true,
  "datos": {
    "id": 10,
    "nombre": "Cera Mate 742037",
    "descripcion": null,
    "categoria": "Styling",
    "unidad": "unidad",
    "precio": 32000,
    "stock": 10,
    "stockMinimo": 4,
    "stockBajo": false,
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Producto no encontrado |

### 36. Actualizar producto

`PUT /api/productos/{id}`

Actualiza los datos descriptivos. El stock NO se cambia aquí: solo con movimientos, para conservar el historial.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del producto |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `nombre` | string | Sí | Nombre |
| `precio` | number | Sí | Precio |
| `categoria` | string | No | Categoría |
| `unidad` | string | No | Unidad |
| `stockMinimo` | integer | No | Stock mínimo |
| `descripcion` | string | No | Descripción |

Ejemplo de petición:

```json
{
  "nombre": "Cera Mate 742037",
  "categoria": "Styling",
  "unidad": "unidad",
  "precio": 33000,
  "stockMinimo": 4
}
```

**Respuesta exitosa: 200**

Ejemplo (`PUT /api/productos/10`):

```json
{
  "exito": true,
  "mensaje": "Producto actualizado",
  "datos": {
    "id": 10,
    "nombre": "Cera Mate 742037",
    "descripcion": null,
    "categoria": "Styling",
    "unidad": "unidad",
    "precio": 33000,
    "stock": 10,
    "stockMinimo": 4,
    "stockBajo": false,
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Producto no encontrado |

### 37. Activar o desactivar producto

`PATCH /api/productos/{id}/estado`

Desactiva un producto sin borrar su historial.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del producto |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `activo` | boolean | Sí | true / false |

Ejemplo de petición:

```json
{
  "activo": true
}
```

**Respuesta exitosa: 200**

Ejemplo (`PATCH /api/productos/10/estado`):

```json
{
  "exito": true,
  "mensaje": "Producto activado",
  "datos": {
    "id": 10,
    "nombre": "Cera Mate 742037",
    "descripcion": null,
    "categoria": "Styling",
    "unidad": "unidad",
    "precio": 33000,
    "stock": 10,
    "stockMinimo": 4,
    "stockBajo": false,
    "activo": true
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Producto no encontrado |

### 38. Registrar entrada o salida

`POST /api/productos/{id}/movimientos`

Registra un movimiento (RF11) y actualiza el stock en la misma transacción, con bloqueo de la fila. Una salida nunca deja el stock negativo. Si una salida deja el producto bajo el mínimo, avisa al administrador. Las entradas con costo cuentan como egresos en el resumen mensual.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del producto |

**Cuerpo (JSON)**

| Campo | Tipo | Obligatorio | Descripción |
|---|---|---|---|
| `tipo` | string | Sí | entrada o salida |
| `cantidad` | integer | Sí | Cantidad (≥ 1) |
| `costoUnitario` | number | No | Costo de compra (entradas) |
| `motivo` | string | No | Motivo |

Ejemplo de petición:

```json
{
  "tipo": "entrada",
  "cantidad": 5,
  "costoUnitario": 18000,
  "motivo": "Compra a proveedor"
}
```

**Respuesta exitosa: 201**

Ejemplo (`POST /api/productos/10/movimientos`):

```json
{
  "exito": true,
  "mensaje": "Entrada registrada. Stock: 10 -> 15",
  "datos": {
    "idMovimiento": 10,
    "stockAnterior": 10,
    "stockNuevo": 15,
    "producto": {
      "id": 10,
      "nombre": "Cera Mate 742037",
      "descripcion": null,
      "categoria": "Styling",
      "unidad": "unidad",
      "precio": 33000,
      "stock": 15,
      "stockMinimo": 4,
      "stockBajo": false,
      "activo": true
    }
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Producto no encontrado |
| 409 | Stock insuficiente: hay 2 y se intenta sacar 50 |
| 409 | El producto esta desactivado |

### 39. Historial de un producto

`GET /api/productos/{id}/movimientos`

Entradas y salidas de un producto, de la más reciente a la más antigua.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id del producto |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/productos/10/movimientos`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 10,
      "idProducto": 10,
      "nombreProducto": "Cera Mate 742037",
      "tipo": "entrada",
      "cantidad": 5,
      "costoUnitario": 18000,
      "motivo": "Compra a proveedor",
      "idUsuario": 1,
      "nombreUsuario": "Admin Demo",
      "creadoEn": "2026-10-29 00:29:03"
    },
    {
      "id": 9,
      "idProducto": 10,
      "nombreProducto": "Cera Mate 742037",
      "tipo": "entrada",
      "cantidad": 10,
      "costoUnitario": 18000,
      "motivo": "Stock inicial",
      "idUsuario": 1,
      "nombreUsuario": "Admin Demo",
      "creadoEn": "2026-10-29 00:29:03"
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
| 404 | Producto no encontrado |

### 40. Historial general de movimientos

`GET /api/productos/movimientos`

Todos los movimientos con filtros opcionales.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `idProducto` | consulta | integer | No | Id del producto |
| `desde` | consulta | string | No | AAAA-MM-DD |
| `hasta` | consulta | string | No | AAAA-MM-DD |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/productos/movimientos?idProducto=10`):

```json
{
  "exito": true,
  "datos": [
    {
      "id": 10,
      "idProducto": 10,
      "nombreProducto": "Cera Mate 742037",
      "tipo": "entrada",
      "cantidad": 5,
      "costoUnitario": 18000,
      "motivo": "Compra a proveedor",
      "idUsuario": 1,
      "nombreUsuario": "Admin Demo",
      "creadoEn": "2026-10-29 00:29:03"
    },
    {
      "id": 9,
      "idProducto": 10,
      "nombreProducto": "Cera Mate 742037",
      "tipo": "entrada",
      "cantidad": 10,
      "costoUnitario": 18000,
      "motivo": "Stock inicial",
      "idUsuario": 1,
      "nombreUsuario": "Admin Demo",
      "creadoEn": "2026-10-29 00:29:03"
    }
  ]
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |

## Notificaciones

### 41. Mis notificaciones

`GET /api/notificaciones`

Notificaciones del usuario (las crea el sistema al agendar, confirmar, cancelar, pagar o con stock bajo) y el número de no leídas.

**Acceso:** Cualquier usuario con sesión

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `noLeidas` | consulta | boolean | No | Solo las no leídas |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/notificaciones?noLeidas=true`):

```json
{
  "exito": true,
  "datos": {
    "noLeidas": 9,
    "notificaciones": [
      {
        "id": 68,
        "tipo": "pago",
        "mensaje": "Pago registrado (efectivo) por $24.000 para la cita #11 de Juan Cliente. Pendiente de verificacion.",
        "leida": false,
        "creadoEn": "2026-10-29 00:29:03"
      },
      {
        "id": 64,
        "tipo": "cita",
        "mensaje": "Nueva cita agendada por Juan Cliente: Afeitado Clasico 3013405 con Carlos Barbero el 2027-03-08 a las 10:00.",
        "leida": false,
        "creadoEn": "2026-10-29 00:29:03"
      }
    ]
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |

### 42. Marcar una como leída

`PATCH /api/notificaciones/{id}/leida`

Marca una notificación propia como leída. La de otro usuario responde 404.

**Acceso:** Cualquier usuario con sesión

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `id` | ruta | integer | Sí | Id de la notificación |

**Respuesta exitosa: 200**

Ejemplo (`PATCH /api/notificaciones/68/leida`):

```json
{
  "exito": true,
  "mensaje": "Notificacion marcada como leida"
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 404 | Notificacion no encontrada |

### 43. Marcar todas como leídas

`PATCH /api/notificaciones/leidas`

Marca como leídas todas las notificaciones del usuario.

**Acceso:** Cualquier usuario con sesión

**Respuesta exitosa: 200**

Ejemplo (`PATCH /api/notificaciones/leidas`):

```json
{
  "exito": true,
  "mensaje": "8 notificaciones marcadas como leidas"
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |

## Reportes

### 44. Resumen mensual de ingresos y egresos

`GET /api/reportes/resumen-mensual`

RF02. Ingresos = pagos verificados del mes; egresos = compras de inventario (entradas con costo); balance; pagos por método; citas por estado y servicios más solicitados. Por defecto, el mes actual.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `anio` | consulta | integer | No | Año (ej. 2026) |
| `mes` | consulta | integer | No | Mes 1-12 |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/reportes/resumen-mensual`):

```json
{
  "exito": true,
  "datos": {
    "periodo": "2026-10",
    "ingresos": 160000,
    "egresos": 810000,
    "balance": -650000,
    "pagosVerificados": 7,
    "comprasInventario": 6,
    "pagosPendientes": 0,
    "ingresosPorMetodo": {
      "efectivo": 116000,
      "transferencia": 44000
    },
    "citasPorEstado": {
      "pendiente": 0,
      "confirmada": 0,
      "cancelada": 0,
      "completada": 0
    },
    "totalCitas": 0,
    "serviciosMasSolicitados": []
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |

### 45. Indicadores del panel

`GET /api/reportes/indicadores`

Citas de hoy, citas pendientes, clientes activos, productos con stock bajo y pagos por verificar.

**Acceso:** Administrador

**Respuesta exitosa: 200**

Ejemplo (`GET /api/reportes/indicadores`):

```json
{
  "exito": true,
  "datos": {
    "citasHoy": 0,
    "citasPendientes": 3,
    "clientesActivos": 17,
    "productosStockBajo": 4,
    "pagosPendientes": 0
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |

### 46. Ingresos por mes de un año

`GET /api/reportes/ingresos-por-mes`

Ingresos verificados de cada mes (enero a diciembre) para la gráfica del panel.

**Acceso:** Administrador

**Parámetros**

| Nombre | Ubicación | Tipo | Obligatorio | Descripción |
|---|---|---|---|---|
| `anio` | consulta | integer | No | Año (por defecto el actual) |

**Respuesta exitosa: 200**

Ejemplo (`GET /api/reportes/ingresos-por-mes`):

```json
{
  "exito": true,
  "datos": {
    "anio": 2026,
    "ingresos": [
      0,
      0
    ],
    "total": 160000
  }
}
```

**Errores posibles**

| Código | Mensaje |
|---|---|
| 400 | Datos invalidos (el detalle de cada campo viene en "errores") |
| 401 | Debe iniciar sesion (falta el token de acceso) |
| 403 | Su rol no tiene permiso para esta accion |
