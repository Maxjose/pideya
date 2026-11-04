import { useMemo, useState, type ReactNode } from 'react';
import {
  Ban,
  Bike,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Package,
  PackageCheck,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Store,
  Trash2,
  Truck,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import pideyaLogo from '../assets/pideya-logo.png';
import * as api from '../lib/api';
import { ActionButton, EmptyState, InitialAvatar, SafeImage, StatusPill } from './Shared';
import type { AppUser, DeliveryAgent, Order, OrderStatus, Product, Role, Storefront } from '../types';
import { formatCurrency, statusLabels } from '../utils/format';

interface AdminPortalProps {
  currentUser: AppUser | null;
  stores: Storefront[];
  products: Product[];
  orders: Order[];
  users: AppUser[];
  deliveries: DeliveryAgent[];
  onRefresh: () => Promise<void> | void;
  onLogout: () => void;
}

type Section = 'overview' | 'orders' | 'stores' | 'users' | 'deliveries';

const roleLabels: Record<Role, string> = {
  client: 'Cliente',
  store: 'Tienda',
  delivery: 'Delivery',
  admin: 'Admin',
};

const allStatuses = Object.keys(statusLabels) as OrderStatus[];
const activeStatuses: OrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit'];

const formatDateTime = (iso?: string) =>
  iso
    ? new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso))
    : '—';

const isToday = (iso?: string) => (iso ? new Date(iso).toDateString() === new Date().toDateString() : false);

const emptyStore: api.StoreInput = {
  name: '',
  type: '',
  rating: 5,
  distanceKm: 1,
  deliveryMinutes: '20-30 min',
  deliveryFee: 1.5,
  imageUrl: '',
  address: '',
  zone: 'Zona Norte',
  phone: '',
  schedule: '8:00 a.m. - 10:00 p.m.',
  open: true,
  tags: [],
  ownerId: undefined,
};

interface UserForm {
  id?: string;
  email: string;
  password: string;
  name: string;
  phone: string;
  role: Role;
  vehicle: string;
  storeId: string;
}

const emptyUser = (role: Role = 'client'): UserForm => ({
  email: '',
  password: '',
  name: '',
  phone: '',
  role,
  vehicle: '',
  storeId: '',
});

/* ---------- piezas reutilizables ---------- */
function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`adm-field ${wide ? 'wide' : ''}`.trim()}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function Modal({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer: ReactNode;
}) {
  return (
    <div className="adm-modal-backdrop" role="presentation" onClick={onClose}>
      <section className="adm-modal" role="dialog" aria-label={title} onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{title}</h2>
          <button aria-label="Cerrar" className="adm-icon-button" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <div className="adm-modal-body">{children}</div>
        <footer>{footer}</footer>
      </section>
    </div>
  );
}

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return (
    <button aria-label={label} aria-pressed={checked} className={`adm-toggle ${checked ? 'on' : ''}`} onClick={onChange} type="button">
      <span />
    </button>
  );
}

function Kpi({ label, value, detail, icon: Icon, tone }: { label: string; value: string; detail?: string; icon: typeof Store; tone: string }) {
  return (
    <article className={`adm-kpi ${tone}`}>
      <div className="adm-kpi-icon">
        <Icon size={20} aria-hidden="true" />
      </div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        {detail ? <small>{detail}</small> : null}
      </div>
    </article>
  );
}

