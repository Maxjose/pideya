import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgePercent,
  Beef,
  Bell,
  Bike,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Coffee,
  Edit3,
  Croissant,
  CupSoda,
  CakeSlice,
  ClipboardList,
  Grid2x2,
  Heart,
  Home,
  IceCreamBowl,
  LogIn,
  LogOut,
  LocateFixed,
  MapPin,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  ShoppingCart,
  Soup,
  Star,
  Store as StoreIcon,
  Trash2,
  UserRound,
  Utensils,
  WalletCards,
  X,
  type LucideIcon,
} from 'lucide-react';
import pideyaLogo from '../assets/pideya-logo.png';
import { ActionButton, EmptyState, SafeImage } from './Shared';
import type { AppUser, CartItem, Order, PaymentMethod, Product, Storefront } from '../types';
import { formatCurrency } from '../utils/format';

type CategoryKey = 'all' | 'restaurants' | 'drinks' | 'pharmacy' | 'shops' | 'bakery' | 'desserts';
type ClientView = 'home' | 'restaurants';
type DeliveryLocationId = 'home' | 'work' | 'current';
type AccountSection = 'menu' | 'edit' | 'history' | 'addresses' | 'address-edit' | 'favorites';

interface AddressForm {
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  postalCode: string;
  reference: string;
  latitude: string;
  longitude: string;
}

const emptyAddressForm: AddressForm = {
  street: '',
  number: '',
  neighborhood: '',
  city: '',
  state: '',
  postalCode: '',
  reference: '',
  latitude: '',
  longitude: '',
};

const initialClientNotifications = [
  {
    id: 'promo-free-delivery',
    title: 'Envio destacado',
    body: 'Burger Line tiene envios rapidos cerca de tu ubicacion.',
  },
  {
    id: 'order-ready',
    title: 'Pedido en curso',
    body: 'Tu ultimo pedido simulado sigue activo en la plataforma.',
  },
  {
    id: 'new-desserts',
    title: 'Nuevos postres',
    body: 'Dulce Ruta agrego opciones populares para esta semana.',
  },
];

interface ClientPortalProps {
  stores: Storefront[];
  products: Product[];
  orders: Order[];
  currentUser: AppUser | null;
  cart: CartItem[];
  selectedStoreId: string;
  onSelectStore: (storeId: string) => void;
  onAddToCart: (product: Product, option?: string) => void;
  onUpdateCartItem: (productId: string, quantity: number) => void;
  onRemoveCartItem: (productId: string) => void;
  onClearCart: () => void;
  onOpenLogin: () => void;
  onOpenRegister: () => void;
  onLogout: () => void;
  onUpdateProfile: (updates: Partial<Pick<AppUser, 'name' | 'phone' | 'savedAddresses'>>) => void;
  onCreateOrder: (input: {
    customerName: string;
    customerPhone: string;
    customerRegistered: boolean;
    address: string;
    paymentMethod: PaymentMethod;
    notes?: string;
  }) => string | undefined;
}

interface FoodFilter {
  value: string;
  label: string;
  icon: LucideIcon;
  tone: string;
}

interface CategoryCard {
  key: CategoryKey;
  label: string;
  description: string;
  icon: LucideIcon;
}

const featuredCategoryCards: CategoryCard[] = [
  {
    key: 'restaurants',
    label: 'Comida',
    description: 'Restaurantes y platos listos para pedir',
    icon: Utensils,
  },
  {
    key: 'desserts',
    label: 'Postres',
    description: 'Tortas, helados y antojos dulces',
    icon: CakeSlice,
  },
];

const scrollCategoryCards: CategoryCard[] = [
  {
    key: 'bakery',
    label: 'Panaderia',
    description: 'Panes, croissants y dulces horneados',
    icon: Croissant,
  },
  {
    key: 'shops',
    label: 'Víveres',
    description: 'Mercado, despensa y productos de casa',
    icon: ShoppingBag,
  },
  {
    key: 'pharmacy',
    label: 'Farmacia',
    description: 'Salud y bienestar para ti',
    icon: Plus,
  },
  {
    key: 'drinks',
    label: 'Bebidas',
    description: 'Refrescos, jugos y mas',
    icon: CupSoda,
  },
];

const homePromoBanners = [
  {
    id: 'promo-burger',
    eyebrow: 'Promoción',
    title: 'Combo favorito',
    text: 'Hamburguesa, papas y bebida para tu próxima orden.',
    imageUrl:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'promo-grocery',
    eyebrow: 'Mercado',
    title: 'Lo esencial en minutos',
    text: 'Encuentra víveres y productos para tu casa cerca de ti.',
    imageUrl:
      'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'promo-dessert',
    eyebrow: 'Antojos',
    title: 'Un dulce para hoy',
    text: 'Postres y opciones especiales listas para pedir.',
    imageUrl:
      'https://images.unsplash.com/photo-1551024506-0bccd828d307?auto=format&fit=crop&w=1200&q=82',
  },
  {
    id: 'promo-pharmacy',
    eyebrow: 'Cerca de ti',
    title: 'Todo lo que necesitas',
    text: 'Farmacia, cuidado personal y productos cotidianos.',
    imageUrl:
      'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?auto=format&fit=crop&w=1200&q=82',
  },
];

const primaryFoodFilters: FoodFilter[] = [
  { value: 'Todas', label: 'Todos', icon: Grid2x2, tone: 'blue' },
  { value: 'Burgers', label: 'Burgers', icon: Beef, tone: 'amber' },
  { value: 'Arepas', label: 'Arepas', icon: Utensils, tone: 'green' },
  { value: 'Sushi', label: 'Asiatica', icon: Soup, tone: 'coral' },
  { value: 'Bebidas', label: 'Bebidas', icon: CupSoda, tone: 'mint' },
  { value: 'Panaderia', label: 'Panaderia', icon: Croissant, tone: 'amber' },
  { value: 'Postres', label: 'Postres', icon: IceCreamBowl, tone: 'violet' },
];

const nonRestaurantTypes = ['Farmacia', 'Minimarket'];
const defaultClientPhoto =
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=220&q=80';

const isFoodStore = (store: Storefront) => !nonRestaurantTypes.includes(store.type);

const foodFilterAliases: Record<string, string[]> = {
  Postres: ['Postres', 'Tortas', 'Helados'],
};

const matchesFoodFilter = (product: Product, foodType: string) =>
  foodType === 'Todas' || (foodFilterAliases[foodType] ?? [foodType]).includes(product.category);

const getFoodFilterIcon = (category: string) => {
  if (category === 'Cafe') {
    return Coffee;
  }

  if (category === 'Combos') {
    return BadgePercent;
  }

  if (category === 'Bebidas') {
    return CupSoda;
  }

  return Utensils;
};

const getFoodFilterTone = (index: number) =>
  ['blue', 'amber', 'coral', 'mint', 'violet', 'green'][index % 6];

