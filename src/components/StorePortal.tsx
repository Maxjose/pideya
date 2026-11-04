import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  ClipboardList,
  CreditCard,
  ChevronRight,
  Edit3,
  LogOut,
  MapPin,
  Menu as MenuIcon,
  PackageCheck,
  Phone,
  Plus,
  Power,
  Search,
  Settings,
  Store,
  Tags,
  WalletCards,
  XCircle,
} from 'lucide-react';
import pideyaLogo from '../assets/pideya-logo.png';
import { ActionButton, EmptyState, MetricCard, Panel, SafeImage, StatusPill } from './Shared';
import type { OrderStatus as DeskOrderStatus } from '../types';
import { statusLabels } from '../utils/format';
import { PaymentMethodsEditor } from './PaymentMethodsEditor';
import type { Order, OrderStatus, Product, Storefront } from '../types';
import { formatCurrency, formatTime } from '../utils/format';

interface StorePortalProps {
  stores: Storefront[];
  products: Product[];
  orders: Order[];
  managedStoreId: string;
  onManagedStoreChange: (storeId: string) => void;
  onOrderStatusChange: (orderId: string, status: OrderStatus) => void;
  onAddProduct: (product: Omit<Product, 'id'>) => void;
  onUpdateProduct: (productId: string, product: Omit<Product, 'id'>) => void;
  onToggleStoreOpen: (storeId: string) => void;
  onLogout: () => void;
}

const productImageFallback =
  'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=700&q=80';

type StoreView =
  | 'dashboard'
  | 'orders'
  | 'inventory'
  | 'payments'
  | 'location'
  | 'paymentData'
  | 'schedule'
  | 'promotions'
  | 'settings';

const storeMainViews: StoreView[] = ['dashboard', 'orders', 'inventory', 'payments'];

