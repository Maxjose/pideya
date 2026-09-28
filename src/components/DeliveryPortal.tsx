import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
  History,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  Navigation,
  PackageCheck,
  Star,
  Truck,
  UserRound,
  WalletCards,
} from 'lucide-react';
import pideyaLogo from '../assets/pideya-logo.png';
import { ActionButton, EmptyState, MetricCard, Panel, SafeImage, StatusPill } from './Shared';
import type { DeliveryAgent, Order, OrderStatus, Storefront } from '../types';
import { formatCurrency, formatTime } from '../utils/format';

interface DeliveryPortalProps {
  deliveries: DeliveryAgent[];
  stores: Storefront[];
  orders: Order[];
  onAcceptDelivery: (orderId: string, deliveryId: string) => void;
  onOrderStatusChange: (orderId: string, status: OrderStatus) => void;
  onLogout: () => void;
}

type DeliveryView = 'dashboard' | 'available' | 'routes' | 'earnings' | 'profile' | 'history';
type DeliveryServiceStatus = 'available' | 'offline';

const deliveryMainViews: DeliveryView[] = ['dashboard', 'available', 'routes'];

export function DeliveryPortal({
  deliveries,
  stores,
  orders,
  onAcceptDelivery,
  onOrderStatusChange,
  onLogout,
}: DeliveryPortalProps) {
  const [activeDeliveryId, setActiveDeliveryId] = useState(deliveries[0]?.id ?? '');
  const [activeView, setActiveView] = useState<DeliveryView>('dashboard');
  const [deliveryMenuOpen, setDeliveryMenuOpen] = useState(false);

  useEffect(() => {
    if (!deliveryMenuOpen) {
      return;
    }

    const scrollY = window.scrollY;
    const body = document.body;
    const previousStyles = {
      overflow: body.style.overflow,
      position: body.style.position,
      top: body.style.top,
      width: body.style.width,
    };

    body.style.overflow = 'hidden';
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.width = '100%';

    return () => {
      body.style.overflow = previousStyles.overflow;
      body.style.position = previousStyles.position;
      body.style.top = previousStyles.top;
      body.style.width = previousStyles.width;
      window.scrollTo(0, scrollY);
    };
  }, [deliveryMenuOpen]);
  const [serviceStatusByDeliveryId, setServiceStatusByDeliveryId] = useState<Record<string, DeliveryServiceStatus>>({});
  const [serviceConfirmAction, setServiceConfirmAction] = useState<DeliveryServiceStatus | null>(null);
  const [routeMapZoom, setRouteMapZoom] = useState(1);
  const activeDelivery = deliveries.find((delivery) => delivery.id === activeDeliveryId) ?? deliveries[0];

  const availableOrders = useMemo(
    () => orders.filter((order) => order.status === 'ready' && !order.assignedDeliveryId),
    [orders],
  );
  const activeJobs = orders.filter(
    (order) =>
      order.assignedDeliveryId === activeDelivery?.id &&
      !['delivered', 'cancelled'].includes(order.status),
  );
  const finishedJobs = orders.filter(
    (order) => order.assignedDeliveryId === activeDelivery?.id && order.status === 'delivered',
  );
  const activeRouteOrder = activeJobs[0] ?? null;
  const activeRouteStore = activeRouteOrder
    ? stores.find((item) => item.id === activeRouteOrder.storeId)
    : null;
  const projectedAvailable = availableOrders.reduce((total, order) => total + order.courierReward, 0);
  const serviceStatus =
    serviceStatusByDeliveryId[activeDelivery?.id ?? ''] ??
    (activeDelivery?.status === 'offline' ? 'offline' : 'available');
  const isInService = serviceStatus === 'available';
  const deliveryStatusLabel =
    activeDelivery?.status === 'busy' ? 'En ruta' : isInService ? 'Disponible' : 'Offline';
  const deliveryStatusClass = isInService ? 'open' : 'closed';

  const navigateDeliverySection = (view: DeliveryView) => {
    setActiveView(view);
    setDeliveryMenuOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const confirmServiceStatus = () => {
    if (!activeDelivery || !serviceConfirmAction) {
      return;
    }

    setServiceStatusByDeliveryId((current) => ({
      ...current,
      [activeDelivery.id]: serviceConfirmAction,
    }));
    setServiceConfirmAction(null);
  };

  return (
    <>
      <header className="store-page-header delivery-page-header" aria-label="Delivery actual">
        <div className="store-page-brand">
          <img src={pideyaLogo} alt="PideYa" />
          <div>
            <span>Delivery</span>
            <strong>{activeDelivery?.name}</strong>
          </div>
        </div>
        <span className={`store-state ${deliveryStatusClass}`}>{deliveryStatusLabel}</span>
      </header>

      <div className="role-grid delivery-grid">
        {activeView === 'dashboard' ? (
          <>
          <Panel className="delivery-service-panel">
            <section className="delivery-service-card" aria-label="Estado de servicio">
              <div>
                <span className={`store-state ${deliveryStatusClass}`}>{deliveryStatusLabel}</span>
                <h2>{isInService ? 'Estas activo para recibir pedidos' : 'Estas fuera de servicio'}</h2>
                <p>
                  {isInService
                    ? 'Los pedidos listos pueden aparecer en tu bandeja para tomarlos.'
                    : 'Activa tu servicio cuando estes disponible para repartir.'}
                </p>
              </div>
              <ActionButton
                icon={isInService ? Clock : CheckCircle2}
                onClick={() => setServiceConfirmAction(isInService ? 'offline' : 'available')}
                variant={isInService ? 'danger' : 'success'}
              >
                {isInService ? 'Salir de servicio' : 'Activarme'}
              </ActionButton>
            </section>
          </Panel>

          <Panel className="delivery-command">
            <div className="workspace-title">
              <div>
                <span className="zone-label">
                  <Bike size={15} aria-hidden="true" /> Portal delivery
                </span>
                <h1>Acepta pedidos disponibles antes que otros repartidores.</h1>
                <p>
                  Cada pedido listo muestra origen, destino, distancia y ganancia estimada para
                  decidir rapido.
                </p>
              </div>
              <label className="input-shell select-shell">
                <Bike size={17} aria-hidden="true" />
                <select
                  aria-label="Seleccionar delivery"
                  onChange={(event) => setActiveDeliveryId(event.target.value)}
                  value={activeDelivery?.id}
                >
                  {deliveries.map((delivery) => (
                    <option key={delivery.id} value={delivery.id}>
                      {delivery.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="metrics-grid">
              <MetricCard detail="Pedidos libres" icon={PackageCheck} label="Disponibles" tone="green" value={String(availableOrders.length)} />
              <MetricCard detail="Ganancia posible" icon={WalletCards} label="Bolsa" tone="amber" value={formatCurrency(projectedAvailable)} />
              <MetricCard detail="Activos ahora" icon={Truck} label="Mis rutas" tone="blue" value={String(activeJobs.length)} />
              <MetricCard detail="Completados" icon={CheckCircle2} label="Hoy" tone="ink" value={String(activeDelivery?.completedToday ?? 0)} />
            </div>
          </Panel>
          </>
        ) : null}

        {activeView === 'available' ? (
          <Panel className="delivery-command" title="Pedidos disponibles">
            {availableOrders.length ? (
              <div className="delivery-offers">
                {availableOrders.map((order) => {
                  const store = stores.find((item) => item.id === order.storeId);

                  return (
                    <article className="delivery-card" key={order.id}>
                      <div className="delivery-card-main">
                        <SafeImage src={store?.imageUrl} alt="" />
                        <div>
                          <strong>{order.id}</strong>
                          <span>{store?.name}</span>
                          <small>{formatTime(order.createdAt)} | {order.items.length} items</small>
                        </div>
                      </div>
                      <div className="route-stack">
                        <span>
                          <MapPin size={15} aria-hidden="true" /> Retiro: {store?.address}
                        </span>
                        <span>
                          <Navigation size={15} aria-hidden="true" /> Entrega: {order.address}
                        </span>
                      </div>
                      <div className="delivery-card-footer">
                        <span>{order.distanceKm} km</span>
                        <strong>{formatCurrency(order.courierReward)}</strong>
                        <ActionButton
                          icon={CheckCircle2}
                          onClick={() => activeDelivery && onAcceptDelivery(order.id, activeDelivery.id)}
                          variant="success"
                        >
                          Tomar pedido
                        </ActionButton>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <EmptyState body="Cuando una tienda marque un pedido como listo aparecera en esta lista." title="Sin pedidos libres" />
            )}
          </Panel>
        ) : null}

        {activeView === 'routes' ? (
          <Panel className="delivery-command delivery-route-page">
            <section className="delivery-route-map" aria-label="Mapa de ruta activa">
              <div className="delivery-route-map-toolbar">
                <span>
                  <Navigation size={16} aria-hidden="true" />
                  Ruta activa
                </span>
                <div>
                  <button
                    aria-label="Alejar mapa"
                    onClick={() => setRouteMapZoom((current) => Math.max(0.86, Number((current - 0.08).toFixed(2))))}
                    type="button"
                  >
                    -
                  </button>
                  <button
                    aria-label="Acercar mapa"
                    onClick={() => setRouteMapZoom((current) => Math.min(1.18, Number((current + 0.08).toFixed(2))))}
                    type="button"
                  >
                    +
                  </button>
                  <button aria-label="Centrar mapa" onClick={() => setRouteMapZoom(1)} type="button">
                    <MapPin size={16} aria-hidden="true" />
                  </button>
                </div>
              </div>
              <div className="delivery-map-canvas">
                <div className="delivery-map-plane" style={{ transform: `scale(${routeMapZoom})` }}>
                  <span className="map-road main" />
                  <span className="map-road diagonal" />
                  <span className="map-road side-a" />
                  <span className="map-road side-b" />
                  <span className="map-route-line" />
                  <span className="map-pin pickup">
                    <MapPin size={18} aria-hidden="true" />
                  </span>
                  <span className="map-pin dropoff">
                    <Navigation size={18} aria-hidden="true" />
                  </span>
                </div>
                <div className="delivery-map-address">
                  <strong>{activeRouteOrder?.address ?? 'Sin pedido activo'}</strong>
                  <span>{activeRouteStore ? `Retiro: ${activeRouteStore.address}` : 'Toma un pedido para ver la direccion de entrega.'}</span>
                </div>
              </div>
            </section>

            <section className="delivery-active-order" aria-label="Pedido activo">
              {activeRouteOrder ? (
                <article className="order-card">
                  <div className="order-card-header">
                    <div>
                      <strong>{activeRouteOrder.id}</strong>
                      <span>{activeRouteStore?.name} | {activeRouteOrder.address}</span>
                    </div>
                    <StatusPill status={activeRouteOrder.status} />
                  </div>
                  <div className="route-stack">
                    <span>
                      <MapPin size={15} aria-hidden="true" /> {activeRouteStore?.address}
                    </span>
                    <span>
                      <Clock size={15} aria-hidden="true" /> {activeRouteOrder.distanceKm} km | {formatCurrency(activeRouteOrder.courierReward)}
                    </span>
                  </div>
                  <div className="button-row">
                    {activeRouteOrder.status === 'assigned' ? (
                      <ActionButton icon={PackageCheck} onClick={() => onOrderStatusChange(activeRouteOrder.id, 'picked_up')} variant="primary">
                        Retirado
                      </ActionButton>
                    ) : null}
                    {activeRouteOrder.status === 'picked_up' ? (
                      <ActionButton icon={Truck} onClick={() => onOrderStatusChange(activeRouteOrder.id, 'in_transit')} variant="primary">
                        En camino
                      </ActionButton>
                    ) : null}
                    {activeRouteOrder.status === 'in_transit' ? (
                      <ActionButton icon={CheckCircle2} onClick={() => onOrderStatusChange(activeRouteOrder.id, 'delivered')} variant="success">
                        Entregado
                      </ActionButton>
                    ) : null}
                  </div>
                </article>
              ) : (
                <EmptyState body="Toma un pedido disponible para iniciar una ruta." title="Sin rutas activas" />
              )}
            </section>
          </Panel>
        ) : null}

        {activeView === 'earnings' ? (
          <Panel className="delivery-command" title="Ganancias">
            <div className="store-payment-summary">
              <span>
                <strong>{formatCurrency(activeDelivery?.earningsToday ?? 0)}</strong>
                Ganado hoy
              </span>
              <span>
                <strong>{formatCurrency(projectedAvailable)}</strong>
                Bolsa disponible
              </span>
              <span>
                <strong>{finishedJobs.length}</strong>
                Entregas cerradas
              </span>
            </div>
          </Panel>
        ) : null}

        {activeView === 'profile' ? (
          <Panel className="delivery-command" title="Mi perfil">
            <div className="driver-card">
              <div className="avatar-circle">{activeDelivery?.name.slice(0, 1)}</div>
              <strong>{activeDelivery?.name}</strong>
              <span>{activeDelivery?.vehicle}</span>
              <span>
                <Star size={15} aria-hidden="true" /> {activeDelivery?.rating} | {formatCurrency(activeDelivery?.earningsToday ?? 0)} hoy
              </span>
            </div>
          </Panel>
        ) : null}

        {activeView === 'history' ? (
          <Panel className="delivery-command" title="Historial">
            <div className="history-list">
              {finishedJobs.length ? (
                finishedJobs.map((order) => (
                  <div className="history-row" key={order.id}>
                    <CheckCircle2 size={15} aria-hidden="true" />
                    <div>
                      <strong>{order.id}</strong>
                      <span>{formatCurrency(order.courierReward)}</span>
                    </div>
                    <StatusPill status={order.status} />
                  </div>
                ))
              ) : (
                <EmptyState body="Las entregas completadas apareceran aqui." title="Sin historial" />
              )}
            </div>
          </Panel>
        ) : null}
      </div>

      <nav className="mobile-bottom-nav store-bottom-nav delivery-bottom-nav" aria-label="Menu delivery">
        <button className={activeView === 'dashboard' ? 'active' : ''} onClick={() => navigateDeliverySection('dashboard')} type="button">
          <Bike size={21} aria-hidden="true" />
          <span>Inicio</span>
        </button>
        <button className={activeView === 'available' ? 'active' : ''} onClick={() => navigateDeliverySection('available')} type="button">
          <PackageCheck size={21} aria-hidden="true" />
          <span>Pedidos</span>
          {availableOrders.length ? <strong>{availableOrders.length}</strong> : null}
        </button>
        <button className={activeView === 'routes' ? 'active' : ''} onClick={() => navigateDeliverySection('routes')} type="button">
          <Navigation size={21} aria-hidden="true" />
          <span>Rutas</span>
        </button>
        <button
          className={deliveryMenuOpen || !deliveryMainViews.includes(activeView) ? 'active' : ''}
          onClick={() => setDeliveryMenuOpen(true)}
          type="button"
        >
          <MenuIcon size={21} aria-hidden="true" />
          <span>Menu</span>
        </button>
      </nav>

      {deliveryMenuOpen ? (
        <div className="account-sheet-backdrop" role="presentation" onClick={() => setDeliveryMenuOpen(false)}>
          <section
            aria-labelledby="delivery-menu-title"
            className="account-sheet store-menu-sheet delivery-menu-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="account-profile-card store-menu-profile">
              <button aria-label="Cerrar menu" className="account-close-button" onClick={() => setDeliveryMenuOpen(false)} type="button">
                <ArrowLeft size={24} aria-hidden="true" />
              </button>
              <div className="account-avatar avatar-circle">{activeDelivery?.name.slice(0, 1)}</div>
              <div>
                <span>Menu delivery</span>
                <h2 id="delivery-menu-title">{activeDelivery?.name}</h2>
                <p>{deliveryStatusLabel}</p>
              </div>
            </div>

            <div className="account-summary-grid delivery-menu-summary">
              <span>
                <strong>{activeJobs.length}</strong>
                Rutas
              </span>
              <span>
                <strong>{finishedJobs.length}</strong>
                Historial
              </span>
              <span>
                <strong>{activeDelivery?.rating}</strong>
                Rating
              </span>
            </div>

            <div className="account-actions store-menu-actions" aria-label="Opciones delivery">
              <button onClick={() => navigateDeliverySection('profile')} type="button">
                <UserRound size={20} aria-hidden="true" />
                <span>
                  <strong>Mi perfil</strong>
                  <small>{activeDelivery?.vehicle}</small>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </button>
              <button onClick={() => navigateDeliverySection('history')} type="button">
                <History size={20} aria-hidden="true" />
                <span>
                  <strong>Historial</strong>
                  <small>Entregas completadas</small>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </button>
              <button onClick={() => navigateDeliverySection('earnings')} type="button">
                <BarChart3 size={20} aria-hidden="true" />
                <span>
                  <strong>Resumen de ganancias</strong>
                  <small>{formatCurrency(activeDelivery?.earningsToday ?? 0)} hoy</small>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </button>
              <button className="account-logout-button" onClick={onLogout} type="button">
                <LogOut size={20} aria-hidden="true" />
                <span>
                  <strong>Cerrar sesion</strong>
                  <small>Salir de la cuenta delivery</small>
                </span>
                <ChevronRight size={20} aria-hidden="true" />
              </button>
            </div>
          </section>
        </div>
      ) : null}

      {serviceConfirmAction ? (
        <div className="modal-backdrop" role="presentation" onClick={() => setServiceConfirmAction(null)}>
          <section
            aria-labelledby="delivery-service-confirm-title"
            className="delivery-service-confirm"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="delivery-service-confirm-icon">
              {serviceConfirmAction === 'available' ? (
                <CheckCircle2 size={26} aria-hidden="true" />
              ) : (
                <Clock size={26} aria-hidden="true" />
              )}
            </div>
            <div>
              <h2 id="delivery-service-confirm-title">
                {serviceConfirmAction === 'available' ? 'Activar servicio' : 'Salir de servicio'}
              </h2>
              <p>
                {serviceConfirmAction === 'available'
                  ? 'Confirmas que estas disponible para recibir y tomar pedidos.'
                  : 'Confirmas que dejaras de aparecer como disponible para nuevos pedidos.'}
              </p>
            </div>
            <div className="delivery-service-confirm-actions">
              <ActionButton icon={ArrowLeft} onClick={() => setServiceConfirmAction(null)} variant="ghost">
                Cancelar
              </ActionButton>
              <ActionButton
                icon={serviceConfirmAction === 'available' ? CheckCircle2 : Clock}
                onClick={confirmServiceStatus}
                variant={serviceConfirmAction === 'available' ? 'success' : 'danger'}
              >
                Confirmar
              </ActionButton>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
