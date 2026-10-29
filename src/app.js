/**
 * Modulo: app.js
 * Proposito: crear y configurar la aplicacion Express (sin encenderla):
 *   - /api       -> servicios web (JSON)
 *   - /api-docs  -> documentacion interactiva Swagger (OpenAPI)
 *   - /          -> frontend del SGB (carpeta public/)
 */
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import express from 'express';
import swaggerUi from 'swagger-ui-express';
import YAML from 'yaml';
import rutasApi from './routes/index.js';
import { rutaNoEncontrada, manejarErrores } from './middlewares/errores.js';

const app = express();
const rutaDe = (relativa) => fileURLToPath(new URL(relativa, import.meta.url));

app.disable('x-powered-by'); // no revelar la tecnologia del servidor

// Encabezados basicos de seguridad para todas las respuestas
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  next();
});

// Cuerpos JSON de hasta 100 KB
app.use(express.json({ limit: '100kb' }));

// Documentacion Swagger generada desde docs/openapi.yaml
const especificacion = YAML.parse(fs.readFileSync(rutaDe('../docs/openapi.yaml'), 'utf8'));
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(especificacion, { customSiteTitle: 'API SGB - Documentacion' }));
app.get('/api-docs.json', (req, res) => res.json(especificacion));

// Servicios web
app.use('/api', rutasApi);
app.use('/api', rutaNoEncontrada);

// Frontend (HTML, CSS y JS) servido desde el mismo servidor: http://localhost:3000
app.use(express.static(rutaDe('../public')));

// Manejo de errores (siempre al final)
app.use(manejarErrores);

export default app;
