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
    { label: 'Datos de pago', detail: 'Cuenta bancaria y pago movil', icon: CreditCard, view: 'paymentData' as const },
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

  return (
    <>
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

    <div className="role-grid store-grid">
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
          <ActionButton icon={CreditCard} variant="ghost">Datos de pago</ActionButton>
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
        <Panel className="store-command" title="Datos de pago">
          <div className="store-payment-summary">
            <span>
              <strong>Pago movil</strong>
              Activo para conciliacion
            </span>
            <span>
              <strong>Banco local</strong>
              Cuenta principal
            </span>
            <span>
              <strong>{formatCurrency(pendingPayout)}</strong>
              Pendiente por liquidar
            </span>
          </div>
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
    </>
  );
}
