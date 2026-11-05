import { supabase } from './supabase';
import type { StaffPermission, StoreStaffMember, StorePaymentMethod, PaymentMethodType, ServiceSettings, AppUser, DeliveryAgent, Order, OrderStatus, PaymentMethod, Product, Role, Storefront } from '../types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const num = (value: unknown) => Number(value ?? 0);

export const mapStore = (r: Row): Storefront => ({
  id: r.id,
  ownerId: r.owner_id ?? undefined,
  name: r.name,
  type: r.type,
  rating: num(r.rating),
  distanceKm: num(r.distance_km),
  deliveryMinutes: r.delivery_minutes,
  deliveryFee: num(r.delivery_fee),
  imageUrl: r.image_url,
  address: r.address,
  zone: r.zone,
  phone: r.phone,
  schedule: r.schedule,
  open: r.open,
  tags: r.tags ?? [],
});

export const mapProduct = (r: Row): Product => ({
  id: r.id,
  storeId: r.store_id,
  name: r.name,
  description: r.description,
  price: num(r.price),
  category: r.category,
  imageUrl: r.image_url,
  available: r.available,
  stock: r.stock,
  options: r.options ?? [],
});

const productToRow = (p: Omit<Product, 'id'>) => ({
  store_id: p.storeId,
  name: p.name,
  description: p.description,
  price: p.price,
  category: p.category,
  image_url: p.imageUrl,
  available: p.available,
  stock: p.stock,
  options: p.options,
});

export const mapOrder = (r: Row): Order => ({
  id: r.id,
  customerId: r.customer_id ?? undefined,
  customerName: r.customer_name,
  customerPhone: r.customer_phone,
  customerRegistered: Boolean(r.customer_id),
  address: r.address,
  storeId: r.store_id,
  status: r.status,
  items: (r.order_items ?? []).map((i: Row) => ({
    productId: i.product_id ?? '',
    name: i.name,
    quantity: i.quantity,
    price: num(i.price),
    option: i.option ?? undefined,
  })),
  subtotal: num(r.subtotal),
  deliveryFee: num(r.delivery_fee),
  courierReward: num(r.courier_reward),
  storeCommission: num(r.store_commission),
  courierCommission: num(r.courier_commission),
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  distanceKm: num(r.distance_km),
  paymentMethod: r.payment_method as PaymentMethod,
  notes: r.notes ?? undefined,
  assignedDeliveryId: r.assigned_delivery_id ?? undefined,
});

export const mapProfile = (r: Row): AppUser => ({
  id: r.id,
  name: r.name,
  phone: r.phone,
  role: r.role as Role,
  email: r.email ?? '',
  active: r.active ?? true,
  createdAt: r.created_at,
  savedAddresses: r.saved_addresses ?? [],
});

const isToday = (iso?: string) => {
  if (!iso) return false;
  const d = new Date(iso);
  const now = new Date();
  return d.toDateString() === now.toDateString();
};

export const buildDeliveryAgents = (rows: Row[], orders: Order[]): DeliveryAgent[] =>
  rows.map((r) => {
    const mine = orders.filter((o) => o.assignedDeliveryId === r.id);
    const doneToday = mine.filter((o) => o.status === 'delivered' && isToday(o.updatedAt ?? o.createdAt));
    const busy = mine.some((o) => !['delivered', 'cancelled'].includes(o.status));
    return {
      id: r.id,
      name: r.name || 'Repartidor',
      serviceStatus: r.service_status,
      vehicle: r.vehicle,
      rating: num(r.rating),
      completedToday: doneToday.length,
      earningsToday: Number(doneToday.reduce((t, o) => t + o.courierReward, 0).toFixed(2)),
      status: r.service_status === 'offline' ? 'offline' : busy ? 'busy' : 'available',
    };
  });

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message);
};

export async function fetchCatalog() {
  const [stores, products] = await Promise.all([
    supabase.from('stores').select('*').order('created_at'),
    supabase.from('products').select('*').order('created_at'),
  ]);
  fail(stores.error);
  fail(products.error);
  return { stores: (stores.data ?? []).map(mapStore), products: (products.data ?? []).map(mapProduct) };
}

export async function fetchOrders() {
  const { data, error } = await supabase
    .from('orders')
    .select('*, order_items(*)')
    .order('created_at', { ascending: false })
    .limit(300);
  fail(error);
  return (data ?? []).map(mapOrder);
}

export async function fetchDeliveryRows() {
  const { data, error } = await supabase.from('delivery_agents').select('*');
  fail(error);
  return data ?? [];
}

export async function fetchProfiles() {
  const { data, error } = await supabase.from('profiles').select('*');
  fail(error);
  return (data ?? []).map(mapProfile);
}

export async function fetchProfile(userId: string) {
  const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
  fail(error);
  return data ? mapProfile(data) : null;
}

