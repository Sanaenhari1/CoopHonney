import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { getUsers, nextUserId, save } from '../db.js'
import { signToken, verifyToken } from '../middleware/auth.js'

const router = Router()

router.post('/register', (req, res) => {
  const { name, email, password } = req.body
  if (!name || !email || !password || password.length < 6) {
    return res.status(400).json({ error: 'يرجى ملء جميع الحقول وكلمة مرور لا تقل عن 6 أحرف' })
  }
  const users = getUsers()
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'البريد الإلكتروني مسجل مسبقاً' })
  }
  const newUser = { id: nextUserId(), name, email, password: bcrypt.hashSync(password, 10), is_admin: false, created_at: new Date().toISOString() }
  users.push(newUser)
  save()
  const user = { id: newUser.id, name, email, isAdmin: false }
  res.json({ token: signToken(user), user })
})

router.post('/login', (req, res) => {
  const { email, password } = req.body
  if (!email || !password) return res.status(400).json({ error: 'يرجى إدخال البريد وكلمة المرور' })
  const row = getUsers().find(u => u.email === email)
  if (!row || !bcrypt.compareSync(password, row.password)) {
    return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة المرور غير صحيحة' })
  }
  const user = { id: row.id, name: row.name, email: row.email, isAdmin: !!row.is_admin }
  res.json({ token: signToken(user), user })
})

router.get('/me', (req, res) => {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) return res.status(401).json({ error: 'غير مصرح' })
  try {
    const user = verifyToken(auth.slice(7))
    res.json({ user })
  } catch {
    res.status(401).json({ error: 'جلسة منتهية' })
  }
})

export default router
