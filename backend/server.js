import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import express from 'express'
import cors from 'cors'
import './db.js'

import authRoutes from './routes/auth.js'
import productsRoutes from './routes/products.js'
import ordersRoutes from './routes/orders.js'
import adminRoutes from './routes/admin.js'
import contactRoutes from './routes/contact.js'

const app = express()
const PORT = process.env.API_PORT || 3001

app.use(cors({ origin: true, credentials: true }))
app.use(express.json({ limit: '2mb' }))
// Servir les fichiers statiques du frontend (dossier dist généré par npm run build)
app.use(express.static(path.join(__dirname, '../dist')));
// Request logger (dev)
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString().slice(11, 19)} ${req.method} ${req.path}`)
  next()
})

// Health
app.get('/api/health', (_, res) => res.json({ status: 'ok', service: 'تعاونية تاوردة API', version: '2.0' }))

// Routes
app.use('/api/auth', authRoutes)
app.use('/api/products', productsRoutes)
app.use('/api/orders', ordersRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/contact', contactRoutes)

// --- SPA Fallback : toutes les requêtes non-API renvoient index.html ---
app.use((req, res, next) => {
  // Ne pas intercepter les requêtes API ni les fichiers statiques
  if (req.path.startsWith('/api') || req.path.includes('.')) {
    return next();
  }
  res.sendFile(path.join(__dirname, '../dist', 'index.html'));
});

// Error handler
app.use((err, _req, res, _next) => {
  console.error('Server error:', err)
  res.status(500).json({ error: 'خطأ في الخادم' })
})

app.listen(PORT, () => {
  console.log(`🍯 تعاونية تاوردة API v2.0 — http://localhost:${PORT}`)
  console.log(`   Admin: admin@tawarda.ma / tawarda2024`)
})