export function ClientPortal({
  stores,
  products,
  orders,
  currentUser,
  cart,
  selectedStoreId,
  onSelectStore,
  onAddToCart,
  onUpdateCartItem,
  onRemoveCartItem,
  onClearCart,
  onOpenLogin,
  onOpenRegister,
  onLogout,
  onUpdateProfile,
  onCreateOrder,
}: ClientPortalProps) {
  const [clientView, setClientView] = useState<ClientView>('home');
  const [query, setQuery] = useState('');
  const [foodType, setFoodType] = useState('Todas');
  const [exploreCategoryLoading, setExploreCategoryLoading] = useState(false);
  const exploreCategoryTimer = useRef<number | null>(null);
  const [categoryKey, setCategoryKey] = useState<CategoryKey>('all');
  const [showMoreFoodTypes, setShowMoreFoodTypes] = useState(false);
  const [homePromoIndex, setHomePromoIndex] = useState(0);
  const [activeRestaurantStoreId, setActiveRestaurantStoreId] = useState<string | null>(null);
  const [selectedLocationId, setSelectedLocationId] = useState<DeliveryLocationId>('home');
  const [locationMenuOpen, setLocationMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notificationsClosing, setNotificationsClosing] = useState(false);
  const [clientNotifications, setClientNotifications] = useState(initialClientNotifications);
  const [notificationsClearing, setNotificationsClearing] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [accountClosing, setAccountClosing] = useState(false);
  const [accountSection, setAccountSection] = useState<AccountSection>('menu');
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false);
  const [profileName, setProfileName] = useState(currentUser?.name ?? '');
  const [profilePhone, setProfilePhone] = useState(currentUser?.phone ?? '');
  const [profileSaved, setProfileSaved] = useState(false);
  const [profileAddresses, setProfileAddresses] = useState<string[]>(() => {
    const addresses = [...(currentUser?.savedAddresses ?? [])].slice(0, 3);
    while (addresses.length < 3) addresses.push('');
    return addresses;
  });
  const [editingAddressIndex, setEditingAddressIndex] = useState(0);
  const [editingAddressForm, setEditingAddressForm] = useState<AddressForm>(emptyAddressForm);
  const [addressSaved, setAddressSaved] = useState(false);
  const [addressDetecting, setAddressDetecting] = useState(false);
  const [addressDetectionMessage, setAddressDetectionMessage] = useState('');
  const [cartCountPulse, setCartCountPulse] = useState(false);
  const previousCartItemsCount = useRef(0);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');
  const [guestAddress, setGuestAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('Pago simulado');
  const [checkoutError, setCheckoutError] = useState('');
  const [lastOrderId, setLastOrderId] = useState('');

  const activeBottomNavIndex = accountOpen ? 3 : cartOpen ? 2 : clientView === 'restaurants' ? 1 : 0;

  useEffect(() => {
    if (clientView !== 'home') {
      return;
    }

    const promoTimer = window.setInterval(() => {
      setHomePromoIndex((current) => (current + 1) % homePromoBanners.length);
    }, 4200);

    return () => window.clearInterval(promoTimer);
  }, [clientView]);

  useEffect(() => {
    if (!cartOpen && !accountOpen && !notificationsOpen) {
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
  }, [cartOpen, accountOpen, notificationsOpen]);

  const activeRestaurantStore = activeRestaurantStoreId
    ? stores.find((store) => store.id === activeRestaurantStoreId) ?? null
    : null;
  const selectedStore = activeRestaurantStore ?? stores.find((store) => store.id === selectedStoreId) ?? stores[0];
  const restaurantStores = useMemo(() => stores.filter(isFoodStore), [stores]);
  const storeById = useMemo(
    () => new Map(stores.map((store) => [store.id, store])),
    [stores],
  );
  const restaurantStoreIds = useMemo(
    () => new Set(restaurantStores.map((store) => store.id)),
    [restaurantStores],
  );

  const extraFoodFilters = useMemo(() => {
    const primaryValues = new Set(primaryFoodFilters.map((filter) => filter.value));
    const categories = Array.from(
      new Set(
        products
          .filter((product) => restaurantStoreIds.has(product.storeId))
          .map((product) => product.category),
      ),
    ).filter((category) => !primaryValues.has(category));

    return categories.slice(0, 6).map((category, index) => ({
      value: category,
      label: category === 'Acompanantes' ? 'Snacks' : category,
      icon: getFoodFilterIcon(category),
      tone: getFoodFilterTone(index + primaryFoodFilters.length),
    }));
  }, [products, restaurantStoreIds]);

  const foodFilters = showMoreFoodTypes
    ? [...primaryFoodFilters, ...extraFoodFilters]
    : primaryFoodFilters;

  const visibleStores = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const filteredStores = stores.filter((store) => {
      const storeProducts = products.filter((product) => product.storeId === store.id);

      if (categoryKey === 'restaurants' && !isFoodStore(store)) {
        return false;
      }

      if (categoryKey === 'drinks' && !storeProducts.some((product) => product.category === 'Bebidas')) {
        return false;
      }

      if (categoryKey === 'pharmacy' && store.type !== 'Farmacia') {
        return false;
      }

      if (categoryKey === 'shops' && store.type !== 'Minimarket') {
        return false;
      }

      if (categoryKey === 'bakery' && !storeProducts.some((product) => product.category === 'Panaderia')) {
        return false;
      }

      if (
        categoryKey === 'desserts' &&
        !storeProducts.some((product) => matchesFoodFilter(product, 'Postres'))
      ) {
        return false;
      }

      if (foodType !== 'Todas' && !storeProducts.some((product) => matchesFoodFilter(product, foodType))) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [store.name, store.type, store.tags.join(' '), storeProducts.map((product) => product.name).join(' ')]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery);
    });

    return filteredStores.sort(
      (left, right) => Number(right.open) - Number(left.open) || left.distanceKm - right.distanceKm,
    );
  }, [categoryKey, foodType, products, query, stores]);

  const exploreProducts = useMemo(() => {
    const storeIds = new Set(visibleStores.map((store) => store.id));

    return products.filter(
      (product) => storeIds.has(product.storeId) && matchesFoodFilter(product, foodType),
    );
  }, [foodType, products, visibleStores]);

  const promotedProduct =
    exploreProducts.find((product) => product.category === 'Combos') ??
    exploreProducts.find((product) => product.category === 'Burgers') ??
    exploreProducts[0] ??
    products[0];
  const promotedStore = stores.find((store) => store.id === promotedProduct?.storeId) ?? selectedStore;
  const selectedFoodLabel =
    foodFilters.find((filter) => filter.value === foodType)?.label ?? foodType;

  const cheapestProducts = useMemo(
    () =>
      [...exploreProducts].sort((left, right) => {
        const leftStore = storeById.get(left.storeId);
        const rightStore = storeById.get(right.storeId);

        return (
          left.price - right.price ||
          (leftStore?.distanceKm ?? Number.MAX_SAFE_INTEGER) -
            (rightStore?.distanceKm ?? Number.MAX_SAFE_INTEGER)
        );
      }),
    [exploreProducts, storeById],
  );

  const nearestProducts = useMemo(
    () =>
      [...exploreProducts].sort((left, right) => {
        const leftStore = storeById.get(left.storeId);
        const rightStore = storeById.get(right.storeId);

        return (
          (leftStore?.distanceKm ?? Number.MAX_SAFE_INTEGER) -
            (rightStore?.distanceKm ?? Number.MAX_SAFE_INTEGER) ||
          left.price - right.price
        );
      }),
    [exploreProducts, storeById],
  );

  const productRails = [
    {
      id: 'cheap',
      title: 'Mas economicos',
      products: cheapestProducts,
    },
    {
      id: 'near',
      title: 'Mas cerca',
      products: nearestProducts,
    },
  ];

  const homePreviewProducts = useMemo(() => {
    const preferredIds = ['prd-burger-combo', 'prd-sushi', 'prd-arepa-reina', 'prd-cheesecake'];
    const preferredProducts = preferredIds
      .map((id) => products.find((product) => product.id === id))
      .filter(Boolean) as Product[];
    const fallbackProducts = products.filter((product) => restaurantStoreIds.has(product.storeId));

    return [...preferredProducts, ...fallbackProducts]
      .filter((product, index, list) => list.findIndex((item) => item.id === product.id) === index)
      .slice(0, 4);
  }, [products, restaurantStoreIds]);

  const menuProducts = useMemo(() => {
    if (!activeRestaurantStore) {
      return [];
    }

    return products
      .filter((product) => product.storeId === activeRestaurantStore.id)
      .filter((product) => matchesFoodFilter(product, foodType));
  }, [activeRestaurantStore, foodType, products]);

  const groupedProducts = useMemo(() => {
    return menuProducts.reduce<Record<string, Product[]>>((groups, product) => {
      const next = { ...groups };
      next[product.category] = [...(next[product.category] ?? []), product];
      return next;
    }, {});
  }, [menuProducts]);

  const cartProducts = cart
    .map((cartItem) => {
      const product = products.find((item) => item.id === cartItem.productId);
      return product ? { ...cartItem, product } : undefined;
    })
    .filter(Boolean) as Array<CartItem & { product: Product }>;

  const cartStoreIds = Array.from(new Set(cartProducts.map((item) => item.product.storeId)));
  const subtotal = cartProducts.reduce(
    (total, item) => total + item.product.price * item.quantity,
    0,
  );
  const deliveryFee = cartProducts.length
    ? cartStoreIds.reduce((totalFee, storeId) => {
        const store = stores.find((item) => item.id === storeId);
        return totalFee + (store?.deliveryFee ?? 0);
      }, 0)
    : 0;
  const total = subtotal + deliveryFee;
  const cartItemsCount = cartProducts.reduce((sum, item) => sum + item.quantity, 0);

  useEffect(() => {
    const previousCount = previousCartItemsCount.current;

    if (previousCount > 0 && cartItemsCount > 0 && cartItemsCount !== previousCount) {
      setCartCountPulse(false);
      window.requestAnimationFrame(() => {
        setCartCountPulse(true);
      });

      const pulseTimer = window.setTimeout(() => {
        setCartCountPulse(false);
      }, 320);

      previousCartItemsCount.current = cartItemsCount;
      return () => window.clearTimeout(pulseTimer);
    }

    previousCartItemsCount.current = cartItemsCount;
  }, [cartItemsCount]);
  const getProductCartQuantity = (productId: string) =>
    cart.find((item) => item.productId === productId)?.quantity ?? 0;
  const deliveryLocations = [
    {
      id: 'home' as const,
      label: 'Casa',
      address: currentUser?.savedAddresses?.[0] ?? 'Residencias Turia, Torre B',
    },
    {
      id: 'work' as const,
      label: 'Trabajo',
      address: currentUser?.savedAddresses?.[1] ?? 'Oficina Torre Platinum, piso 4',
    },
    {
      id: 'current' as const,
      label: 'Mi Ubicacion',
      address: 'Ubicacion actual del cliente',
    },
  ];
  const selectedDeliveryLocation =
    deliveryLocations.find((location) => location.id === selectedLocationId) ?? deliveryLocations[0];
  const customerOrders = currentUser
    ? orders.filter(
        (order) => order.customerPhone === currentUser.phone || order.customerName === currentUser.name,
      )
    : [];

  const exploreTitle =
    categoryKey === 'drinks'
      ? 'Bebidas'
      : categoryKey === 'pharmacy'
        ? 'Farmacias'
        : categoryKey === 'shops'
          ? 'Víveres'
          : categoryKey === 'bakery'
            ? 'Panaderias'
            : categoryKey === 'desserts'
              ? 'Postres'
              : 'Comida';

  const selectFoodType = (nextFoodType: string) => {
    if (nextFoodType === foodType || exploreCategoryLoading) {
      return;
    }

    setExploreCategoryLoading(true);

    if (exploreCategoryTimer.current) {
      window.clearTimeout(exploreCategoryTimer.current);
    }

    exploreCategoryTimer.current = window.setTimeout(() => {
      setFoodType(nextFoodType);
      setActiveRestaurantStoreId(null);

      window.requestAnimationFrame(() => {
        window.setTimeout(() => {
          setExploreCategoryLoading(false);
          exploreCategoryTimer.current = null;
        }, 140);
      });
    }, 460);
  };

  useEffect(() => {
    return () => {
      if (exploreCategoryTimer.current) {
        window.clearTimeout(exploreCategoryTimer.current);
      }
    };
  }, []);

  const selectCategory = (key: CategoryKey) => {
    setClientView('restaurants');
    setCategoryKey(key);
    setActiveRestaurantStoreId(null);
    setFoodType(
      key === 'drinks'
        ? 'Bebidas'
        : key === 'bakery'
          ? 'Panaderia'
          : key === 'desserts'
            ? 'Postres'
            : 'Todas',
    );
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };

  const returnHome = () => {
    setClientView('home');
    setCategoryKey('all');
    setFoodType('Todas');
    setActiveRestaurantStoreId(null);
    window.setTimeout(() => window.scrollTo({ top: 0, behavior: 'smooth' }), 0);
  };

  const selectStore = (storeId: string) => {
    setActiveRestaurantStoreId(storeId);
    onSelectStore(storeId);
    window.setTimeout(() => {
      document.getElementById('restaurant-focus')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 0);
  };

  const addProductToCart = (product: Product) => {
    onAddToCart(product, selectedOptions[product.id] ?? product.options[0]);
    setLastOrderId('');
  };

  const scrollToRestaurantResults = () => {
    document.getElementById('restaurant-results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const openAccount = () => {
    setAccountClosing(false);
    setAccountSection('menu');
    setLogoutConfirmOpen(false);
    setProfileName(currentUser?.name ?? '');
    setProfilePhone(currentUser?.phone ?? '');
    const addresses = [...(currentUser?.savedAddresses ?? [])].slice(0, 3);
    while (addresses.length < 3) addresses.push('');
    setProfileAddresses(addresses);
    setProfileSaved(false);
    setAddressSaved(false);
    setAccountOpen(true);
  };

  const closeAccount = () => {
    setAccountClosing(true);
    setLogoutConfirmOpen(false);
    window.setTimeout(() => {
      setAccountOpen(false);
      setAccountClosing(false);
      setAccountSection('menu');
    }, 300);
  };

  const logoutFromAccount = () => {
    setLogoutConfirmOpen(false);
    setAccountOpen(false);
    setAccountClosing(false);
    setAccountSection('menu');
    onLogout();
  };

  const saveProfile = () => {
    const name = profileName.trim();
    const phone = profilePhone.trim();

    if (!name || !phone) {
      return;
    }

    onUpdateProfile({ name, phone });
    setProfileSaved(true);
  };

  const openAccountSection = (section: AccountSection) => {
    setProfileSaved(false);
    setAddressSaved(false);
    setAccountSection(section);
  };

  const openAddressEditor = (index: number) => {
    setEditingAddressIndex(index);
    setEditingAddressForm({
      ...emptyAddressForm,
      street: profileAddresses[index] ?? '',
    });
    setAddressSaved(false);
    setAddressDetectionMessage('');
    setAccountSection('address-edit');
  };

  const updateAddressField = (field: keyof AddressForm, value: string) => {
    setEditingAddressForm((current) => ({ ...current, [field]: value }));
    setAddressSaved(false);
  };

  const saveAddress = () => {
    const { street, number, neighborhood, city, state, postalCode, reference } = editingAddressForm;

    if (!street.trim() || !city.trim() || !state.trim()) {
      return;
    }

    const nextAddress = [
      [street.trim(), number.trim()].filter(Boolean).join(' '),
      neighborhood.trim(),
      city.trim(),
      state.trim(),
      postalCode.trim(),
      reference.trim() ? `Ref: ${reference.trim()}` : '',
    ]
      .filter(Boolean)
      .join(', ');

    const nextAddresses = [...profileAddresses];
    nextAddresses[editingAddressIndex] = nextAddress;
    setProfileAddresses(nextAddresses);
    onUpdateProfile({ savedAddresses: nextAddresses });
    setAddressSaved(true);
  };

  const detectCurrentAddress = () => {
    if (!navigator.geolocation) {
      setAddressDetectionMessage('Tu navegador no permite detectar la ubicación.');
      return;
    }

    setAddressDetecting(true);
    setAddressDetectionMessage('');

    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const latitude = coords.latitude.toFixed(6);
        const longitude = coords.longitude.toFixed(6);

        setEditingAddressForm((current) => ({
          ...current,
          latitude,
          longitude,
        }));

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${coords.latitude}&lon=${coords.longitude}&zoom=18&addressdetails=1&accept-language=es`,
          );

          if (!response.ok) {
            throw new Error('reverse-geocode-failed');
          }

          const result = await response.json();
          const address = result.address ?? {};

          setEditingAddressForm((current) => ({
            ...current,
            street:
              address.road ??
              address.pedestrian ??
              address.residential ??
              address.footway ??
              current.street,
            number: address.house_number ?? current.number,
            neighborhood:
              address.neighbourhood ??
              address.suburb ??
              address.quarter ??
              current.neighborhood,
            city:
              address.city ??
              address.town ??
              address.village ??
              address.municipality ??
              current.city,
            state: address.state ?? address.region ?? current.state,
            postalCode:
              address.postcode ??
              address.postal_code ??
              address.zip ??
              address.zipcode ??
              current.postalCode,
            latitude,
            longitude,
          }));
          setAddressDetectionMessage('Ubicación detectada. Revisa los datos antes de guardar.');
        } catch {
          setAddressDetectionMessage(
            'Detectamos tus coordenadas, pero no pudimos completar todos los campos automáticamente.',
          );
        } finally {
          setAddressDetecting(false);
        }
      },
      () => {
        setAddressDetecting(false);
        setAddressDetectionMessage('No pudimos acceder a tu ubicación. Revisa el permiso del navegador.');
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      },
    );
  };

  const closeNotifications = () => {
    setNotificationsClosing(true);
    window.setTimeout(() => {
      setNotificationsOpen(false);
      setNotificationsClosing(false);
    }, 300);
  };


  const clearNotifications = () => {
    if (!clientNotifications.length || notificationsClearing) {
      return;
    }

    setNotificationsClearing(true);
    const animationDuration = 260;
    const staggerDelay = 90;
    const totalDuration =
      animationDuration + Math.max(0, clientNotifications.length - 1) * staggerDelay;

    window.setTimeout(() => {
      setClientNotifications([]);
      setNotificationsClearing(false);
    }, totalDuration);
  };

  const submitOrder = () => {
    setCheckoutError('');
    setLastOrderId('');

    if (!cartProducts.length) {
      setCheckoutError('Agrega productos al carrito antes de confirmar.');
      return;
    }

    const customerName = currentUser ? currentUser.name : guestName;
    const customerPhone = currentUser ? currentUser.phone : guestPhone;
    const address = currentUser ? selectedDeliveryLocation.address : guestAddress;

    if (!customerName.trim() || !customerPhone.trim() || !address.trim()) {
      setCheckoutError('Completa nombre, telefono y direccion para reportar el pedido a la tienda.');
      return;
    }

    const orderId = onCreateOrder({
      customerName,
      customerPhone,
      customerRegistered: Boolean(currentUser),
      address,
      paymentMethod,
      notes,
    });

    if (orderId) {
      setLastOrderId(orderId);
      setGuestName('');
      setGuestPhone('');
      setGuestAddress('');
      setNotes('');
      setCheckoutOpen(false);
    }
  };

  const renderProductQuantityControl = (product: Product, disabled: boolean, className = '') => {
    const quantity = getProductCartQuantity(product.id);

    if (!quantity) {
      return (
        <button
          aria-label={`Agregar ${product.name}`}
          className={`product-add-button ${className}`.trim()}
          disabled={disabled}
          onClick={() => addProductToCart(product)}
          type="button"
        >
          <Plus size={25} aria-hidden="true" />
        </button>
      );
    }

    return (
      <div className={`product-quantity-control ${className}`.trim()}>
        <button
          className={quantity === 1 ? 'danger-stepper-button' : ''}
          aria-label={quantity === 1 ? `Eliminar ${product.name}` : `Restar ${product.name}`}
          onClick={() =>
            quantity === 1
              ? onRemoveCartItem(product.id)
              : onUpdateCartItem(product.id, quantity - 1)
          }
          type="button"
        >
          {quantity === 1 ? (
            <Trash2 size={17} aria-hidden="true" />
          ) : (
            <Minus size={18} aria-hidden="true" />
          )}
        </button>
        <span>{quantity}</span>
        <button
          aria-label={`Sumar ${product.name}`}
          disabled={disabled}
          onClick={() => addProductToCart(product)}
          type="button"
        >
          <Plus size={18} aria-hidden="true" />
        </button>
      </div>
    );
  };

  const renderDishCard = (product: Product, compact = false) => {
    const productStore = stores.find((store) => store.id === product.storeId);
    const isUnavailable = !product.available || productStore?.open === false;
    const badgeText = product.category === 'Combos' ? 'Mas vendido' : product.category;
    const renderBadge = () => (
      <span className="dish-badge">
        <Star size={14} aria-hidden="true" fill="currentColor" />
        {isUnavailable ? 'No disponible' : badgeText}
      </span>
    );

    return (
      <article
        className={`dish-card ${compact ? 'compact' : ''} ${isUnavailable ? 'unavailable' : ''}`.trim()}
        key={product.id}
      >
        {compact ? (
          <div className="dish-image-frame">
            <SafeImage src={product.imageUrl} alt="" />
            {renderBadge()}
          </div>
        ) : (
          <SafeImage src={product.imageUrl} alt="" />
        )}
        <div className="dish-card-body">
          <div>
            <div className={`dish-title-row ${compact ? 'compact-title' : ''}`.trim()}>
              <strong>{product.name}</strong>
              {!compact ? (
                <button aria-label={`Guardar ${product.name}`} className="dish-favorite" type="button">
                  <Heart size={22} aria-hidden="true" />
                </button>
              ) : null}
            </div>
            {!compact ? <p>{product.description}</p> : null}
          </div>
          {!compact ? (
            <div className="dish-meta-row">
              {renderBadge()}
              {product.options.length > 1 ? (
                <label className="dish-option">
                  <span className="sr-only">Opcion para {product.name}</span>
                  <select
                    disabled={isUnavailable}
                    onChange={(event) =>
                      setSelectedOptions((current) => ({
                        ...current,
                        [product.id]: event.target.value,
                      }))
                    }
                    value={selectedOptions[product.id] ?? product.options[0] ?? ''}
                  >
                    {product.options.map((option) => (
                      <option key={option}>{option}</option>
                    ))}
                  </select>
                </label>
              ) : null}
            </div>
          ) : null}
          <div className="dish-footer">
            <span>{formatCurrency(product.price)}</span>
            {renderProductQuantityControl(product, isUnavailable, 'dish-add-button')}
          </div>
        </div>
      </article>
    );
  };

  const renderStoreCard = (store: Storefront, index: number) => (
    <article className="local-card restaurant-store-card" key={store.id}>
      <button className="local-card-main" onClick={() => selectStore(store.id)} type="button">
        <SafeImage src={store.imageUrl} alt="" />
        <div className="local-info">
          <div className="local-title-row">
            <h3>{store.name}</h3>
            {index === 0 ? <span>Destacado</span> : null}
          </div>
          <p>{store.type} | {store.tags.slice(0, 2).join(' | ')}</p>
          <div className="local-meta">
            <span>
              <Star size={17} aria-hidden="true" fill="currentColor" /> {store.rating}
            </span>
            <span>
              <MapPin size={17} aria-hidden="true" /> {store.distanceKm} km
            </span>
          </div>
          <div className="local-delivery-row">
            <span>
              <Clock size={21} aria-hidden="true" />
              <strong>{store.deliveryMinutes}</strong>
              Entrega estimada
            </span>
            <span>
              <Bike size={21} aria-hidden="true" />
              <strong>{formatCurrency(store.deliveryFee)}</strong>
              Envio
            </span>
          </div>
        </div>
      </button>
    </article>
  );

  const renderRailProductCard = (product: Product, rank: number) => {
    const productStore = storeById.get(product.storeId);
    const isUnavailable = !product.available || productStore?.open === false;

    return (
      <article className={`rail-product-card ${isUnavailable ? 'unavailable' : ''}`.trim()} key={product.id}>
        <button
          aria-label={`Ver ${product.name} en ${productStore?.name ?? 'local cercano'}`}
          className="rail-product-main"
          onClick={() => productStore && selectStore(productStore.id)}
          type="button"
        >
          <SafeImage src={product.imageUrl} alt="" />
          <div className="rail-product-image-meta">
            <span className="rail-product-rank">#{rank + 1}</span>
            <span className="rail-product-rating">
              <Star size={13} aria-hidden="true" fill="currentColor" />
              {productStore?.rating ?? '4.8'}
            </span>
          </div>
        </button>
        <div className="rail-product-body">
          <strong>{product.name}</strong>
          <span>{productStore?.name ?? 'Local cercano'}</span>
          <div className="rail-product-footer">
            <b>{formatCurrency(product.price)}</b>
            {renderProductQuantityControl(product, isUnavailable, 'rail-add-button')}
          </div>
        </div>
      </article>
    );
  };

  const renderRailSeeAllCard = (railTitle: string) => (
    <button className="rail-see-all-card" key={`${railTitle}-see-all`} onClick={scrollToRestaurantResults} type="button">
      <span>
        <StoreIcon size={24} aria-hidden="true" />
      </span>
      <strong>Ver todos</strong>
      <small>{railTitle}</small>
      <ChevronRight size={24} aria-hidden="true" />
    </button>
  );

  const renderCategoryCard = (card: CategoryCard, compact = false) => {
    const Icon = card.icon;

    return (
      <button
        className={`category-card category-card-${card.key} ${compact ? 'category-card-compact' : ''} ${
          categoryKey === card.key ? 'active' : ''
        }`.trim()}
        key={card.key}
        onClick={() => selectCategory(card.key)}
        type="button"
      >
        <span className={`category-icon category-${card.key}`}>
          <Icon size={42} aria-hidden="true" strokeWidth={2.1} />
        </span>
        <span className="category-card-copy">
          <strong>{card.label}</strong>
          <small>{card.description}</small>
        </span>
        <span className="category-card-meta">
          <MapPin size={18} aria-hidden="true" fill="currentColor" />
          <span>Ver tiendas</span>
          <ChevronRight size={26} aria-hidden="true" />
        </span>
      </button>
    );
  };

  return (
    <>
      <div className="mobile-home-frame">
        {clientView === 'home' ? (
          <>
            <section className={`reference-hero ${locationMenuOpen || notificationsOpen ? 'location-menu-open' : ''}`.trim()}>
              <div className="reference-hero-top">
                <div className="hero-brand">
                  <img src={pideyaLogo} alt="PideYa" />
                  <strong>Pide<span>Ya</span></strong>
                </div>
                {currentUser ? (
                  <div className="hero-auth-actions hero-location-actions">
                    <div className="hero-location-control">
                      <button
                        className="hero-location-button"
                        onClick={() => {
                          setLocationMenuOpen((current) => !current);
                          setNotificationsOpen(false);
                        }}
                        type="button"
                      >
                        <MapPin size={19} aria-hidden="true" />
                        <span>
                          <strong>{selectedDeliveryLocation.label}</strong>
                          <small>{selectedDeliveryLocation.address}</small>
                        </span>
                        <ChevronDown size={18} aria-hidden="true" />
                      </button>

                      {locationMenuOpen ? (
                        <div className="hero-location-menu">
                          {deliveryLocations.map((location) => (
                            <button
                              className={selectedLocationId === location.id ? 'active' : ''}
                              key={location.id}
                              onClick={() => {
                                setSelectedLocationId(location.id);
                                setLocationMenuOpen(false);
                              }}
                              type="button"
                            >
                              <MapPin size={16} aria-hidden="true" />
                              <span>
                                <strong>{location.label}</strong>
                                <small>{location.address}</small>
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>

                    <div className="hero-notification-control">
                      <button
                        aria-label="Abrir notificaciones"
                        className="hero-notification-button"
                        onClick={() => {
                          if (notificationsOpen) {
                            closeNotifications();
                          } else {
                            setNotificationsClosing(false);
                            setNotificationsOpen(true);
                          }
                          setLocationMenuOpen(false);
                        }}
                        type="button"
                      >
                        <Bell size={20} aria-hidden="true" />
                        {clientNotifications.length ? <strong>{clientNotifications.length}</strong> : null}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="hero-auth-actions">
                    <button className="hero-auth ghost" onClick={onOpenLogin} type="button">
                      <UserRound size={20} aria-hidden="true" />
                      <span>Iniciar sesion</span>
                    </button>
                    <button className="hero-auth primary" onClick={onOpenRegister} type="button">
                      <Plus size={20} aria-hidden="true" />
                      <span>Registrarse</span>
                    </button>
                  </div>
                )}
              </div>
              <div className="hero-content">
                <div>
                  <h1>Todo lo que necesitas, cuando lo necesitas.</h1>
                  <p>Pedidos rapidos en tu zona con tiendas, restaurantes y delivery cerca.</p>
                </div>
              </div>
            </section>

            <label className="reference-search">
              <Search size={34} aria-hidden="true" />
              <input
                aria-label="Buscar tiendas o productos"
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Busca restaurantes o productos..."
                value={query}
              />
            </label>

            <section className="reference-categories" aria-label="Categorias principales">
              <div className="category-group-heading">
                <h2>Lo mas buscado en PideYa</h2>
              </div>
              <div className="category-feature-grid">
                {featuredCategoryCards.map((card) => renderCategoryCard(card))}
              </div>

              <section className="home-promo-slider" aria-label="Promociones destacadas">
                <div
                  className="home-promo-track"
                  style={{ transform: `translateX(-${homePromoIndex * 100}%)` }}
                >
                  {homePromoBanners.map((banner) => (
                    <article className="home-promo-slide" key={banner.id}>
                      <SafeImage src={banner.imageUrl} alt="" />
                      <div className="home-promo-overlay" />
                      <div className="home-promo-copy">
                        <span>{banner.eyebrow}</span>
                        <strong>{banner.title}</strong>
                        <p>{banner.text}</p>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="home-promo-dots" aria-label="Seleccionar promoción">
                  {homePromoBanners.map((banner, index) => (
                    <button
                      aria-label={`Ver promoción ${index + 1}`}
                      className={homePromoIndex === index ? 'active' : ''}
                      key={banner.id}
                      onClick={() => setHomePromoIndex(index)}
                      type="button"
                    />
                  ))}
                </div>
              </section>

              <div className="category-group-heading category-group-heading-secondary">
                <h2>Principales tiendas</h2>
              </div>
              <div className="category-scroll-row" aria-label="Mas categorias">
                {scrollCategoryCards.map((card) => renderCategoryCard(card, true))}
              </div>
            </section>

            <section className="reference-section home-products-section">
              <div className="reference-section-heading">
                <h2>Mas vendidos</h2>
                <button onClick={() => selectCategory('restaurants')} type="button">
                  Ver restaurantes
                  <ChevronRight size={18} aria-hidden="true" />
                </button>
              </div>
              <div className="home-product-preview-list">
                {homePreviewProducts.map((product) => renderDishCard(product, true))}
              </div>
            </section>
          </>
        ) : (
          <section
            className={`restaurant-app-page ${exploreCategoryLoading ? 'explore-category-loading' : ''}`.trim()}
            aria-labelledby="restaurant-page-title"
          >
            <div className="restaurant-topbar">
              <button aria-label="Volver al inicio" className="restaurant-back-button" onClick={returnHome} type="button">
                <ArrowLeft size={28} aria-hidden="true" />
              </button>
              <label className="restaurant-search">
                <Search size={28} aria-hidden="true" />
                <input
                  aria-label={`Buscar en ${exploreTitle}`}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Busca productos..."
                  value={query}
                />
              </label>
            </div>

            <nav className="food-type-scroll" aria-label="Tipos de comida">
              {foodFilters.map(({ value, label, icon: Icon, tone }) => (
                <button
                  className={foodType === value ? `food-type-button active tone-${tone}` : `food-type-button tone-${tone}`}
                  key={value}
                  onClick={() => selectFoodType(value)}
                  type="button"
                >
                  <span>
                    <Icon size={30} aria-hidden="true" strokeWidth={2.1} />
                  </span>
                  <strong>{label}</strong>
                </button>
              ))}
              {extraFoodFilters.length ? (
                <button
                  className={showMoreFoodTypes ? 'food-type-button more active' : 'food-type-button more'}
                  onClick={() => setShowMoreFoodTypes((current) => !current)}
                  type="button"
                >
                  <span>
                    <Grid2x2 size={30} aria-hidden="true" strokeWidth={2.1} />
                  </span>
                  <strong>Mas</strong>
                </button>
              ) : null}
            </nav>

            <div id="restaurant-focus" />

            {exploreCategoryLoading ? (
              <div className="explore-skeleton" role="status" aria-live="polite" aria-label="Cargando resultados">
                <div className="explore-skeleton-feature">
                  <div className="skeleton-copy">
                    <span className="skeleton-line short" />
                    <span className="skeleton-line title" />
                    <span className="skeleton-line medium" />
                    <span className="skeleton-line price" />
                    <span className="skeleton-button" />
                  </div>
                  <span className="skeleton-image" />
                </div>

                <div className="explore-skeleton-rails">
                  {[0, 1].map((rail) => (
                    <section className="explore-skeleton-rail" key={rail}>
                      <div className="skeleton-section-heading">
                        <span className="skeleton-line heading" />
                        <span className="skeleton-pill" />
                      </div>
                      <div className="explore-skeleton-card-row">
                        {[0, 1, 2].map((card) => (
                          <article className="explore-skeleton-card" key={card}>
                            <span className="skeleton-card-image" />
                            <span className="skeleton-line card-title" />
                            <span className="skeleton-line card-meta" />
                            <span className="skeleton-line card-price" />
                          </article>
                        ))}
                      </div>
                    </section>
                  ))}
                </div>

                <div className="skeleton-results-heading">
                  <span className="skeleton-line heading wide" />
                  <span className="skeleton-line medium" />
                </div>

                <div className="explore-skeleton-stores">
                  {[0, 1].map((store) => (
                    <article className="explore-skeleton-store" key={store}>
                      <span className="skeleton-store-image" />
                      <div>
                        <span className="skeleton-line title" />
                        <span className="skeleton-line medium" />
                        <span className="skeleton-line short" />
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            ) : (
              <div
                className="explore-results-enter"
                key={`explore-results-${foodType}-${activeRestaurantStoreId ?? 'all'}`}
              >
                {activeRestaurantStore ? (
                  <article className="store-spotlight-card">
                    <SafeImage src={activeRestaurantStore.imageUrl} alt="" />
                    <div className="store-spotlight-content">
                      <span className="spotlight-kicker">
                        <StoreIcon size={17} aria-hidden="true" />
                        {activeRestaurantStore.open ? 'Abierto ahora' : 'Cerrado'}
                      </span>
                      <h2 id="restaurant-page-title">{activeRestaurantStore.name}</h2>
                      <p>{activeRestaurantStore.type} | {activeRestaurantStore.tags.join(' | ')}</p>
                      <div className="spotlight-meta">
                        <span>
                          <Star size={16} aria-hidden="true" fill="currentColor" /> {activeRestaurantStore.rating}
                        </span>
                        <span>
                          <Clock size={16} aria-hidden="true" /> {activeRestaurantStore.deliveryMinutes}
                        </span>
                        <span>
                          <Bike size={16} aria-hidden="true" /> {formatCurrency(activeRestaurantStore.deliveryFee)}
                        </span>
                      </div>
                      <div className="store-address-line">
                        <MapPin size={16} aria-hidden="true" />
                        <span>{activeRestaurantStore.address}</span>
                      </div>
                      <button className="clear-store-button" onClick={() => setActiveRestaurantStoreId(null)} type="button">
                        Ver otros locales
                      </button>
                    </div>
                  </article>
                ) : promotedProduct ? (
                  <article className="featured-deal-card">
                    <div className="featured-deal-copy">
                      <span>
                        <BadgePercent size={17} aria-hidden="true" />
                        Oferta especial
                      </span>
                      <h2 id="restaurant-page-title">{promotedProduct.name}</h2>
                      <p>{promotedProduct.description}</p>
                      <div className="featured-price-row">
                        <strong>{formatCurrency(promotedProduct.price)}</strong>
                        <s>{formatCurrency(Number((promotedProduct.price * 1.35).toFixed(2)))}</s>
                      </div>
                      {renderProductQuantityControl(
                        promotedProduct,
                        !promotedProduct.available || !promotedStore.open,
                        'featured-quantity-control',
                      )}
                    </div>
                    <SafeImage src={promotedProduct.imageUrl} alt="" />
                    <b className="featured-discount-badge">
                      <span>25%</span>
                      <small>OFF</small>
                    </b>
                  </article>
                ) : null}

                <section className="restaurant-content-section">
                  {activeRestaurantStore ? (
                    <>
                      <div className="restaurant-section-heading">
                        <div>
                          <h2>{`Productos de ${activeRestaurantStore.name}`}</h2>
                          <span>{`${menuProducts.length} productos disponibles`}</span>
                        </div>
                      </div>

                      {Object.entries(groupedProducts).length ? (
                        <div className="menu-product-list">
                          {Object.entries(groupedProducts).map(([group, groupProducts]) => (
                            <section className="restaurant-product-group" key={group}>
                              <div className="menu-section-heading">
                                <h3>{group}</h3>
                                <span>{groupProducts.length} productos</span>
                              </div>
                              <div className="dish-list">
                                {groupProducts.map((product) => renderDishCard(product))}
                              </div>
                            </section>
                          ))}
                        </div>
                      ) : (
                        <EmptyState body="Prueba otro tipo de comida o selecciona otro local." title="Sin productos" />
                      )}
                    </>
                  ) : (
                    <>
                      {exploreProducts.length ? (
                        <div className="product-rail-stack">
                          {productRails.map((rail) => (
                            <section className="product-rail-section" key={`${foodType}-${rail.id}`}>
                              <div className="product-rail-heading">
                                <h3>{rail.title}</h3>
                                <small>{rail.products.length}</small>
                              </div>
                              <div className="product-rail-scroll" key={`${foodType}-${rail.id}-scroll`}>
                                {rail.products.map((product, index) => renderRailProductCard(product, index))}
                                {rail.products.length > 2 ? renderRailSeeAllCard(rail.title) : null}
                              </div>
                            </section>
                          ))}
                        </div>
                      ) : (
                        <EmptyState body="Prueba otro tipo de comida o ajusta la busqueda." title="Sin productos" />
                      )}

                      <div id="restaurant-results" className="restaurant-section-heading restaurant-results-heading">
                        <div>
                          <h2>
                            {foodType === 'Todas'
                              ? `${exploreTitle} cerca de vos`
                              : `Locales con ${selectedFoodLabel}`}
                          </h2>
                          <span>{`${visibleStores.length} locales disponibles`}</span>
                        </div>
                      </div>

                      {visibleStores.length ? (
                        <div className="local-list restaurant-local-list">
                          {visibleStores.map((store, index) => renderStoreCard(store, index))}
                        </div>
                      ) : (
                        <EmptyState body="Prueba otro tipo de comida o ajusta la busqueda." title="Sin locales" />
                      )}
                    </>
                  )}
                </section>
              </div>
            )}
          </section>
        )}
      </div>

      <nav className={`mobile-bottom-nav client-bottom-nav nav-index-${activeBottomNavIndex}`} aria-label="Menu principal">
        <span className="mobile-bottom-nav-indicator" aria-hidden="true" />
        <button
          className={clientView === 'home' ? 'active' : ''}
          onClick={returnHome}
          type="button"
        >
          <Home size={21} aria-hidden="true" />
          <span>Inicio</span>
        </button>
        <button
          className={clientView === 'restaurants' ? 'active' : ''}
          onClick={() => selectCategory(categoryKey === 'all' ? 'restaurants' : categoryKey)}
          type="button"
        >
          <Search size={21} aria-hidden="true" />
          <span>Explorar</span>
        </button>
        <button
          className={cartOpen ? 'active' : ''}
          onClick={() => setCartOpen(true)}
          type="button"
        >
          <ShoppingCart size={21} aria-hidden="true" />
          <span>Carrito</span>
          {cartItemsCount ? (
            <strong className={cartCountPulse ? 'cart-count-pulse' : ''}>{cartItemsCount}</strong>
          ) : null}
        </button>
        <button
          className={accountOpen ? 'active' : ''}
          onClick={currentUser ? openAccount : onOpenLogin}
          type="button"
        >
          <UserRound size={21} aria-hidden="true" />
          <span>Cuenta</span>
        </button>
      </nav>

      {accountOpen && currentUser ? (
        <div
          className={`account-sheet-backdrop ${accountClosing ? 'closing' : ''}`.trim()}
          role="presentation"
          onClick={closeAccount}
        >
          <section
            aria-labelledby="account-sheet-title"
            className={`account-sheet ${accountSection === 'address-edit' ? 'expanded-address-editor' : ''} ${accountClosing ? 'closing' : ''}`.trim()}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            {accountSection === 'menu' ? (
              <div className="account-profile-card account-view-enter">
                <button
                  aria-label="Cerrar cuenta"
                  className="account-close-button"
                  onClick={closeAccount}
                  type="button"
                >
                  <ArrowLeft size={24} aria-hidden="true" />
                </button>
                <SafeImage className="account-avatar" src={defaultClientPhoto} alt="" />
                <div>
                  <span>Perfil del cliente</span>
                  <h2 id="account-sheet-title">{currentUser.name}</h2>
                  <p>{currentUser.phone}</p>
                </div>
              </div>
            ) : (
              <div className="account-subsection-header account-view-enter">
                <button
                  aria-label={accountSection === 'address-edit' ? 'Volver a direcciones' : 'Volver al perfil'}
                  className="account-subsection-back"
                  onClick={() => setAccountSection(accountSection === 'address-edit' ? 'addresses' : 'menu')}
                  type="button"
                >
                  <ArrowLeft size={22} aria-hidden="true" />
                </button>
                <div>
                  <span>{accountSection === 'address-edit' ? 'Direcciones' : 'Mi cuenta'}</span>
                  <h2 id="account-sheet-title">
                    {accountSection === 'edit'
                      ? 'Editar datos'
                      : accountSection === 'history'
                        ? 'Historial'
                        : accountSection === 'addresses'
                          ? 'Direcciones'
                          : accountSection === 'address-edit'
                            ? `Editar ${editingAddressIndex === 0 ? 'Casa' : editingAddressIndex === 1 ? 'Trabajo' : 'Otro'}`
                            : 'Favoritos'}
                  </h2>
                </div>
              </div>
            )}

            {accountSection === 'menu' ? (
              <div className="account-section-content">
                <div className="account-summary-grid">
                  <span>
                    <strong>{customerOrders.length}</strong>
                    Pedidos
                  </span>
                  <span>
                    <strong>{profileAddresses.filter(Boolean).length}</strong>
                    Direcciones
                  </span>
                  <span>
                    <strong>0</strong>
                    Favoritos
                  </span>
                </div>

                <div className="account-actions" aria-label="Opciones de cuenta">
                  <button onClick={() => openAccountSection('edit')} type="button">
                    <Edit3 size={20} aria-hidden="true" />
                    <span>Editar datos</span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                  <button onClick={() => openAccountSection('history')} type="button">
                    <ClipboardList size={20} aria-hidden="true" />
                    <span>Historial</span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                  <button onClick={() => openAccountSection('addresses')} type="button">
                    <MapPin size={20} aria-hidden="true" />
                    <span>Direcciones</span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                  <button onClick={() => openAccountSection('favorites')} type="button">
                    <Heart size={20} aria-hidden="true" />
                    <span>Favoritos</span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                  <button className="account-logout-button" onClick={() => setLogoutConfirmOpen(true)} type="button">
                    <LogOut size={20} aria-hidden="true" />
                    <span>Cerrar sesion</span>
                    <ChevronRight size={20} aria-hidden="true" />
                  </button>
                </div>
              </div>
            ) : null}

            {accountSection === 'edit' ? (
              <div className="account-subsection account-view-enter">
                <div className="account-form-field">
                  <label htmlFor="profile-name">Nombre</label>
                  <input
                    id="profile-name"
                    onChange={(event) => {
                      setProfileName(event.target.value);
                      setProfileSaved(false);
                    }}
                    value={profileName}
                  />
                </div>
                <div className="account-form-field">
                  <label htmlFor="profile-phone">Telefono</label>
                  <input
                    id="profile-phone"
                    inputMode="tel"
                    onChange={(event) => {
                      setProfilePhone(event.target.value);
                      setProfileSaved(false);
                    }}
                    value={profilePhone}
                  />
                </div>
                {profileSaved ? <p className="account-success-message">Datos actualizados correctamente.</p> : null}
                <button
                  className="account-primary-button"
                  disabled={!profileName.trim() || !profilePhone.trim()}
                  onClick={saveProfile}
                  type="button"
                >
                  Guardar cambios
                </button>
              </div>
            ) : null}

            {accountSection === 'history' ? (
              <div className="account-subsection account-list account-view-enter">
                {customerOrders.length ? (
                  customerOrders.map((order) => (
                    <article className="account-list-card" key={order.id}>
                      <div>
                        <strong>Pedido {order.id}</strong>
                        <span>{order.createdAt}</span>
                      </div>
                      <div className="account-order-meta">
                        <span>{order.items.reduce((sum, item) => sum + item.quantity, 0)} productos</span>
                        <b>{formatCurrency(order.subtotal + order.deliveryFee)}</b>
                      </div>
                      <small>{order.status.split('_').join(' ')}</small>
                    </article>
                  ))
                ) : (
                  <div className="account-empty-state">
                    <ClipboardList size={30} aria-hidden="true" />
                    <strong>Aun no tienes pedidos</strong>
                    <p>Cuando realices un pedido aparecera aqui.</p>
                  </div>
                )}
              </div>
            ) : null}

            {accountSection === 'addresses' ? (
              <div className="account-subsection account-list account-view-enter">
                {profileAddresses.map((address, index) => (
                  <article className="account-address-card" key={index}>
                    <span><MapPin size={19} aria-hidden="true" /></span>
                    <div>
                      <strong>{index === 0 ? 'Casa' : index === 1 ? 'Trabajo' : 'Otro'}</strong>
                      <p>{address || 'Sin dirección guardada'}</p>
                    </div>
                    <button
                      className="account-address-edit"
                      onClick={() => openAddressEditor(index)}
                      type="button"
                    >
                      <Edit3 size={16} aria-hidden="true" />
                      <span>Editar</span>
                    </button>
                  </article>
                ))}
              </div>
            ) : null}

            {accountSection === 'address-edit' ? (
              <div className="account-subsection account-view-enter">
                <div className="account-address-type">
                  <span><MapPin size={19} aria-hidden="true" /></span>
                  <div>
                    <small>Tipo de dirección</small>
                    <strong>{editingAddressIndex === 0 ? 'Casa' : editingAddressIndex === 1 ? 'Trabajo' : 'Otro'}</strong>
                  </div>
                </div>

                <button
                  className="account-detect-location"
                  disabled={addressDetecting}
                  onClick={detectCurrentAddress}
                  type="button"
                >
                  <LocateFixed size={19} aria-hidden="true" />
                  <span>{addressDetecting ? 'Detectando ubicación...' : 'Usar mi ubicación actual'}</span>
                </button>

                {addressDetectionMessage ? (
                  <p className="account-location-message">{addressDetectionMessage}</p>
                ) : null}

                <div className="account-address-form-grid">
                  <div className="account-form-field address-field-wide">
                    <label htmlFor="address-street">Calle o avenida</label>
                    <input
                      id="address-street"
                      onChange={(event) => updateAddressField('street', event.target.value)}
                      placeholder="Ej. Av. Principal"
                      value={editingAddressForm.street}
                    />
                  </div>

                  <div className="account-form-field">
                    <label htmlFor="address-number">Número / casa</label>
                    <input
                      id="address-number"
                      onChange={(event) => updateAddressField('number', event.target.value)}
                      placeholder="Ej. 24-B"
                      value={editingAddressForm.number}
                    />
                  </div>

                  <div className="account-form-field address-field-wide">
                    <label htmlFor="address-neighborhood">Sector / urbanización</label>
                    <input
                      id="address-neighborhood"
                      onChange={(event) => updateAddressField('neighborhood', event.target.value)}
                      placeholder="Ej. La Floresta"
                      value={editingAddressForm.neighborhood}
                    />
                  </div>

                  <div className="account-form-field address-field-wide">
                    <label htmlFor="address-city">Ciudad</label>
                    <input
                      id="address-city"
                      onChange={(event) => updateAddressField('city', event.target.value)}
                      placeholder="Ciudad"
                      value={editingAddressForm.city}
                    />
                  </div>

                  <div className="account-form-field address-field-wide">
                    <label htmlFor="address-state">Estado / región</label>
                    <input
                      id="address-state"
                      onChange={(event) => updateAddressField('state', event.target.value)}
                      placeholder="Estado"
                      value={editingAddressForm.state}
                    />
                  </div>

                  <div className="account-form-field">
                    <label htmlFor="address-postal">Código postal</label>
                    <input
                      id="address-postal"
                      inputMode="numeric"
                      onChange={(event) => updateAddressField('postalCode', event.target.value)}
                      placeholder="Código postal"
                      value={editingAddressForm.postalCode}
                    />
                  </div>

                  <div className="account-form-field address-field-wide">
                    <label htmlFor="address-reference">Punto de referencia</label>
                    <textarea
                      id="address-reference"
                      onChange={(event) => updateAddressField('reference', event.target.value)}
                      placeholder="Ej. edificio azul frente a la plaza"
                      rows={3}
                      value={editingAddressForm.reference}
                    />
                  </div>

                </div>

                <p className="account-address-helper">
                  Calle, ciudad, estado y código postal ayudan a ubicar la dirección con mayor precisión en mapas.
                </p>

                {addressSaved ? (
                  <p className="account-success-message">Dirección actualizada correctamente.</p>
                ) : null}

                <button
                  className="account-primary-button"
                  disabled={
                    !editingAddressForm.street.trim() ||
                    !editingAddressForm.city.trim() ||
                    !editingAddressForm.state.trim()
                  }
                  onClick={saveAddress}
                  type="button"
                >
                  Guardar dirección
                </button>
              </div>
            ) : null}

            {accountSection === 'favorites' ? (
              <div className="account-subsection account-view-enter">
                <div className="account-empty-state">
                  <Heart size={32} aria-hidden="true" />
                  <strong>Aun no tienes favoritos</strong>
                  <p>Los restaurantes y productos que guardes apareceran aqui.</p>
                </div>
              </div>
            ) : null}

          </section>
        </div>
      ) : null}

      {logoutConfirmOpen && currentUser ? (
        <div className="account-confirm-backdrop" role="presentation" onClick={() => setLogoutConfirmOpen(false)}>
          <div
            aria-labelledby="logout-confirm-title"
            className="account-confirm-card"
            onClick={(event) => event.stopPropagation()}
            role="alertdialog"
          >
            <span className="account-confirm-icon"><LogOut size={24} aria-hidden="true" /></span>
            <h3 id="logout-confirm-title">¿Cerrar sesion?</h3>
            <p>Tendras que iniciar sesion nuevamente para acceder a tu cuenta.</p>
            <div>
              <button className="account-confirm-cancel" onClick={() => setLogoutConfirmOpen(false)} type="button">
                Cancelar
              </button>
              <button className="account-confirm-logout" onClick={logoutFromAccount} type="button">
                Cerrar sesion
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {notificationsOpen && currentUser ? (
        <div
          className={`notification-sheet-backdrop ${notificationsClosing ? 'closing' : ''}`.trim()}
          role="presentation"
          onClick={closeNotifications}
        >
          <section
            aria-labelledby="notification-sheet-title"
            className={`notification-sheet ${notificationsClosing ? 'closing' : ''}`.trim()}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="notification-sheet-heading">
              <div>
                <span>Centro de avisos</span>
                <h2 id="notification-sheet-title">Notificaciones</h2>
              </div>
              <div className="notification-sheet-actions">
                <button
                  className={!clientNotifications.length ? 'hidden-action' : ''}
                  disabled={!clientNotifications.length || notificationsClearing}
                  onClick={clearNotifications}
                  type="button"
                >
                  Limpiar
                </button>
                <button
                  aria-label="Cerrar notificaciones"
                  className="notification-sheet-close"
                  onClick={closeNotifications}
                  type="button"
                >
                  <X size={18} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className="notification-sheet-list">
              {clientNotifications.length ? (
                clientNotifications.map((notification, index) => (
                  <article
                    className={notificationsClearing ? 'clearing' : ''}
                    key={notification.id}
                    style={
                      notificationsClearing
                        ? { animationDelay: `${index * 90}ms` }
                        : undefined
                    }
                  >
                    <span>
                      <Bell size={17} aria-hidden="true" />
                    </span>
                    <div>
                      <strong>{notification.title}</strong>
                      <p>{notification.body}</p>
                    </div>
                  </article>
                ))
              ) : (
                <div className="notification-empty">
                  No tienes notificaciones pendientes.
                </div>
              )}
            </div>
          </section>
        </div>
      ) : null}

      {cartItemsCount ? (
        <button className="cart-launcher" onClick={() => setCartOpen(true)} type="button">
          <ShoppingCart size={18} aria-hidden="true" />
          <span>Ver carrito</span>
          <strong>
            <span className={`cart-launcher-count ${cartCountPulse ? 'cart-count-pulse' : ''}`.trim()}>
              {cartItemsCount}
            </span>
            <span aria-hidden="true"> | </span>
            {formatCurrency(total)}
          </strong>
          <ChevronUp size={17} aria-hidden="true" />
        </button>
      ) : null}

      {cartOpen ? (
        <div className="cart-sheet-backdrop" role="presentation" onClick={() => setCartOpen(false)}>
          <section
            aria-labelledby="cart-sheet-title"
            className="cart-sheet"
            onClick={(event) => event.stopPropagation()}
            role="dialog"
          >
            <div className="cart-sheet-hero">
              <div className="cart-title-row">
                <button aria-label="Cerrar carrito" className="cart-back-button" onClick={() => setCartOpen(false)} type="button">
                  <ArrowLeft size={28} aria-hidden="true" />
                </button>
                <div className="cart-sheet-heading">
                  <h2 id="cart-sheet-title">Mi carrito</h2>
                  <span>{cartItemsCount} productos</span>
                </div>
                {cartProducts.length ? (
                  <button className="cart-clear-button" onClick={onClearCart} type="button">
                    <Trash2 size={16} aria-hidden="true" />
                    <span>Vaciar</span>
                  </button>
                ) : null}
              </div>
            </div>

            {lastOrderId ? (
              <p className="form-success">Pedido {lastOrderId} reportado a la tienda.</p>
            ) : null}

            {cartProducts.length ? (
              <>
                <div className="cart-items-panel">
                  {cartProducts.map((item) => (
                    <article className="cart-line" key={item.productId}>
                      <SafeImage src={item.product.imageUrl} alt="" />
                      <div className="cart-line-info">
                        <strong>{item.product.name}</strong>
                        <b>{formatCurrency(item.product.price)}</b>
                      </div>
                      <div className="quantity-stepper">
                        <button
                          className={item.quantity === 1 ? 'danger-stepper-button' : ''}
                          aria-label={item.quantity === 1 ? `Eliminar ${item.product.name}` : `Restar ${item.product.name}`}
                          onClick={() =>
                            item.quantity === 1
                              ? onRemoveCartItem(item.productId)
                              : onUpdateCartItem(item.productId, item.quantity - 1)
                          }
                          type="button"
                        >
                          {item.quantity === 1 ? (
                            <Trash2 size={17} aria-hidden="true" />
                          ) : (
                            <Minus size={18} aria-hidden="true" />
                          )}
                        </button>
                        <span>{item.quantity}</span>
                        <button
                          aria-label={`Sumar ${item.product.name}`}
                          onClick={() => onUpdateCartItem(item.productId, item.quantity + 1)}
                          type="button"
                        >
                          <Plus size={18} aria-hidden="true" />
                        </button>
                      </div>
                    </article>
                  ))}
                </div>

                {checkoutOpen ? (
                  <div className="checkout-section">
                    {currentUser ? (
                    <div className="profile-card">
                      <UserRound size={20} aria-hidden="true" />
                      <div>
                        <strong>{currentUser.name}</strong>
                        <span>{selectedDeliveryLocation.address}</span>
                      </div>
                    </div>
                    ) : (
                      <>
                        <div className="login-nudge">
                          <span>Compra como invitado o inicia sesion para guardar tu direccion.</span>
                          <button onClick={onOpenLogin} type="button">
                            <LogIn size={15} aria-hidden="true" /> Entrar
                          </button>
                        </div>
                        <div className="checkout-fields">
                          <input
                            aria-label="Nombre del cliente invitado"
                            onChange={(event) => setGuestName(event.target.value)}
                            placeholder="Nombre"
                            value={guestName}
                          />
                          <input
                            aria-label="Telefono del cliente invitado"
                            onChange={(event) => setGuestPhone(event.target.value)}
                            placeholder="Telefono"
                            value={guestPhone}
                          />
                          <textarea
                            aria-label="Direccion de entrega"
                            onChange={(event) => setGuestAddress(event.target.value)}
                            placeholder="Direccion de entrega"
                            value={guestAddress}
                          />
                        </div>
                      </>
                    )}

                    <textarea
                      aria-label="Notas del pedido"
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Notas para la tienda o delivery"
                      value={notes}
                    />

                    <label className="payment-select">
                      <WalletCards aria-hidden="true" size={17} strokeWidth={2.1} />
                      <select
                        aria-label="Metodo de pago"
                        onChange={(event) => setPaymentMethod(event.target.value as PaymentMethod)}
                        value={paymentMethod}
                      >
                        <option>Pago simulado</option>
                        <option>Pago contra entrega</option>
                      </select>
                    </label>

                    {checkoutError ? <p className="form-error">{checkoutError}</p> : null}

                    <ActionButton icon={CheckCircle2} onClick={submitOrder} variant="success">
                      Reportar a tienda
                    </ActionButton>
                  </div>
                ) : (
                  <div className="cart-summary-panel">
                    <div className="totals">
                      <span>
                        Subtotal <strong>{formatCurrency(subtotal)}</strong>
                      </span>
                      <span>
                        Envio <strong>{formatCurrency(deliveryFee)}</strong>
                      </span>
                      <span className="total-line">
                        Total <strong>{formatCurrency(total)}</strong>
                      </span>
                    </div>
                    <button className="cart-continue-button" onClick={() => setCheckoutOpen(true)} type="button">
                      <span>Continuar</span>
                      <strong>{formatCurrency(total)}</strong>
                      <ChevronRight size={28} aria-hidden="true" />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <EmptyState
                body="Agrega productos desde el menu para continuar."
                title="Tu carrito esta vacio"
              />
            )}

          </section>
        </div>
      ) : null}
    </>
  );
}
