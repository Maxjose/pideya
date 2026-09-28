import { useEffect, useMemo, useState } from 'react';
import { Bike, Download, LayoutDashboard, LogIn, LogOut, Share2, Store, UserPlus, X } from 'lucide-react';
import './App.css';
import pideyaLogo from './assets/pideya-logo.png';
import { AdminPortal } from './components/AdminPortal';
import { AuthScreen } from './components/AuthScreen';
import { ClientPortal } from './components/ClientPortal';
import { DeliveryPortal } from './components/DeliveryPortal';
import { RoleDrawer } from './components/RoleDrawer';
import { StorePortal } from './components/StorePortal';
import {
  deliveries as initialDeliveries,
  orders as initialOrders,
  products as initialProducts,
  stores as initialStores,
  users,
} from './data/mockData';
import type { AppUser, CartItem, Order, OrderStatus, PaymentMethod, Product, Role } from './types';

type AuthMode = 'login' | 'register';
type BeforeInstallPromptOutcome = 'accepted' | 'dismissed';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: BeforeInstallPromptOutcome; platform: string }>;
}

const isStandaloneApp = () => {
  const navigatorWithStandalone = navigator as Navigator & { standalone?: boolean };

  return window.matchMedia('(display-mode: standalone)').matches || navigatorWithStandalone.standalone === true;
};

