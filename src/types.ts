export type Role = 'client' | 'store' | 'delivery' | 'admin' | 'staff';

export type StaffPermission = 'orders' | 'inventory' | 'payments' | 'settings';

export interface StoreStaffMember {
  storeId: string;
  userId: string;
  name: string;
  email: string;
  permissions: StaffPermission[];
  active: boolean;
  createdAt?: string;
}

export type OrderStatus =
  | 'pending'
  | 'accepted'
  | 'preparing'
  | 'ready'
  | 'assigned'
  | 'picked_up'
  | 'in_transit'
  | 'delivered'
  | 'cancelled';

export type PaymentMethod = 'Pago simulado' | 'Pago contra entrega';

export interface Storefront {
  id: string;
  ownerId?: string;
  name: string;
  type: string;
  rating: number;
  distanceKm: number;
  deliveryMinutes: string;
  deliveryFee: number;
  imageUrl: string;
  address: string;
  zone: string;
  phone: string;
  schedule: string;
  open: boolean;
  tags: string[];
}

export interface Product {
  id: string;
  storeId: string;
  name: string;
  description: string;
  price: number;
  category: string;
  imageUrl: string;
  available: boolean;
  stock: number;
  options: string[];
}

export interface CartItem {
  productId: string;
  quantity: number;
  option?: string;
}

export interface OrderItem {
  productId: string;
  name: string;
  quantity: number;
  price: number;
  option?: string;
}

export interface Order {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string;
  customerRegistered: boolean;
  address: string;
  storeId: string;
  status: OrderStatus;
  items: OrderItem[];
  subtotal: number;
  deliveryFee: number;
  courierReward: number;
  storeCommission: number;
  courierCommission: number;
  createdAt: string;
  updatedAt?: string;
  distanceKm: number;
  paymentMethod: PaymentMethod;
  notes?: string;
  assignedDeliveryId?: string;
}

export interface DeliveryAgent {
  id: string;
  name: string;
  vehicle: string;
  rating: number;
  completedToday: number;
  earningsToday: number;
  status: 'available' | 'busy' | 'offline';
  serviceStatus?: 'available' | 'offline';
}

export interface AppUser {
  id: string;
  name: string;
  role: Role;
  phone: string;
  email?: string;
  active?: boolean;
  createdAt?: string;
  savedAddresses?: string[];
}

export interface ServiceSettings {
  baseFee: number;
  perKm: number;
  minFee: number;
  rounding: number;
  nightEnabled: boolean;
  nightStart: string;
  nightEnd: string;
  nightSurchargePct: number;
  timezone: string;
  storeCommissionEnabled: boolean;
  storeCommissionPct: number;
  courierCommissionEnabled: boolean;
  courierCommissionPct: number;
  updatedAt?: string;
}

export type PaymentMethodType = 'pago_movil' | 'binance' | 'efectivo';

export interface StorePaymentMethod {
  storeId: string;
  type: PaymentMethodType;
  enabled: boolean;
  details: Record<string, string>;
  updatedAt?: string;
}
