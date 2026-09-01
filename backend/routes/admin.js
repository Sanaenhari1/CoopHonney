import { Router } from 'express'
import { getUsers, getOrders, save } from '../db.js'
import { requireAdmin } from '../middleware/auth.js'

const router = Router()

// GET /api/admin/users
router.get('/users', requireAdmin, (req, res) => {
  const users = getUsers().map(({ password, ...u }) => u)
  res.json(users)
})

// DELETE /api/admin/users/:id
router.delete('/users/:id', requireAdmin, (req, res) => {
  const users = getUsers()
  const idx = users.findIndex(u => u.id === parseInt(req.params.id))
  if (idx === -1) return res.status(404).json({ error: 'المستخدم غير موجود' })
  if (users[idx].is_admin) return res.status(403).json({ error: 'لا يمكن حذف المدير' })
  users.splice(idx, 1)
  save()
  res.json({ ok: true })
})

// GET /api/admin/dashboard — full stats + recent orders
router.get('/dashboard', requireAdmin, (req, res) => {
  const orders = getOrders()
  const users = getUsers()

  // Revenue by day (last 7 days)
  const now = new Date()
  const days = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    const dayOrders = orders.filter(o => o.created_at?.startsWith(key))
    days.push({
      date: key,
      orders: dayOrders.length,
      revenue: dayOrders.reduce((s, o) => s + o.total, 0),
    })
  }

  // Top products
  const productCounts = {}
  for (const order of orders) {
    for (const item of order.items || []) {
      const key = item.nameAr || item.productId
      productCounts[key] = (productCounts[key] || 0) + item.qty
    }
  }
  const topProducts = Object.entries(productCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, qty]) => ({ name, qty }))

  res.json({
    stats: {
      totalOrders: orders.length,
      totalRevenue: orders.reduce((s, o) => s + o.total, 0),
      totalUsers: users.length,
      pending: orders.filter(o => o.status === 'pending').length,
      confirmed: orders.filter(o => o.status === 'confirmed').length,
      delivered: orders.filter(o => o.status === 'delivered').length,
      cancelled: orders.filter(o => o.status === 'cancelled').length,
    },
    revenueByDay: days,
    topProducts,
    recentOrders: [...orders].reverse().slice(0, 5),
  })
})

export default router