function App() {
  const [activeRole, setActiveRole] = useState<Role>('client');
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [authMode, setAuthMode] = useState<AuthMode | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installHelpOpen, setInstallHelpOpen] = useState(false);
  const [installBannerDismissed, setInstallBannerDismissed] = useState(false);
  const [standaloneMode, setStandaloneMode] = useState(() => isStandaloneApp());
  const [stores, setStores] = useState(initialStores);
  const [products, setProducts] = useState(initialProducts);
  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState(initialStores[0].id);
  const [managedStoreId, setManagedStoreId] = useState(initialStores[0].id);
  const [splashVisible, setSplashVisible] = useState(true);
  const [splashClosing, setSplashClosing] = useState(false);
  const [entryScreenVisible, setEntryScreenVisible] = useState(true);
  const [entryScreenClosing, setEntryScreenClosing] = useState(false);
  const [appEntering, setAppEntering] = useState(false);

  const activeOrdersCount = useMemo(
    () => orders.filter((order) => !['delivered', 'cancelled'].includes(order.status)).length,
    [orders],
  );
  const isClientShell = activeRole === 'client';
  const showTopbar = activeRole !== 'client' && activeRole !== 'store' && activeRole !== 'delivery';
  const showInstallBanner = !standaloneMode && !installBannerDismissed;

  useEffect(() => {
    const closingTimer = window.setTimeout(() => setSplashClosing(true), 1350);
    const hideTimer = window.setTimeout(() => setSplashVisible(false), 1700);

    return () => {
      window.clearTimeout(closingTimer);
      window.clearTimeout(hideTimer);
    };
  }, []);

  useEffect(() => {
    const displayModeQuery = window.matchMedia('(display-mode: standalone)');
    const syncStandaloneMode = () => setStandaloneMode(isStandaloneApp());
    const handleBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as BeforeInstallPromptEvent);
    };
    const handleAppInstalled = () => {
      setInstallPrompt(null);
      setInstallHelpOpen(false);
      setStandaloneMode(true);
    };

    displayModeQuery.addEventListener('change', syncStandaloneMode);
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      displayModeQuery.removeEventListener('change', syncStandaloneMode);
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleAuthComplete = (user: AppUser) => {
    setCurrentUser(user);
    setActiveRole(user.role);
    setAuthMode(null);
    setDrawerOpen(false);
    setEntryScreenVisible(false);
    setEntryScreenClosing(false);
    setAppEntering(true);

    window.setTimeout(() => {
      setAppEntering(false);
    }, 520);
  };

  const enterTestRole = (role: Exclude<Role, 'admin'>) => {
    const testUsers: Record<Exclude<Role, 'admin'>, AppUser> = {
      client: {
        id: 'test-client',
        name: 'Usuario de prueba',
        phone: '+58 412-555-0000',
        role: 'client',
        savedAddresses: ['Residencias Turia, Torre B', 'Oficina Torre Platinum, piso 4'],
      },
      delivery: {
        id: 'test-delivery',
        name: 'Delivery de prueba',
        phone: '+58 412-555-0001',
        role: 'delivery',
      },
      store: {
        id: 'test-store',
        name: 'Tienda de prueba',
        phone: '+58 412-555-0002',
        role: 'store',
      },
    };

    handleAuthComplete(testUsers[role]);
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveRole('client');
    setDrawerOpen(false);
    setAppEntering(false);
    setEntryScreenClosing(false);
    setEntryScreenVisible(true);
  };

  const updateCurrentUserProfile = (
    updates: Partial<Pick<AppUser, 'name' | 'phone' | 'savedAddresses'>>,
  ) => {
    setCurrentUser((user) => (user ? { ...user, ...updates } : user));
  };

  const dismissInstallBanner = () => {
    setInstallBannerDismissed(true);
    setInstallHelpOpen(false);
  };

  const handleInstallClick = async () => {
    if (!installPrompt) {
      setInstallHelpOpen(true);
      return;
    }

    await installPrompt.prompt();
    const choice = await installPrompt.userChoice;
    setInstallPrompt(null);

    if (choice.outcome === 'accepted') {
      dismissInstallBanner();
    }
  };

  const navigateRole = (role: Role) => {
    setActiveRole(role);
    setDrawerOpen(false);
  };

  const addToCart = (product: Product, option?: string) => {
    setSelectedStoreId(product.storeId);
    setCart((currentCart) => {
      const existing = currentCart.find((item) => item.productId === product.id);

      if (existing) {
        return currentCart.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1, option: option ?? item.option }
            : item,
        );
      }

      return [...currentCart, { productId: product.id, quantity: 1, option }];
    });
  };

  const updateCartItem = (productId: string, quantity: number) => {
    setCart((currentCart) => {
      if (quantity <= 0) {
        return currentCart.filter((item) => item.productId !== productId);
      }

      return currentCart.map((item) =>
        item.productId === productId ? { ...item, quantity } : item,
      );
    });
  };

  const removeCartItem = (productId: string) => {
    setCart((currentCart) => currentCart.filter((item) => item.productId !== productId));
  };

  const clearCart = () => {
    setCart([]);
  };

  const createOrder = (input: {
    customerName: string;
    customerPhone: string;
    customerRegistered: boolean;
    address: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => {
    const cartProducts = cart
      .map((cartItem) => {
        const product = products.find((item) => item.id === cartItem.productId);
        return product ? { ...cartItem, product } : undefined;
      })
      .filter(Boolean) as Array<CartItem & { product: Product }>;

    if (!cartProducts.length) {
      return undefined;
    }

    const cartProductsByStore = cartProducts.reduce<Record<string, Array<CartItem & { product: Product }>>>(
      (groups, item) => {
        const next = { ...groups };
        next[item.product.storeId] = [...(next[item.product.storeId] ?? []), item];
        return next;
      },
      {},
    );
    const createdAt = new Date().toISOString();
    const newOrders = Object.entries(cartProductsByStore).map(([storeId, storeProducts], index) => {
      const store = stores.find((item) => item.id === storeId) ?? stores[0];
      const subtotal = storeProducts.reduce(
        (total, item) => total + item.quantity * item.product.price,
        0,
      );

      return {
        id: `PY-${1055 + orders.length + index}`,
        customerName: input.customerName,
        customerPhone: input.customerPhone,
        customerRegistered: input.customerRegistered,
        address: input.address,
        storeId: store.id,
        status: 'pending',
        items: storeProducts.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          quantity: item.quantity,
          price: item.product.price,
          option: item.option,
        })),
        subtotal,
        deliveryFee: store.deliveryFee,
        courierReward: Math.max(2, Number((store.deliveryFee + 0.8).toFixed(2))),
        createdAt,
        distanceKm: Number((store.distanceKm + 0.8).toFixed(1)),
        paymentMethod: input.paymentMethod,
        notes: input.notes,
      } satisfies Order;
    });

    setOrders((currentOrders) => [...newOrders, ...currentOrders]);
    setCart([]);
    return newOrders.map((order) => order.id).join(', ');
  };

  const changeOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => (order.id === orderId ? { ...order, status } : order)),
    );
  };

  const acceptDelivery = (orderId: string, deliveryId: string) => {
    setOrders((currentOrders) =>
      currentOrders.map((order) => {
        if (order.id !== orderId || order.status !== 'ready' || order.assignedDeliveryId) {
          return order;
        }

        return {
          ...order,
          assignedDeliveryId: deliveryId,
          status: 'assigned',
        };
      }),
    );
  };

  const toggleProduct = (productId: string) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...product, available: !product.available } : product,
      ),
    );
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    setProducts((currentProducts) => [
      {
        ...product,
        id: `prd-custom-${Date.now()}`,
      },
      ...currentProducts,
    ]);
  };

  const updateProduct = (productId: string, productUpdate: Omit<Product, 'id'>) => {
    setProducts((currentProducts) =>
      currentProducts.map((product) =>
        product.id === productId ? { ...productUpdate, id: product.id } : product,
      ),
    );
  };

  const toggleStoreOpen = (storeId: string) => {
    setStores((currentStores) =>
      currentStores.map((storefront) =>
        storefront.id === storeId ? { ...storefront, open: !storefront.open } : storefront,
      ),
    );
  };

  return (
    <>
      {splashVisible ? (
        <div
          aria-label="Cargando PideYa"
          className={`app-splash ${splashClosing ? 'closing' : ''}`.trim()}
          role="status"
        >
          <div className="app-splash-glow" aria-hidden="true" />
          <div className="app-splash-logo-wrap">
            <img className="app-splash-logo" src={pideyaLogo} alt="" />
          </div>
          <strong className="app-splash-name">
            Pide<span>Ya</span>
          </strong>
        </div>
      ) : null}

      {!splashVisible && entryScreenVisible && !authMode ? (
        <section
          className={`app-entry-screen ${entryScreenClosing ? 'closing' : ''}`.trim()}
          aria-labelledby="app-entry-title"
        >
          <div className="app-entry-brand">
            <div className="app-entry-logo-wrap">
              <img src={pideyaLogo} alt="PideYa" />
            </div>
            <div>
              <h1 id="app-entry-title">
                Pide<span>Ya</span>
              </h1>
              <p>Todo lo que necesitas, más cerca de ti.</p>
            </div>
          </div>

          <div className="app-entry-actions">
            <button className="app-entry-button primary" onClick={() => setAuthMode('login')} type="button">
              <LogIn size={20} aria-hidden="true" />
              <span>Iniciar sesión</span>
            </button>
            <button className="app-entry-button secondary" onClick={() => setAuthMode('register')} type="button">
              <UserPlus size={20} aria-hidden="true" />
              <span>Registrarse</span>
            </button>

            <div className="app-entry-divider">
              <span>Modo de prueba</span>
            </div>

            <button className="app-entry-button test" onClick={() => enterTestRole('client')} type="button">
              Entrar como prueba
            </button>

            <div className="app-entry-role-links" aria-label="Accesos de prueba">
              <button onClick={() => enterTestRole('delivery')} type="button">
                <Bike size={17} aria-hidden="true" />
                <span>Entrar como delivery</span>
              </button>
              <span aria-hidden="true">•</span>
              <button onClick={() => enterTestRole('store')} type="button">
                <Store size={17} aria-hidden="true" />
                <span>Entrar como tienda</span>
              </button>
            </div>
          </div>
        </section>
      ) : null}

      {!entryScreenVisible ? (
      <main className={`app-shell ${isClientShell ? 'public-client-shell' : ''} ${showInstallBanner ? 'install-banner-visible' : ''} ${appEntering ? 'app-entering' : ''}`.trim()}>
      {showInstallBanner ? (
        <section className="install-app-banner" aria-label="Instalar PideYa">
          <div>
            <Download size={18} aria-hidden="true" />
            <span>Instala PideYa y pide mas rapido desde tu pantalla de inicio.</span>
          </div>
          <button className="install-app-primary" onClick={handleInstallClick} type="button">
            Instalar app
          </button>
          <button
            aria-label="Cerrar invitacion para instalar"
            className="install-app-close"
            onClick={dismissInstallBanner}
            type="button"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </section>
      ) : null}

      {showTopbar ? (
        <header className="topbar">
          <div className="brand-lockup">
            <img src={pideyaLogo} alt="PideYa" />
            <div>
              <strong>PideYa</strong>
              <span>Menu y pedidos en Zona Norte</span>
            </div>
          </div>

          <div className="topbar-actions">
            <div className="prototype-status">
              <LayoutDashboard size={17} aria-hidden="true" />
              <span>{activeOrdersCount} pedidos activos</span>
            </div>

            {currentUser ? (
              <>
                <div className="session-chip">
                  <strong>{currentUser.name}</strong>
                  <span>{currentUser.role}</span>
                </div>
                <button className="auth-top-button ghost" onClick={logout} type="button">
                  <LogOut size={17} aria-hidden="true" />
                  <span>Salir</span>
                </button>
              </>
            ) : (
              <>
                <button className="auth-top-button ghost" onClick={() => setAuthMode('login')} type="button">
                  <LogIn size={17} aria-hidden="true" />
                  <span>Iniciar sesion</span>
                </button>
                <button className="auth-top-button primary" onClick={() => setAuthMode('register')} type="button">
                  <UserPlus size={17} aria-hidden="true" />
                  <span>Registrarse</span>
                </button>
              </>
            )}
          </div>
        </header>
      ) : null}

      {activeRole === 'client' ? (
        <ClientPortal
          cart={cart}
          currentUser={currentUser?.role === 'client' ? currentUser : null}
          onAddToCart={addToCart}
          onCreateOrder={createOrder}
          onOpenLogin={() => setAuthMode('login')}
          onOpenRegister={() => setAuthMode('register')}
          onLogout={logout}
          onUpdateProfile={updateCurrentUserProfile}
          onClearCart={clearCart}
          onRemoveCartItem={removeCartItem}
          onSelectStore={setSelectedStoreId}
          onUpdateCartItem={updateCartItem}
          orders={orders}
          products={products}
          selectedStoreId={selectedStoreId}
          stores={stores}
        />
      ) : null}

      {activeRole === 'store' ? (
        <StorePortal
          managedStoreId={managedStoreId}
          onAddProduct={addProduct}
          onManagedStoreChange={setManagedStoreId}
          onOrderStatusChange={changeOrderStatus}
          onLogout={logout}
          onToggleStoreOpen={toggleStoreOpen}
          onUpdateProduct={updateProduct}
          orders={orders}
          products={products}
          stores={stores}
        />
      ) : null}

      {activeRole === 'delivery' ? (
        <DeliveryPortal
          deliveries={initialDeliveries}
          onAcceptDelivery={acceptDelivery}
          onLogout={logout}
          onOrderStatusChange={changeOrderStatus}
          orders={orders}
          stores={stores}
        />
      ) : null}

      {activeRole === 'admin' ? (
        <AdminPortal
          deliveries={initialDeliveries}
          orders={orders}
          products={products}
          stores={stores}
          users={users}
        />
      ) : null}

      <RoleDrawer
        activeRole={activeRole}
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onLogout={logout}
        onNavigate={navigateRole}
        user={currentUser}
      />

      {installHelpOpen ? (
        <div className="install-help-backdrop" role="presentation" onClick={() => setInstallHelpOpen(false)}>
          <section
            aria-labelledby="install-help-title"
            className="install-help-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <button
              aria-label="Cerrar instrucciones"
              className="install-help-close"
              onClick={() => setInstallHelpOpen(false)}
              type="button"
            >
              <X size={18} aria-hidden="true" />
            </button>
            <div className="install-help-icon">
              <Share2 size={24} aria-hidden="true" />
            </div>
            <h2 id="install-help-title">Instala PideYa en tu pantalla de inicio</h2>
            <p>En iPhone o iPad, toca Compartir y elige Agregar a pantalla de inicio. En Android, abre el menu del navegador y selecciona Instalar app.</p>
            <button className="install-help-action" onClick={() => setInstallHelpOpen(false)} type="button">
              Entendido
            </button>
          </section>
        </div>
      ) : null}
      </main>
      ) : null}

      {!splashVisible && entryScreenVisible && authMode ? (
        <AuthScreen
          mode={authMode}
          onBack={() => setAuthMode(null)}
          onComplete={handleAuthComplete}
          onModeChange={setAuthMode}
        />
      ) : null}
    </>
  );
}

export default App;
