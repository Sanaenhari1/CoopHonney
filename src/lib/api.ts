// ─── Types ───────────────────────────────────────────────────────────────────
export interface ApiUser {
  id: number
  name: string
  email: string
  is_admin?: boolean
  isAdmin: boolean
  created_at?: string
}

export interface ApiProduct {
  id: number
  name_ar: string
  name_fr: string
  description: string
  benefits: string
  image: string
  prices: Record<string, number>
  badge?: string | null
  active: boolean
}

export interface ApiOrderItem {
  productId: number
  nameAr: string
  size: string
  qty: number
  price: number
}

export interface ApiOrder {
  id: string
  user_id: number | null
  items: ApiOrderItem[]
  total: number
  delivery: number
  name: string
  phone: string
  city: string
  address: string
  payment: 'cash' | 'card'
  status: 'pending' | 'confirmed' | 'delivered' | 'cancelled'
  notes?: string
  created_at: string
}

export interface ApiStats {
  total: number
  pending: number
  confirmed: number
  delivered: number
  revenue: number
}

export interface DashboardData {
  stats: {
    totalOrders: number
    totalRevenue: number
    totalUsers: number
    pending: number
    confirmed: number
    delivered: number
    cancelled: number
  }
  revenueByDay: { date: string; orders: number; revenue: number }[]
  topProducts: { name: string; qty: number }[]
  recentOrders: ApiOrder[]
}

export interface ContactMessage {
  id: number
  name: string
  phone: string
  email: string
  message: string
  created_at: string
  read: boolean
}

// ─── Token storage ────────────────────────────────────────────────────────────
const TOKEN_KEY = 'tawarda_token'
export function getToken() { return localStorage.getItem(TOKEN_KEY) }
export function setToken(t: string) { localStorage.setItem(TOKEN_KEY, t) }
export function clearToken() { localStorage.removeItem(TOKEN_KEY) }

// ─── Base fetch ───────────────────────────────────────────────────────────────
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`/api${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...((options.headers as Record<string, string>) ?? {}),
    },
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'خطأ في الخادم')
  return data as T
}

// ─── Auth ─────────────────────────────────────────────────────────────────────
export async function apiLogin(email: string, password: string) {
  const data = await apiFetch<{ token: string; user: ApiUser }>('/auth/login', {
    method: 'POST', body: JSON.stringify({ email, password }),
  })
  setToken(data.token)
  return data.user
}

export async function apiRegister(name: string, email: string, password: string) {
  const data = await apiFetch<{ token: string; user: ApiUser }>('/auth/register', {
    method: 'POST', body: JSON.stringify({ name, email, password }),
  })
  setToken(data.token)
  return data.user
}

export async function apiMe(): Promise<ApiUser | null> {
  try {
    const data = await apiFetch<{ user: ApiUser }>('/auth/me')
    return data.user
  } catch { return null }
}

// ─── Products ─────────────────────────────────────────────────────────────────
export function apiGetProducts() { return apiFetch<ApiProduct[]>('/products') }
export function apiGetAllProducts() { return apiFetch<ApiProduct[]>('/products/all') }

export function apiCreateProduct(data: Omit<ApiProduct, 'id' | 'active'>) {
  return apiFetch<ApiProduct>('/products', { method: 'POST', body: JSON.stringify(data) })
}

export function apiUpdateProduct(id: number, data: Partial<ApiProduct>) {
  return apiFetch<{ ok: boolean; product: ApiProduct }>(`/products/${id}`, {
    method: 'PATCH', body: JSON.stringify(data),
  })
}

export function apiDeleteProduct(id: number) {
  return apiFetch<{ ok: boolean }>(`/products/${id}`, { method: 'DELETE' })
}

// ─── Orders ───────────────────────────────────────────────────────────────────
export interface PlaceOrderPayload {
  items: ApiOrderItem[]
  name: string
  phone: string
  city: string
  address: string
  payment: 'cash' | 'card'
  notes?: string
}

export function apiPlaceOrder(payload: PlaceOrderPayload) {
  return apiFetch<{ id: string; total: number; delivery: number }>('/orders', {
    method: 'POST', body: JSON.stringify(payload),
  })
}

export function apiGetOrders() { return apiFetch<ApiOrder[]>('/orders') }
export function apiGetOrderStats() { return apiFetch<ApiStats>('/orders/stats') }

export function apiUpdateOrderStatus(id: string, status: ApiOrder['status']) {
  return apiFetch<{ ok: boolean }>(`/orders/${id}/status`, {
    method: 'PATCH', body: JSON.stringify({ status }),
  })
}

// ─── Admin ────────────────────────────────────────────────────────────────────
export function apiGetAdminUsers() { return apiFetch<ApiUser[]>('/admin/users') }
export function apiDeleteUser(id: number) {
  return apiFetch<{ ok: boolean }>(`/admin/users/${id}`, { method: 'DELETE' })
}
export function apiGetDashboard() { return apiFetch<DashboardData>('/admin/dashboard') }

// ─── Contact ──────────────────────────────────────────────────────────────────
export function apiSendContact(data: { name: string; phone?: string; email?: string; message: string }) {
  return apiFetch<{ ok: boolean; message: string }>('/contact', {
    method: 'POST', body: JSON.stringify(data),
  })
}

export function apiGetContacts() { return apiFetch<ContactMessage[]>('/contact') }
export function apiMarkContactRead(id: number) {
  return apiFetch<{ ok: boolean }>(`/contact/${id}/read`, { method: 'PATCH' })
}

// ─── Health ───────────────────────────────────────────────────────────────────
export async function apiHealth(): Promise<boolean> {
  try { await apiFetch('/health'); return true } catch { return false }
}
