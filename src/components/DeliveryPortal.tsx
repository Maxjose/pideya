import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  CheckCircle2,
  ChevronRight,
  Clock,
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
  onAcceptDelivery: (orderId: string) => void;
  onServiceStatusChange: (status: 'available' | 'offline') => void;
  onOrderStatusChange: (orderId: string, status: OrderStatus) => void;
  onLogout: () => void;
}

type DeliveryView = 'dashboard' | 'available' | 'routes' | 'earnings' | 'profile';
type DeliveryServiceStatus = 'available' | 'offline';

const deliveryMainViews: DeliveryView[] = ['dashboard', 'available', 'routes'];

export function DeliveryPortal({
  deliveries,
  stores,
  orders,
  onAcceptDelivery,
  onServiceStatusChange,
  onOrderStatusChange,
  onLogout,
}: DeliveryPortalProps) {
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
  const [serviceConfirmAction, setServiceConfirmAction] = useState<DeliveryServiceStatus | null>(null);
  const [routeMapZoom, setRouteMapZoom] = useState(1);
  const activeDelivery = deliveries[0];

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
  const serviceStatus: DeliveryServiceStatus = activeDelivery?.status === 'offline' ? 'offline' : 'available';
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

    onServiceStatusChange(serviceConfirmAction);
    setServiceConfirmAction(null);
  };

  const routeSteps: { status: OrderStatus; label: string }[] = [
    { status: 'assigned', label: 'Retiro' },
    { status: 'picked_up', label: 'En camino' },
    { status: 'in_transit', label: 'Entrega' },
  ];
  const nextAction: Partial<Record<OrderStatus, { to: OrderStatus; label: string; icon: typeof Truck }>> = {
    assigned: { to: 'picked_up', label: 'Confirmar retiro', icon: PackageCheck },
    picked_up: { to: 'in_transit', label: 'Iniciar entrega', icon: Truck },
    in_transit: { to: 'delivered', label: 'Marcar entregado', icon: CheckCircle2 },
  };

  const renderActiveOrder = (order: Order) => {
    const store = stores.find((item) => item.id === order.storeId);
    const stepIndex = routeSteps.findIndex((step) => step.status === order.status);
    const action = nextAction[order.status];

    return (
      <article className="order-card dlv-active">
        <div className="order-card-header">
          <div>
            <strong>{order.id}</strong>
            <span>{store?.name}</span>
          </div>
          <StatusPill status={order.status} />
        </div>
        <ol className="dlv-steps" aria-label="Progreso del pedido">
          {routeSteps.map((step, index) => (
            <li className={index < stepIndex ? 'done' : index === stepIndex ? 'current' : ''} key={step.status}>
              <span />
              {step.label}
            </li>
          ))}
        </ol>
        <div className="dlv-route">
          <span>
            <MapPin size={15} aria-hidden="true" /> <small>Retiro</small> {store?.address}
          </span>
          <span>
            <Navigation size={15} aria-hidden="true" /> <small>Entrega</small> {order.address}
          </span>
        </div>
        <div className="delivery-card-footer">
          <span>{order.distanceKm} km</span>
          <strong>{formatCurrency(order.courierReward)}</strong>
        </div>
        {action ? (
          <ActionButton
            className="dlv-wide"
            icon={action.icon}
            onClick={() => onOrderStatusChange(order.id, action.to)}
            variant={action.to === 'delivered' ? 'success' : 'primary'}
          >
            {action.label}
          </ActionButton>
        ) : null}
      </article>
    );
  };

  const renderOffer = (order: Order) => {
    const store = stores.find((item) => item.id === order.storeId);

    return (
      <article className="delivery-card" key={order.id}>
        <div className="delivery-card-main">
          <SafeImage src={store?.imageUrl} alt="" />
          <div>
            <strong>{store?.name}</strong>
            <small>{order.id} | {formatTime(order.createdAt)} | {order.items.length} items</small>
          </div>
          <div className="dlv-reward">
            <strong>{formatCurrency(order.courierReward)}</strong>
            <small>{order.distanceKm} km</small>
          </div>
        </div>
        <div className="dlv-route">
          <span>
            <MapPin size={15} aria-hidden="true" /> <small>Retiro</small> {store?.address}
          </span>
          <span>
            <Navigation size={15} aria-hidden="true" /> <small>Entrega</small> {order.address}
          </span>
        </div>
        <ActionButton
          className="dlv-wide"
          disabled={!isInService}
          icon={CheckCircle2}
          onClick={() => onAcceptDelivery(order.id)}
          variant="success"
        >
          Tomar pedido
        </ActionButton>
      </article>
    );
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
              <section className={`delivery-service-card dlv-service ${isInService ? 'is-on' : 'is-off'}`} aria-label="Estado de servicio">
                <div>
                  <h2>{isInService ? 'Estas en servicio' : 'Estas fuera de servicio'}</h2>
                  <p>
                    {isInService
                      ? 'Recibiras los pedidos listos para tomarlos.'
                      : 'Activate cuando estes disponible para repartir.'}
                  </p>
                </div>
                <ActionButton
                  icon={isInService ? Clock : CheckCircle2}
                  onClick={() => setServiceConfirmAction(isInService ? 'offline' : 'available')}
                  variant={isInService ? 'danger' : 'success'}
                >
                  {isInService ? 'Salir' : 'Activarme'}
                </ActionButton>
              </section>
            </Panel>

            {activeRouteOrder ? (
              <Panel
                className="delivery-command"
                title="Pedido en curso"
                action={
                  <button className="dlv-link" onClick={() => navigateDeliverySection('routes')} type="button">
                    Ver ruta <ChevronRight size={16} aria-hidden="true" />
                  </button>
                }
              >
                {renderActiveOrder(activeRouteOrder)}
              </Panel>
            ) : null}

            <Panel className="delivery-command" title="Tu dia">
              <div className="store-payment-summary">
                <span>
                  <strong>{formatCurrency(activeDelivery?.earningsToday ?? 0)}</strong>
                  Ganado hoy
                </span>
                <span>
                  <strong>{activeDelivery?.completedToday ?? 0}</strong>
                  Entregas
                </span>
                <span>
                  <strong>
                    <Star size={15} aria-hidden="true" /> {activeDelivery?.rating}
                  </strong>
                  Rating
                </span>
              </div>
            </Panel>

            <Panel
              className="delivery-command"
              title={`Pedidos disponibles (${availableOrders.length})`}
              action={
                availableOrders.length > 2 ? (
                  <button className="dlv-link" onClick={() => navigateDeliverySection('available')} type="button">
                    Ver todos <ChevronRight size={16} aria-hidden="true" />
                  </button>
                ) : undefined
              }
            >
              {availableOrders.length ? (
                <div className="delivery-offers">{availableOrders.slice(0, 2).map(renderOffer)}</div>
              ) : (
                <EmptyState body="Cuando una tienda marque un pedido como listo aparecera aqui." title="Sin pedidos libres" />
              )}
            </Panel>
          </>
        ) : null}

        {activeView === 'available' ? (
          <Panel className="delivery-command" title="Pedidos disponibles">
            {!isInService ? (
              <div className="dlv-notice">
                <Clock size={18} aria-hidden="true" />
                <span>Estas fuera de servicio. Activate desde Inicio para tomar pedidos.</span>
              </div>
            ) : null}
            {availableOrders.length ? (
              <div className="delivery-offers">{availableOrders.map(renderOffer)}</div>
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
                renderActiveOrder(activeRouteOrder)
              ) : (
                <EmptyState body="Toma un pedido disponible para iniciar una ruta." title="Sin rutas activas" />
              )}
            </section>

            {activeJobs.length > 1 ? (
              <section className="dlv-queue" aria-label="Pedidos en cola">
                <h3>En cola ({activeJobs.length - 1})</h3>
                <div className="history-list">
                  {activeJobs.slice(1).map((order) => {
                    const store = stores.find((item) => item.id === order.storeId);
                    return (
                      <div className="history-row" key={order.id}>
                        <Truck size={15} aria-hidden="true" />
                        <div>
                          <strong>{order.id}</strong>
                          <span>{store?.name} | {order.address}</span>
                        </div>
                        <StatusPill status={order.status} />
                      </div>
                    );
                  })}
                </div>
              </section>
            ) : null}
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
                <strong>{finishedJobs.length}</strong>
                Entregas cerradas
              </span>
              <span>
                <strong>{formatCurrency(projectedAvailable)}</strong>
                Bolsa disponible
              </span>
            </div>
            <h3 className="dlv-subtitle">Historial de entregas</h3>
            <div className="history-list">
              {finishedJobs.length ? (
                finishedJobs.map((order) => {
                  const store = stores.find((item) => item.id === order.storeId);
                  return (
                    <div className="history-row" key={order.id}>
                      <CheckCircle2 size={15} aria-hidden="true" />
                      <div>
                        <strong>{order.id}</strong>
                        <span>{store?.name} | {order.distanceKm} km</span>
                      </div>
                      <strong className="dlv-amount">{formatCurrency(order.courierReward)}</strong>
                    </div>
                  );
                })
              ) : (
                <EmptyState body="Las entregas completadas apareceran aqui." title="Sin historial" />
              )}
            </div>
          </Panel>
        ) : null}

        {activeView === 'profile' ? (
          <Panel className="delivery-command" title="Mi perfil">
            <div className="driver-card">
              <div className="avatar-circle">{activeDelivery?.name.slice(0, 1)}</div>
              <strong>{activeDelivery?.name}</strong>
              <span>{activeDelivery?.vehicle}</span>
            </div>
            <div className="store-payment-summary">
              <span>
                <strong>
                  <Star size={15} aria-hidden="true" /> {activeDelivery?.rating}
                </strong>
                Rating
              </span>
              <span>
                <strong>{activeDelivery?.completedToday ?? 0}</strong>
                Entregas hoy
              </span>
              <span>
                <strong>{deliveryStatusLabel}</strong>
                Estado
              </span>
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
                Entregas
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
              <button onClick={() => navigateDeliverySection('earnings')} type="button">
                <BarChart3 size={20} aria-hidden="true" />
                <span>
                  <strong>Ganancias e historial</strong>
                  <small>{formatCurrency(activeDelivery?.earningsToday ?? 0)} hoy | {finishedJobs.length} entregas</small>
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
