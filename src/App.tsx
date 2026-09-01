import { useState, useEffect, useCallback } from 'react'
import logoImg from '@/imports/image.png'
import {
  apiLogin, apiRegister, apiMe, apiGetProducts, apiPlaceOrder, apiGetOrders,
  apiUpdateOrderStatus, apiGetDashboard, apiGetAdminUsers,
  apiDeleteUser, apiUpdateProduct,
  apiGetAllProducts, apiSendContact, apiGetContacts, apiMarkContactRead,
  clearToken,
  type ApiUser, type ApiProduct, type ApiOrder, type DashboardData, type ContactMessage,
} from '@/lib/api'

// ─── Types ───────────────────────────────────────────────────────────────────
interface CartItem { product: ApiProduct; size: string; qty: number }

type Page = 'home' | 'shop' | 'cart' | 'checkout' | 'admin' | 'orders' | 'contact' | 'about'

// ─── Helpers ─────────────────────────────────────────────────────────────────
function deliveryFee(city: string) {
  const l = city.trim().toLowerCase()
  if (!l) return 0
  return l.includes('شفشاون') || l.includes('chefchaouen') ? 0 : 30
}

// ─── Small Components ─────────────────────────────────────────────────────────
const STAR_PATH = 'M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z'
function Stars() {
  return <div className="flex gap-0.5" style={{ direction: 'ltr' }}>{[...Array(5)].map((_, i) => <svg key={i} className="w-4 h-4" viewBox="0 0 20 20" fill="#f5c842"><path d={STAR_PATH} /></svg>)}</div>
}

function Spinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const s = size === 'sm' ? 'w-4 h-4 border-2' : size === 'lg' ? 'w-14 h-14 border-4' : 'w-9 h-9 border-3'
  return <div className={`${s} rounded-full animate-spin flex-shrink-0`} style={{ borderColor: '#c9850a', borderTopColor: 'transparent' }} />
}

function SpinnerPage() {
  return <div className="flex justify-center items-center py-32"><Spinner size="lg" /></div>
}


function CartIcon({ count }: { count: number }) {
  return <div className="relative cursor-pointer">
    <svg className="w-7 h-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" />
    </svg>
    {count > 0 && <span className="absolute -top-2 -left-2 w-5 h-5 rounded-full text-xs flex items-center justify-center font-bold" style={{ background: '#c9850a', color: '#fff8e8' }}>{count}</span>}
  </div>
}