export async function updateProfile(userId: string, updates: Partial<Pick<AppUser, 'name' | 'phone' | 'savedAddresses'>>) {
  const row: Row = {};
  if (updates.name !== undefined) row.name = updates.name;
  if (updates.phone !== undefined) row.phone = updates.phone;
  if (updates.savedAddresses !== undefined) row.saved_addresses = updates.savedAddresses;
  const { error } = await supabase.from('profiles').update(row).eq('id', userId);
  fail(error);
}

export async function placeOrder(input: {
  items: Array<{ productId: string; quantity: number; option?: string }>;
  customerName: string;
  customerPhone: string;
  address: string;
  paymentMethod: PaymentMethod;
  notes?: string;
}) {
  const { data, error } = await supabase.rpc('place_order', {
    p_items: input.items.map((i) => ({ product_id: i.productId, quantity: i.quantity, option: i.option ?? null })),
    p_customer_name: input.customerName,
    p_customer_phone: input.customerPhone,
    p_address: input.address,
    p_payment_method: input.paymentMethod,
    p_notes: input.notes ?? null,
  });
  fail(error);
  return (data ?? []) as string[];
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const { error } = await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: status });
  fail(error);
}

export async function acceptDelivery(orderId: string) {
  const { data, error } = await supabase.rpc('accept_delivery', { p_order_id: orderId });
  fail(error);
  return Boolean(data);
}

export async function setServiceStatus(deliveryId: string, status: 'available' | 'offline') {
  const { error } = await supabase.from('delivery_agents').update({ service_status: status }).eq('id', deliveryId);
  fail(error);
}

export async function insertProduct(product: Omit<Product, 'id'>) {
  const { error } = await supabase.from('products').insert(productToRow(product));
  fail(error);
}

export async function saveProduct(productId: string, product: Omit<Product, 'id'>) {
  const { error } = await supabase.from('products').update(productToRow(product)).eq('id', productId);
  fail(error);
}

export async function setProductAvailable(productId: string, available: boolean) {
  const { error } = await supabase.from('products').update({ available }).eq('id', productId);
  fail(error);
}

export async function setStoreOpen(storeId: string, open: boolean) {
  const { error } = await supabase.rpc('set_store_open', { p_store_id: storeId, p_open: open });
  fail(error);
}

/* ===== Administración ===== */
export type StoreInput = Omit<Storefront, 'id'>;

const storeToRow = (s: StoreInput) => ({
  owner_id: s.ownerId || null,
  name: s.name,
  type: s.type,
  rating: s.rating,
  distance_km: s.distanceKm,
  delivery_minutes: s.deliveryMinutes,
  delivery_fee: s.deliveryFee,
  image_url: s.imageUrl,
  address: s.address,
  zone: s.zone,
  phone: s.phone,
  schedule: s.schedule,
  open: s.open,
  tags: s.tags,
});

export async function createStore(store: StoreInput) {
  const { error } = await supabase.from('stores').insert(storeToRow(store));
  fail(error);
}

export async function saveStore(storeId: string, store: StoreInput) {
  const { error } = await supabase.from('stores').update(storeToRow(store)).eq('id', storeId);
  fail(error);
}

export async function deleteStore(storeId: string) {
  const { error } = await supabase.from('stores').delete().eq('id', storeId);
  if (error && /foreign key/i.test(error.message)) {
    throw new Error('La tienda tiene pedidos registrados. Desactívala (ciérrala) en lugar de borrarla.');
  }
  fail(error);
}

export async function deleteProduct(productId: string) {
  const { error } = await supabase.from('products').delete().eq('id', productId);
  fail(error);
}

export async function saveDeliveryAgent(id: string, updates: { vehicle?: string; rating?: number; serviceStatus?: 'available' | 'offline' }) {
  const row: Row = {};
  if (updates.vehicle !== undefined) row.vehicle = updates.vehicle;
  if (updates.rating !== undefined) row.rating = updates.rating;
  if (updates.serviceStatus !== undefined) row.service_status = updates.serviceStatus;
  const { error } = await supabase.from('delivery_agents').update(row).eq('id', id);
  fail(error);
}

export async function adminAssignDelivery(orderId: string, deliveryId: string | null) {
  const { error } = await supabase.rpc('admin_assign_delivery', { p_order_id: orderId, p_delivery_id: deliveryId });
  fail(error);
}

