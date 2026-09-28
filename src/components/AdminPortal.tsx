import { useMemo, useState } from 'react';
import {
  BarChart3,
  CalendarDays,
  CircleDollarSign,
  ClipboardList,
  PackageCheck,
  ShieldCheck,
  Store,
  Truck,
  UsersRound,
} from 'lucide-react';
import { MetricCard, Panel, SafeImage, StatusPill } from './Shared';
import type { AppUser, DeliveryAgent, Order, Product, Storefront } from '../types';
import { formatCurrency, formatTime } from '../utils/format';

interface AdminPortalProps {
  stores: Storefront[];
  products: Product[];
  orders: Order[];
  users: AppUser[];
  deliveries: DeliveryAgent[];
}

export function AdminPortal({ stores, products, orders, users, deliveries }: AdminPortalProps) {
  const [period, setPeriod] = useState('Hoy');

  const metrics = useMemo(() => {
    const validOrders = orders.filter((order) => order.status !== 'cancelled');
    const revenue = validOrders.reduce((total, order) => total + order.subtotal + order.deliveryFee, 0);
    const activeOrders = orders.filter(
      (order) => !['delivered', 'cancelled'].includes(order.status),
    ).length;

    return {
      revenue,
      activeOrders,
      cancelled: orders.filter((order) => order.status === 'cancelled').length,
      delivered: orders.filter((order) => order.status === 'delivered').length,
      usersTotal: users.length + stores.length + deliveries.length,
      activeStores: stores.filter((store) => store.open).length,
      activeDeliveries: deliveries.filter((delivery) => delivery.status !== 'offline').length,
    };
  }, [deliveries, orders, stores, users]);

  const storePerformance = stores.map((store) => {
    const storeOrders = orders.filter((order) => order.storeId === store.id);
    const sales = storeOrders
      .filter((order) => order.status !== 'cancelled')
      .reduce((total, order) => total + order.subtotal, 0);

    return {
      store,
      orders: storeOrders.length,
      sales,
      products: products.filter((product) => product.storeId === store.id).length,
    };
  });

  const maxStoreSales = Math.max(...storePerformance.map((item) => item.sales), 1);

  return (
    <div className="role-grid admin-grid">
      <Panel className="admin-command">
        <div className="workspace-title">
          <div>
            <span className="zone-label">
              <ShieldCheck size={15} aria-hidden="true" /> Administrador PideYa
            </span>
            <h1>Supervisa ventas, usuarios, pedidos y operacion.</h1>
            <p>
              Esta primera version calcula indicadores desde los datos simulados para validar el
              panel antes de conectar base de datos.
            </p>
          </div>
          <label className="input-shell select-shell">
            <CalendarDays size={17} aria-hidden="true" />
            <select
              aria-label="Periodo de metricas"
              onChange={(event) => setPeriod(event.target.value)}
              value={period}
            >
              <option>Hoy</option>
              <option>Ultimos 7 dias</option>
              <option>Este mes</option>
            </select>
          </label>
        </div>

        <div className="metrics-grid">
          <MetricCard
            detail={period}
            icon={CircleDollarSign}
            label="Ventas"
            tone="green"
            value={formatCurrency(metrics.revenue)}
          />
          <MetricCard
            detail="En operacion"
            icon={ClipboardList}
            label="Pedidos activos"
            tone="blue"
            value={String(metrics.activeOrders)}
          />
          <MetricCard
            detail="Clientes, tiendas, delivery"
            icon={UsersRound}
            label="Usuarios"
            tone="ink"
            value={String(metrics.usersTotal)}
          />
          <MetricCard
            detail="Revisar motivos"
            icon={PackageCheck}
            label="Cancelados"
            tone="coral"
            value={String(metrics.cancelled)}
          />
        </div>
      </Panel>

      <Panel title="Pedidos activos">
        <div className="admin-table">
          <div className="admin-table-head">
            <span>Pedido</span>
            <span>Tienda</span>
            <span>Cliente</span>
            <span>Total</span>
            <span>Estado</span>
          </div>
          {orders
            .filter((order) => !['delivered', 'cancelled'].includes(order.status))
            .map((order) => {
              const store = stores.find((item) => item.id === order.storeId);

              return (
                <div className="admin-table-row" key={order.id}>
                  <span>
                    <strong>{order.id}</strong>
                    <small>{formatTime(order.createdAt)}</small>
                  </span>
                  <span>{store?.name}</span>
                  <span>{order.customerName}</span>
                  <span>{formatCurrency(order.subtotal + order.deliveryFee)}</span>
                  <StatusPill status={order.status} />
                </div>
              );
            })}
        </div>
      </Panel>

      <aside className="side-stack">
        <Panel title="Operacion">
          <div className="ops-list">
            <div>
              <Store size={17} aria-hidden="true" />
              <span>Tiendas abiertas</span>
              <strong>{metrics.activeStores}/{stores.length}</strong>
            </div>
            <div>
              <Truck size={17} aria-hidden="true" />
              <span>Delivery activos</span>
              <strong>{metrics.activeDeliveries}/{deliveries.length}</strong>
            </div>
            <div>
              <ClipboardList size={17} aria-hidden="true" />
              <span>Entregados</span>
              <strong>{metrics.delivered}</strong>
            </div>
          </div>
        </Panel>

        <Panel title="Usuarios y roles">
          <div className="user-list">
            {users.map((user) => (
              <div className="user-row" key={user.id}>
                <div className="avatar-circle">{user.name.slice(0, 1)}</div>
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.role}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </aside>

      <Panel title="Rendimiento por tienda">
        <div className="performance-list">
          {storePerformance.map((item) => (
            <div className="performance-row" key={item.store.id}>
              <SafeImage src={item.store.imageUrl} alt="" />
              <div>
                <strong>{item.store.name}</strong>
                <span>{item.orders} pedidos · {item.products} productos</span>
                <div className="bar-track">
                  <span style={{ width: `${Math.max(8, (item.sales / maxStoreSales) * 100)}%` }} />
                </div>
              </div>
              <strong>{formatCurrency(item.sales)}</strong>
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Rendimiento delivery">
        <div className="delivery-score-list">
          {deliveries.map((delivery) => (
            <div className="delivery-score-row" key={delivery.id}>
              <div>
                <strong>{delivery.name}</strong>
                <span>{delivery.vehicle}</span>
              </div>
              <span>
                <BarChart3 size={15} aria-hidden="true" /> {delivery.completedToday} entregas
              </span>
              <strong>{formatCurrency(delivery.earningsToday)}</strong>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