// ─── Main App ────────────────────────────────────────────────────────────────
export default function App() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [page, setPage] = useState<Page>('home')
  const [showLogin, setShowLogin] = useState(false)
  const [showProduct, setShowProduct] = useState<ApiProduct | null>(null)
  const [selSize, setSelSize] = useState<Record<number, string>>({})
  const [user, setUser] = useState<ApiUser | null>(null)
  const [products, setProducts] = useState<ApiProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [apiOnline, setApiOnline] = useState<boolean | null>(null)
  const [toast, setToast] = useState('')
  const [mobileMenu, setMobileMenu] = useState(false)

  const cartCount = cart.reduce((s, i) => s + i.qty, 0)
  const cartTotal = cart.reduce((s, i) => s + i.qty * i.product.prices[i.size], 0)

  function notify(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2800) }

  useEffect(() => {
    async function init() {
      try {
        const [prods, me] = await Promise.all([apiGetProducts(), apiMe()])
        setProducts(prods)
        if (me) setUser(me)
        setApiOnline(true)
      } catch {
        setApiOnline(false)
        setProducts(FALLBACK)
      } finally { setLoading(false) }
    }
    init()
  }, [])

  function addToCart(product: ApiProduct, size: string) {
    setCart(prev => {
      const ex = prev.find(i => i.product.id === product.id && i.size === size)
      return ex ? prev.map(i => i.product.id === product.id && i.size === size ? { ...i, qty: i.qty + 1 } : i) : [...prev, { product, size, qty: 1 }]
    })
    notify(`تمت الإضافة: ${product.name_ar} (${size}) ✓`)
  }

  function removeFromCart(pid: number, size: string) { setCart(p => p.filter(i => !(i.product.id === pid && i.size === size))) }
  function updateQty(pid: number, size: string, qty: number) {
    if (qty < 1) { removeFromCart(pid, size); return }
    setCart(p => p.map(i => i.product.id === pid && i.size === size ? { ...i, qty } : i))
  }

  const navLinks: { label: string; page: Page }[] = [
    { label: 'الرئيسية', page: 'home' },
    { label: 'المنتجات', page: 'shop' },
    { label: 'من نحن', page: 'about' },
    { label: 'تواصل معنا', page: 'contact' },
    { label: 'طلباتي', page: 'orders' },
  ]

  return (
    <div className="min-h-screen hex-pattern" dir="rtl" style={{ fontFamily: "'Cairo', sans-serif" }}>

      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-[300] animate-fadeIn px-5 py-3 rounded-xl shadow-xl font-semibold text-sm pointer-events-none"
          style={{ background: 'linear-gradient(135deg,#e8a21a,#c9850a)', color: '#fff8e8' }}>
          {toast}
        </div>
      )}

      {/* API indicator */}
      {apiOnline === false && (
        <div className="fixed bottom-24 right-4 z-40 px-3 py-1.5 rounded-full text-xs font-semibold shadow"
          style={{ background: '#fee2e2', color: '#dc2626' }}>
          ⚠ API غير متصل — وضع offline
        </div>
      )}

      {/* Navbar */}
      <nav className="sticky top-0 z-50 shadow-md" style={{ background: 'rgba(61,28,2,0.97)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={() => setPage('home')} className="flex items-center gap-3 flex-shrink-0">
            <img src={logoImg} alt="تعاونية تاوردة" className="h-11 w-11 rounded-full object-cover border-2" style={{ borderColor: '#e8a21a' }} />
            <div className="hidden sm:block">
              <div className="font-bold text-sm" style={{ color: '#f5c842', fontFamily: "'Amiri', serif" }}>تعاونية تاوردة</div>
              <div className="text-xs" style={{ color: '#c8a87a' }}>لتربية النحل وانتاج العسل</div>
            </div>
          </button>

          <div className="hidden lg:flex items-center gap-5">
            {navLinks.map(l => (
              <button key={l.page} onClick={() => setPage(l.page)}
                className="text-sm font-semibold transition-colors"
                style={{ color: page === l.page ? '#f5c842' : '#d6b88a', borderBottom: page === l.page ? '2px solid #f5c842' : '2px solid transparent', paddingBottom: '2px' }}>
                {l.label}
              </button>
            ))}
            {user?.isAdmin && (
              <button onClick={() => setPage('admin')} className="text-sm font-semibold" style={{ color: page === 'admin' ? '#f5c842' : '#fca5a5' }}>
                ⚙ لوحة التحكم
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setPage('cart')} style={{ color: '#d6b88a' }}><CartIcon count={cartCount} /></button>
            {user ? (
              <div className="flex items-center gap-2">
                <div className="hidden sm:flex w-8 h-8 rounded-full items-center justify-center text-sm font-bold" style={{ background: '#c9850a', color: '#fff8e8' }}>{user.name[0]}</div>
                <span className="text-xs hidden md:block" style={{ color: '#d6b88a' }}>{user.name}</span>
                <button onClick={() => { clearToken(); setUser(null); notify('تم تسجيل الخروج') }}
                  className="text-xs px-3 py-1.5 rounded-lg font-semibold" style={{ background: '#6b3a2a', color: '#fde68a' }}>خروج</button>
              </div>
            ) : (
              <button onClick={() => setShowLogin(true)} className="btn-primary text-sm px-4 py-1.5 rounded-lg font-semibold">دخول</button>
            )}
            <button className="lg:hidden" onClick={() => setMobileMenu(!mobileMenu)} style={{ color: '#d6b88a' }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d={mobileMenu ? 'M6 18L18 6M6 6l12 12' : 'M4 6h16M4 12h16M4 18h16'} />
              </svg>
            </button>
          </div>
        </div>
        {mobileMenu && (
          <div className="lg:hidden px-4 pb-4 border-t flex flex-col gap-1" style={{ borderColor: '#4a2510' }}>
            {navLinks.map(l => (
              <button key={l.page} onClick={() => { setPage(l.page); setMobileMenu(false) }}
                className="text-right py-2.5 text-sm font-semibold" style={{ color: page === l.page ? '#f5c842' : '#d6b88a' }}>{l.label}</button>
            ))}
            {user?.isAdmin && <button onClick={() => { setPage('admin'); setMobileMenu(false) }} className="text-right py-2.5 text-sm font-semibold" style={{ color: '#fca5a5' }}>⚙ لوحة التحكم</button>}
          </div>
        )}
      </nav>

      {/* Pages */}
      {loading ? <SpinnerPage /> : (
        <>
          {page === 'home' && <HomePage setPage={setPage} products={products} addToCart={addToCart} selSize={selSize} setSelSize={setSelSize} setShowProduct={setShowProduct} />}
          {page === 'shop' && <ShopPage products={products} addToCart={addToCart} selSize={selSize} setSelSize={setSelSize} setShowProduct={setShowProduct} />}
          {page === 'about' && <AboutPage setPage={setPage} />}
          {page === 'contact' && <ContactPage notify={notify} />}
          {page === 'cart' && <CartPage cart={cart} total={cartTotal} remove={removeFromCart} updateQty={updateQty} setPage={setPage} />}
          {page === 'checkout' && <CheckoutPage cart={cart} total={cartTotal} setPage={setPage} user={user} setCart={setCart} notify={notify} />}
          {page === 'orders' && <OrdersPage user={user} setShowLogin={setShowLogin} />}
          {page === 'admin' && user?.isAdmin && <AdminPage notify={notify} products={products} setProducts={setProducts} />}
        </>
      )}

      <Footer setPage={setPage} />

      {/* WhatsApp */}
      <a href="https://wa.me/212662782489" target="_blank" rel="noopener noreferrer"
        className="fixed bottom-6 left-6 z-50 flex items-center gap-2 px-4 py-3 rounded-full shadow-2xl font-bold text-sm hover:scale-105 transition-transform"
        style={{ background: '#25D366', color: '#fff' }}>
        <svg className="w-6 h-6" viewBox="0 0 24 24" fill="currentColor">
          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
        </svg>
        <span className="hidden sm:inline">تواصل واتساب</span>
      </a>

      {showLogin && <LoginModal onClose={() => setShowLogin(false)} setUser={setUser} notify={notify} />}
      {showProduct && <ProductModal product={showProduct} addToCart={addToCart} onClose={() => setShowProduct(null)} selSize={selSize} setSelSize={setSelSize} />}
    </div>
  )
}

// ─── Fallback products ────────────────────────────────────────────────────────
const FALLBACK: ApiProduct[] = [
  { id: 1, name_ar: 'عسل المرونة', name_fr: "Miel d'Arbousier", description: 'عسل نقي من أزهار شجرة المرونة الجبلية النادرة', benefits: 'مضاد للأكسدة، يقوي المناعة، مفيد للجهاز الهضمي', image: 'https://images.unsplash.com/photo-1536788567643-8c2368376526?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 500, '500 غ': 250, '250 غ': 130 }, badge: 'الأكثر مبيعاً', active: true },
  { id: 2, name_ar: 'عسل الزعتر', name_fr: 'Miel de Thym', description: 'عسل أصيل من أزهار الزعتر البري في جبال شفشاون', benefits: 'مضاد للبكتيريا، يقوي الجهاز التنفسي', image: 'https://images.unsplash.com/photo-1623018697148-8350cf18e64e?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 350, '500 غ': 180, '250 غ': 90 }, badge: null, active: true },
  { id: 3, name_ar: 'عسل الخروب', name_fr: 'Miel de Caroube', description: 'عسل فاخر من أزهار شجرة الخروب الأصيلة', benefits: 'غني بالمعادن، ينظم سكر الدم', image: 'https://images.unsplash.com/photo-1642067958024-1a2d9f836920?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 300, '500 غ': 150, '250 غ': 80 }, badge: null, active: true },
  { id: 4, name_ar: 'عسل الكاليبتوس', name_fr: "Miel d'Eucalyptus", description: 'عسل طبيعي من أزهار الكاليبتوس العطرية', benefits: 'مطهر طبيعي، يخفف البرد', image: 'https://images.unsplash.com/photo-1718146921295-700b969e7c78?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 200, '500 غ': 100, '250 غ': 50 }, badge: null, active: true },
  { id: 5, name_ar: 'عسل الأعشاب', name_fr: 'Miel Multi-Fleurs', description: 'مزيج رائع من عسل أزهار الجبل', benefits: 'مغذي شامل، يعزز الطاقة', image: 'https://images.unsplash.com/photo-1642067958050-bfba120a57e2?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 200, '500 غ': 100, '250 غ': 50 }, badge: null, active: true },
  { id: 6, name_ar: 'عسل الأرز', name_fr: 'Miel de Cèdre', description: 'عسل نادر من أزهار أشجار الأرز الجبلية', benefits: 'يقوي الذاكرة، غني بمضادات الأكسدة', image: 'https://images.unsplash.com/photo-1717438671329-077f530f0c0d?w=500&h=500&fit=crop&auto=format', prices: { '1 كيلو': 500, '500 غ': 250, '250 غ': 180 }, badge: 'نادر', active: true },
]

// ─── Product Card ─────────────────────────────────────────────────────────────
function ProductCard({ product, addToCart, selSize, setSelSize, onDetails }: {
  product: ApiProduct; addToCart: (p: ApiProduct, s: string) => void
  selSize: Record<number, string>; setSelSize: React.Dispatch<React.SetStateAction<Record<number, string>>>
  onDetails: () => void
}) {
  const sizes = Object.keys(product.prices)
  const cur = selSize[product.id] || sizes[0]
  return (
    <div className="card-hover rounded-2xl overflow-hidden border flex flex-col" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
      <div className="relative overflow-hidden">
        <img src={product.image} alt={product.name_ar} className="w-full h-52 object-cover transition-transform duration-500 hover:scale-105" />
        {product.badge && <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold shadow" style={{ background: '#c9850a', color: '#fff8e8' }}>{product.badge}</span>}
        <div className="absolute bottom-3 left-3 px-2 py-1 rounded-lg text-xs" style={{ background: 'rgba(61,28,2,0.8)', color: '#fde68a' }}>{product.name_fr}</div>
      </div>
      <div className="p-5 flex flex-col flex-1">
        <h3 className="font-bold text-xl mb-1" style={{ color: '#3d1c02' }}>{product.name_ar}</h3>
        <p className="text-sm mb-4 flex-1 leading-relaxed" style={{ color: '#8b6244' }}>{product.description}</p>
        <div className="flex gap-1.5 mb-4 flex-wrap">
          {sizes.map(s => (
            <button key={s} onClick={() => setSelSize(p => ({ ...p, [product.id]: s }))}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all"
              style={{ borderColor: cur === s ? '#c9850a' : '#e8d5b0', background: cur === s ? '#c9850a' : 'transparent', color: cur === s ? '#fff8e8' : '#6b3a2a' }}>
              {s} — {product.prices[s]}د
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between">
          <div className="text-2xl font-bold" style={{ color: '#c9850a' }}>{product.prices[cur]} <span className="text-sm font-medium">درهم</span></div>
          <div className="flex gap-2">
            <button onClick={onDetails} className="px-3 py-2 rounded-lg text-sm border-2 font-semibold" style={{ borderColor: '#c9850a', color: '#c9850a' }}>تفاصيل</button>
            <button onClick={() => addToCart(product, cur)} className="btn-primary px-4 py-2 rounded-lg text-sm font-bold">+ سلة</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Home Page ────────────────────────────────────────────────────────────────
function HomePage({ setPage, products, addToCart, selSize, setSelSize, setShowProduct }: {
  setPage: (p: Page) => void; products: ApiProduct[]; addToCart: (p: ApiProduct, s: string) => void
  selSize: Record<number, string>; setSelSize: React.Dispatch<React.SetStateAction<Record<number, string>>>
  setShowProduct: (p: ApiProduct) => void
}) {
  return (
    <div>
      {/* Hero */}
      <section className="relative" style={{ minHeight: '92vh' }}>
        <div className="absolute inset-0">
          <img src="https://images.unsplash.com/photo-1699424495131-ab928183d4f0?w=1400&h=900&fit=crop&auto=format" alt="جبال شفشاون" className="w-full h-full object-cover" />
          <div className="absolute inset-0" style={{ background: 'linear-gradient(135deg,rgba(61,28,2,0.88) 0%,rgba(139,90,0,0.55) 50%,rgba(61,28,2,0.78) 100%)' }} />
        </div>
        <div className="relative z-10 max-w-5xl mx-auto px-6 py-28 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6 text-sm font-semibold" style={{ background: 'rgba(245,200,66,0.18)', border: '1px solid rgba(245,200,66,0.4)', color: '#f5c842' }}>
            🐝 اعسال طبيعية من الجبل للزبون
          </div>
          <h1 className="font-display text-5xl md:text-7xl font-bold mb-3" style={{ color: '#f5c842' }}>تعاونية تاوردة</h1>
          <h2 className="text-xl md:text-2xl font-semibold mb-5" style={{ color: '#fde68a' }}>لتربية النحل وانتاج العسل</h2>
          <p className="text-base mb-3 max-w-lg" style={{ color: '#dfc499' }}>جماعة لغدير، إقليم شفشاون — جبال الريف الشامخة</p>
          <div className="flex flex-wrap gap-3 justify-center mb-10 text-sm" style={{ color: '#fcd34d' }}>
            <span>✓ خبرة أكثر من 10 سنوات</span>
            <span className="opacity-50">|</span>
            <span>✓ اعتماد صحي رسمي</span>
            <span className="opacity-50">|</span>
            <span>✓ 100% طبيعي خالص</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-4">
            <button onClick={() => setPage('shop')} className="btn-primary px-8 py-3.5 rounded-xl text-lg font-bold shadow-lg">تسوق الآن 🍯</button>
            <a href="https://wa.me/212662782489" target="_blank" rel="noopener noreferrer"
              className="px-8 py-3.5 rounded-xl text-lg font-bold border-2 hover:scale-105 transition-transform"
              style={{ borderColor: '#25D366', color: '#25D366', background: 'rgba(37,211,102,0.1)' }}>واتساب 📱</a>
          </div>
          <div className="mt-16 grid grid-cols-3 gap-10 max-w-sm">
            {[{ n: '+10', l: 'سنوات خبرة' }, { n: '6', l: 'أنواع عسل' }, { n: '100%', l: 'طبيعي خالص' }].map(s => (
              <div key={s.l} className="text-center">
                <div className="text-3xl font-bold" style={{ color: '#f5c842' }}>{s.n}</div>
                <div className="text-xs mt-1" style={{ color: '#c8a87a' }}>{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6" style={{ background: '#fff8e8' }}>
        <div className="max-w-6xl mx-auto">
          <h2 className="text-center font-display text-3xl font-bold mb-10" style={{ color: '#3d1c02' }}>لماذا تختار تعاونية تاوردة؟</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[
              { icon: '🏔️', title: 'من الجبل مباشرةً', desc: 'جبال شفشاون الشامخة، بيئة نقية بعيدة عن أي تلوث' },
              { icon: '🏥', title: 'اعتماد صحي رسمي', desc: 'جميع منتجاتنا حاصلة على رقم الاعتماد الصحي المعتمد' },
              { icon: '🐝', title: 'خبرة عشر سنوات', desc: 'أكثر من 10 سنوات في تربية النحل وانتاج العسل الطبيعي' },
              { icon: '🚚', title: 'توصيل مجاني بشفشاون', desc: '30 درهم فقط لباقي المدن المغربية' },
              { icon: '🌍', title: 'توصيل دولي', desc: 'نوصل عسلنا الأصيل إلى خارج المغرب' },
              { icon: '💰', title: 'أسعار تنافسية', desc: 'جودة عالية بأسعار مناسبة لجميع الميزانيات' },
            ].map(f => (
              <div key={f.title} className="card-hover p-6 rounded-2xl border text-center" style={{ background: '#fdf8f0', borderColor: '#e8d5b0' }}>
                <div className="text-4xl mb-3">{f.icon}</div>
                <h3 className="font-bold text-base mb-1.5" style={{ color: '#3d1c02' }}>{f.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: '#8b6244' }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Products preview */}
      <section className="py-16 px-6 hex-pattern">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-10">
            <h2 className="font-display text-3xl font-bold" style={{ color: '#3d1c02' }}>أبرز منتجاتنا</h2>
            <button onClick={() => setPage('shop')} className="btn-outline px-5 py-2 rounded-lg text-sm font-semibold">عرض الكل</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.slice(0, 3).map(p => <ProductCard key={p.id} product={p} addToCart={addToCart} selSize={selSize} setSelSize={setSelSize} onDetails={() => setShowProduct(p)} />)}
          </div>
        </div>
      </section>

      {/* Delivery banner */}
      <section className="py-16 px-6" style={{ background: 'linear-gradient(135deg,#3d1c02,#6b3a2a)' }}>
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl font-bold mb-3" style={{ color: '#f5c842' }}>التوصيل والدفع</h2>
          <p className="mb-10 text-sm" style={{ color: '#c8a87a' }}>نوصل إليك أينما كنت في المغرب وخارجه</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            {[
              { icon: '🏙️', label: 'داخل شفشاون', val: 'مجاني', color: '#22c55e' },
              { icon: '🇲🇦', label: 'باقي المدن', val: '30 درهم', color: '#f5c842' },
              { icon: '✈️', label: 'خارج المغرب', val: 'متوفر', color: '#60a5fa' },
            ].map(d => (
              <div key={d.label} className="p-5 rounded-2xl text-center" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(245,200,66,0.2)' }}>
                <div className="text-3xl mb-2">{d.icon}</div>
                <div className="font-semibold text-sm mb-1" style={{ color: '#c8a87a' }}>{d.label}</div>
                <div className="font-bold text-xl" style={{ color: d.color }}>{d.val}</div>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            <a href="tel:0662782489" className="btn-primary px-6 py-2.5 rounded-xl font-bold text-sm">📞 0662782489</a>
            <a href="https://wa.me/212662782489" target="_blank" rel="noopener noreferrer" className="px-6 py-2.5 rounded-xl font-bold text-sm" style={{ background: '#25D366', color: '#fff' }}>💬 واتساب</a>
          </div>
          <div className="flex flex-wrap justify-center gap-3">
            {['💳 دفع بالبطاقة', '💵 دفع عند الاستلام'].map(t => (
              <span key={t} className="px-4 py-2 rounded-full text-sm" style={{ background: 'rgba(245,200,66,0.12)', color: '#fde68a', border: '1px solid rgba(245,200,66,0.25)' }}>{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 px-6" style={{ background: '#fff8e8' }}>
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center font-display text-3xl font-bold mb-10" style={{ color: '#3d1c02' }}>ماذا يقول زبائننا</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { name: 'محمد الأمين', city: 'الرباط', text: 'عسل ممتاز وطبيعي 100%، جربت عسل المرونة وهو رائع جداً. التوصيل سريع والتغليف ممتاز.' },
              { name: 'فاطمة الزهراء', city: 'الدار البيضاء', text: 'أفضل عسل جربته في حياتي. عسل الزعتر علاجي وطعمه لذيذ. شكراً تعاونية تاوردة!' },
              { name: 'يوسف المنصوري', city: 'فاس', text: 'منتجات طبيعية وأصيلة من جبال الريف. سعر مناسب وجودة عالية. أنصح الجميع بالتجربة.' },
            ].map(t => (
              <div key={t.name} className="p-6 rounded-2xl border card-hover" style={{ background: '#fdf8f0', borderColor: '#e8d5b0' }}>
                <Stars />
                <p className="mt-3 mb-4 text-sm leading-loose" style={{ color: '#6b3a2a' }}>"{t.text}"</p>
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#e8a21a', color: '#3d1c02' }}>{t.name[0]}</div>
                  <div>
                    <div className="font-semibold text-sm" style={{ color: '#3d1c02' }}>{t.name}</div>
                    <div className="text-xs" style={{ color: '#8b6244' }}>{t.city}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Shop Page ────────────────────────────────────────────────────────────────
function ShopPage({ products, addToCart, selSize, setSelSize, setShowProduct }: {
  products: ApiProduct[]; addToCart: (p: ApiProduct, s: string) => void
  selSize: Record<number, string>; setSelSize: React.Dispatch<React.SetStateAction<Record<number, string>>>
  setShowProduct: (p: ApiProduct) => void
}) {
  const [search, setSearch] = useState('')
  const [maxPrice, setMaxPrice] = useState(600)
  const [sort, setSort] = useState<'default' | 'asc' | 'desc'>('default')

  const filtered = products
    .filter(p => !search || p.name_ar.includes(search) || p.name_fr.toLowerCase().includes(search.toLowerCase()))
    .filter(p => Math.min(...Object.values(p.prices)) <= maxPrice)
    .sort((a, b) => {
      if (sort === 'asc') return Math.min(...Object.values(a.prices)) - Math.min(...Object.values(b.prices))
      if (sort === 'desc') return Math.min(...Object.values(b.prices)) - Math.min(...Object.values(a.prices))
      return 0
    })

  return (
    <div className="max-w-6xl mx-auto px-4 py-10">
      <div className="text-center mb-10">
        <h1 className="font-display text-4xl font-bold mb-2" style={{ color: '#3d1c02' }}>كل أنواع العسل</h1>
        <p className="text-sm" style={{ color: '#8b6244' }}>اعسال طبيعية من جبال شفشاون — مباشرة من خلية النحل إليك</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-8 p-4 rounded-2xl" style={{ background: '#fff8e8', border: '1px solid #e8d5b0' }}>
        <div className="relative flex-1">
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: '#8b6244' }} fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث عن نوع العسل..."
            className="w-full pr-9 pl-3 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}
            onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
        </div>
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-xs flex-shrink-0" style={{ color: '#8b6244' }}>السعر الأقصى: {maxPrice}د</span>
          <input type="range" min={50} max={600} step={50} value={maxPrice} onChange={e => setMaxPrice(+e.target.value)}
            className="w-28" style={{ accentColor: '#c9850a' }} />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as typeof sort)}
          className="px-3 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}>
          <option value="default">الترتيب الافتراضي</option>
          <option value="asc">السعر: الأرخص أولاً</option>
          <option value="desc">السعر: الأغلى أولاً</option>
        </select>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">🍯</div>
          <p className="font-semibold" style={{ color: '#8b6244' }}>لا توجد منتجات مطابقة</p>
          <button onClick={() => { setSearch(''); setMaxPrice(600); setSort('default') }} className="mt-4 btn-outline px-5 py-2 rounded-lg text-sm">إعادة تعيين الفلاتر</button>
        </div>
      ) : (
        <>
          <p className="text-sm mb-4" style={{ color: '#8b6244' }}>{filtered.length} منتج</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map(p => <ProductCard key={p.id} product={p} addToCart={addToCart} selSize={selSize} setSelSize={setSelSize} onDetails={() => setShowProduct(p)} />)}
          </div>
        </>
      )}
    </div>
  )
}

// ─── About Page ───────────────────────────────────────────────────────────────
function AboutPage({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <div>
      <section className="relative py-24 px-6 overflow-hidden" style={{ background: 'linear-gradient(135deg,#3d1c02,#6b3a2a)' }}>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="text-6xl mb-4">🐝</div>
          <h1 className="font-display text-5xl font-bold mb-4" style={{ color: '#f5c842' }}>من نحن</h1>
          <p className="text-lg leading-relaxed" style={{ color: '#e8d5b0' }}>تعاونية تاوردة لتربية النحل وانتاج العسل</p>
        </div>
      </section>

      <section className="py-16 px-6" style={{ background: '#fff8e8' }}>
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div>
              <h2 className="font-display text-3xl font-bold mb-4" style={{ color: '#3d1c02' }}>قصتنا</h2>
              <p className="text-base leading-loose mb-4" style={{ color: '#6b3a2a' }}>
                تأسست تعاونية تاوردة في قلب جبال شفشاون الشامخة، بمقرها الرئيسي في جماعة لغدير بإقليم شفشاون. انطلقنا من حب عميق لطبيعة الريف المغربي والنحل الذي يسكن أزهاره.
              </p>
              <p className="text-base leading-loose mb-4" style={{ color: '#6b3a2a' }}>
                بعد أكثر من 10 سنوات من الخبرة والممارسة في مجال تربية النحل، أصبحنا مرجعاً موثوقاً لإنتاج العسل الطبيعي الأصيل في المنطقة، ونفخر بأن منتجاتنا حاصلة على رقم الاعتماد الصحي الرسمي.
              </p>
              <p className="text-base leading-loose" style={{ color: '#6b3a2a' }}>
                فلسفتنا بسيطة: من الجبل مباشرةً إلى زبوننا، بدون وسطاء وبدون مواد حافظة — عسل طبيعي خالص كما خلقه الله.
              </p>
            </div>
            <div className="rounded-3xl overflow-hidden shadow-xl">
              <img src="https://images.unsplash.com/photo-1577095870693-360d002ad341?w=600&h=400&fit=crop&auto=format" alt="خلية النحل" className="w-full h-80 object-cover" />
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center mb-16">
            <div className="rounded-3xl overflow-hidden shadow-xl order-2 lg:order-1">
              <img src="https://images.unsplash.com/photo-1695601187635-12bdb90fbd40?w=600&h=400&fit=crop&auto=format" alt="شفشاون" className="w-full h-80 object-cover" />
            </div>
            <div className="order-1 lg:order-2">
              <h2 className="font-display text-3xl font-bold mb-4" style={{ color: '#3d1c02' }}>موقعنا</h2>
              <p className="text-base leading-loose mb-4" style={{ color: '#6b3a2a' }}>
                نحن في قلب جماعة لغدير بإقليم شفشاون، محاطون بالغابات والمراعي الجبلية التي تزخر بتنوع نباتي رائع يمنح عسلنا طعماً ونكهة لا مثيل لهما.
              </p>
              <div className="flex flex-col gap-3">
                {[
                  { icon: '📍', text: 'جماعة لغدير، إقليم شفشاون' },
                  { icon: '📞', text: '0662782489' },
                  { icon: '🌿', text: 'على ارتفاع يتجاوز 1000م فوق سطح البحر' },
                ].map(i => (
                  <div key={i.text} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: '#fdf8f0', border: '1px solid #e8d5b0' }}>
                    <span className="text-xl">{i.icon}</span>
                    <span className="text-sm font-semibold" style={{ color: '#6b3a2a' }}>{i.text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Values */}
          <div className="text-center mb-10">
            <h2 className="font-display text-3xl font-bold" style={{ color: '#3d1c02' }}>قيمنا</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-12">
            {[
              { icon: '🌿', title: 'الطبيعية', desc: 'لا مضافات ولا مواد حافظة — عسل نقي 100%' },
              { icon: '🤝', title: 'الشفافية', desc: 'نفخر بإخبارك بكل شيء عن مصدر عسلنا وطريقة إنتاجه' },
              { icon: '❤️', title: 'الجودة', desc: 'نلتزم بأعلى معايير الجودة في كل مرحلة من مراحل الإنتاج' },
            ].map(v => (
              <div key={v.title} className="text-center p-6 rounded-2xl" style={{ background: '#fdf8f0', border: '1px solid #e8d5b0' }}>
                <div className="text-4xl mb-3">{v.icon}</div>
                <h3 className="font-bold text-lg mb-2" style={{ color: '#3d1c02' }}>{v.title}</h3>
                <p className="text-sm" style={{ color: '#8b6244' }}>{v.desc}</p>
              </div>
            ))}
          </div>

          <div className="text-center">
            <button onClick={() => setPage('shop')} className="btn-primary px-8 py-3.5 rounded-xl font-bold text-lg">اكتشف منتجاتنا</button>
          </div>
        </div>
      </section>
    </div>
  )
}

// ─── Contact Page ─────────────────────────────────────────────────────────────
function ContactPage({ notify }: { notify: (m: string) => void }) {
  const [form, setForm] = useState({ name: '', phone: '', email: '', message: '' })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function send() {
    if (!form.name || !form.message) return
    setSending(true)
    try {
      await apiSendContact(form)
      setSent(true)
      notify('تم إرسال رسالتك بنجاح! ✓')
      setForm({ name: '', phone: '', email: '', message: '' })
    } catch { notify('فشل الإرسال، يرجى المحاولة مرة أخرى') }
    finally { setSending(false) }
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-16">
      <div className="text-center mb-12">
        <h1 className="font-display text-4xl font-bold mb-3" style={{ color: '#3d1c02' }}>تواصل معنا</h1>
        <p style={{ color: '#8b6244' }}>نسعد بالإجابة على استفساراتكم وتلقي طلباتكم</p>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Contact info */}
        <div className="flex flex-col gap-5">
          <h2 className="font-bold text-xl" style={{ color: '#3d1c02' }}>معلومات التواصل</h2>
          {[
            { icon: '📞', label: 'الهاتف', val: '0662782489', href: 'tel:0662782489' },
            { icon: '💬', label: 'واتساب', val: 'تحدث معنا مباشرة', href: 'https://wa.me/212662782489' },
            { icon: '📍', label: 'الموقع', val: 'جماعة لغدير، إقليم شفشاون', href: undefined },
          ].map(c => (
            <div key={c.label} className="flex items-start gap-4 p-4 rounded-2xl border" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
              <div className="text-2xl flex-shrink-0">{c.icon}</div>
              <div>
                <div className="text-xs font-semibold mb-0.5" style={{ color: '#8b6244' }}>{c.label}</div>
                {c.href ? (
                  <a href={c.href} target={c.href.startsWith('http') ? '_blank' : undefined} rel="noopener noreferrer" className="font-bold hover:underline" style={{ color: '#c9850a' }}>{c.val}</a>
                ) : <div className="font-semibold" style={{ color: '#3d1c02' }}>{c.val}</div>}
              </div>
            </div>
          ))}
          <div className="p-5 rounded-2xl" style={{ background: 'linear-gradient(135deg,#3d1c02,#6b3a2a)' }}>
            <div className="text-sm font-semibold mb-2" style={{ color: '#f5c842' }}>أوقات العمل</div>
            <div className="text-sm" style={{ color: '#e8d5b0' }}>السبت — الخميس: 8:00 — 20:00</div>
            <div className="text-sm" style={{ color: '#e8d5b0' }}>الجمعة: 8:00 — 12:00</div>
          </div>
        </div>

        {/* Form */}
        <div className="p-6 rounded-2xl border" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
          {sent ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-4">✅</div>
              <h3 className="font-bold text-xl mb-2" style={{ color: '#3d1c02' }}>تم استلام رسالتك!</h3>
              <p className="text-sm" style={{ color: '#8b6244' }}>سنتواصل معك في أقرب وقت ممكن</p>
              <button onClick={() => setSent(false)} className="mt-5 btn-outline px-5 py-2 rounded-lg text-sm">إرسال رسالة أخرى</button>
            </div>
          ) : (
            <>
              <h2 className="font-bold text-xl mb-5" style={{ color: '#3d1c02' }}>أرسل رسالة</h2>
              <div className="flex flex-col gap-3">
                {[
                  { key: 'name', label: 'الاسم *', type: 'text', placeholder: 'اسمك الكامل' },
                  { key: 'phone', label: 'الهاتف', type: 'tel', placeholder: '0612345678' },
                  { key: 'email', label: 'البريد الإلكتروني', type: 'email', placeholder: 'example@gmail.com' },
                ].map(f => (
                  <div key={f.key}>
                    <label className="block text-xs font-semibold mb-1" style={{ color: '#6b3a2a' }}>{f.label}</label>
                    <input type={f.type} placeholder={f.placeholder} value={(form as Record<string, string>)[f.key]}
                      onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
                      className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none"
                      style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}
                      onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
                  </div>
                ))}
                <div>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b3a2a' }}>الرسالة *</label>
                  <textarea rows={4} placeholder="اكتب رسالتك هنا..." value={form.message}
                    onChange={e => setForm(p => ({ ...p, message: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none resize-none"
                    style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}
                    onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
                </div>
                <button onClick={send} disabled={!form.name || !form.message || sending}
                  className="btn-primary py-3 rounded-xl font-bold text-base flex items-center justify-center gap-2 disabled:opacity-50">
                  {sending && <Spinner size="sm" />}
                  {sending ? 'جاري الإرسال...' : 'إرسال الرسالة ✉️'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Cart Page ────────────────────────────────────────────────────────────────
function CartPage({ cart, total, remove, updateQty, setPage }: {
  cart: CartItem[]; total: number; remove: (id: number, s: string) => void
  updateQty: (id: number, s: string, q: number) => void; setPage: (p: Page) => void
}) {
  if (!cart.length) return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="text-7xl mb-5">🍯</div>
      <h2 className="font-display text-3xl font-bold mb-3" style={{ color: '#3d1c02' }}>سلتك فارغة</h2>
      <p className="mb-7" style={{ color: '#8b6244' }}>أضف بعض العسل اللذيذ من منتجاتنا</p>
      <button onClick={() => setPage('shop')} className="btn-primary px-8 py-3 rounded-xl font-bold text-lg">تسوق الآن</button>
    </div>
  )
  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-7" style={{ color: '#3d1c02' }}>سلة التسوق ({cart.length})</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-4">
          {cart.map(item => (
            <div key={`${item.product.id}-${item.size}`} className="flex gap-4 p-4 rounded-2xl border items-center" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
              <img src={item.product.image} alt={item.product.name_ar} className="w-20 h-20 rounded-xl object-cover flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="font-bold" style={{ color: '#3d1c02' }}>{item.product.name_ar}</div>
                <div className="text-sm" style={{ color: '#8b6244' }}>{item.size}</div>
                <div className="font-semibold text-sm mt-1" style={{ color: '#c9850a' }}>{item.product.prices[item.size]} درهم / وحدة</div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={() => updateQty(item.product.id, item.size, item.qty - 1)} className="w-8 h-8 rounded-full border-2 font-bold" style={{ borderColor: '#c9850a', color: '#c9850a' }}>−</button>
                <span className="w-5 text-center font-bold" style={{ color: '#3d1c02' }}>{item.qty}</span>
                <button onClick={() => updateQty(item.product.id, item.size, item.qty + 1)} className="w-8 h-8 rounded-full border-2 font-bold" style={{ borderColor: '#c9850a', color: '#c9850a' }}>+</button>
                <button onClick={() => remove(item.product.id, item.size)} className="w-8 h-8 rounded-full mr-1 font-bold" style={{ background: '#fee2e2', color: '#dc2626' }}>✕</button>
              </div>
            </div>
          ))}
        </div>
        <div className="p-6 rounded-2xl border h-fit sticky top-20" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
          <h2 className="font-bold text-lg mb-4" style={{ color: '#3d1c02' }}>ملخص الطلب</h2>
          <div className="flex justify-between text-sm mb-2" style={{ color: '#6b3a2a' }}><span>المجموع</span><span>{total} درهم</span></div>
          <div className="flex justify-between text-sm mb-4" style={{ color: '#6b3a2a' }}><span>التوصيل</span><span className="text-green-600 font-semibold">يُحدد لاحقاً</span></div>
          <div className="border-t pt-4 flex justify-between font-bold text-xl mb-5" style={{ borderColor: '#e8d5b0', color: '#3d1c02' }}>
            <span>الإجمالي</span><span style={{ color: '#c9850a' }}>{total} د</span>
          </div>
          <button onClick={() => setPage('checkout')} className="btn-primary w-full py-3 rounded-xl font-bold text-lg mb-2">إتمام الطلب</button>
          <button onClick={() => setPage('shop')} className="w-full py-2 text-sm font-semibold" style={{ color: '#8b6244' }}>متابعة التسوق</button>
        </div>
      </div>
    </div>
  )
}

// ─── Checkout Page ────────────────────────────────────────────────────────────
function CheckoutPage({ cart, total, setPage, user, setCart, notify }: {
  cart: CartItem[]; total: number; setPage: (p: Page) => void
  user: ApiUser | null; setCart: React.Dispatch<React.SetStateAction<CartItem[]>>; notify: (m: string) => void
}) {
  const [form, setForm] = useState({ name: user?.name || '', phone: '', city: '', address: '', payment: 'cash' as 'cash' | 'card', cardNum: '', cardExpiry: '', cardCvv: '' })
  const [busy, setBusy] = useState(false)
  const [orderId, setOrderId] = useState<string | null>(null)
  const del = deliveryFee(form.city)

  async function place() {
    setBusy(true)
    try {
      const items = cart.map(i => ({ productId: i.product.id, nameAr: i.product.name_ar, size: i.size, qty: i.qty, price: i.product.prices[i.size] }))
      const res = await apiPlaceOrder({ items, name: form.name, phone: form.phone, city: form.city, address: form.address, payment: form.payment })
      setCart([]); setOrderId(res.id)
    } catch (e: unknown) { notify((e as Error).message || 'فشل الإرسال') }
    finally { setBusy(false) }
  }

  if (orderId) return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="text-7xl mb-5 animate-float">🍯</div>
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style={{ background: '#dcfce7' }}>
        <svg className="w-8 h-8" fill="none" stroke="#16a34a" strokeWidth="3" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </div>
      <h2 className="font-display text-3xl font-bold mb-2" style={{ color: '#3d1c02' }}>تم تأكيد طلبك!</h2>
      <p className="text-sm font-mono mb-2" style={{ color: '#c9850a' }}>رقم الطلب: {orderId}</p>
      <p className="text-sm mb-8" style={{ color: '#6b3a2a' }}>سنتواصل معك على رقم هاتفك لتأكيد موعد التوصيل</p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <button onClick={() => setPage('home')} className="btn-primary px-7 py-2.5 rounded-xl font-bold">الرئيسية</button>
        {user && <button onClick={() => setPage('orders')} className="btn-outline px-7 py-2.5 rounded-xl font-bold">طلباتي</button>}
      </div>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-7" style={{ color: '#3d1c02' }}>إتمام الطلب</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Delivery */}
          <div className="p-6 rounded-2xl border" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: '#3d1c02' }}>بيانات التوصيل</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[{ k: 'name', l: 'الاسم الكامل *', t: 'text', ph: 'اسمك الكامل' }, { k: 'phone', l: 'الهاتف *', t: 'tel', ph: '0612345678' }, { k: 'city', l: 'المدينة *', t: 'text', ph: 'شفشاون، الرباط...' }].map(f => (
                <div key={f.k}>
                  <label className="block text-xs font-semibold mb-1" style={{ color: '#6b3a2a' }}>{f.l}</label>
                  <input type={f.t} placeholder={f.ph} value={(form as Record<string, string>)[f.k]}
                    onChange={e => setForm(p => ({ ...p, [f.k]: e.target.value }))}
                    className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}
                    onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold mb-1" style={{ color: '#6b3a2a' }}>العنوان التفصيلي *</label>
                <textarea rows={2} placeholder="الحي، الشارع، رقم المنزل..." value={form.address}
                  onChange={e => setForm(p => ({ ...p, address: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none resize-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}
                  onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
              </div>
            </div>
            {form.city && (
              <div className="mt-3 p-3 rounded-xl text-sm font-semibold" style={{ background: del === 0 ? '#dcfce7' : '#fef3c7', color: del === 0 ? '#15803d' : '#92400e' }}>
                {del === 0 ? '🎉 التوصيل مجاني داخل شفشاون!' : `🚚 رسوم التوصيل: ${del} درهم`}
              </div>
            )}
          </div>
          {/* Payment */}
          <div className="p-6 rounded-2xl border" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
            <h2 className="font-bold text-lg mb-4" style={{ color: '#3d1c02' }}>طريقة الدفع</h2>
            <div className="grid grid-cols-2 gap-3 mb-4">
              {[{ v: 'cash', l: 'دفع عند الاستلام', i: '💵' }, { v: 'card', l: 'بطاقة بنكية', i: '💳' }].map(o => (
                <button key={o.v} onClick={() => setForm(p => ({ ...p, payment: o.v as 'cash' | 'card' }))}
                  className="p-4 rounded-xl border-2 font-semibold text-sm flex flex-col items-center gap-2 transition-all"
                  style={{ borderColor: form.payment === o.v ? '#c9850a' : '#e8d5b0', background: form.payment === o.v ? 'rgba(201,133,10,0.1)' : 'transparent', color: form.payment === o.v ? '#c9850a' : '#6b3a2a' }}>
                  <span className="text-2xl">{o.i}</span>{o.l}
                </button>
              ))}
            </div>
            {form.payment === 'card' && (
              <div className="flex flex-col gap-2">
                <input placeholder="رقم البطاقة" value={form.cardNum} onChange={e => setForm(p => ({ ...p, cardNum: e.target.value }))}
                  className="w-full px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02', direction: 'ltr' }}
                  onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
                <div className="flex gap-2">
                  <input placeholder="MM/YY" value={form.cardExpiry} onChange={e => setForm(p => ({ ...p, cardExpiry: e.target.value }))}
                    className="flex-1 px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02', direction: 'ltr' }}
                    onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
                  <input placeholder="CVV" value={form.cardCvv} onChange={e => setForm(p => ({ ...p, cardCvv: e.target.value }))}
                    className="w-20 px-4 py-2.5 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02', direction: 'ltr' }}
                    onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Summary */}
        <div className="p-6 rounded-2xl border h-fit sticky top-20" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
          <h2 className="font-bold text-lg mb-4" style={{ color: '#3d1c02' }}>ملخص</h2>
          <div className="flex flex-col gap-2 mb-3">
            {cart.map(i => (
              <div key={`${i.product.id}-${i.size}`} className="flex justify-between text-xs" style={{ color: '#6b3a2a' }}>
                <span className="truncate ml-1">{i.product.name_ar} {i.size}×{i.qty}</span>
                <span>{i.qty * i.product.prices[i.size]}د</span>
              </div>
            ))}
          </div>
          <div className="border-t pt-3 flex flex-col gap-1.5 text-sm" style={{ borderColor: '#e8d5b0' }}>
            <div className="flex justify-between" style={{ color: '#6b3a2a' }}><span>المجموع</span><span>{total} د</span></div>
            <div className="flex justify-between" style={{ color: del === 0 ? '#15803d' : '#6b3a2a' }}><span>التوصيل</span><span>{del === 0 ? 'مجاني' : `${del} د`}</span></div>
            <div className="flex justify-between font-bold text-lg mt-1" style={{ color: '#3d1c02' }}><span>الإجمالي</span><span style={{ color: '#c9850a' }}>{total + del} د</span></div>
          </div>
          <button onClick={place} disabled={!form.name || !form.phone || !form.city || !form.address || busy}
            className="btn-primary w-full py-3 rounded-xl font-bold mt-4 flex items-center justify-center gap-2 disabled:opacity-50">
            {busy && <Spinner size="sm" />}
            {busy ? 'جاري...' : 'تأكيد الطلب ✓'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Orders Page ──────────────────────────────────────────────────────────────
function OrdersPage({ user, setShowLogin }: { user: ApiUser | null; setShowLogin: (v: boolean) => void }) {
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) { setLoading(false); return }
    apiGetOrders().then(setOrders).catch(() => {}).finally(() => setLoading(false))
  }, [user])

  if (!user) return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="text-6xl mb-5">🔒</div>
      <h2 className="font-display text-2xl font-bold mb-3" style={{ color: '#3d1c02' }}>يرجى تسجيل الدخول</h2>
      <p className="mb-6" style={{ color: '#8b6244' }}>سجل دخولك لمتابعة طلباتك</p>
      <button onClick={() => setShowLogin(true)} className="btn-primary px-8 py-3 rounded-xl font-bold">دخول</button>
    </div>
  )

  if (loading) return <SpinnerPage />

  const SC: Record<string, string> = { pending: '#f59e0b', confirmed: '#3b82f6', delivered: '#22c55e', cancelled: '#ef4444' }
  const SL: Record<string, string> = { pending: 'قيد الانتظار', confirmed: 'تم التأكيد', delivered: 'تم التوصيل', cancelled: 'ملغي' }
  const STEPS = ['pending', 'confirmed', 'delivered']

  if (!orders.length) return (
    <div className="max-w-xl mx-auto px-6 py-24 text-center">
      <div className="text-6xl mb-5">📦</div>
      <h2 className="font-display text-2xl font-bold mb-2" style={{ color: '#3d1c02' }}>لا توجد طلبات بعد</h2>
      <p style={{ color: '#8b6244' }}>ابدأ التسوق واطلب عسلك الآن</p>
    </div>
  )

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <h1 className="font-display text-3xl font-bold mb-7" style={{ color: '#3d1c02' }}>طلباتي ({orders.length})</h1>
      <div className="flex flex-col gap-6">
        {orders.map(order => (
          <div key={order.id} className="p-6 rounded-2xl border" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <span className="font-bold text-lg ml-2" style={{ color: '#3d1c02' }}>#{order.id}</span>
                <span className="text-sm" style={{ color: '#8b6244' }}>{order.created_at?.slice(0, 10)}</span>
              </div>
              <span className="px-3 py-1 rounded-full text-sm font-bold" style={{ background: `${SC[order.status]}20`, color: SC[order.status] }}>{SL[order.status]}</span>
            </div>

            {/* Status timeline */}
            {order.status !== 'cancelled' && (
              <div className="flex items-center mb-5">
                {STEPS.map((s, i) => {
                  const done = STEPS.indexOf(order.status) >= i
                  return (
                    <div key={s} className="flex items-center flex-1">
                      <div className="flex flex-col items-center">
                        <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all"
                          style={{ background: done ? '#c9850a' : '#e8d5b0', color: done ? '#fff8e8' : '#8b6244' }}>
                          {done ? '✓' : i + 1}
                        </div>
                        <div className="text-xs mt-1 text-center w-16" style={{ color: done ? '#c9850a' : '#8b6244' }}>
                          {SL[s]}
                        </div>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div className="flex-1 h-1 mx-1 rounded-full" style={{ background: STEPS.indexOf(order.status) > i ? '#c9850a' : '#e8d5b0' }} />
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            <div className="flex flex-col gap-1 mb-4">
              {order.items.map((item, i) => (
                <div key={i} className="flex justify-between text-sm" style={{ color: '#6b3a2a' }}>
                  <span>{item.nameAr} — {item.size} ×{item.qty}</span>
                  <span>{item.qty * item.price} درهم</span>
                </div>
              ))}
            </div>
            <div className="flex justify-between font-bold text-base border-t pt-3" style={{ borderColor: '#e8d5b0', color: '#3d1c02' }}>
              <div className="flex items-center gap-3">
                <span>📍 {order.city}</span>
                <span>|</span>
                <span>{order.payment === 'cash' ? '💵 نقداً' : '💳 بطاقة'}</span>
              </div>
              <span style={{ color: '#c9850a' }}>{order.total} درهم</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Admin Page ───────────────────────────────────────────────────────────────
function AdminPage({ notify, products: initProducts, setProducts }: {
  notify: (m: string) => void
  products: ApiProduct[]
  setProducts: React.Dispatch<React.SetStateAction<ApiProduct[]>>
}) {
  const [tab, setTab] = useState<'dashboard' | 'orders' | 'products' | 'users' | 'messages'>('dashboard')
  const [dashboard, setDashboard] = useState<DashboardData | null>(null)
  const [orders, setOrders] = useState<ApiOrder[]>([])
  const [allProducts, setAllProducts] = useState<ApiProduct[]>(initProducts)
  const [users, setUsers] = useState<ApiUser[]>([])
  const [messages, setMessages] = useState<ContactMessage[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async (t: typeof tab) => {
    setLoading(true)
    try {
      if (t === 'dashboard') setDashboard(await apiGetDashboard())
      if (t === 'orders') setOrders(await apiGetOrders())
      if (t === 'products') setAllProducts(await apiGetAllProducts())
      if (t === 'users') setUsers(await apiGetAdminUsers())
      if (t === 'messages') setMessages(await apiGetContacts())
    } catch { notify('فشل تحميل البيانات') }
    finally { setLoading(false) }
  }, [notify])

  useEffect(() => { load(tab) }, [tab, load])

  const SC: Record<string, string> = { pending: '#f59e0b', confirmed: '#3b82f6', delivered: '#22c55e', cancelled: '#ef4444' }
  const SL: Record<string, string> = { pending: 'قيد الانتظار', confirmed: 'تم التأكيد', delivered: 'تم التوصيل', cancelled: 'ملغي' }

  async function changeStatus(id: string, status: ApiOrder['status']) {
    try { await apiUpdateOrderStatus(id, status); setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o)); notify('تم التحديث ✓') }
    catch { notify('فشل') }
  }

  async function toggleProduct(id: number, active: boolean) {
    try {
      const res = await apiUpdateProduct(id, { active })
      setAllProducts(prev => prev.map(p => p.id === id ? (res.product || { ...p, active }) : p))
      setProducts(prev => active ? [...prev, allProducts.find(p => p.id === id)!].filter(Boolean) : prev.filter(p => p.id !== id))
      notify(active ? 'تم تفعيل المنتج ✓' : 'تم إيقاف المنتج')
    } catch { notify('فشل') }
  }

  async function deleteUser(id: number) {
    if (!confirm('هل أنت متأكد من حذف هذا المستخدم؟')) return
    try { await apiDeleteUser(id); setUsers(prev => prev.filter(u => u.id !== id)); notify('تم الحذف ✓') }
    catch (e: unknown) { notify((e as Error).message) }
  }

  async function markRead(id: number) {
    try { await apiMarkContactRead(id); setMessages(prev => prev.map(m => m.id === id ? { ...m, read: true } : m)) }
    catch {}
  }

  const TABS = [
    { k: 'dashboard', l: '📊 لوحة القيادة' },
    { k: 'orders', l: '📦 الطلبات' },
    { k: 'products', l: '🍯 المنتجات' },
    { k: 'users', l: '👥 المستخدمون' },
    { k: 'messages', l: '✉️ الرسائل' },
  ] as const

  return (
    <div className="max-w-7xl mx-auto px-4 py-10">
      <div className="flex items-center gap-3 mb-7">
        <h1 className="font-display text-3xl font-bold" style={{ color: '#3d1c02' }}>لوحة التحكم</h1>
        <span className="px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#fde68a', color: '#92400e' }}>تعاونية تاوردة</span>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-7 p-1 rounded-2xl" style={{ background: '#f5e8d0' }}>
        {TABS.map(t => (
          <button key={t.k} onClick={() => setTab(t.k)}
            className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
            style={{ background: tab === t.k ? '#c9850a' : 'transparent', color: tab === t.k ? '#fff8e8' : '#6b3a2a' }}>
            {t.l}
          </button>
        ))}
      </div>

      {loading ? <SpinnerPage /> : (
        <>
          {/* DASHBOARD */}
          {tab === 'dashboard' && dashboard && (
            <div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-7">
                {[
                  { l: 'إجمالي الطلبات', v: dashboard.stats.totalOrders, i: '📦', c: '#3b82f6' },
                  { l: 'الإيرادات (د)', v: dashboard.stats.totalRevenue, i: '💰', c: '#c9850a' },
                  { l: 'المستخدمون', v: dashboard.stats.totalUsers, i: '👥', c: '#8b5cf6' },
                  { l: 'قيد الانتظار', v: dashboard.stats.pending, i: '⏳', c: '#f59e0b' },
                ].map(s => (
                  <div key={s.l} className="p-5 rounded-2xl border text-center" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
                    <div className="text-3xl mb-1">{s.i}</div>
                    <div className="text-2xl font-bold" style={{ color: s.c }}>{s.v}</div>
                    <div className="text-xs mt-1" style={{ color: '#8b6244' }}>{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Revenue chart */}
                <div className="p-6 rounded-2xl border" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
                  <h3 className="font-bold text-lg mb-5" style={{ color: '#3d1c02' }}>الإيرادات آخر 7 أيام</h3>
                  <div className="flex items-end gap-2 h-32">
                    {dashboard.revenueByDay.map((d, i) => {
                      const maxRev = Math.max(1, ...dashboard.revenueByDay.map(x => x.revenue))
                      const h = Math.round((d.revenue / maxRev) * 100)
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1">
                          <div className="text-xs font-bold" style={{ color: '#c9850a' }}>{d.revenue > 0 ? d.revenue : ''}</div>
                          <div className="w-full rounded-t-lg transition-all" style={{ height: `${Math.max(4, h)}%`, background: h > 60 ? '#c9850a' : '#e8d5b0', minHeight: '4px' }} />
                          <div className="text-xs" style={{ color: '#8b6244' }}>{d.date.slice(5)}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {/* Top products */}
                <div className="p-6 rounded-2xl border" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
                  <h3 className="font-bold text-lg mb-5" style={{ color: '#3d1c02' }}>أكثر المنتجات مبيعاً</h3>
                  {dashboard.topProducts.length === 0 ? <p className="text-sm" style={{ color: '#8b6244' }}>لا توجد مبيعات بعد</p> : (
                    <div className="flex flex-col gap-3">
                      {dashboard.topProducts.map((p, i) => (
                        <div key={i} className="flex items-center gap-3">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: i === 0 ? '#f5c842' : '#e8d5b0', color: '#3d1c02' }}>{i + 1}</div>
                          <div className="flex-1 font-semibold text-sm" style={{ color: '#3d1c02' }}>{p.name}</div>
                          <div className="text-sm font-bold" style={{ color: '#c9850a' }}>{p.qty} وحدة</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Order status summary */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
                {[
                  { l: 'قيد الانتظار', v: dashboard.stats.pending, c: '#f59e0b' },
                  { l: 'تم التأكيد', v: dashboard.stats.confirmed, c: '#3b82f6' },
                  { l: 'تم التوصيل', v: dashboard.stats.delivered, c: '#22c55e' },
                  { l: 'ملغية', v: dashboard.stats.cancelled, c: '#ef4444' },
                ].map(s => (
                  <div key={s.l} className="p-4 rounded-xl border text-center" style={{ background: `${s.c}10`, borderColor: `${s.c}40` }}>
                    <div className="text-xl font-bold" style={{ color: s.c }}>{s.v}</div>
                    <div className="text-xs mt-0.5" style={{ color: '#6b3a2a' }}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
              <div className="p-5 border-b flex items-center justify-between" style={{ borderColor: '#e8d5b0' }}>
                <h2 className="font-bold text-xl" style={{ color: '#3d1c02' }}>قائمة الطلبات ({orders.length})</h2>
              </div>
              {!orders.length ? <div className="p-12 text-center" style={{ color: '#8b6244' }}>لا توجد طلبات بعد</div> : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead><tr style={{ background: '#f5e8d0' }}>
                      {['رقم الطلب', 'الزبون', 'الهاتف', 'المدينة', 'المبلغ', 'الدفع', 'الحالة', 'تغيير'].map(h => (
                        <th key={h} className="px-4 py-3 text-right font-bold whitespace-nowrap" style={{ color: '#6b3a2a' }}>{h}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {orders.map((o, i) => (
                        <tr key={o.id} className="border-t" style={{ borderColor: '#e8d5b0', background: i % 2 ? 'transparent' : '#fffdf5' }}>
                          <td className="px-4 py-3 font-mono text-xs" style={{ color: '#c9850a' }}>{o.id}</td>
                          <td className="px-4 py-3 font-semibold" style={{ color: '#3d1c02' }}>{o.name}</td>
                          <td className="px-4 py-3" style={{ color: '#6b3a2a', direction: 'ltr' }}>{o.phone}</td>
                          <td className="px-4 py-3" style={{ color: '#6b3a2a' }}>{o.city}</td>
                          <td className="px-4 py-3 font-bold whitespace-nowrap" style={{ color: '#c9850a' }}>{o.total} د</td>
                          <td className="px-4 py-3 whitespace-nowrap" style={{ color: '#6b3a2a' }}>{o.payment === 'cash' ? '💵 نقداً' : '💳 بطاقة'}</td>
                          <td className="px-4 py-3"><span className="px-2 py-0.5 rounded-full text-xs font-bold whitespace-nowrap" style={{ background: `${SC[o.status]}20`, color: SC[o.status] }}>{SL[o.status]}</span></td>
                          <td className="px-4 py-3">
                            <select value={o.status} onChange={e => changeStatus(o.id, e.target.value as ApiOrder['status'])}
                              className="text-xs px-2 py-1 rounded-lg border outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}>
                              <option value="pending">قيد الانتظار</option>
                              <option value="confirmed">تم التأكيد</option>
                              <option value="delivered">تم التوصيل</option>
                              <option value="cancelled">ملغي</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* PRODUCTS */}
          {tab === 'products' && (
            <div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {allProducts.map(p => (
                  <div key={p.id} className="rounded-2xl border overflow-hidden" style={{ background: '#fff8e8', borderColor: '#e8d5b0', opacity: p.active ? 1 : 0.55 }}>
                    <div className="relative">
                      <img src={p.image} alt={p.name_ar} className="w-full h-36 object-cover" />
                      <div className="absolute top-2 left-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: p.active ? '#dcfce7' : '#fee2e2', color: p.active ? '#16a34a' : '#dc2626' }}>
                          {p.active ? 'نشط' : 'موقوف'}
                        </span>
                      </div>
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold mb-0.5" style={{ color: '#3d1c02' }}>{p.name_ar}</h3>
                      <p className="text-xs mb-3" style={{ color: '#8b6244' }}>{p.name_fr}</p>
                      <div className="flex flex-wrap gap-1 mb-3">
                        {Object.entries(p.prices).map(([s, v]) => (
                          <span key={s} className="text-xs px-2 py-0.5 rounded" style={{ background: '#f5e8d0', color: '#6b3a2a' }}>{s}: {v}د</span>
                        ))}
                      </div>
                      <button onClick={() => toggleProduct(p.id, !p.active)}
                        className="w-full py-2 rounded-xl text-sm font-bold transition-all"
                        style={{ background: p.active ? '#fee2e2' : '#dcfce7', color: p.active ? '#dc2626' : '#16a34a' }}>
                        {p.active ? 'إيقاف المنتج' : 'تفعيل المنتج'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div className="rounded-2xl border overflow-hidden" style={{ background: '#fff8e8', borderColor: '#e8d5b0' }}>
              <div className="p-5 border-b" style={{ borderColor: '#e8d5b0' }}>
                <h2 className="font-bold text-xl" style={{ color: '#3d1c02' }}>المستخدمون ({users.length})</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr style={{ background: '#f5e8d0' }}>
                    {['#', 'الاسم', 'البريد الإلكتروني', 'النوع', 'تاريخ التسجيل', 'إجراء'].map(h => (
                      <th key={h} className="px-4 py-3 text-right font-bold" style={{ color: '#6b3a2a' }}>{h}</th>
                    ))}
                  </tr></thead>
                  <tbody>
                    {users.map((u, i) => (
                      <tr key={u.id} className="border-t" style={{ borderColor: '#e8d5b0', background: i % 2 ? 'transparent' : '#fffdf5' }}>
                        <td className="px-4 py-3 font-mono text-xs" style={{ color: '#8b6244' }}>{u.id}</td>
                        <td className="px-4 py-3 font-semibold" style={{ color: '#3d1c02' }}>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: '#e8a21a', color: '#3d1c02' }}>{u.name[0]}</div>
                            {u.name}
                          </div>
                        </td>
                        <td className="px-4 py-3" style={{ color: '#6b3a2a', direction: 'ltr' }}>{u.email}</td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-xs font-bold" style={{ background: u.is_admin ? '#fde68a' : '#e8d5b0', color: u.is_admin ? '#92400e' : '#6b3a2a' }}>
                            {u.is_admin ? 'مدير' : 'زبون'}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-xs" style={{ color: '#8b6244' }}>{u.created_at?.slice(0, 10)}</td>
                        <td className="px-4 py-3">
                          {!u.is_admin && (
                            <button onClick={() => deleteUser(u.id)} className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ background: '#fee2e2', color: '#dc2626' }}>حذف</button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MESSAGES */}
          {tab === 'messages' && (
            <div className="flex flex-col gap-4">
              <h2 className="font-bold text-xl" style={{ color: '#3d1c02' }}>رسائل التواصل ({messages.filter(m => !m.read).length} غير مقروءة)</h2>
              {!messages.length ? <div className="p-12 text-center rounded-2xl border" style={{ borderColor: '#e8d5b0', color: '#8b6244' }}>لا توجد رسائل</div> : (
                messages.map(m => (
                  <div key={m.id} className="p-5 rounded-2xl border" style={{ background: m.read ? '#fffdf5' : '#fff8e8', borderColor: m.read ? '#e8d5b0' : '#c9850a' }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: '#e8a21a', color: '#3d1c02' }}>{m.name[0]}</div>
                        <div>
                          <div className="font-bold" style={{ color: '#3d1c02' }}>{m.name}</div>
                          <div className="text-xs" style={{ color: '#8b6244' }}>{m.phone || m.email || '—'} · {m.created_at?.slice(0, 10)}</div>
                        </div>
                      </div>
                      {!m.read && (
                        <button onClick={() => markRead(m.id)} className="text-xs px-3 py-1 rounded-lg font-semibold flex-shrink-0" style={{ background: '#dcfce7', color: '#16a34a' }}>
                          تحديد كمقروء
                        </button>
                      )}
                    </div>
                    <p className="text-sm leading-relaxed p-3 rounded-xl" style={{ background: '#fdf8f0', color: '#3d1c02' }}>{m.message}</p>
                    <div className="flex gap-3 mt-3">
                      {m.phone && <a href={`https://wa.me/212${m.phone.replace(/^0/, '')}`} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ background: '#25D366', color: '#fff' }}>واتساب</a>}
                      {m.phone && <a href={`tel:${m.phone}`} className="text-xs px-3 py-1 rounded-lg font-semibold" style={{ background: '#f5e8d0', color: '#6b3a2a' }}>اتصل</a>}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

// ─── Product Modal ────────────────────────────────────────────────────────────
function ProductModal({ product, addToCart, onClose, selSize, setSelSize }: {
  product: ApiProduct; addToCart: (p: ApiProduct, s: string) => void; onClose: () => void
  selSize: Record<number, string>; setSelSize: React.Dispatch<React.SetStateAction<Record<number, string>>>
}) {
  const sizes = Object.keys(product.prices)
  const cur = selSize[product.id] || sizes[0]
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(61,28,2,0.72)', backdropFilter: 'blur(4px)' }} onClick={onClose}>
      <div className="w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fadeIn" style={{ background: '#fff8e8' }} onClick={e => e.stopPropagation()}>
        <div className="relative">
          <img src={product.image} alt={product.name_ar} className="w-full h-60 object-cover" />
          <button onClick={onClose} className="absolute top-3 left-3 w-9 h-9 rounded-full flex items-center justify-center font-bold" style={{ background: 'rgba(61,28,2,0.75)', color: '#fde68a' }}>✕</button>
          {product.badge && <span className="absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#c9850a', color: '#fff8e8' }}>{product.badge}</span>}
        </div>
        <div className="p-6">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-display text-2xl font-bold" style={{ color: '#3d1c02' }}>{product.name_ar}</h2>
            <span className="text-sm" style={{ color: '#8b6244' }}>{product.name_fr}</span>
          </div>
          <Stars />
          <p className="mt-3 text-sm leading-loose" style={{ color: '#6b3a2a' }}>{product.description}</p>
          <div className="mt-3 p-3 rounded-xl text-sm" style={{ background: '#fef3c7', color: '#92400e' }}>
            <span className="font-bold">✨ الفوائد: </span>{product.benefits}
          </div>
          <div className="mt-4 mb-4">
            <div className="text-sm font-semibold mb-2" style={{ color: '#6b3a2a' }}>اختر الحجم:</div>
            <div className="flex flex-wrap gap-2">
              {sizes.map(s => (
                <button key={s} onClick={() => setSelSize(p => ({ ...p, [product.id]: s }))}
                  className="px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all"
                  style={{ borderColor: cur === s ? '#c9850a' : '#e8d5b0', background: cur === s ? '#c9850a' : 'transparent', color: cur === s ? '#fff8e8' : '#6b3a2a' }}>
                  {s} — {product.prices[s]} درهم
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-2xl font-bold" style={{ color: '#c9850a' }}>{product.prices[cur]} <span className="text-sm font-medium">درهم</span></div>
            <button onClick={() => { addToCart(product, cur); onClose() }} className="btn-primary flex-1 py-3 rounded-xl font-bold text-lg">أضف إلى السلة 🍯</button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Login Modal ──────────────────────────────────────────────────────────────
function LoginModal({ onClose, setUser, notify }: {
  onClose: () => void; setUser: (u: ApiUser) => void; notify: (m: string) => void
}) {
  const [tab, setTab] = useState<'login' | 'register'>('login')
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [err, setErr] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit() {
    setErr(''); setBusy(true)
    try {
      const u = tab === 'login' ? await apiLogin(form.email, form.password) : await apiRegister(form.name, form.email, form.password)
      setUser(u); notify(`مرحباً ${u.name}!`); onClose()
    } catch (e: unknown) { setErr((e as Error).message) }
    finally { setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: 'rgba(61,28,2,0.78)', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="w-full max-w-sm rounded-3xl p-6 shadow-2xl animate-fadeIn" style={{ background: '#fff8e8' }} onClick={e => e.stopPropagation()}>
        <div className="text-center mb-5">
          <img src={logoImg} alt="تاوردة" className="w-16 h-16 rounded-full mx-auto mb-2 object-cover" />
          <div className="font-display text-xl font-bold" style={{ color: '#3d1c02' }}>تعاونية تاوردة</div>
        </div>
        <div className="flex rounded-xl overflow-hidden mb-5 border" style={{ borderColor: '#e8d5b0' }}>
          {(['login', 'register'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setErr('') }}
              className="flex-1 py-2.5 text-sm font-bold transition-all"
              style={{ background: tab === t ? '#c9850a' : 'transparent', color: tab === t ? '#fff8e8' : '#6b3a2a' }}>
              {t === 'login' ? 'تسجيل الدخول' : 'إنشاء حساب'}
            </button>
          ))}
        </div>
        <div className="flex flex-col gap-3">
          {tab === 'register' && (
            <input type="text" placeholder="الاسم الكامل" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02' }}
              onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
          )}
          <input type="email" placeholder="البريد الإلكتروني" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
            className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02', direction: 'ltr' }}
            onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
          <input type="password" placeholder="كلمة المرور" value={form.password} onChange={e => setForm(p => ({ ...p, password: e.target.value }))}
            onKeyDown={e => e.key === 'Enter' && submit()}
            className="w-full px-4 py-3 rounded-xl border-2 text-sm outline-none" style={{ borderColor: '#e8d5b0', background: '#fdf8f0', color: '#3d1c02', direction: 'ltr' }}
            onFocus={e => e.target.style.borderColor = '#c9850a'} onBlur={e => e.target.style.borderColor = '#e8d5b0'} />
          {err && <div className="text-xs px-3 py-2 rounded-lg" style={{ background: '#fee2e2', color: '#dc2626' }}>{err}</div>}
          <button onClick={submit} disabled={busy} className="btn-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 disabled:opacity-60">
            {busy && <Spinner size="sm" />}
            {tab === 'login' ? 'دخول' : 'إنشاء الحساب'}
          </button>
          {tab === 'login' && (
            <div className="text-xs text-center p-2 rounded-lg" style={{ background: '#fef3c7', color: '#92400e' }}>
              <span className="font-bold">المدير:</span> admin@tawarda.ma / tawarda2024
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function Footer({ setPage }: { setPage: (p: Page) => void }) {
  return (
    <footer className="py-12 px-6" style={{ background: '#3d1c02' }}>
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <img src={logoImg} alt="تاوردة" className="w-12 h-12 rounded-full object-cover border-2" style={{ borderColor: '#e8a21a' }} />
              <div>
                <div className="font-display font-bold" style={{ color: '#f5c842' }}>تعاونية تاوردة</div>
                <div className="text-xs" style={{ color: '#c8a87a' }}>لتربية النحل وانتاج العسل</div>
              </div>
            </div>
            <p className="text-sm leading-relaxed mb-3" style={{ color: '#c8a87a' }}>اعسال طبيعية من جبال شفشاون الشامخة — من الجبل مباشرةً إليك</p>
            <p className="text-xs font-semibold" style={{ color: '#c9850a' }}>✓ حاصلة على رقم الاعتماد الصحي</p>
          </div>
          <div>
            <h3 className="font-bold mb-3 text-sm" style={{ color: '#fde68a' }}>روابط سريعة</h3>
            <div className="flex flex-col gap-2">
              {[{ l: 'الرئيسية', p: 'home' as Page }, { l: 'منتجاتنا', p: 'shop' as Page }, { l: 'من نحن', p: 'about' as Page }, { l: 'تواصل معنا', p: 'contact' as Page }].map(lnk => (
                <button key={lnk.l} onClick={() => setPage(lnk.p)} className="text-right text-sm hover:underline" style={{ color: '#c8a87a' }}>{lnk.l}</button>
              ))}
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-3 text-sm" style={{ color: '#fde68a' }}>تواصل معنا</h3>
            <div className="flex flex-col gap-2 text-sm" style={{ color: '#c8a87a' }}>
              <a href="tel:0662782489" className="hover:text-yellow-300">📞 0662782489</a>
              <a href="https://wa.me/212662782489" target="_blank" rel="noopener noreferrer" className="hover:text-green-400">💬 واتساب</a>
              <p>📍 جماعة لغدير، شفشاون</p>
              <div className="flex gap-2 mt-1">
                {['💵 نقداً', '💳 بطاقة'].map(t => <span key={t} className="text-xs px-2 py-1 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)', color: '#e8d5b0' }}>{t}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div className="border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs" style={{ borderColor: '#4a2510', color: '#6b4a30' }}>
          <span>© 2024 تعاونية تاوردة — جميع الحقوق محفوظة</span>
          <span>صُنع بـ ❤️ في جبال شفشاون المغربية</span>
        </div>
      </div>
    </footer>
  )
}
