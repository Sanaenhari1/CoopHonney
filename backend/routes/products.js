import { Router } from 'express'
import { getProducts, save } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/products — public, active only
router.get('/', (req, res) => {
  res.json(getProducts().filter(p => p.active))
})

// GET /api/products/all — admin sees inactive too
router.get('/all', requireAdmin, (req, res) => {
  res.json(getProducts())
})

// GET /api/products/:id
router.get('/:id', (req, res) => {
  const p = getProducts().find(p => p.id === parseInt(req.params.id))
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' })
  res.json(p)
})

// POST /api/products — admin add
router.post('/', requireAdmin, (req, res) => {
  const { name_ar, name_fr, description, benefits, image, prices, badge } = req.body
  if (!name_ar || !name_fr || !description || !benefits || !image || !prices) {
    return res.status(400).json({ error: 'جميع الحقول مطلوبة' })
  }
  const products = getProducts()
  const id = Math.max(0, ...products.map(p => p.id)) + 1
  const newProduct = { id, name_ar, name_fr, description, benefits, image, prices, badge: badge || null, active: true, created_at: new Date().toISOString() }
  products.push(newProduct)
  save()
  res.status(201).json(newProduct)
})

// PATCH /api/products/:id — admin edit
router.patch('/:id', requireAdmin, (req, res) => {
  const products = getProducts()
  const idx = products.findIndex(p => p.id === parseInt(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'المنتج غير موجود' })
  const allowed = ['name_ar', 'name_fr', 'description', 'benefits', 'image', 'prices', 'badge', 'active']
  for (const key of allowed) {
    if (key in req.body) products[idx][key] = req.body[key]
  }
  save()
  res.json({ ok: true, product: products[idx] })
})

// DELETE /api/products/:id — soft delete
router.delete('/:id', requireAdmin, (req, res) => {
  const products = getProducts()
  const p = products.find(p => p.id === parseInt(req.params.id))
  if (!p) return res.status(404).json({ error: 'المنتج غير موجود' })
  p.active = false
  save()
  res.json({ ok: true })
})

export default router
