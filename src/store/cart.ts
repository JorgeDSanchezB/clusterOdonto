/**
 * STORE — slice cart: carrito de servicios del sitio público.
 * Persistido en localStorage y aislado por tenant (multi-tenant estricto).
 */
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

export interface CartItem {
  serviceId: string
  name: string
  price: number
  qty: number
  imageUrl: string | null
  durationMin: number
}

interface CartState {
  tenantSlug: string
  items: CartItem[]
  customerName: string
  customerPhone: string
  /** true cuando zustand terminó de hidratar desde localStorage */
  hydrated: boolean
  markHydrated: () => void
  ensureTenant: (slug: string) => void
  setQty: (serviceId: string, qty: number) => void
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  clear: () => void
  setCustomer: (name: string, phone: string) => void
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      tenantSlug: 'demo',
      items: [],
      customerName: '',
      customerPhone: '',
      hydrated: false,
      markHydrated: () => set({ hydrated: true }),
      ensureTenant: (slug) => {
        if (get().tenantSlug !== slug) set({ tenantSlug: slug, items: [] })
      },
      setQty: (serviceId, qty) => {
        if (qty <= 0) {
          set({ items: get().items.filter((i) => i.serviceId !== serviceId) })
          return
        }
        set({
          items: get().items.map((i) => (i.serviceId === serviceId ? { ...i, qty: Math.min(qty, 50) } : i)),
        })
      },
      addItem: (item, qty = 1) => {
        const existing = get().items.find((i) => i.serviceId === item.serviceId)
        if (existing) {
          get().setQty(item.serviceId, existing.qty + qty)
          return
        }
        set({ items: [...get().items, { ...item, qty }] })
      },
      clear: () => set({ items: [] }),
      setCustomer: (customerName, customerPhone) => set({ customerName, customerPhone }),
    }),
    {
      name: 'odts-cart',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        tenantSlug: s.tenantSlug,
        items: s.items,
        customerName: s.customerName,
        customerPhone: s.customerPhone,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated()
      },
    },
  ),
)

/** Selectores derivados. */
export const cartCount = (s: CartState) => s.items.reduce((n, i) => n + i.qty, 0)
export const cartSubtotal = (s: CartState) => s.items.reduce((n, i) => n + i.price * i.qty, 0)
