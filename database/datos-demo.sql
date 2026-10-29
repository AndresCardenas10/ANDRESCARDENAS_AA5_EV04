-- =====================================================================
-- Script: datos-demo.sql
-- Evidencia: GA7-220501096-AA5-EV03 - Diseno y desarrollo de servicios web (proyecto)
-- Proposito: cargar datos de DEMOSTRACION en la base "sgb" para probar la API
--            y el frontend. No borra nada: solo inserta lo que no exista.
-- Cuentas demo (contrasena de las tres: Demo1234, guardada como hash bcrypt):
--   admin@demo.com    -> Administrador
--   barbero@demo.com  -> Barbero
--   cliente@demo.com  -> Cliente
-- Uso: despues de sgb-estructura.sql o migracion-ev03.sql (phpMyAdmin -> Importar).
-- =====================================================================

SET NAMES utf8mb4; -- tildes y caracteres especiales correctos

USE sgb;

INSERT IGNORE INTO rol (id_rol, nombre_rol) VALUES (1, 'Administrador'), (2, 'Barbero'), (3, 'Cliente');

-- Usuarios demo (INSERT IGNORE: si el correo ya existe, no se duplica)
INSERT IGNORE INTO usuario (id_rol, nombre, apellido, correo, contrasena_hash, telefono, activo) VALUES
  (1, 'Admin',  'Demo',    'admin@demo.com',   '$2a$10$1cDyF9tfu.23CoD7nGZOl.ltDQ8vsPoIDaDoK3wpGN.S02RnADLjS', '3000000001', 1),
  (2, 'Carlos', 'Barbero', 'barbero@demo.com', '$2a$10$1cDyF9tfu.23CoD7nGZOl.ltDQ8vsPoIDaDoK3wpGN.S02RnADLjS', '3000000002', 1),
  (3, 'Juan',   'Cliente', 'cliente@demo.com', '$2a$10$1cDyF9tfu.23CoD7nGZOl.ltDQ8vsPoIDaDoK3wpGN.S02RnADLjS', '3000000003', 1);

-- Servicios demo (solo si no existe uno con el mismo nombre)
INSERT INTO servicio (nombre, descripcion, precio, duracion_min, activo, categoria)
SELECT * FROM (
  SELECT 'Corte Clásico' AS nombre, 'Corte tradicional con tijera y máquina' AS descripcion, 25000 AS precio, 45 AS duracion_min, 1 AS activo, 'Corte' AS categoria
  UNION ALL SELECT 'Barba Completa', 'Perfilado y arreglo de barba con toalla caliente', 20000, 35, 1, 'Barba'
  UNION ALL SELECT 'Combo Premium', 'Corte más barba', 40000, 75, 1, 'Combo'
  UNION ALL SELECT 'Tratamiento Capilar', 'Hidratación y masaje capilar', 30000, 30, 1, 'Tratamiento'
  UNION ALL SELECT 'Corte Infantil', 'Corte para niños', 18000, 30, 1, 'Corte'
  UNION ALL SELECT 'Tinte & Color', 'Coloración completa', 55000, 90, 1, 'Color'
) AS nuevos
WHERE NOT EXISTS (SELECT 1 FROM servicio s WHERE s.nombre = nuevos.nombre);

-- Productos demo del inventario
INSERT INTO producto (nombre, descripcion, precio, stock, activo, categoria, unidad, stock_minimo)
SELECT * FROM (
  SELECT 'Pomada Fijadora' AS nombre, NULL AS descripcion, 35000 AS precio, 5 AS stock, 1 AS activo, 'Styling' AS categoria, 'unidad' AS unidad, 8 AS stock_minimo
  UNION ALL SELECT 'Shampoo Premium', NULL, 28000, 12, 1, 'Cuidado', 'frasco', 6
  UNION ALL SELECT 'Cuchillas x10', NULL, 15000, 3, 1, 'Herramientas', 'caja', 10
  UNION ALL SELECT 'Toallas Desechables x100', NULL, 22000, 8, 1, 'Insumos', 'paquete', 5
  UNION ALL SELECT 'Aceite de Barba', NULL, 45000, 2, 1, 'Cuidado', 'frasco', 5
) AS nuevos
WHERE NOT EXISTS (SELECT 1 FROM producto p WHERE p.nombre = nuevos.nombre);

-- Horario del barbero demo: lunes a sabado de 09:00 a 18:00 (solo si no tiene horario)
INSERT INTO horario_barbero (id_barbero, dia_semana, hora_inicio, hora_fin)
SELECT u.id_usuario, d.dia, '09:00:00', '18:00:00'
FROM usuario u
JOIN (SELECT 1 AS dia UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 UNION ALL SELECT 5 UNION ALL SELECT 6) AS d
WHERE u.correo = 'barbero@demo.com'
  AND NOT EXISTS (SELECT 1 FROM horario_barbero h WHERE h.id_barbero = u.id_usuario);
