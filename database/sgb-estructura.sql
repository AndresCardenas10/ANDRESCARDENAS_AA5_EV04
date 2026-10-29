-- =====================================================================
-- Script: sgb-estructura.sql
-- Evidencia: GA7-220501096-AA5-EV03 - Diseno y desarrollo de servicios web (proyecto)
-- Proposito: crear DESDE CERO la base "sgb" del Sistema Gestion Barberia
--            (solo estructura, sin datos). Incluye los cambios de migracion-ev03.sql.
-- Motor: MySQL / MariaDB (XAMPP)
-- Uso: solo si la base "sgb" NO existe. Si ya existe, usar migracion-ev03.sql.
--      Luego, opcional: datos-demo.sql para cuentas y datos de prueba.
-- =====================================================================

SET NAMES utf8mb4; -- tildes y caracteres especiales correctos

CREATE DATABASE IF NOT EXISTS sgb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE sgb;

-- Roles del sistema (Administrador, Barbero, Cliente)
CREATE TABLE IF NOT EXISTS rol (
  id_rol     INT         NOT NULL,
  nombre_rol VARCHAR(50) NOT NULL,
  PRIMARY KEY (id_rol),
  UNIQUE KEY uq_rol_nombre (nombre_rol)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Roles de usuario del sistema';

-- Usuarios (todos los roles). La contrasena se guarda como hash bcrypt.
CREATE TABLE IF NOT EXISTS usuario (
  id_usuario         INT          NOT NULL AUTO_INCREMENT,
  id_rol             INT          NOT NULL,
  nombre             VARCHAR(100) NOT NULL,
  apellido           VARCHAR(100) NOT NULL,
  correo             VARCHAR(150) NOT NULL,
  contrasena_hash    VARCHAR(255) NOT NULL,
  telefono           VARCHAR(20)  NULL,
  token_recuperacion VARCHAR(255) NULL,
  expira_token       DATETIME     NULL,
  activo             TINYINT(1)   NOT NULL DEFAULT 1,
  creado_en          TIMESTAMP    NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_usuario),
  UNIQUE KEY uq_usuario_correo (correo),
  KEY fk_usuario_rol (id_rol),
  CONSTRAINT fk_usuario_rol FOREIGN KEY (id_rol) REFERENCES rol (id_rol) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Catalogo de servicios de la barberia
CREATE TABLE IF NOT EXISTS servicio (
  id_servicio  INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL,
  descripcion  TEXT         NULL,
  precio       DECIMAL(8,2) NOT NULL,
  duracion_min INT          NOT NULL,
  activo       TINYINT(1)   NOT NULL DEFAULT 1,
  categoria    VARCHAR(50)  NULL,
  PRIMARY KEY (id_servicio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Citas entre clientes y barberos
CREATE TABLE IF NOT EXISTS cita (
  id_cita     INT       NOT NULL AUTO_INCREMENT,
  id_cliente  INT       NOT NULL,
  id_barbero  INT       NOT NULL,
  id_servicio INT       NOT NULL,
  fecha_hora  DATETIME  NOT NULL,
  estado      ENUM('pendiente','confirmada','cancelada','completada') NOT NULL DEFAULT 'pendiente',
  expira_en   DATETIME  NULL COMMENT 'Limite para confirmar; NULL = no expira',
  notas       TEXT      NULL,
  creado_en   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_cita),
  KEY fk_cita_cliente (id_cliente),
  KEY fk_cita_barbero (id_barbero),
  KEY fk_cita_servicio (id_servicio),
  CONSTRAINT fk_cita_barbero  FOREIGN KEY (id_barbero)  REFERENCES usuario (id_usuario)   ON UPDATE CASCADE,
  CONSTRAINT fk_cita_cliente  FOREIGN KEY (id_cliente)  REFERENCES usuario (id_usuario)   ON UPDATE CASCADE,
  CONSTRAINT fk_cita_servicio FOREIGN KEY (id_servicio) REFERENCES servicio (id_servicio) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Citas programadas entre clientes y barberos';

-- Servicios de cada cita con el precio aplicado (precio historico)
CREATE TABLE IF NOT EXISTS cita_servicio (
  id_cita         INT          NOT NULL,
  id_servicio     INT          NOT NULL,
  precio_aplicado DECIMAL(8,2) NOT NULL COMMENT 'Precio del servicio al momento de la cita',
  PRIMARY KEY (id_cita, id_servicio),
  KEY fk_cs_servicio (id_servicio),
  CONSTRAINT fk_cs_cita     FOREIGN KEY (id_cita)     REFERENCES cita (id_cita)         ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_cs_servicio FOREIGN KEY (id_servicio) REFERENCES servicio (id_servicio) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Disponibilidad semanal de cada barbero
CREATE TABLE IF NOT EXISTS horario_barbero (
  id_horario  INT        NOT NULL AUTO_INCREMENT,
  id_barbero  INT        NOT NULL,
  dia_semana  TINYINT(4) NOT NULL COMMENT '1=Lun, 2=Mar, ..., 7=Dom',
  hora_inicio TIME       NOT NULL,
  hora_fin    TIME       NOT NULL,
  PRIMARY KEY (id_horario),
  KEY fk_horario_barbero (id_barbero),
  CONSTRAINT fk_horario_barbero FOREIGN KEY (id_barbero) REFERENCES usuario (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Notificaciones para los usuarios
CREATE TABLE IF NOT EXISTS notificacion (
  id_notificacion INT         NOT NULL AUTO_INCREMENT,
  id_usuario      INT         NOT NULL,
  tipo            VARCHAR(50) NOT NULL COMMENT 'cita | pago | recordatorio | sistema',
  mensaje         TEXT        NOT NULL,
  leida           TINYINT(1)  NOT NULL DEFAULT 0,
  creado_en       TIMESTAMP   NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_notificacion),
  KEY fk_notificacion_usuario (id_usuario),
  CONSTRAINT fk_notificacion_usuario FOREIGN KEY (id_usuario) REFERENCES usuario (id_usuario) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Pagos de las citas (efectivo o transferencia con comprobante)
CREATE TABLE IF NOT EXISTS pago (
  id_pago         INT           NOT NULL AUTO_INCREMENT,
  id_cita         INT           NOT NULL,
  monto           DECIMAL(8,2)  NOT NULL,
  metodo_pago     ENUM('efectivo','transferencia') NOT NULL,
  url_comprobante VARCHAR(500)  NULL COMMENT 'URL del comprobante; solo aplica para transferencia',
  estado_pago     ENUM('pendiente','verificado','rechazado') NOT NULL DEFAULT 'pendiente',
  registrado_en   TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_pago),
  KEY fk_pago_cita (id_cita),
  CONSTRAINT fk_pago_cita FOREIGN KEY (id_cita) REFERENCES cita (id_cita) ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Productos del inventario
CREATE TABLE IF NOT EXISTS producto (
  id_producto  INT          NOT NULL AUTO_INCREMENT,
  nombre       VARCHAR(100) NOT NULL,
  descripcion  TEXT         NULL,
  precio       DECIMAL(8,2) NOT NULL,
  stock        INT          NOT NULL DEFAULT 0,
  activo       TINYINT(1)   NOT NULL DEFAULT 1,
  categoria    VARCHAR(50)  NULL,
  unidad       VARCHAR(20)  NOT NULL DEFAULT 'unidad',
  stock_minimo INT          NOT NULL DEFAULT 5,
  PRIMARY KEY (id_producto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Resenas de las citas (tabla existente; la API EV03 no la utiliza)
CREATE TABLE IF NOT EXISTS resena (
  id_resena    INT        NOT NULL AUTO_INCREMENT,
  id_cita      INT        NOT NULL,
  calificacion TINYINT(4) NOT NULL COMMENT '1 a 5 estrellas',
  comentario   TEXT       NULL,
  creado_en    TIMESTAMP  NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_resena),
  UNIQUE KEY uq_resena_cita (id_cita),
  CONSTRAINT fk_resena_cita FOREIGN KEY (id_cita) REFERENCES cita (id_cita) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Historial de entradas y salidas de inventario (RF11)
CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id_movimiento  INT           NOT NULL AUTO_INCREMENT,
  id_producto    INT           NOT NULL,
  id_usuario     INT           NOT NULL,
  tipo           ENUM('entrada','salida') NOT NULL,
  cantidad       INT           NOT NULL,
  costo_unitario DECIMAL(10,2) NULL,
  motivo         VARCHAR(255)  NULL,
  creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_movimiento),
  KEY fk_movimiento_producto (id_producto),
  KEY fk_movimiento_usuario (id_usuario),
  CONSTRAINT fk_movimiento_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto) ON UPDATE CASCADE,
  CONSTRAINT fk_movimiento_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuario (id_usuario)  ON UPDATE CASCADE,
  CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='Entradas y salidas de inventario (RF11)';

-- Roles base (necesarios para registrar usuarios)
INSERT IGNORE INTO rol (id_rol, nombre_rol) VALUES (1, 'Administrador'), (2, 'Barbero'), (3, 'Cliente');
