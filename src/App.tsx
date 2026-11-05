import { useEffect, useMemo, useRef, useState } from 'react';
import { Bike, Download, LayoutDashboard, LogIn, LogOut, Share2, Store, UserPlus, X } from 'lucide-react';
import './App.css';
import pideyaLogo from './assets/pideya-logo.png';
import { AdminPortal } from './components/AdminPortal';
import { AuthScreen } from './components/AuthScreen';
import { ClientPortal } from './components/ClientPortal';
import { DeliveryPortal } from './components/DeliveryPortal';
import { RoleDrawer } from './components/RoleDrawer';
import { StorePortal } from './components/StorePortal';
import * as api from './lib/api';
import { supabase } from './lib/supabase';
import type { StaffPermission, StoreStaffMember, ServiceSettings, AppUser, CartItem, DeliveryAgent, Order, OrderStatus, PaymentMethod, Product, Role, Storefront } from './types';

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
  const [stores, setStores] = useState<Storefront[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [deliveryRows, setDeliveryRows] = useState<Record<string, unknown>[]>([]);
  const [profiles, setProfiles] = useState<AppUser[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedStoreId, setSelectedStoreId] = useState('');
  const [managedStoreId, setManagedStoreId] = useState('');
  const [catalogLoaded, setCatalogLoaded] = useState(false);
  const [serviceSettings, setServiceSettings] = useState<ServiceSettings>(api.defaultServiceSettings);
  const [actionError, setActionError] = useState<string | null>(null);
  const signedInUserId = useRef<string | null>(null);
  const [staffMemberships, setStaffMemberships] = useState<StoreStaffMember[]>([]);
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
  const showTopbar = false;
  const showInstallBanner = !standaloneMode && !installBannerDismissed && activeRole !== 'admin';

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

  const deliveries: DeliveryAgent[] = useMemo(
    () => api.buildDeliveryAgents(deliveryRows, orders),
    [deliveryRows, orders],
  );
  // El costo de envío lo calcula la app con las tarifas del servicio
  const pricedStores = useMemo(
    () => stores.map((store) => ({ ...store, deliveryFee: api.calcDeliveryFee(serviceSettings, api.deliveryDistance(store.distanceKm)) })),
    [serviceSettings, stores],
  );
  const ownedStores = useMemo(
    () =>
      currentUser?.role === 'admin'
        ? stores
        : currentUser?.role === 'staff'
          ? stores.filter((store) => staffMemberships.some((member) => member.storeId === store.id))
          : stores.filter((store) => currentUser && store.ownerId === currentUser.id),
    [currentUser, staffMemberships, stores],
  );
  const activeStoreId = managedStoreId || ownedStores[0]?.id || '';
  const storePermissions: StaffPermission[] | undefined =
    currentUser?.role === 'staff' ? staffMemberships.find((member) => member.storeId === activeStoreId)?.permissions ?? [] : undefined;

  const reportError = (error: unknown) => {
    const message = error instanceof Error ? error.message : 'Ocurrio un error. Intenta de nuevo.';
    setActionError(message);
    window.setTimeout(() => setActionError(null), 4500);
  };

  const loadCatalog = async () => {
    try {
      const [catalog, settings] = await Promise.all([api.fetchCatalog(), api.fetchServiceSettings()]);
      setServiceSettings(settings);
      setStores(catalog.stores);
      setProducts(catalog.products);
      setSelectedStoreId((current) => current || catalog.stores[0]?.id || '');
      setCatalogLoaded(true);
    } catch (error) {
      reportError(error);
    }
  };

  const loadPrivateData = async (user: AppUser | null) => {
    if (!user) {
      setOrders([]);
      setDeliveryRows([]);
      setProfiles([]);
      return;
    }
    try {
      const [nextOrders, nextDeliveryRows, nextProfiles] = await Promise.all([
        api.fetchOrders(),
        api.fetchDeliveryRows(),
        user.role === 'admin' ? api.fetchProfiles() : Promise.resolve([]),
      ]);
      if (user.role === 'staff') {
        setStaffMemberships(await api.fetchMyStaffMemberships(user.id));
      }
      setOrders(nextOrders);
      setDeliveryRows(nextDeliveryRows);
      setProfiles(nextProfiles);
    } catch (error) {
      reportError(error);
    }
  };

  useEffect(() => {
    void loadCatalog();
  }, []);

  useEffect(() => {
    const syncSession = async (userId: string | undefined) => {
      if (!userId) {
        setCurrentUser(null);
        return;
      }
      // Supabase vuelve a emitir SIGNED_IN al regresar a la pestaña: si es el mismo usuario no se repite la animación de entrada
      if (signedInUserId.current === userId) return;
      const profile = await api.fetchProfile(userId).catch(() => null);
      if (profile && signedInUserId.current !== userId) {
        handleAuthComplete(profile);
      }
    };

    void supabase.auth.getSession().then(({ data }) => syncSession(data.session?.user.id));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        signedInUserId.current = null;
        setCurrentUser(null);
      }
      if (event === 'SIGNED_IN' && session?.user.id) {
        window.setTimeout(() => void syncSession(session.user.id), 0);
      }
    });
    return () => data.subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadPrivateData(currentUser);
    if (currentUser && !managedStoreId) {
      const owned = stores.find((store) => store.ownerId === currentUser.id);
      if (owned) setManagedStoreId(owned.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id, currentUser?.role, stores.length]);

  // Tiempo real: cualquier cambio recarga los datos afectados
  useEffect(() => {
    let timer: number | undefined;
    const refreshPrivate = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void loadPrivateData(currentUser), 250);
    };
    const channel = supabase
      .channel('pideya-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, () => void loadCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => void loadCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_settings' }, () => void loadCatalog())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, refreshPrivate)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'delivery_agents' }, refreshPrivate)
      .subscribe();
    return () => {
      window.clearTimeout(timer);
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  const handleAuthComplete = (user: AppUser) => {
    if (signedInUserId.current === user.id) {
      setCurrentUser(user);
      return;
    }
    signedInUserId.current = user.id;
    setCurrentUser(user);
    setActiveRole(user.role === 'staff' ? 'store' : user.role);
    setAuthMode(null);
    setDrawerOpen(false);
    setEntryScreenVisible(false);
    setEntryScreenClosing(false);
    setAppEntering(true);

    window.setTimeout(() => {
      setAppEntering(false);
    }, 520);
  };

  const logout = () => {
    signedInUserId.current = null;
    void supabase.auth.signOut();
    setCurrentUser(null);
    setCart([]);
    setManagedStoreId('');
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
    if (currentUser) {
      api.updateProfile(currentUser.id, updates).catch(reportError);
    }
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

  const createOrder = async (input: {
    customerName: string;
    customerPhone: string;
    customerRegistered: boolean;
    address: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => {
    if (!cart.length) {
      return undefined;
    }
    try {
      const ids = await api.placeOrder({ ...input, items: cart });
      setCart([]);
      void loadPrivateData(currentUser);
      return ids.join(', ');
    } catch (error) {
      reportError(error);
      return undefined;
    }
  };

  const changeOrderStatus = (orderId: string, status: OrderStatus) => {
    setOrders((current) => current.map((order) => (order.id === orderId ? { ...order, status } : order)));
    api.updateOrderStatus(orderId, status).catch((error) => {
      reportError(error);
      void loadPrivateData(currentUser);
    });
  };

  const acceptDelivery = (orderId: string) => {
    api
      .acceptDelivery(orderId)
      .then((ok) => {
        if (!ok) reportError(new Error('Otro repartidor tomo este pedido primero.'));
        void loadPrivateData(currentUser);
      })
      .catch(reportError);
  };

  const changeServiceStatus = (status: 'available' | 'offline') => {
    if (!currentUser) return;
    setDeliveryRows((rows) => rows.map((row) => (row.id === currentUser.id ? { ...row, service_status: status } : row)));
    api.setServiceStatus(currentUser.id, status).catch(reportError);
  };

  const addProduct = (product: Omit<Product, 'id'>) => {
    api.insertProduct(product).then(loadCatalog).catch(reportError);
  };

  const updateProduct = (productId: string, productUpdate: Omit<Product, 'id'>) => {
    setProducts((current) => current.map((product) => (product.id === productId ? { ...productUpdate, id: productId } : product)));
    api.saveProduct(productId, productUpdate).catch((error) => {
      reportError(error);
      void loadCatalog();
    });
  };

  const toggleStoreOpen = (storeId: string) => {
    const store = stores.find((item) => item.id === storeId);
    if (!store) return;
    setStores((current) => current.map((item) => (item.id === storeId ? { ...item, open: !item.open } : item)));
    api.setStoreOpen(storeId, !store.open).catch((error) => {
      reportError(error);
      void loadCatalog();
    });
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
          stores={pricedStores}
        />
      ) : null}

      {activeRole === 'store' && !ownedStores.length && catalogLoaded ? (
        <section className="app-notice-screen">
          <h2>Tu cuenta aun no tiene una tienda asignada</h2>
          <p>Contacta a administracion para vincular tu comercio a esta cuenta.</p>
          <button className="app-entry-button primary" onClick={logout} type="button">
            <LogOut size={20} aria-hidden="true" />
            <span>Cerrar sesion</span>
          </button>
        </section>
      ) : null}

      {activeRole === 'store' && ownedStores.length ? (
        <StorePortal
          managedStoreId={activeStoreId}
          permissions={storePermissions}
          onAddProduct={addProduct}
          onManagedStoreChange={setManagedStoreId}
          onOrderStatusChange={changeOrderStatus}
          onLogout={logout}
          onToggleStoreOpen={toggleStoreOpen}
          onUpdateProduct={updateProduct}
          orders={orders}
          products={products}
          stores={ownedStores}
        />
      ) : null}

      {activeRole === 'delivery' ? (
        <DeliveryPortal
          deliveries={deliveries.filter((delivery) => delivery.id === currentUser?.id)}
          onAcceptDelivery={acceptDelivery}
          onServiceStatusChange={changeServiceStatus}
          onLogout={logout}
          onOrderStatusChange={changeOrderStatus}
          orders={orders}
          stores={stores}
        />
      ) : null}

      {activeRole === 'admin' ? (
        <AdminPortal
          currentUser={currentUser}
          onLogout={logout}
          onRefresh={async () => {
            await Promise.all([loadCatalog(), loadPrivateData(currentUser)]);
          }}
          deliveries={deliveries}
          orders={orders}
          products={products}
          serviceSettings={serviceSettings}
          stores={stores}
          users={profiles}
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

      {actionError ? (
        <div className="app-error-toast" role="alert">
          {actionError}
        </div>
      ) : null}

      {!catalogLoaded && !entryScreenVisible ? <div className="app-loading-bar" aria-hidden="true" /> : null}

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
