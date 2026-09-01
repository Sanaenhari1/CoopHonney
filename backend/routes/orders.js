import { Router } from 'express'
import { getOrders, nextOrderId, save } from '../db.js'
import { requireAuth, requireAdmin, verifyToken } from '../middleware/auth.js'

const router = Router()

function deliveryFee(city) {
  const lower = (city || '').toLowerCase().trim()
  if (lower.includes('شفشاون') || lower.includes('chefchaouen')) return 0
  return 30
}

router.post('/', (req, res) => {
  const { items, name, phone, city, address, payment, notes } = req.body
  if (!items?.length || !name || !phone || !city || !address) {
    return res.status(400).json({ error: 'يرجى ملء جميع بيانات الطلب' })
  }
  let userId = null
  const auth = req.headers.authorization
  if (auth?.startsWith('Bearer ')) {
    try { userId = verifyToken(auth.slice(7))?.id ?? null } catch {}
  }
  const subtotal = items.reduce((s, i) => s + i.qty * i.price, 0)
  const delivery = deliveryFee(city)
  const total = subtotal + delivery
  const id = nextOrderId()
  const order = { id, user_id: userId, items, total, delivery, name, phone, city, address, payment: payment || 'cash', notes: notes || null, status: 'pending', created_at: new Date().toISOString() }
  getOrders().push(order)
  save()
  res.status(201).json({ id, total, delivery })
})

// Stats must come before /:id
router.get('/stats', requireAdmin, (req, res) => {
  const orders = getOrders()
  res.json({
    total: orders.length,
    pending: orders.filter(o => o.status === 'pending').length,
    confirmed: orders.filter(o => o.status === 'confirmed').length,
    delivered: orders.filter(o => o.status === 'delivered').length,
    revenue: orders.reduce((s, o) => s + o.total, 0),
  })
})

router.get('/', requireAuth, (req, res) => {
  const orders = getOrders()
  if (req.user.isAdmin) return res.json([...orders].reverse())
  res.json([...orders].reverse().filter(o => o.user_id === req.user.id))
})

router.patch('/:id/status', requireAdmin, (req, res) => {
  const { status } = req.body
  const valid = ['pending', 'confirmed', 'delivered', 'cancelled']
  if (!valid.includes(status)) return res.status(400).json({ error: 'حالة غير صالحة' })
  const order = getOrders().find(o => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  order.status = status
  save()
  res.json({ ok: true })
})

router.get('/:id', requireAuth, (req, res) => {
  const order = getOrders().find(o => o.id === req.params.id)
  if (!order) return res.status(404).json({ error: 'الطلب غير موجود' })
  if (!req.user.isAdmin && order.user_id !== req.user.id) return res.status(403).json({ error: 'غير مصرح' })
  res.json(order)
})

export default router
