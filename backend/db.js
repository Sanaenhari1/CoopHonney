import { LowSync } from 'lowdb'
import { JSONFileSync } from 'lowdb/node'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { mkdirSync } from 'node:fs'
import bcrypt from 'bcryptjs'

const __dir = dirname(fileURLToPath(import.meta.url))
const dataDir = join(__dir, 'data')
mkdirSync(dataDir, { recursive: true })

const adapter = new JSONFileSync(join(dataDir, 'tawarda.json'))

const PRODUCTS_SEED = [
  { id: 1, name_ar: 'عسل المرونة', name_fr: "Miel d'Arbousier", description: 'عسل نقي من أزهار شجرة المرونة الجبلية النادرة', benefits: 'مضاد للأكسدة، يقوي المناعة، مفيد للجهاز الهضمي', image: 'https://images.unsplash.com/photo-1536788567643-8c2368376526?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 500, '500 غ': 250, '250 غ': 130 }, badge: 'الأكثر مبيعاً', active: true },
  { id: 2, name_ar: 'عسل الزعتر', name_fr: 'Miel de Thym', description: 'عسل أصيل من أزهار الزعتر البري في جبال شفشاون', benefits: 'مضاد للبكتيريا، يقوي الجهاز التنفسي، مفيد للمناعة', image: 'https://images.unsplash.com/photo-1623018697148-8350cf18e64e?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 350, '500 غ': 180, '250 غ': 90 }, badge: null, active: true },
  { id: 3, name_ar: 'عسل الخروب', name_fr: 'Miel de Caroube', description: 'عسل فاخر من أزهار شجرة الخروب الأصيلة', benefits: 'غني بالمعادن، ينظم سكر الدم، مفيد للعظام', image: 'https://images.unsplash.com/photo-1642067958024-1a2d9f836920?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 300, '500 غ': 150, '250 غ': 80 }, badge: null, active: true },
  { id: 4, name_ar: 'عسل الكاليبتوس', name_fr: "Miel d'Eucalyptus", description: 'عسل طبيعي من أزهار أشجار الكاليبتوس العطرية', benefits: 'مطهر طبيعي، يخفف أعراض البرد، يوسع الشعب الهوائية', image: 'https://images.unsplash.com/photo-1718146921295-700b969e7c78?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 200, '500 غ': 100, '250 غ': 50 }, badge: null, active: true },
  { id: 5, name_ar: 'عسل الأعشاب', name_fr: 'Miel Multi-Fleurs', description: 'مزيج رائع من عسل أزهار الجبل المتعددة والمتنوعة', benefits: 'مغذي شامل، يعزز الطاقة، يوفر فيتامينات متعددة', image: 'https://images.unsplash.com/photo-1642067958050-bfba120a57e2?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 200, '500 غ': 100, '250 غ': 50 }, badge: null, active: true },
  { id: 6, name_ar: 'عسل الأرز', name_fr: 'Miel de Cèdre', description: 'عسل نادر وثمين من أزهار أشجار الأرز الجبلية الشامخة', benefits: 'نادر جداً، يقوي الذاكرة، غني بمضادات الأكسدة', image: 'https://images.unsplash.com/photo-1717438671329-077f530f0c0d?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 500, '500 غ': 250, '250 غ': 180 }, badge: 'نادر', active: true },
]

const db = new LowSync(adapter, {
  users: [],
  products: PRODUCTS_SEED,
  orders: [],
  _nextUserId: 2,
})

db.read()

// Ensure required keys exist (migrations)
if (!db.data.users) db.data.users = []
if (!db.data.products || db.data.products.length === 0) db.data.products = PRODUCTS_SEED
if (!db.data.orders) db.data.orders = []
if (!db.data._nextUserId) db.data._nextUserId = 2

// Seed admin account
const adminExists = db.data.users.find(u => u.email === 'admin@tawarda.ma')
if (!adminExists) {
  db.data.users.push({
    id: 1,
    name: 'المدير',
    email: 'admin@tawarda.ma',
    password: bcrypt.hashSync('tawarda2024', 10),
    is_admin: true,
    created_at: new Date().toISOString(),
  })
  db.write()
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
export function save() { db.write() }

export function getUsers() { return db.data.users }
export function getProducts() { return db.data.products }
export function getOrders() { return db.data.orders }

export function nextUserId() {
  const id = db.data._nextUserId
  db.data._nextUserId++
  db.write()
  return id
}

export function nextOrderId() {
  return `TAW-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`
}

export default db