export function AdminPortal({ currentUser, stores, products, orders, users, deliveries, onRefresh, onLogout }: AdminPortalProps) {
  const [section, setSection] = useState<Section>('overview');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; action: () => Promise<void> } | null>(null);

  // filtros
  const [query, setQuery] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | 'active' | OrderStatus>('all');
  const [storeFilter, setStoreFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState<'all' | Role>('all');

  // formularios
  const [storeForm, setStoreForm] = useState<{ id?: string; data: api.StoreInput } | null>(null);
  const [productsStoreId, setProductsStoreId] = useState<string | null>(null);
  const [productQuery, setProductQuery] = useState('');
  const [userForm, setUserForm] = useState<UserForm | null>(null);
  const [deliveryForm, setDeliveryForm] = useState<{ id: string; vehicle: string; rating: number } | null>(null);
  const [orderDetailId, setOrderDetailId] = useState<string | null>(null);

  const storeById = useMemo(() => new Map(stores.map((store) => [store.id, store])), [stores]);
  const userById = useMemo(() => new Map(users.map((user) => [user.id, user])), [users]);
  const deliveryById = useMemo(() => new Map(deliveries.map((delivery) => [delivery.id, delivery])), [deliveries]);
  const storeUsers = users.filter((user) => user.role === 'store');
  const q = query.trim().toLowerCase();
  const matches = (...values: Array<string | undefined>) => !q || values.some((value) => value?.toLowerCase().includes(q));

  const notify = (kind: 'ok' | 'error', text: string) => {
    setToast({ kind, text });
    window.setTimeout(() => setToast(null), 4000);
  };

  const run = async (action: () => Promise<unknown>, success: string) => {
    setBusy(true);
    try {
      await action();
      await onRefresh();
      notify('ok', success);
      return true;
    } catch (error) {
      notify('error', error instanceof Error ? error.message : 'No se pudo completar la accion.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const goTo = (next: Section) => {
    setSection(next);
    setQuery('');
  };

  /* ---------- métricas ---------- */
  const metrics = useMemo(() => {
    const valid = orders.filter((order) => order.status !== 'cancelled');
    const delivered = orders.filter((order) => order.status === 'delivered');
    const today = valid.filter((order) => isToday(order.createdAt));
    const revenue = valid.reduce((total, order) => total + order.subtotal + order.deliveryFee, 0);
    return {
      revenue,
      revenueToday: today.reduce((total, order) => total + order.subtotal + order.deliveryFee, 0),
      ordersToday: today.length,
      active: orders.filter((order) => activeStatuses.includes(order.status)).length,
      delivered: delivered.length,
      cancelled: orders.length - valid.length,
      avgTicket: valid.length ? revenue / valid.length : 0,
      courierPaid: delivered.reduce((total, order) => total + order.courierReward, 0),
      clients: users.filter((user) => user.role === 'client').length,
      inactiveUsers: users.filter((user) => user.active === false).length,
      openStores: stores.filter((store) => store.open).length,
      onlineDeliveries: deliveries.filter((delivery) => delivery.status !== 'offline').length,
      waitingDelivery: orders.filter((order) => order.status === 'ready' && !order.assignedDeliveryId).length,
    };
  }, [deliveries, orders, stores, users]);

  const storeStats = useMemo(
    () =>
      stores
        .map((store) => {
          const storeOrders = orders.filter((order) => order.storeId === store.id && order.status !== 'cancelled');
          return {
            store,
            orders: storeOrders.length,
            sales: storeOrders.reduce((total, order) => total + order.subtotal, 0),
            products: products.filter((product) => product.storeId === store.id).length,
          };
        })
        .sort((a, b) => b.sales - a.sales),
    [orders, products, stores],
  );
  const maxSales = Math.max(1, ...storeStats.map((item) => item.sales));
  const statusCounts = allStatuses.map((status) => ({ status, count: orders.filter((order) => order.status === status).length }));
  const maxStatus = Math.max(1, ...statusCounts.map((item) => item.count));

  /* ---------- listas filtradas ---------- */
  const filteredOrders = orders.filter((order) => {
    if (orderStatusFilter === 'active' && !activeStatuses.includes(order.status)) return false;
    if (orderStatusFilter !== 'all' && orderStatusFilter !== 'active' && order.status !== orderStatusFilter) return false;
    if (storeFilter !== 'all' && order.storeId !== storeFilter) return false;
    return matches(order.id, order.customerName, order.customerPhone, order.address, storeById.get(order.storeId)?.name);
  });
  const filteredStores = storeStats.filter(({ store }) => matches(store.name, store.type, store.address, store.zone));
  const filteredUsers = users
    .filter((user) => (roleFilter === 'all' || user.role === roleFilter) && matches(user.name, user.email, user.phone))
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''));
  const filteredDeliveries = deliveries.filter((delivery) => matches(delivery.name, delivery.vehicle, userById.get(delivery.id)?.email));

  const orderDetail = orders.find((order) => order.id === orderDetailId) ?? null;

  /* ---------- acciones ---------- */
  const submitStore = async () => {
    if (!storeForm) return;
    const { id, data } = storeForm;
    if (!data.name.trim() || !data.address.trim()) {
      notify('error', 'Nombre y direccion son obligatorios.');
      return;
    }
    const ok = await run(() => (id ? api.saveStore(id, data) : api.createStore(data)), id ? 'Tienda actualizada.' : 'Tienda creada.');
    if (ok) setStoreForm(null);
  };

  const submitUser = async () => {
    if (!userForm) return;
    const form = userForm;
    if (!form.email.trim() || (!form.id && form.password.length < 6)) {
      notify('error', 'Correo y contraseña (minimo 6 caracteres) son obligatorios.');
      return;
    }
    const ok = await run(async () => {
      if (form.id) {
        await api.adminUsers({
          action: 'update',
          userId: form.id,
          email: form.email.trim(),
          password: form.password || undefined,
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: form.role,
        });
        if (form.role === 'store' && form.storeId) {
          const store = storeById.get(form.storeId);
          if (store) await api.saveStore(store.id, { ...store, ownerId: form.id });
        }
      } else {
        await api.adminUsers({
          action: 'create',
          email: form.email.trim(),
          password: form.password,
          name: form.name.trim(),
          phone: form.phone.trim(),
          role: form.role,
          vehicle: form.vehicle.trim(),
          storeId: form.storeId || undefined,
        });
      }
    }, form.id ? 'Usuario actualizado.' : 'Usuario creado.');
    if (ok) setUserForm(null);
  };

  const submitDelivery = async () => {
    if (!deliveryForm) return;
    const ok = await run(
      () => api.saveDeliveryAgent(deliveryForm.id, { vehicle: deliveryForm.vehicle, rating: deliveryForm.rating }),
      'Repartidor actualizado.',
    );
    if (ok) setDeliveryForm(null);
  };

  const toggleUserActive = (user: AppUser) => {
    const next = user.active === false;
    setConfirm({
      text: next ? `¿Activar la cuenta de ${user.name || user.email}?` : `¿Desactivar la cuenta de ${user.name || user.email}? No podra iniciar sesion.`,
      action: async () => {
        await run(() => api.adminUsers({ action: 'set_active', userId: user.id, active: next }), next ? 'Cuenta activada.' : 'Cuenta desactivada.');
      },
    });
  };

  const removeUser = (user: AppUser) =>
    setConfirm({
      text: `¿Eliminar definitivamente la cuenta de ${user.name || user.email}? Esta accion no se puede deshacer.`,
      action: async () => {
        await run(() => api.adminUsers({ action: 'delete', userId: user.id }), 'Usuario eliminado.');
      },
    });

  const editUser = (user: AppUser) =>
    setUserForm({
      id: user.id,
      email: user.email ?? '',
      password: '',
      name: user.name,
      phone: user.phone,
      role: user.role,
      vehicle: '',
      storeId: stores.find((store) => store.ownerId === user.id)?.id ?? '',
    });

  /* ---------- secciones ---------- */
  const nav: Array<{ id: Section; label: string; icon: typeof Store; badge?: number }> = [
    { id: 'overview', label: 'Resumen', icon: LayoutDashboard },
    { id: 'orders', label: 'Pedidos', icon: ClipboardList, badge: metrics.active },
    { id: 'stores', label: 'Tiendas', icon: Store },
    { id: 'users', label: 'Usuarios', icon: UsersRound },
    { id: 'deliveries', label: 'Repartidores', icon: Bike },
  ];

  const sectionTitles: Record<Section, { title: string; subtitle: string; action?: ReactNode }> = {
    overview: { title: 'Resumen general', subtitle: 'Estado de toda la operacion de PideYa.' },
    orders: { title: 'Pedidos', subtitle: `${filteredOrders.length} de ${orders.length} pedidos` },
    stores: {
      title: 'Tiendas',
      subtitle: `${stores.length} tiendas · ${metrics.openStores} abiertas`,
      action: (
        <ActionButton icon={Plus} onClick={() => setStoreForm({ data: { ...emptyStore } })} variant="primary">
          Nueva tienda
        </ActionButton>
      ),
    },
    users: {
      title: 'Usuarios',
      subtitle: `${users.length} cuentas · ${metrics.inactiveUsers} desactivadas`,
      action: (
        <ActionButton icon={UserPlus} onClick={() => setUserForm(emptyUser(roleFilter === 'all' ? 'client' : roleFilter))} variant="primary">
          Nuevo usuario
        </ActionButton>
      ),
    },
    deliveries: {
      title: 'Repartidores',
      subtitle: `${deliveries.length} repartidores · ${metrics.onlineDeliveries} en servicio`,
      action: (
        <ActionButton icon={UserPlus} onClick={() => setUserForm(emptyUser('delivery'))} variant="primary">
          Nuevo repartidor
        </ActionButton>
      ),
    },
  };

  const searchBox = (placeholder: string) => (
    <label className="adm-search">
      <Search size={17} aria-hidden="true" />
      <input onChange={(event) => setQuery(event.target.value)} placeholder={placeholder} value={query} />
    </label>
  );

  const storeSelect = (value: string, onChange: (value: string) => void, allLabel?: string) => (
    <select className="adm-select" onChange={(event) => onChange(event.target.value)} value={value}>
      {allLabel ? <option value="all">{allLabel}</option> : null}
      {stores.map((store) => (
        <option key={store.id} value={store.id}>
          {store.name}
        </option>
      ))}
    </select>
  );

  const renderOverview = () => (
    <>
      <div className="adm-kpis">
        <Kpi icon={CircleDollarSign} label="Ventas totales" tone="green" value={formatCurrency(metrics.revenue)} detail={`${formatCurrency(metrics.revenueToday)} hoy`} />
        <Kpi icon={ClipboardList} label="Pedidos activos" tone="blue" value={String(metrics.active)} detail={`${metrics.ordersToday} pedidos hoy`} />
        <Kpi icon={PackageCheck} label="Entregados" tone="ink" value={String(metrics.delivered)} detail={`${metrics.cancelled} cancelados`} />
        <Kpi icon={CircleDollarSign} label="Ticket promedio" tone="amber" value={formatCurrency(metrics.avgTicket)} detail={`${formatCurrency(metrics.courierPaid)} a repartidores`} />
        <Kpi icon={UsersRound} label="Clientes" tone="blue" value={String(metrics.clients)} detail={`${users.length} cuentas en total`} />
        <Kpi icon={Store} label="Tiendas abiertas" tone="green" value={`${metrics.openStores}/${stores.length}`} />
        <Kpi icon={Truck} label="Repartidores en servicio" tone="amber" value={`${metrics.onlineDeliveries}/${deliveries.length}`} />
        <Kpi icon={Bike} label="Esperando repartidor" tone={metrics.waitingDelivery ? 'coral' : 'ink'} value={String(metrics.waitingDelivery)} detail="Pedidos listos sin asignar" />
      </div>

      <div className="adm-columns">
        <section className="adm-card">
          <h3>Pedidos por estado</h3>
          <div className="adm-bars">
            {statusCounts.map(({ status, count }) => (
              <button className="adm-bar-row" key={status} onClick={() => { setOrderStatusFilter(status); goTo('orders'); }} type="button">
                <span>{statusLabels[status]}</span>
                <div><i style={{ width: `${(count / maxStatus) * 100}%` }} /></div>
                <strong>{count}</strong>
              </button>
            ))}
          </div>
        </section>

        <section className="adm-card">
          <h3>Rendimiento por tienda</h3>
          <div className="adm-bars">
            {storeStats.map(({ store, sales, orders: count }) => (
              <div className="adm-bar-row" key={store.id}>
                <span>{store.name}</span>
                <div><i className="green" style={{ width: `${(sales / maxSales) * 100}%` }} /></div>
                <strong>{formatCurrency(sales)} <small>· {count}</small></strong>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="adm-card">
        <div className="adm-card-head">
          <h3>Ultimos pedidos</h3>
          <button className="adm-link" onClick={() => goTo('orders')} type="button">Ver todos</button>
        </div>
        {renderOrderTable(orders.slice(0, 8))}
      </section>
    </>
  );

  function renderOrderTable(list: Order[]) {
    if (!list.length) return <EmptyState title="Sin pedidos" body="No hay pedidos que coincidan con los filtros." />;
    return (
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Tienda</th>
              <th>Repartidor</th>
              <th className="num">Total</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {list.map((order) => (
              <tr className="clickable" key={order.id} onClick={() => setOrderDetailId(order.id)}>
                <td><strong>{order.id}</strong></td>
                <td>{formatDateTime(order.createdAt)}</td>
                <td>
                  {order.customerName}
                  <small>{order.customerPhone}{order.customerRegistered ? '' : ' · invitado'}</small>
                </td>
                <td>{storeById.get(order.storeId)?.name ?? '—'}</td>
                <td>{order.assignedDeliveryId ? deliveryById.get(order.assignedDeliveryId)?.name ?? '—' : <span className="adm-muted">Sin asignar</span>}</td>
                <td className="num">{formatCurrency(order.subtotal + order.deliveryFee)}</td>
                <td><StatusPill status={order.status} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  const renderOrders = () => (
    <>
      <div className="adm-toolbar">
        {searchBox('Buscar por pedido, cliente, telefono o direccion')}
        <select className="adm-select" onChange={(event) => setOrderStatusFilter(event.target.value as typeof orderStatusFilter)} value={orderStatusFilter}>
          <option value="all">Todos los estados</option>
          <option value="active">Solo activos</option>
          {allStatuses.map((status) => (
            <option key={status} value={status}>{statusLabels[status]}</option>
          ))}
        </select>
        {storeSelect(storeFilter, setStoreFilter, 'Todas las tiendas')}
      </div>
      <section className="adm-card flush">{renderOrderTable(filteredOrders)}</section>
    </>
  );

  const renderStores = () => (
    <>
      <div className="adm-toolbar">{searchBox('Buscar tienda, tipo o zona')}</div>
      <section className="adm-card flush">
        {filteredStores.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Tienda</th>
                  <th>Responsable</th>
                  <th>Zona</th>
                  <th className="num">Envio</th>
                  <th className="num">Productos</th>
                  <th className="num">Pedidos</th>
                  <th className="num">Ventas</th>
                  <th>Abierta</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredStores.map(({ store, products: productCount, orders: count, sales }) => (
                  <tr key={store.id}>
                    <td>
                      <div className="adm-entity">
                        <SafeImage src={store.imageUrl} alt="" />
                        <div>
                          <strong>{store.name}</strong>
                          <small>{store.type} · {store.address}</small>
                        </div>
                      </div>
                    </td>
                    <td>{store.ownerId ? userById.get(store.ownerId)?.name || userById.get(store.ownerId)?.email || 'Asignado' : <span className="adm-muted">Sin asignar</span>}</td>
                    <td>{store.zone}</td>
                    <td className="num">{formatCurrency(store.deliveryFee)}</td>
                    <td className="num">{productCount}</td>
                    <td className="num">{count}</td>
                    <td className="num">{formatCurrency(sales)}</td>
                    <td>
                      <Toggle
                        checked={store.open}
                        label={`Abrir o cerrar ${store.name}`}
                        onChange={() => void run(() => api.setStoreOpen(store.id, !store.open), store.open ? 'Tienda cerrada.' : 'Tienda abierta.')}
                      />
                    </td>
                    <td className="adm-actions">
                      <button className="adm-icon-button" onClick={() => { setProductsStoreId(store.id); setProductQuery(''); }} title="Ver productos" type="button">
                        <Package size={16} aria-hidden="true" />
                      </button>
                      <button className="adm-icon-button" onClick={() => setStoreForm({ id: store.id, data: { ...store } })} title="Editar" type="button">
                        <Pencil size={16} aria-hidden="true" />
                      </button>
                      <button
                        className="adm-icon-button danger"
                        onClick={() =>
                          setConfirm({
                            text: `¿Eliminar la tienda ${store.name} y todos sus productos?`,
                            action: async () => { await run(() => api.deleteStore(store.id), 'Tienda eliminada.'); },
                          })
                        }
                        title="Eliminar"
                        type="button"
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin tiendas" body="Crea la primera tienda con el boton Nueva tienda." />
        )}
      </section>
    </>
  );

  const renderUsers = () => (
    <>
      <div className="adm-toolbar">
        {searchBox('Buscar por nombre, correo o telefono')}
        <div className="adm-segmented">
          {(['all', 'client', 'store', 'delivery', 'admin'] as const).map((role) => (
            <button className={roleFilter === role ? 'active' : ''} key={role} onClick={() => setRoleFilter(role)} type="button">
              {role === 'all' ? 'Todos' : roleLabels[role]}
              <small>{role === 'all' ? users.length : users.filter((user) => user.role === role).length}</small>
            </button>
          ))}
        </div>
      </div>
      <section className="adm-card flush">
        {filteredUsers.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Usuario</th>
                  <th>Telefono</th>
                  <th>Rol</th>
                  <th>Detalle</th>
                  <th className="num">Pedidos</th>
                  <th>Registro</th>
                  <th>Estado</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((user) => {
                  const isMe = user.id === currentUser?.id;
                  const ownedStore = stores.find((store) => store.ownerId === user.id);
                  const orderCount =
                    user.role === 'delivery'
                      ? orders.filter((order) => order.assignedDeliveryId === user.id).length
                      : user.role === 'store'
                        ? orders.filter((order) => order.storeId === ownedStore?.id).length
                        : orders.filter((order) => order.customerId === user.id).length;
                  return (
                    <tr className={user.active === false ? 'inactive' : ''} key={user.id}>
                      <td>
                        <div className="adm-entity">
                          <InitialAvatar className="adm-avatar" name={user.name || user.email} seed={user.id} />
                          <div>
                            <strong>{user.name || 'Sin nombre'}{isMe ? ' (tu)' : ''}</strong>
                            <small>{user.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>{user.phone || '—'}</td>
                      <td><span className={`adm-role ${user.role}`}>{roleLabels[user.role]}</span></td>
                      <td>
                        {user.role === 'store' ? ownedStore?.name ?? <span className="adm-muted">Sin tienda</span> : null}
                        {user.role === 'delivery' ? deliveryById.get(user.id)?.vehicle || <span className="adm-muted">Sin vehiculo</span> : null}
                        {user.role === 'client' ? `${user.savedAddresses?.length ?? 0} direcciones` : null}
                        {user.role === 'admin' ? 'Acceso total' : null}
                      </td>
                      <td className="num">{orderCount}</td>
                      <td>{formatDateTime(user.createdAt)}</td>
                      <td>
                        <span className={`adm-state ${user.active === false ? 'off' : 'on'}`}>{user.active === false ? 'Desactivado' : 'Activo'}</span>
                      </td>
                      <td className="adm-actions">
                        <button className="adm-icon-button" onClick={() => editUser(user)} title="Editar" type="button">
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        {!isMe ? (
                          <>
                            <button className="adm-icon-button" onClick={() => toggleUserActive(user)} title={user.active === false ? 'Activar' : 'Desactivar'} type="button">
                              {user.active === false ? <CheckCircle2 size={16} aria-hidden="true" /> : <Ban size={16} aria-hidden="true" />}
                            </button>
                            <button className="adm-icon-button danger" onClick={() => removeUser(user)} title="Eliminar" type="button">
                              <Trash2 size={16} aria-hidden="true" />
                            </button>
                          </>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin usuarios" body="No hay cuentas que coincidan con los filtros." />
        )}
      </section>
    </>
  );

  const renderDeliveries = () => (
    <>
      <div className="adm-toolbar">{searchBox('Buscar repartidor, vehiculo o correo')}</div>
      <section className="adm-card flush">
        {filteredDeliveries.length ? (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Repartidor</th>
                  <th>Vehiculo</th>
                  <th className="num">Rating</th>
                  <th className="num">Activos</th>
                  <th className="num">Entregas hoy</th>
                  <th className="num">Ganado hoy</th>
                  <th className="num">Total entregas</th>
                  <th>Servicio</th>
                  <th>Cuenta</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredDeliveries.map((delivery) => {
                  const profile = userById.get(delivery.id);
                  const mine = orders.filter((order) => order.assignedDeliveryId === delivery.id);
                  return (
                    <tr className={profile?.active === false ? 'inactive' : ''} key={delivery.id}>
                      <td>
                        <div className="adm-entity">
                          <InitialAvatar className="adm-avatar" name={delivery.name} seed={delivery.id} />
                          <div>
                            <strong>{delivery.name}</strong>
                            <small>{profile?.email} · {profile?.phone}</small>
                          </div>
                        </div>
                      </td>
                      <td>{delivery.vehicle || '—'}</td>
                      <td className="num">{delivery.rating.toFixed(1)}</td>
                      <td className="num">{mine.filter((order) => activeStatuses.includes(order.status)).length}</td>
                      <td className="num">{delivery.completedToday}</td>
                      <td className="num">{formatCurrency(delivery.earningsToday)}</td>
                      <td className="num">{mine.filter((order) => order.status === 'delivered').length}</td>
                      <td>
                        <span className={`adm-state ${delivery.status}`}>
                          {delivery.status === 'busy' ? 'En ruta' : delivery.status === 'available' ? 'Disponible' : 'Fuera de servicio'}
                        </span>
                      </td>
                      <td>
                        <span className={`adm-state ${profile?.active === false ? 'off' : 'on'}`}>{profile?.active === false ? 'Desactivada' : 'Activa'}</span>
                      </td>
                      <td className="adm-actions">
                        <button
                          className="adm-icon-button"
                          onClick={() => setDeliveryForm({ id: delivery.id, vehicle: delivery.vehicle, rating: delivery.rating })}
                          title="Editar"
                          type="button"
                        >
                          <Pencil size={16} aria-hidden="true" />
                        </button>
                        <button
                          className="adm-icon-button"
                          onClick={() =>
                            void run(
                              () => api.saveDeliveryAgent(delivery.id, { serviceStatus: delivery.status === 'offline' ? 'available' : 'offline' }),
                              'Servicio actualizado.',
                            )
                          }
                          title={delivery.status === 'offline' ? 'Poner en servicio' : 'Sacar de servicio'}
                          type="button"
                        >
                          <Truck size={16} aria-hidden="true" />
                        </button>
                        {profile ? (
                          <button className="adm-icon-button" onClick={() => toggleUserActive(profile)} title={profile.active === false ? 'Activar cuenta' : 'Desactivar cuenta'} type="button">
                            {profile.active === false ? <CheckCircle2 size={16} aria-hidden="true" /> : <Ban size={16} aria-hidden="true" />}
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Sin repartidores" body="Crea un repartidor con el boton Nuevo repartidor." />
        )}
      </section>
    </>
  );

  const header = sectionTitles[section];

  return (
    <div className="adm">
      <aside className="adm-sidebar">
        <div className="adm-brand">
          <img src={pideyaLogo} alt="PideYa" />
          <div>
            <strong>PideYa</strong>
            <span>Administracion</span>
          </div>
        </div>
        <nav aria-label="Secciones de administracion">
          {nav.map(({ id, label, icon: Icon, badge }) => (
            <button className={section === id ? 'active' : ''} key={id} onClick={() => goTo(id)} type="button">
              <Icon size={19} aria-hidden="true" />
              <span>{label}</span>
              {badge ? <strong>{badge}</strong> : null}
            </button>
          ))}
        </nav>
        <div className="adm-sidebar-foot">
          <div className="adm-me">
            <span className="adm-avatar"><ShieldCheck size={16} aria-hidden="true" /></span>
            <div>
              <strong>{currentUser?.name || 'Administrador'}</strong>
              <small>{currentUser?.email}</small>
            </div>
          </div>
          <button className="adm-logout" onClick={onLogout} type="button">
            <LogOut size={18} aria-hidden="true" />
            <span>Cerrar sesion</span>
          </button>
        </div>
      </aside>

      <main className="adm-main">
        <header className="adm-header">
          <div>
            <h1>{header.title}</h1>
            <p>{header.subtitle}</p>
          </div>
          <div className="adm-header-actions">
            <button className="adm-icon-button" disabled={busy} onClick={() => void onRefresh()} title="Recargar datos" type="button">
              <RefreshCw className={busy ? 'spin' : ''} size={17} aria-hidden="true" />
            </button>
            {header.action}
          </div>
        </header>

        <div className="adm-content">
          {section === 'overview' ? renderOverview() : null}
          {section === 'orders' ? renderOrders() : null}
          {section === 'stores' ? renderStores() : null}
          {section === 'users' ? renderUsers() : null}
          {section === 'deliveries' ? renderDeliveries() : null}
        </div>
      </main>

      {/* Detalle de pedido */}
      {orderDetail ? (
        <div className="adm-drawer-backdrop" role="presentation" onClick={() => setOrderDetailId(null)}>
          <aside className="adm-drawer" role="dialog" aria-label={`Pedido ${orderDetail.id}`} onClick={(event) => event.stopPropagation()}>
            <header>
              <div>
                <h2>{orderDetail.id}</h2>
                <small>{formatDateTime(orderDetail.createdAt)}</small>
              </div>
              <StatusPill status={orderDetail.status} />
              <button aria-label="Cerrar" className="adm-icon-button" onClick={() => setOrderDetailId(null)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="adm-drawer-body">
              <dl className="adm-dl">
                <dt>Cliente</dt><dd>{orderDetail.customerName}{orderDetail.customerRegistered ? '' : ' (invitado)'}</dd>
                <dt>Telefono</dt><dd>{orderDetail.customerPhone}</dd>
                <dt>Direccion</dt><dd>{orderDetail.address}</dd>
                <dt>Tienda</dt><dd>{storeById.get(orderDetail.storeId)?.name}</dd>
                <dt>Pago</dt><dd>{orderDetail.paymentMethod}</dd>
                {orderDetail.notes ? (<><dt>Notas</dt><dd>{orderDetail.notes}</dd></>) : null}
              </dl>

              <h3>Productos</h3>
              <ul className="adm-items">
                {orderDetail.items.map((item, index) => (
                  <li key={`${item.productId}-${index}`}>
                    <span>{item.quantity}× {item.name}{item.option ? <small> · {item.option}</small> : null}</span>
                    <strong>{formatCurrency(item.quantity * item.price)}</strong>
                  </li>
                ))}
                <li><span>Envio</span><strong>{formatCurrency(orderDetail.deliveryFee)}</strong></li>
                <li className="total"><span>Total</span><strong>{formatCurrency(orderDetail.subtotal + orderDetail.deliveryFee)}</strong></li>
                <li><span>Pago al repartidor</span><strong>{formatCurrency(orderDetail.courierReward)}</strong></li>
              </ul>

              <h3>Gestion</h3>
              <div className="adm-form-grid">
                <Field label="Estado del pedido" wide>
                  <select
                    className="adm-select"
                    disabled={busy}
                    onChange={(event) => void run(() => api.updateOrderStatus(orderDetail.id, event.target.value as OrderStatus), 'Estado actualizado.')}
                    value={orderDetail.status}
                  >
                    {allStatuses.map((status) => (
                      <option key={status} value={status}>{statusLabels[status]}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Repartidor asignado" wide>
                  <select
                    className="adm-select"
                    disabled={busy}
                    onChange={(event) => void run(() => api.adminAssignDelivery(orderDetail.id, event.target.value || null), 'Repartidor actualizado.')}
                    value={orderDetail.assignedDeliveryId ?? ''}
                  >
                    <option value="">Sin asignar</option>
                    {deliveries.map((delivery) => (
                      <option key={delivery.id} value={delivery.id}>
                        {delivery.name} · {delivery.status === 'offline' ? 'fuera de servicio' : delivery.status === 'busy' ? 'en ruta' : 'disponible'}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              {orderDetail.status !== 'cancelled' && orderDetail.status !== 'delivered' ? (
                <ActionButton
                  className="adm-wide"
                  icon={Ban}
                  onClick={() =>
                    setConfirm({
                      text: `¿Cancelar el pedido ${orderDetail.id}?`,
                      action: async () => { await run(() => api.updateOrderStatus(orderDetail.id, 'cancelled'), 'Pedido cancelado.'); },
                    })
                  }
                  variant="danger"
                >
                  Cancelar pedido
                </ActionButton>
              ) : null}
            </div>
          </aside>
        </div>
      ) : null}

      {/* Formulario tienda */}
      {storeForm ? (
        <Modal
          footer={
            <>
              <ActionButton onClick={() => setStoreForm(null)} variant="ghost">Cancelar</ActionButton>
              <ActionButton disabled={busy} icon={CheckCircle2} onClick={() => void submitStore()} variant="primary">Guardar</ActionButton>
            </>
          }
          onClose={() => setStoreForm(null)}
          title={storeForm.id ? 'Editar tienda' : 'Nueva tienda'}
        >
          <div className="adm-form-grid">
            {(() => {
              const d = storeForm.data;
              const set = (patch: Partial<api.StoreInput>) => setStoreForm({ ...storeForm, data: { ...d, ...patch } });
              return (
                <>
                  <Field label="Nombre"><input onChange={(e) => set({ name: e.target.value })} value={d.name} /></Field>
                  <Field label="Tipo de comercio"><input onChange={(e) => set({ type: e.target.value })} placeholder="Comida criolla, Farmacia..." value={d.type} /></Field>
                  <Field label="Direccion" wide><input onChange={(e) => set({ address: e.target.value })} value={d.address} /></Field>
                  <Field label="Zona"><input onChange={(e) => set({ zone: e.target.value })} value={d.zone} /></Field>
                  <Field label="Telefono"><input onChange={(e) => set({ phone: e.target.value })} value={d.phone} /></Field>
                  <Field label="Horario"><input onChange={(e) => set({ schedule: e.target.value })} value={d.schedule} /></Field>
                  <Field label="Tiempo de entrega"><input onChange={(e) => set({ deliveryMinutes: e.target.value })} value={d.deliveryMinutes} /></Field>
                  <Field label="Costo de envio ($)"><input min={0} onChange={(e) => set({ deliveryFee: Number(e.target.value) })} step="0.1" type="number" value={d.deliveryFee} /></Field>
                  <Field label="Distancia (km)"><input min={0} onChange={(e) => set({ distanceKm: Number(e.target.value) })} step="0.1" type="number" value={d.distanceKm} /></Field>
                  <Field label="Rating"><input max={5} min={0} onChange={(e) => set({ rating: Number(e.target.value) })} step="0.1" type="number" value={d.rating} /></Field>
                  <Field label="Responsable (cuenta tienda)">
                    <select onChange={(e) => set({ ownerId: e.target.value || undefined })} value={d.ownerId ?? ''}>
                      <option value="">Sin asignar</option>
                      {storeUsers.map((user) => (
                        <option key={user.id} value={user.id}>{user.name || user.email}</option>
                      ))}
                    </select>
                  </Field>
                  <Field label="Imagen (URL)" wide><input onChange={(e) => set({ imageUrl: e.target.value })} placeholder="https://..." value={d.imageUrl} /></Field>
                  <Field label="Etiquetas (separadas por coma)" wide>
                    <input
                      onChange={(e) => set({ tags: e.target.value.split(',').map((tag) => tag.trim()).filter(Boolean) })}
                      defaultValue={d.tags.join(', ')}
                    />
                  </Field>
                  <label className="adm-check wide">
                    <input checked={d.open} onChange={(e) => set({ open: e.target.checked })} type="checkbox" />
                    <span>Tienda abierta y visible para pedidos</span>
                  </label>
                  {!storeUsers.length ? (
                    <p className="adm-hint wide">Para asignar un responsable, primero crea un usuario con rol Tienda en la seccion Usuarios.</p>
                  ) : null}
                </>
              );
            })()}
          </div>
        </Modal>
      ) : null}

      {/* Productos de una tienda (consulta y moderación) */}
      {productsStoreId ? (() => {
        const store = storeById.get(productsStoreId);
        const pq = productQuery.trim().toLowerCase();
        const list = products.filter(
          (product) =>
            product.storeId === productsStoreId &&
            (!pq || product.name.toLowerCase().includes(pq) || product.category.toLowerCase().includes(pq)),
        );
        const total = products.filter((product) => product.storeId === productsStoreId);
        return (
          <div className="adm-drawer-backdrop" role="presentation" onClick={() => setProductsStoreId(null)}>
            <aside className="adm-drawer wide" role="dialog" aria-label={`Productos de ${store?.name}`} onClick={(event) => event.stopPropagation()}>
              <header>
                <div>
                  <h2>Productos de {store?.name}</h2>
                  <small>
                    {total.length} productos · {total.filter((product) => !product.available).length} ocultos
                  </small>
                </div>
                <button aria-label="Cerrar" className="adm-icon-button" onClick={() => setProductsStoreId(null)} type="button">
                  <X size={18} aria-hidden="true" />
                </button>
              </header>
              <div className="adm-drawer-body">
                <p className="adm-hint">
                  Cada tienda administra su menu desde su propio panel. Aqui puedes consultarlo y ocultar o eliminar productos que no cumplan las normas.
                </p>
                <label className="adm-search">
                  <Search size={17} aria-hidden="true" />
                  <input onChange={(event) => setProductQuery(event.target.value)} placeholder="Buscar producto o categoria" value={productQuery} />
                </label>
                {list.length ? (
                  <div className="adm-card flush">
                    <div className="adm-table-wrap">
                      <table className="adm-table">
                        <thead>
                          <tr>
                            <th>Producto</th>
                            <th className="num">Precio</th>
                            <th className="num">Stock</th>
                            <th>Visible</th>
                            <th />
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((product) => (
                            <tr className={product.available ? '' : 'inactive'} key={product.id}>
                              <td>
                                <div className="adm-entity">
                                  <SafeImage src={product.imageUrl} alt="" />
                                  <div>
                                    <strong>{product.name}</strong>
                                    <small>{product.category}</small>
                                  </div>
                                </div>
                              </td>
                              <td className="num">{formatCurrency(product.price)}</td>
                              <td className="num">{product.stock}</td>
                              <td className="adm-actions">
                                <Toggle
                                  checked={product.available}
                                  label={`Mostrar u ocultar ${product.name}`}
                                  onChange={() =>
                                    void run(
                                      () => api.setProductAvailable(product.id, !product.available),
                                      product.available ? 'Producto oculto.' : 'Producto visible.',
                                    )
                                  }
                                />
                              </td>
                              <td className="adm-actions">
                                <button
                                  className="adm-icon-button danger"
                                  onClick={() =>
                                    setConfirm({
                                      text: `¿Eliminar el producto ${product.name}?`,
                                      action: async () => { await run(() => api.deleteProduct(product.id), 'Producto eliminado.'); },
                                    })
                                  }
                                  title="Eliminar"
                                  type="button"
                                >
                                  <Trash2 size={16} aria-hidden="true" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <EmptyState title="Sin productos" body="Esta tienda aun no tiene productos que coincidan." />
                )}
              </div>
            </aside>
          </div>
        );
      })() : null}

      {/* Formulario usuario */}
      {userForm ? (
        <Modal
          footer={
            <>
              <ActionButton onClick={() => setUserForm(null)} variant="ghost">Cancelar</ActionButton>
              <ActionButton disabled={busy} icon={CheckCircle2} onClick={() => void submitUser()} variant="primary">
                {userForm.id ? 'Guardar cambios' : 'Crear usuario'}
              </ActionButton>
            </>
          }
          onClose={() => setUserForm(null)}
          title={userForm.id ? 'Editar usuario' : 'Nuevo usuario'}
        >
          <div className="adm-form-grid">
            {(() => {
              const d = userForm;
              const set = (patch: Partial<UserForm>) => setUserForm({ ...d, ...patch });
              const isMe = d.id === currentUser?.id;
              return (
                <>
                  <Field label="Rol" wide>
                    <div className="adm-segmented">
                      {(['client', 'delivery', 'store', 'admin'] as Role[]).map((role) => (
                        <button
                          className={d.role === role ? 'active' : ''}
                          disabled={isMe}
                          key={role}
                          onClick={() => set({ role })}
                          type="button"
                        >
                          {roleLabels[role]}
                        </button>
                      ))}
                    </div>
                  </Field>
                  <Field label="Nombre completo"><input onChange={(e) => set({ name: e.target.value })} value={d.name} /></Field>
                  <Field label="Telefono"><input onChange={(e) => set({ phone: e.target.value })} value={d.phone} /></Field>
                  <Field label="Correo electronico"><input onChange={(e) => set({ email: e.target.value })} type="email" value={d.email} /></Field>
                  <Field label={d.id ? 'Nueva contraseña (opcional)' : 'Contraseña'}>
                    <input autoComplete="new-password" onChange={(e) => set({ password: e.target.value })} placeholder={d.id ? 'Dejar vacio para no cambiar' : 'Minimo 6 caracteres'} type="text" value={d.password} />
                  </Field>
                  {d.role === 'delivery' && !d.id ? (
                    <Field label="Vehiculo" wide><input onChange={(e) => set({ vehicle: e.target.value })} placeholder="Moto azul, placa..." value={d.vehicle} /></Field>
                  ) : null}
                  {d.role === 'store' ? (
                    <Field label="Tienda que administra" wide>
                      <select onChange={(e) => set({ storeId: e.target.value })} value={d.storeId}>
                        <option value="">Sin asignar</option>
                        {stores.map((store) => (
                          <option key={store.id} value={store.id}>
                            {store.name}{store.ownerId && store.ownerId !== d.id ? ' (ya tiene responsable)' : ''}
                          </option>
                        ))}
                      </select>
                    </Field>
                  ) : null}
                  <p className="adm-hint wide">
                    {d.id
                      ? 'Los cambios de correo y contraseña se aplican de inmediato.'
                      : 'La cuenta queda confirmada y lista para iniciar sesion con este correo y contraseña.'}
                  </p>
                </>
              );
            })()}
          </div>
        </Modal>
      ) : null}

      {/* Formulario repartidor */}
      {deliveryForm ? (
        <Modal
          footer={
            <>
              <ActionButton onClick={() => setDeliveryForm(null)} variant="ghost">Cancelar</ActionButton>
              <ActionButton disabled={busy} icon={CheckCircle2} onClick={() => void submitDelivery()} variant="primary">Guardar</ActionButton>
            </>
          }
          onClose={() => setDeliveryForm(null)}
          title="Editar repartidor"
        >
          <div className="adm-form-grid">
            <Field label="Vehiculo"><input onChange={(e) => setDeliveryForm({ ...deliveryForm, vehicle: e.target.value })} value={deliveryForm.vehicle} /></Field>
            <Field label="Rating"><input max={5} min={0} onChange={(e) => setDeliveryForm({ ...deliveryForm, rating: Number(e.target.value) })} step="0.1" type="number" value={deliveryForm.rating} /></Field>
            <p className="adm-hint wide">Nombre, telefono, correo y contraseña se editan desde la seccion Usuarios.</p>
          </div>
        </Modal>
      ) : null}

      {/* Confirmación */}
      {confirm ? (
        <Modal
          footer={
            <>
              <ActionButton onClick={() => setConfirm(null)} variant="ghost">Volver</ActionButton>
              <ActionButton
                disabled={busy}
                onClick={() => {
                  const action = confirm.action;
                  setConfirm(null);
                  void action();
                }}
                variant="danger"
              >
                Confirmar
              </ActionButton>
            </>
          }
          onClose={() => setConfirm(null)}
          title="Confirmar accion"
        >
          <p className="adm-confirm-text">{confirm.text}</p>
        </Modal>
      ) : null}

      {toast ? <div className={`adm-toast ${toast.kind}`} role="status">{toast.text}</div> : null}
    </div>
  );
}
