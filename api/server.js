import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

// Récupérer __dirname en ES module
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Importer tes routes
import authRoutes from '../backend/routes/auth.js';
import productsRoutes from '../backend/routes/products.js';
import ordersRoutes from '../backend/routes/orders.js';
import adminRoutes from '../backend/routes/admin.js';
import contactRoutes from '../backend/routes/contact.js';

const app = express();

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: '2mb' }));

// Servir les fichiers statiques du frontend (dossier dist)
app.use(express.static(path.join(__dirname, '../dist')));

// Routes API
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'تعاونية تاوردة API', version: '2.0' }));
app.use('/api/auth', authRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/orders', ordersRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);

// SPA Fallback : toutes les requêtes non-API renvoient index.html
app.use((req, res, next) => {
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'خطأ في الخادم' });
});

// Exporter l'app pour Vercel (serverless)
export default app;