-- =====================================================================
-- Script: migracion-ev03.sql
-- Evidencia: GA7-220501096-AA5-EV03 - Diseno y desarrollo de servicios web (proyecto)
-- Proposito: preparar una base "sgb" EXISTENTE para la API Node.js.
--            Solo AGREGA lo que falta; no borra ni modifica datos.
-- Motor: MySQL / MariaDB (XAMPP, puerto 3307)
-- Uso: en phpMyAdmin seleccionar la base "sgb" -> pestana "Importar".
--      Se puede ejecutar varias veces sin problema (IF NOT EXISTS).
-- =====================================================================

SET NAMES utf8mb4; -- tildes y caracteres especiales correctos

USE sgb;

-- 1. Inventario: datos que usa el panel del administrador
ALTER TABLE producto
  ADD COLUMN IF NOT EXISTS categoria    VARCHAR(50) NULL     COMMENT 'Ej: Styling, Cuidado, Insumos',
  ADD COLUMN IF NOT EXISTS unidad       VARCHAR(20) NOT NULL DEFAULT 'unidad' COMMENT 'unidad, frasco, caja...',
  ADD COLUMN IF NOT EXISTS stock_minimo INT         NOT NULL DEFAULT 5 COMMENT 'Bajo este valor se alerta stock bajo';

-- 2. Servicios: categoria que muestra el catalogo
ALTER TABLE servicio
  ADD COLUMN IF NOT EXISTS categoria VARCHAR(50) NULL COMMENT 'Ej: Corte, Barba, Combo';

-- 3. Historial de entradas y salidas de inventario (RF11)
--    producto.stock guarda la cantidad actual; esta tabla guarda cada movimiento.
CREATE TABLE IF NOT EXISTS movimiento_inventario (
  id_movimiento  INT           NOT NULL AUTO_INCREMENT,
  id_producto    INT           NOT NULL,
  id_usuario     INT           NOT NULL COMMENT 'Quien registro el movimiento',
  tipo           ENUM('entrada','salida') NOT NULL,
  cantidad       INT           NOT NULL,
  costo_unitario DECIMAL(10,2) NULL     COMMENT 'Costo de compra (entradas); se usa en el resumen mensual',
  motivo         VARCHAR(255)  NULL,
  creado_en      TIMESTAMP     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id_movimiento),
  KEY fk_movimiento_producto (id_producto),
  KEY fk_movimiento_usuario (id_usuario),
  CONSTRAINT fk_movimiento_producto FOREIGN KEY (id_producto) REFERENCES producto (id_producto) ON UPDATE CASCADE,
  CONSTRAINT fk_movimiento_usuario  FOREIGN KEY (id_usuario)  REFERENCES usuario (id_usuario)  ON UPDATE CASCADE,
  CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Entradas y salidas de inventario (RF11)';