export async function adminUsers(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('admin-users', { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error ?? message;
    } catch {
      /* respuesta sin JSON */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

/* ===== Tarifas del servicio ===== */
export const defaultServiceSettings: ServiceSettings = {
  baseFee: 1,
  perKm: 0.5,
  minFee: 1.5,
  rounding: 0.1,
  nightEnabled: false,
  nightStart: '22:00',
  nightEnd: '06:00',
  nightSurchargePct: 20,
  timezone: 'America/Caracas',
  storeCommissionEnabled: false,
  storeCommissionPct: 10,
  courierCommissionEnabled: false,
  courierCommissionPct: 10,
};

export async function fetchServiceSettings(): Promise<ServiceSettings> {
  const { data, error } = await supabase.from('service_settings').select('*').eq('id', 1).maybeSingle();
  fail(error);
  if (!data) return defaultServiceSettings;
  return {
    baseFee: num(data.base_fee),
    perKm: num(data.per_km),
    minFee: num(data.min_fee),
    rounding: num(data.rounding),
    nightEnabled: data.night_enabled,
    nightStart: String(data.night_start).slice(0, 5),
    nightEnd: String(data.night_end).slice(0, 5),
    nightSurchargePct: num(data.night_surcharge_pct),
    timezone: data.timezone,
    storeCommissionEnabled: data.store_commission_enabled,
    storeCommissionPct: num(data.store_commission_pct),
    courierCommissionEnabled: data.courier_commission_enabled,
    courierCommissionPct: num(data.courier_commission_pct),
    updatedAt: data.updated_at,
  };
}

export async function saveServiceSettings(settings: ServiceSettings) {
  const { error } = await supabase
    .from('service_settings')
    .update({
      base_fee: settings.baseFee,
      per_km: settings.perKm,
      min_fee: settings.minFee,
      rounding: settings.rounding,
      night_enabled: settings.nightEnabled,
      night_start: settings.nightStart,
      night_end: settings.nightEnd,
      night_surcharge_pct: settings.nightSurchargePct,
      store_commission_enabled: settings.storeCommissionEnabled,
      store_commission_pct: settings.storeCommissionPct,
      courier_commission_enabled: settings.courierCommissionEnabled,
      courier_commission_pct: settings.courierCommissionPct,
    })
    .eq('id', 1);
  fail(error);
}

const localTime = (date: Date, timezone: string) =>
  new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timezone }).format(date);

export function isNightTime(settings: ServiceSettings, at = new Date()) {
  if (!settings.nightEnabled) return false;
  const now = localTime(at, settings.timezone);
  const { nightStart: start, nightEnd: end } = settings;
  return start <= end ? now >= start && now < end : now >= start || now < end;
}

/** Misma fórmula que el servidor (private.calc_delivery_fee). El servidor siempre decide el cobro final. */
export function calcDeliveryFee(settings: ServiceSettings, distanceKm: number, at = new Date(), forceNight?: boolean) {
  let fee = Math.max(settings.minFee, settings.baseFee + settings.perKm * Math.max(distanceKm, 0));
  const night = forceNight ?? isNightTime(settings, at);
  if (night) fee *= 1 + settings.nightSurchargePct / 100;
  if (settings.rounding > 0) fee = Math.ceil(Number((fee / settings.rounding).toFixed(6))) * settings.rounding;
  return Number(fee.toFixed(2));
}

/** Distancia que usa el servidor para cobrar (distancia de la tienda + margen de entrega). */
export const deliveryDistance = (storeDistanceKm: number) => Number((storeDistanceKm + 0.8).toFixed(1));

/* ===== Métodos de pago por tienda ===== */
export async function fetchStorePaymentMethods(storeId: string): Promise<StorePaymentMethod[]> {
  const { data, error } = await supabase.from('store_payment_methods').select('*').eq('store_id', storeId);
  fail(error);
  return (data ?? []).map((r) => ({
    storeId: r.store_id,
    type: r.type as PaymentMethodType,
    enabled: r.enabled,
    details: (r.details ?? {}) as Record<string, string>,
    updatedAt: r.updated_at,
  }));
}

export async function saveStorePaymentMethod(method: StorePaymentMethod) {
  const { error } = await supabase
    .from('store_payment_methods')
    .upsert(
      { store_id: method.storeId, type: method.type, enabled: method.enabled, details: method.details },
      { onConflict: 'store_id,type' },
    );
  fail(error);
}

export async function deleteStorePaymentMethod(storeId: string, type: PaymentMethodType) {
  const { error } = await supabase.from('store_payment_methods').delete().eq('store_id', storeId).eq('type', type);
  fail(error);
}

/* ===== Empleados de tienda ===== */
const mapStaff = (r: Row): StoreStaffMember => ({
  storeId: r.store_id,
  userId: r.user_id,
  name: r.name,
  email: r.email,
  permissions: (r.permissions ?? []) as StaffPermission[],
  active: r.active,
  createdAt: r.created_at,
});

export async function fetchMyStaffMemberships(userId: string) {
  const { data, error } = await supabase.from('store_staff').select('*').eq('user_id', userId).eq('active', true);
  fail(error);
  return (data ?? []).map(mapStaff);
}

export async function fetchStoreStaff(storeId: string) {
  const { data, error } = await supabase.from('store_staff').select('*').eq('store_id', storeId).order('created_at');
  fail(error);
  return (data ?? []).map(mapStaff);
}

export async function storeStaffAction(body: Record<string, unknown>) {
  const { data, error } = await supabase.functions.invoke('store-staff', { body });
  if (error) {
    let message = error.message;
    try {
      const ctx = (error as { context?: Response }).context;
      if (ctx) message = (await ctx.json()).error ?? message;
    } catch {
      /* sin JSON */
    }
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