export function StorePortal({
  stores,
  products,
  orders,
  managedStoreId,
  onManagedStoreChange,
  onOrderStatusChange,
  onAddProduct,
  onUpdateProduct,
  onToggleStoreOpen,
  onLogout,
}: StorePortalProps) {
  const [draftName, setDraftName] = useState('');
  const [draftDescription, setDraftDescription] = useState('');
  const [draftPrice, setDraftPrice] = useState('5.00');
  const [draftCategory, setDraftCategory] = useState('Especiales');
  const [draftStock, setDraftStock] = useState('10');
  const [draftOptions, setDraftOptions] = useState('Extra salsa, Sin cebolla');
  const [productSearch, setProductSearch] = useState('');
  const [activeView, setActiveView] = useState<StoreView>('dashboard');
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);

  useEffect(() => {
    if (!storeMenuOpen) {
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
  }, [storeMenuOpen]);
  const [inventoryFabOpen, setInventoryFabOpen] = useState(false);
  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [categorySheetOpen, setCategorySheetOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  const store = stores.find((item) => item.id === managedStoreId) ?? stores[0];
  const storeProducts = products.filter((product) => product.storeId === store.id);
  const storeOrders = orders.filter((order) => order.storeId === store.id);

  const dashboard = useMemo(
    () => ({
      newOrders: storeOrders.filter((order) => order.status === 'pending').length,
      preparing: storeOrders.filter((order) =>
        ['accepted', 'preparing'].includes(order.status),
      ).length,
      ready: storeOrders.filter((order) => order.status === 'ready').length,
      completed: storeOrders.filter((order) => order.status === 'delivered').length,
    }),
    [storeOrders],
  );
  const deliveredSales = storeOrders
    .filter((order) => order.status === 'delivered')
    .reduce((total, order) => total + order.subtotal + order.deliveryFee, 0);
  const pendingPayout = storeOrders
    .filter((order) => !['cancelled', 'delivered'].includes(order.status))
    .reduce((total, order) => total + order.subtotal + order.deliveryFee, 0);
  const lowStockProducts = storeProducts.filter((product) => product.stock <= 5).length;
  const productCategoryOptions = Array.from(
    new Set(['Especiales', ...storeProducts.map((product) => product.category), draftCategory].filter(Boolean)),
  );
  const filteredStoreProducts = storeProducts.filter((product) => {
    const normalizedSearch = productSearch.trim().toLowerCase();

    if (!normalizedSearch) {
      return true;
    }

    return [product.name, product.category, product.description].some((value) =>
      value.toLowerCase().includes(normalizedSearch),
    );
  });

  const openNewProductSheet = () => {
    setEditingProductId(null);
    setDraftName('');
    setDraftDescription('');
    setDraftPrice('5.00');
    setDraftCategory('Especiales');
    setDraftStock('10');
    setDraftOptions('Extra salsa, Sin cebolla');
    setInventoryFabOpen(false);
    setProductSheetOpen(true);
  };

  const openEditProductSheet = (product: Product) => {
    setEditingProductId(product.id);
    setDraftName(product.name);
    setDraftDescription(product.description);
    setDraftPrice(String(product.price));
    setDraftCategory(product.category);
    setDraftStock(String(product.stock));
    setDraftOptions(product.options.join(', '));
    setInventoryFabOpen(false);
    setProductSheetOpen(true);
  };

  const navigateStoreSection = (view: StoreView) => {
    setActiveView(view);
    setStoreMenuOpen(false);
    setInventoryFabOpen(false);
    setProductSheetOpen(false);
    setCategorySheetOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const menuOptions = [
    { label: 'Ubicacion de la tienda', detail: store.address, icon: MapPin, view: 'location' as const },
    { label: 'Métodos de pago', detail: 'Pago móvil, Binance y efectivo', icon: CreditCard, view: 'paymentData' as const },
    { label: 'Horario y disponibilidad', detail: store.schedule, icon: Clock, view: 'schedule' as const },
    { label: 'Promociones', detail: 'Cupones, descuentos y combos', icon: Tags, view: 'promotions' as const },
    { label: 'Ajustes de tienda', detail: 'Perfil, permisos y notificaciones', icon: Settings, view: 'settings' as const },
  ];

  const submitProduct = () => {
    const price = Number(draftPrice);
    const stock = Number(draftStock);

    if (!draftName.trim() || !draftDescription.trim() || Number.isNaN(price) || Number.isNaN(stock)) {
      return;
    }

    const productPayload = {
      storeId: store.id,
      name: draftName.trim(),
      description: draftDescription.trim(),
      price,
      category: draftCategory.trim() || 'Especiales',
      imageUrl: productImageFallback,
      available: true,
      stock,
      options: draftOptions
        .split(',')
        .map((option) => option.trim())
        .filter(Boolean),
    };

    if (editingProductId) {
      onUpdateProduct(editingProductId, productPayload);
    } else {
      onAddProduct(productPayload);
    }

    setDraftName('');
    setDraftDescription('');
    setDraftPrice('5.00');
    setDraftCategory('Especiales');
    setDraftStock('10');
    setEditingProductId(null);
    setProductSheetOpen(false);
  };

  const deskNav: Array<{ view: StoreView; label: string; icon: typeof Store; badge?: number }> = [
    { view: 'dashboard', label: 'Inicio', icon: Store },
    { view: 'orders', label: 'Pedidos', icon: ClipboardList, badge: dashboard.newOrders },
    { view: 'inventory', label: 'Inventario', icon: PackageCheck },
    { view: 'payments', label: 'Pagos', icon: WalletCards },
  ];
  const deskConfig: Array<{ view: StoreView; label: string; icon: typeof Store }> = [
    { view: 'paymentData', label: 'Métodos de pago', icon: CreditCard },
    { view: 'location', label: 'Ubicación', icon: MapPin },
    { view: 'schedule', label: 'Horario', icon: Clock },
    { view: 'promotions', label: 'Promociones', icon: Tags },
    { view: 'settings', label: 'Ajustes', icon: Settings },
  ];
  const deskTitles: Record<StoreView, { title: string; subtitle: string }> = {
    dashboard: { title: 'Inicio', subtitle: 'Resumen de la operación de tu tienda.' },
    orders: { title: 'Pedidos', subtitle: `${storeOrders.length} pedidos · ${dashboard.newOrders} nuevos` },
    inventory: { title: 'Inventario', subtitle: `${storeProducts.length} productos · ${lowStockProducts} con stock bajo` },
    payments: { title: 'Pagos', subtitle: 'Ventas liquidadas y por conciliar.' },
    paymentData: { title: 'Métodos de pago', subtitle: 'Cómo te pagan tus clientes.' },
    location: { title: 'Ubicación', subtitle: store.address },
    schedule: { title: 'Horario y disponibilidad', subtitle: store.schedule },
    promotions: { title: 'Promociones', subtitle: 'Cupones, descuentos y combos.' },
    settings: { title: 'Ajustes de tienda', subtitle: 'Perfil, permisos y notificaciones.' },
  };
  const deskHeader = deskTitles[activeView];
  const [deskQuery, setDeskQuery] = useState('');
  const [deskStatus, setDeskStatus] = useState<'active' | 'all' | DeskOrderStatus>('active');
  const [deskOrderId, setDeskOrderId] = useState<string | null>(null);
  const activeOrderStatuses: DeskOrderStatus[] = ['pending', 'accepted', 'preparing', 'ready', 'assigned', 'picked_up', 'in_transit'];
  const dq = deskQuery.trim().toLowerCase();
  const deskOrders = storeOrders.filter((order) => {
    if (deskStatus === 'active' && !activeOrderStatuses.includes(order.status)) return false;
    if (deskStatus !== 'all' && deskStatus !== 'active' && order.status !== deskStatus) return false;
    return !dq || [order.id, order.customerName, order.customerPhone, order.address].some((v) => v.toLowerCase().includes(dq));
  });
  const deskProducts = storeProducts.filter(
    (product) => !dq || [product.name, product.category, product.description].some((v) => v.toLowerCase().includes(dq)),
  );
  const deskOrderDetail = storeOrders.find((order) => order.id === deskOrderId) ?? null;
  const fmtDate = (iso: string) =>
    new Intl.DateTimeFormat('es-VE', { day: '2-digit', month: 'short', hour: 'numeric', minute: '2-digit' }).format(new Date(iso));
  const netForStore = (order: Order) => order.subtotal - (order.storeCommission ?? 0);
  const deliveredOrders = storeOrders.filter((order) => order.status === 'delivered');
  const todayOrders = storeOrders.filter((order) => new Date(order.createdAt).toDateString() === new Date().toDateString());
  const isMainView = storeMainViews.includes(activeView);

  const orderActions = (order: Order) => (
    <div className="store-desk-actions" onClick={(event) => event.stopPropagation()}>
      {order.status === 'pending' ? (
        <>
          <ActionButton icon={CheckCircle2} onClick={() => onOrderStatusChange(order.id, 'accepted')} variant="success">Confirmar</ActionButton>
          <ActionButton icon={XCircle} onClick={() => onOrderStatusChange(order.id, 'cancelled')} variant="danger">Rechazar</ActionButton>
        </>
      ) : null}
      {order.status === 'accepted' ? (
        <ActionButton icon={PackageCheck} onClick={() => onOrderStatusChange(order.id, 'preparing')} variant="primary">Preparar</ActionButton>
      ) : null}
      {order.status === 'preparing' ? (
        <ActionButton icon={CheckCircle2} onClick={() => onOrderStatusChange(order.id, 'ready')} variant="primary">Marcar listo</ActionButton>
      ) : null}
    </div>
  );

  const deskOrderTable = (list: Order[], withActions = true) =>
    list.length ? (
      <div className="adm-table-wrap">
        <table className="adm-table">
          <thead>
            <tr>
              <th>Pedido</th>
              <th>Fecha</th>
              <th>Cliente</th>
              <th>Productos</th>
              <th>Pago</th>
              <th className="num">Total</th>
              <th>Estado</th>
              {withActions ? <th /> : null}
            </tr>
          </thead>
          <tbody>
            {list.map((order) => (
              <tr className="clickable" key={order.id} onClick={() => setDeskOrderId(order.id)}>
                <td><strong>{order.id}</strong></td>
                <td>{fmtDate(order.createdAt)}</td>
                <td>
                  {order.customerName}
                  <small>{order.customerPhone}</small>
                </td>
                <td>
                  {order.items.reduce((t, i) => t + i.quantity, 0)} items
                  <small>{order.items.map((i) => i.name).join(', ')}</small>
                </td>
                <td>{order.paymentMethod}</td>
                <td className="num">{formatCurrency(order.subtotal + order.deliveryFee)}</td>
                <td><StatusPill status={order.status} /></td>
                {withActions ? <td className="adm-actions">{orderActions(order)}</td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    ) : (
      <EmptyState body="No hay pedidos que coincidan." title="Sin pedidos" />
    );

  const deskKpi = (label: string, value: string, detail: string, Icon: typeof Store, tone: string) => (
    <article className={`adm-kpi ${tone}`}>
      <div className="adm-kpi-icon"><Icon size={20} aria-hidden="true" /></div>
      <div>
        <span>{label}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
    </article>
  );

  const deskSearch = (placeholder: string) => (
    <label className="adm-search">
      <Search size={17} aria-hidden="true" />
      <input onChange={(event) => setDeskQuery(event.target.value)} placeholder={placeholder} value={deskQuery} />
    </label>
  );

  const renderDeskView = () => {
    if (activeView === 'dashboard') {
      const attention = storeOrders.filter((order) => ['pending', 'accepted', 'preparing'].includes(order.status));
      return (
        <>
          <div className="adm-kpis">
            {deskKpi('Pedidos nuevos', String(dashboard.newOrders), 'Sin confirmar', Clock, dashboard.newOrders ? 'coral' : 'ink')}
            {deskKpi('En preparacion', String(dashboard.preparing), 'Aceptados y en cocina', PackageCheck, 'amber')}
            {deskKpi('Listos', String(dashboard.ready), 'Esperando repartidor', CheckCircle2, 'green')}
            {deskKpi('Entregados', String(dashboard.completed), `${todayOrders.length} pedidos hoy`, ClipboardList, 'blue')}
            {deskKpi('Ventas liquidadas', formatCurrency(deliveredOrders.reduce((t, o) => t + netForStore(o), 0)), 'Neto de pedidos entregados', WalletCards, 'green')}
            {deskKpi('Por conciliar', formatCurrency(storeOrders.filter((o) => activeOrderStatuses.includes(o.status)).reduce((t, o) => t + netForStore(o), 0)), 'Pedidos en curso', CreditCard, 'amber')}
            {deskKpi('Productos', String(storeProducts.length), `${storeProducts.filter((p) => !p.available).length} ocultos`, Tags, 'blue')}
            {deskKpi('Stock bajo', String(lowStockProducts), '5 unidades o menos', PackageCheck, lowStockProducts ? 'coral' : 'ink')}
          </div>
          <div className="adm-columns">
            <section className="adm-card flush">
              <div className="adm-card-head pad">
                <h3>Requieren atencion</h3>
                <button className="adm-link" onClick={() => navigateStoreSection('orders')} type="button">Ver pedidos</button>
              </div>
              {attention.length ? (
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <tbody>
                      {attention.slice(0, 6).map((order) => (
                        <tr className="clickable" key={order.id} onClick={() => setDeskOrderId(order.id)}>
                          <td><strong>{order.id}</strong><small>{fmtDate(order.createdAt)}</small></td>
                          <td>{order.customerName}<small>{order.items.length} productos</small></td>
                          <td><StatusPill status={order.status} /></td>
                          <td className="adm-actions">{orderActions(order)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="pad"><EmptyState body="No hay pedidos pendientes por atender." title="Todo al dia" /></div>
              )}
            </section>
            <section className="adm-card">
              <h3>Mi tienda</h3>
              <div className="store-desk-info">
                <SafeImage src={store.imageUrl} alt="" />
                <dl className="adm-dl">
                  <dt>Nombre</dt><dd>{store.name}</dd>
                  <dt>Direccion</dt><dd>{store.address}</dd>
                  <dt>Telefono</dt><dd>{store.phone || '—'}</dd>
                  <dt>Horario</dt><dd>{store.schedule}</dd>
                  <dt>Estado</dt><dd><span className={`adm-state ${store.open ? 'on' : 'off'}`}>{store.open ? 'Abierta' : 'Cerrada'}</span></dd>
                </dl>
              </div>
            </section>
          </div>
          <section className="adm-card flush">
            <div className="adm-card-head pad">
              <h3>Ultimos pedidos</h3>
              <button className="adm-link" onClick={() => navigateStoreSection('orders')} type="button">Ver todos</button>
            </div>
            {deskOrderTable(storeOrders.slice(0, 8), false)}
          </section>
        </>
      );
    }
    if (activeView === 'orders') {
      const counts = (status: 'active' | 'all' | DeskOrderStatus) =>
        status === 'all' ? storeOrders.length : status === 'active' ? storeOrders.filter((o) => activeOrderStatuses.includes(o.status)).length : storeOrders.filter((o) => o.status === status).length;
      return (
        <>
          <div className="adm-toolbar">
            {deskSearch('Buscar por pedido, cliente, telefono o direccion')}
            <div className="adm-segmented">
              {(['active', 'pending', 'preparing', 'ready', 'delivered', 'cancelled', 'all'] as const).map((status) => (
                <button className={deskStatus === status ? 'active' : ''} key={status} onClick={() => setDeskStatus(status)} type="button">
                  {status === 'active' ? 'Activos' : status === 'all' ? 'Todos' : statusLabels[status]}
                  <small>{counts(status)}</small>
                </button>
              ))}
            </div>
          </div>
          <section className="adm-card flush">{deskOrderTable(deskOrders)}</section>
        </>
      );
    }
    if (activeView === 'inventory') {
      return (
        <>
          <div className="adm-toolbar">{deskSearch('Buscar producto o categoria')}</div>
          <section className="adm-card flush">
            {deskProducts.length ? (
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Producto</th>
                      <th>Categoria</th>
                      <th>Opciones</th>
                      <th className="num">Precio</th>
                      <th className="num">Stock</th>
                      <th>Disponible</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {deskProducts.map((product) => (
                      <tr className={product.available ? '' : 'inactive'} key={product.id}>
                        <td>
                          <div className="adm-entity">
                            <SafeImage src={product.imageUrl} alt="" />
                            <div>
                              <strong>{product.name}</strong>
                              <small>{product.description}</small>
                            </div>
                          </div>
                        </td>
                        <td>{product.category}</td>
                        <td><small>{product.options.join(', ') || '—'}</small></td>
                        <td className="num">{formatCurrency(product.price)}</td>
                        <td className="num">
                          {product.stock <= 5 ? <span className="adm-state off">{product.stock}</span> : product.stock}
                        </td>
                        <td className="adm-actions">
                          <button
                            aria-label={`Disponibilidad de ${product.name}`}
                            aria-pressed={product.available}
                            className={`adm-toggle ${product.available ? 'on' : ''}`}
                            onClick={() => {
                              const { id, ...rest } = product;
                              onUpdateProduct(id, { ...rest, available: !product.available });
                            }}
                            type="button"
                          >
                            <span />
                          </button>
                        </td>
                        <td className="adm-actions">
                          <button className="adm-icon-button" onClick={() => openEditProductSheet(product)} title="Editar" type="button">
                            <Edit3 size={16} aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="pad"><EmptyState body="Agrega tu primer producto con el boton Nuevo producto." title="Sin productos" /></div>
            )}
          </section>
        </>
      );
    }
    // payments
    const commissionTotal = storeOrders.filter((o) => o.status !== 'cancelled').reduce((t, o) => t + (o.storeCommission ?? 0), 0);
    return (
      <>
        <div className="adm-kpis">
          {deskKpi('Ventas liquidadas', formatCurrency(deliveredOrders.reduce((t, o) => t + netForStore(o), 0)), `${deliveredOrders.length} pedidos entregados`, WalletCards, 'green')}
          {deskKpi('Por conciliar', formatCurrency(storeOrders.filter((o) => activeOrderStatuses.includes(o.status)).reduce((t, o) => t + netForStore(o), 0)), 'Pedidos en curso', Clock, 'amber')}
          {deskKpi('Ventas brutas', formatCurrency(storeOrders.filter((o) => o.status !== 'cancelled').reduce((t, o) => t + o.subtotal, 0)), 'Productos vendidos', ClipboardList, 'blue')}
          {deskKpi('Comision PideYa', formatCurrency(commissionTotal), 'Retenida por la app', CreditCard, 'ink')}
        </div>
        <section className="adm-card flush">
          <div className="adm-card-head pad">
            <h3>Movimientos</h3>
            <button className="adm-link" onClick={() => navigateStoreSection('paymentData')} type="button">Metodos de pago</button>
          </div>
          {storeOrders.length ? (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Pedido</th>
                    <th>Fecha</th>
                    <th>Metodo</th>
                    <th className="num">Productos</th>
                    <th className="num">Comision</th>
                    <th className="num">Neto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {storeOrders.map((order) => (
                    <tr className="clickable" key={order.id} onClick={() => setDeskOrderId(order.id)}>
                      <td><strong>{order.id}</strong></td>
                      <td>{fmtDate(order.createdAt)}</td>
                      <td>{order.paymentMethod}</td>
                      <td className="num">{formatCurrency(order.subtotal)}</td>
                      <td className="num">{formatCurrency(order.storeCommission ?? 0)}</td>
                      <td className="num"><strong>{formatCurrency(order.status === 'cancelled' ? 0 : netForStore(order))}</strong></td>
                      <td><StatusPill status={order.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="pad"><EmptyState body="Aqui veras los cobros de tus pedidos." title="Sin movimientos" /></div>
          )}
        </section>
      </>
    );
  };

  return (
    <div className="store-shell">
    {/* Barra lateral: solo escritorio */}
    <aside className="adm-sidebar store-desk-only" aria-label="Menu de tienda">
      <div className="adm-brand">
        <img src={pideyaLogo} alt="PideYa" />
        <div>
          <strong>PideYa</strong>
          <span>Mi negocio</span>
        </div>
      </div>
      <nav aria-label="Secciones de la tienda">
        {deskNav.map(({ view, label, icon: Icon, badge }) => (
          <button className={activeView === view ? 'active' : ''} key={view} onClick={() => navigateStoreSection(view)} type="button">
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
            {badge ? <strong>{badge}</strong> : null}
          </button>
        ))}
        <small className="store-desk-nav-label">Configuración</small>
        {deskConfig.map(({ view, label, icon: Icon }) => (
          <button className={activeView === view ? 'active' : ''} key={view} onClick={() => navigateStoreSection(view)} type="button">
            <Icon size={19} aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      <div className="adm-sidebar-foot">
        <div className="adm-me">
          <SafeImage className="store-desk-avatar" src={store.imageUrl} alt="" />
          <div>
            <strong>{store.name}</strong>
            <small>{store.open ? 'Abierta ahora' : 'Cerrada'}</small>
          </div>
        </div>
        <button className="adm-logout" onClick={onLogout} type="button">
          <LogOut size={18} aria-hidden="true" />
          <span>Cerrar sesion</span>
        </button>
      </div>
    </aside>

    <div className="store-desk-main">
    <header className="adm-header store-desk-only">
      <div>
        <h1>{deskHeader.title}</h1>
        <p>{deskHeader.subtitle}</p>
      </div>
      <div className="adm-header-actions">
        {stores.length > 1 ? (
          <select
            aria-label="Seleccionar tienda administrada"
            className="adm-select"
            onChange={(event) => onManagedStoreChange(event.target.value)}
            value={store.id}
          >
            {stores.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </select>
        ) : null}
        {activeView === 'inventory' ? (
          <>
            <ActionButton icon={Tags} onClick={() => setCategorySheetOpen(true)} variant="ghost">
              Categorías
            </ActionButton>
            <ActionButton icon={Plus} onClick={openNewProductSheet} variant="primary">
              Nuevo producto
            </ActionButton>
          </>
        ) : null}
        <button
          className={`store-desk-open ${store.open ? 'open' : ''}`}
          onClick={() => onToggleStoreOpen(store.id)}
          title={store.open ? 'Cerrar tienda' : 'Abrir tienda'}
          type="button"
        >
          <Power size={16} aria-hidden="true" />
          <span>{store.open ? 'Abierta' : 'Cerrada'}</span>
        </button>
      </div>
    </header>

    <div className="store-desk-content">
    {isMainView ? <div className="store-desk-only store-desk-views">{renderDeskView()}</div> : null}
    <header className="store-page-header" aria-label="Tienda actual">
      <div className="store-page-brand">
        <img src={pideyaLogo} alt="PideYa" />
        <div>
          <span>Tienda</span>
          <strong>{store.name}</strong>
        </div>
      </div>
      <span className={store.open ? 'store-state open' : 'store-state closed'}>
        {store.open ? 'Abierta' : 'Cerrada'}
      </span>
    </header>

    <div className={`role-grid store-grid ${isMainView ? 'desk-hide' : 'desk-config'}`}>
      {activeView === 'dashboard' ? (
      <Panel className="store-command" id="store-dashboard-section">
        <div className="workspace-title">
          <div>
            <span className="zone-label">
              <Store size={15} aria-hidden="true" /> Portal de tienda
            </span>
            <h1>Gestiona pedidos, productos y disponibilidad.</h1>
            <p>
              Esta vista simula el flujo de operacion diaria para que una tienda pueda vender sin
              tocar configuraciones tecnicas.
            </p>
          </div>
          <label className="input-shell select-shell">
            <Store size={17} aria-hidden="true" />
            <select
              aria-label="Seleccionar tienda administrada"
              onChange={(event) => onManagedStoreChange(event.target.value)}
              value={store.id}
            >
              {stores.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="metrics-grid">
          <MetricCard detail="Sin aceptar" icon={Clock} label="Nuevos" tone="coral" value={String(dashboard.newOrders)} />
          <MetricCard detail="Cocina activa" icon={PackageCheck} label="Preparando" tone="amber" value={String(dashboard.preparing)} />
          <MetricCard detail="Para delivery" icon={CheckCircle2} label="Listos" tone="green" value={String(dashboard.ready)} />
          <MetricCard detail="Hoy" icon={Tags} label="Productos" tone="blue" value={String(storeProducts.length)} />
        </div>
      </Panel>
      ) : null}

      {activeView === 'orders' ? (
      <Panel
        className="orders-panel"
        id="store-orders-section"
        title="Pedidos de la tienda"
        action={<span className={store.open ? 'store-state open' : 'store-state closed'}>{store.open ? 'Abierta' : 'Cerrada'}</span>}
      >
        {storeOrders.length ? (
          <div className="order-list">
            {storeOrders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-header">
                  <div>
                    <strong>{order.id}</strong>
                    <span>{order.customerName} · {formatTime(order.createdAt)}</span>
                  </div>
                  <StatusPill status={order.status} />
                </div>
                <div className="order-items">
                  {order.items.map((item) => (
                    <span key={`${order.id}-${item.productId}`}>
                      {item.quantity}x {item.name}
                    </span>
                  ))}
                </div>
                <div className="order-payment-detail">
                  <span>
                    <Phone size={14} aria-hidden="true" /> {order.customerPhone}
                  </span>
                  <span>
                    <MapPin size={14} aria-hidden="true" /> {order.address}
                  </span>
                  <span>
                    <WalletCards size={14} aria-hidden="true" /> {order.paymentMethod}
                  </span>
                  {order.notes ? <span>{order.notes}</span> : null}
                </div>
                <div className="order-card-footer">
                  <span>{formatCurrency(order.subtotal + order.deliveryFee)}</span>
                  <div className="button-row">
                    {order.status === 'pending' ? (
                      <>
                        <ActionButton
                          icon={CheckCircle2}
                          onClick={() => onOrderStatusChange(order.id, 'accepted')}
                          variant="success"
                        >
                          Confirmar
                        </ActionButton>
                        <ActionButton
                          icon={XCircle}
                          onClick={() => onOrderStatusChange(order.id, 'cancelled')}
                          variant="danger"
                        >
                          Rechazar
                        </ActionButton>
                      </>
                    ) : null}
                    {order.status === 'accepted' ? (
                      <ActionButton
                        icon={PackageCheck}
                        onClick={() => onOrderStatusChange(order.id, 'preparing')}
                        variant="primary"
                      >
                        Preparar
                      </ActionButton>
                    ) : null}
                    {order.status === 'preparing' ? (
                      <ActionButton
                        icon={CheckCircle2}
                        onClick={() => onOrderStatusChange(order.id, 'ready')}
                        variant="primary"
                      >
                        Marcar listo
                      </ActionButton>
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <EmptyState body="Cuando entren pedidos nuevos apareceran aqui." title="Sin pedidos" />
        )}
      </Panel>
      ) : null}

      {activeView === 'payments' ? (
      <Panel className="store-payments-panel" id="store-payments-section" title="Pagos">
        <div className="store-payment-summary">
          <span>
            <strong>{formatCurrency(deliveredSales)}</strong>
            Ventas liquidadas
          </span>
          <span>
            <strong>{formatCurrency(pendingPayout)}</strong>
            Por conciliar
          </span>
          <span>
            <strong>{storeOrders.length}</strong>
            Pedidos facturados
          </span>
        </div>
        <div className="store-payment-actions">
          <ActionButton icon={WalletCards} variant="secondary">Ver movimientos</ActionButton>
          <ActionButton icon={CreditCard} onClick={() => navigateStoreSection('paymentData')} variant="ghost">Métodos de pago</ActionButton>
        </div>
      </Panel>
      ) : null}

      {activeView === 'dashboard' ? (
      <aside className="side-stack">
        <Panel title="Informacion">
          <div className="store-info">
            <SafeImage src={store.imageUrl} alt="" />
            <strong>{store.name}</strong>
            <span>{store.address}</span>
            <span>
              <Phone size={15} aria-hidden="true" /> {store.phone}
            </span>
            <span>{store.schedule}</span>
            <ActionButton icon={Power} onClick={() => onToggleStoreOpen(store.id)} variant={store.open ? 'danger' : 'success'}>
              {store.open ? 'Cerrar tienda' : 'Abrir tienda'}
            </ActionButton>
          </div>
        </Panel>
      </aside>
      ) : null}

      {activeView === 'inventory' ? (
      <Panel className="products-panel inventory-products-panel" id="store-inventory-section">
        <label className="input-shell inventory-search">
          <Search size={18} aria-hidden="true" />
          <input
            aria-label="Buscar productos"
            onChange={(event) => setProductSearch(event.target.value)}
            placeholder="Buscar productos"
            value={productSearch}
          />
        </label>
        <div className="inventory-table">
          {filteredStoreProducts.length ? filteredStoreProducts.map((product) => (
            <div className="inventory-row" key={product.id}>
              <SafeImage src={product.imageUrl} alt="" />
              <div className="inventory-product-detail">
                <strong>{product.name}</strong>
                <span>{product.category}</span>
                <b>{formatCurrency(product.price)}</b>
              </div>
              <ActionButton
                icon={Edit3}
                onClick={() => openEditProductSheet(product)}
                variant="ghost"
              >
                Editar
              </ActionButton>
            </div>
          )) : (
            <EmptyState body="No encontramos productos con esa busqueda." title="Sin resultados" />
          )}
        </div>
      </Panel>
      ) : null}

      {activeView === 'location' ? (
        <Panel className="store-command" title="Ubicacion de la tienda">
          <div className="store-info">
            <SafeImage src={store.imageUrl} alt="" />
            <strong>{store.name}</strong>
            <span>
              <MapPin size={15} aria-hidden="true" /> {store.address}
            </span>
            <span>{store.zone}</span>
            <span>
              <Phone size={15} aria-hidden="true" /> {store.phone}
            </span>
          </div>
        </Panel>
      ) : null}

      {activeView === 'paymentData' ? (
        <Panel className="store-command" title="Métodos de pago">
          <p className="pm-intro">Activa los métodos con los que tus clientes pueden pagarte y registra los datos que verán al pagar.</p>
          <PaymentMethodsEditor storeId={store.id} />
        </Panel>
      ) : null}

      {activeView === 'schedule' ? (
        <Panel
          className="store-command"
          title="Horario y disponibilidad"
          action={<span className={store.open ? 'store-state open' : 'store-state closed'}>{store.open ? 'Abierta' : 'Cerrada'}</span>}
        >
          <div className="store-info">
            <strong>{store.schedule}</strong>
            <span>Estado visible para clientes y delivery.</span>
            <ActionButton icon={Power} onClick={() => onToggleStoreOpen(store.id)} variant={store.open ? 'danger' : 'success'}>
              {store.open ? 'Cerrar tienda' : 'Abrir tienda'}
            </ActionButton>
          </div>
        </Panel>
      ) : null}

      {activeView === 'promotions' ? (
        <Panel className="store-command" title="Promociones">
          <div className="store-payment-summary">
            <span>
              <strong>Combo destacado</strong>
              Promocion activa en portada
            </span>
            <span>
              <strong>Envio rapido</strong>
              Prioridad para zonas cercanas
            </span>
            <span>
              <strong>Cupones</strong>
              Sin cupones nuevos
            </span>
          </div>
        </Panel>
      ) : null}

      {activeView === 'settings' ? (
        <Panel className="store-command" title="Ajustes de tienda">
          <div className="store-info">
            <SafeImage src={store.imageUrl} alt="" />
            <strong>{store.name}</strong>
            <span>{store.type}</span>
            <span>{store.tags.join(' | ')}</span>
            <ActionButton icon={Settings} variant="secondary">Editar perfil</ActionButton>
          </div>
        </Panel>
      ) : null}
    </div>
    </div>
    </div>


    <nav className="mobile-bottom-nav store-bottom-nav" aria-label="Menu de tienda">
      <button
        className={activeView === 'dashboard' ? 'active' : ''}
        onClick={() => navigateStoreSection('dashboard')}
        type="button"
      >
        <Store size={21} aria-hidden="true" />
        <span>Inicio</span>
      </button>
      <button
        className={activeView === 'orders' ? 'active' : ''}
        onClick={() => navigateStoreSection('orders')}
        type="button"
      >
        <ClipboardList size={21} aria-hidden="true" />
        <span>Pedidos</span>
        {dashboard.newOrders ? <strong>{dashboard.newOrders}</strong> : null}
      </button>
      <button
        className={activeView === 'inventory' ? 'active' : ''}
        onClick={() => navigateStoreSection('inventory')}
        type="button"
      >
        <PackageCheck size={21} aria-hidden="true" />
        <span>Inventario</span>
      </button>
      <button
        className={activeView === 'payments' ? 'active' : ''}
        onClick={() => navigateStoreSection('payments')}
        type="button"
      >
        <WalletCards size={21} aria-hidden="true" />
        <span>Pagos</span>
      </button>
      <button
        className={storeMenuOpen || !storeMainViews.includes(activeView) ? 'active' : ''}
        onClick={() => setStoreMenuOpen(true)}
        type="button"
      >
        <MenuIcon size={21} aria-hidden="true" />
        <span>Menu</span>
      </button>
    </nav>

    {activeView === 'inventory' ? (
      <div className={`store-inventory-fab ${inventoryFabOpen ? 'open' : ''}`.trim()} aria-label="Acciones de inventario">
        {inventoryFabOpen ? (
          <div className="store-inventory-fab-actions">
            <button
              aria-label="Agregar producto"
              onClick={openNewProductSheet}
              type="button"
            >
              <Plus size={20} aria-hidden="true" />
            </button>
            <button
              aria-label="Editar categorias"
              onClick={() => {
                setInventoryFabOpen(false);
                setCategorySheetOpen(true);
              }}
              type="button"
            >
              <Tags size={20} aria-hidden="true" />
            </button>
          </div>
        ) : null}
        <button
          aria-label={inventoryFabOpen ? 'Cerrar acciones de inventario' : 'Abrir acciones de inventario'}
          className="store-add-product-fab"
          onClick={() => setInventoryFabOpen((current) => !current)}
          type="button"
        >
          <Plus size={28} aria-hidden="true" />
        </button>
      </div>
    ) : null}

    {storeMenuOpen ? (
      <div className="account-sheet-backdrop" role="presentation" onClick={() => setStoreMenuOpen(false)}>
        <section
          aria-labelledby="store-menu-title"
          className="account-sheet store-menu-sheet"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="account-profile-card store-menu-profile">
            <button
              aria-label="Cerrar menu"
              className="account-close-button"
              onClick={() => setStoreMenuOpen(false)}
              type="button"
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </button>
            <SafeImage className="account-avatar" src={store.imageUrl} alt="" />
            <div>
              <span>Menu de tienda</span>
              <h2 id="store-menu-title">{store.name}</h2>
              <p>{store.open ? 'Abierta ahora' : 'Cerrada'}</p>
            </div>
          </div>

          <div className="account-summary-grid">
            <span>
              <strong>{dashboard.newOrders}</strong>
              Nuevos
            </span>
            <span>
              <strong>{storeProducts.length}</strong>
              Productos
            </span>
            <span>
              <strong>{lowStockProducts}</strong>
              Stock bajo
            </span>
          </div>

          <div className="account-actions store-menu-actions" aria-label="Opciones de tienda">
            {menuOptions.map((option) => {
              const Icon = option.icon;

              return (
                <button key={option.label} onClick={() => navigateStoreSection(option.view)} type="button">
                  <Icon size={20} aria-hidden="true" />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.detail}</small>
                  </span>
                  <ChevronRight size={20} aria-hidden="true" />
                </button>
              );
            })}
            <button className="account-logout-button" onClick={onLogout} type="button">
              <LogOut size={20} aria-hidden="true" />
              <span>
                <strong>Cerrar sesion</strong>
                <small>Salir de la cuenta de tienda</small>
              </span>
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    ) : null}

    {productSheetOpen ? (
      <div className="account-sheet-backdrop" role="presentation" onClick={() => setProductSheetOpen(false)}>
        <section
          aria-labelledby="new-product-sheet-title"
          className="account-sheet store-menu-sheet"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="account-profile-card store-menu-profile">
            <button
              aria-label="Cerrar nuevo producto"
              className="account-close-button"
              onClick={() => setProductSheetOpen(false)}
              type="button"
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </button>
            <SafeImage className="account-avatar" src={store.imageUrl} alt="" />
            <div>
              <span>Inventario</span>
              <h2 id="new-product-sheet-title">{editingProductId ? 'Editar producto' : 'Nuevo producto'}</h2>
              <p>{store.name}</p>
            </div>
          </div>

          <div className="product-form">
            <input
              aria-label="Nombre del producto"
              onChange={(event) => setDraftName(event.target.value)}
              placeholder="Nombre"
              value={draftName}
            />
            <textarea
              aria-label="Descripcion del producto"
              onChange={(event) => setDraftDescription(event.target.value)}
              placeholder="Descripcion"
              value={draftDescription}
            />
            <div className="form-grid">
              <input
                aria-label="Precio del producto"
                onChange={(event) => setDraftPrice(event.target.value)}
                placeholder="Precio"
                type="number"
                value={draftPrice}
              />
              <input
                aria-label="Cantidad disponible"
                onChange={(event) => setDraftStock(event.target.value)}
                placeholder="Stock"
                type="number"
                value={draftStock}
              />
            </div>
            <label className="product-form-select">
              <span>Categoria</span>
              <select
                aria-label="Categoria"
                onChange={(event) => setDraftCategory(event.target.value)}
                value={draftCategory}
              >
                {productCategoryOptions.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </label>
            <input
              aria-label="Opciones adicionales"
              onChange={(event) => setDraftOptions(event.target.value)}
              placeholder="Opciones separadas por coma"
              value={draftOptions}
            />
            <ActionButton icon={Plus} onClick={submitProduct} variant="primary">
              {editingProductId ? 'Guardar cambios' : 'Agregar producto'}
            </ActionButton>
          </div>
        </section>
      </div>
    ) : null}

    {categorySheetOpen ? (
      <div className="account-sheet-backdrop" role="presentation" onClick={() => setCategorySheetOpen(false)}>
        <section
          aria-labelledby="category-sheet-title"
          className="account-sheet store-menu-sheet"
          onClick={(event) => event.stopPropagation()}
          role="dialog"
        >
          <div className="account-profile-card store-menu-profile">
            <button
              aria-label="Cerrar categorias"
              className="account-close-button"
              onClick={() => setCategorySheetOpen(false)}
              type="button"
            >
              <ArrowLeft size={24} aria-hidden="true" />
            </button>
            <SafeImage className="account-avatar" src={store.imageUrl} alt="" />
            <div>
              <span>Inventario</span>
              <h2 id="category-sheet-title">Editar categorias</h2>
              <p>Diseno preliminar</p>
            </div>
          </div>

          <div className="category-editor-preview">
            {productCategoryOptions.map((category) => (
              <button key={category} type="button">
                <Tags size={18} aria-hidden="true" />
                <span>{category}</span>
                <Edit3 size={18} aria-hidden="true" />
              </button>
            ))}
            <button className="category-add-preview" type="button">
              <Plus size={18} aria-hidden="true" />
              <span>Nueva categoria</span>
              <ChevronRight size={18} aria-hidden="true" />
            </button>
          </div>
        </section>
      </div>
    ) : null}
    {deskOrderDetail ? (
      <div className="adm-drawer-backdrop store-desk-only" role="presentation" onClick={() => setDeskOrderId(null)}>
        <aside className="adm-drawer" role="dialog" aria-label={`Pedido ${deskOrderDetail.id}`} onClick={(event) => event.stopPropagation()}>
          <header>
            <div>
              <h2>{deskOrderDetail.id}</h2>
              <small>{fmtDate(deskOrderDetail.createdAt)}</small>
            </div>
            <StatusPill status={deskOrderDetail.status} />
            <button aria-label="Cerrar" className="adm-icon-button" onClick={() => setDeskOrderId(null)} type="button">
              <XCircle size={18} aria-hidden="true" />
            </button>
          </header>
          <div className="adm-drawer-body">
            <dl className="adm-dl">
              <dt>Cliente</dt><dd>{deskOrderDetail.customerName}</dd>
              <dt>Telefono</dt><dd>{deskOrderDetail.customerPhone}</dd>
              <dt>Direccion</dt><dd>{deskOrderDetail.address}</dd>
              <dt>Pago</dt><dd>{deskOrderDetail.paymentMethod}</dd>
              {deskOrderDetail.notes ? (<><dt>Notas</dt><dd>{deskOrderDetail.notes}</dd></>) : null}
            </dl>
            <h3>Productos</h3>
            <ul className="adm-items">
              {deskOrderDetail.items.map((item, index) => (
                <li key={`${item.productId}-${index}`}>
                  <span>{item.quantity}× {item.name}{item.option ? <small> · {item.option}</small> : null}</span>
                  <strong>{formatCurrency(item.quantity * item.price)}</strong>
                </li>
              ))}
              <li><span>Subtotal</span><strong>{formatCurrency(deskOrderDetail.subtotal)}</strong></li>
              <li><span>Comision PideYa</span><strong>- {formatCurrency(deskOrderDetail.storeCommission ?? 0)}</strong></li>
              <li className="total"><span>Recibes</span><strong>{formatCurrency(netForStore(deskOrderDetail))}</strong></li>
            </ul>
            {orderActions(deskOrderDetail)}
          </div>
        </aside>
      </div>
    ) : null}
    </div>
  );
}
