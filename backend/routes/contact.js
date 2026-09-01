import { Router } from 'express'
import db, { save } from '../db.js'

const router = Router()

// POST /api/contact — save message
router.post('/', (req, res) => {
  const { name, phone, email, message } = req.body
  if (!name || !message) return res.status(400).json({ error: 'الاسم والرسالة مطلوبان' })
  if (!db.data.contacts) db.data.contacts = []
  db.data.contacts.push({
    id: Date.now(),
    name, phone: phone || '', email: email || '', message,
    created_at: new Date().toISOString(),
    read: false,
  })
  save()
  res.json({ ok: true, message: 'تم استلام رسالتك، سنتواصل معك قريباً' })
})

// GET /api/contact — admin read messages
router.get('/', (req, res) => {
  res.json((db.data.contacts || []).reverse())
})

// PATCH /api/contact/:id/read
router.patch('/:id/read', (req, res) => {
  const msg = (db.data.contacts || []).find(c => c.id === parseInt(req.params.id))
  if (!msg) return res.status(404).json({ error: 'الرسالة غير موجودة' })
  msg.read = true
  save()
  res.json({ ok: true })
})

export default router
