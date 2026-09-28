import {
  BarChart3,
  Bike,
  ClipboardList,
  Heart,
  Home,
  MapPin,
  PackageCheck,
  Settings,
  ShoppingBag,
  Store,
  UserRound,
  X,
} from 'lucide-react';
import type { AppUser, Role } from '../types';

interface RoleDrawerProps {
  isOpen: boolean;
  user: AppUser | null;
  activeRole: Role;
  onClose: () => void;
  onNavigate: (role: Role) => void;
  onLogout: () => void;
}

const roleMenus = {
  client: [
    { label: 'Inicio', icon: Home },
    { label: 'Mi carrito', icon: ShoppingBag },
    { label: 'Historial', icon: ClipboardList },
    { label: 'Direcciones', icon: MapPin },
    { label: 'Favoritos', icon: Heart },
  ],
  store: [
    { label: 'Pedidos', icon: ClipboardList },
    { label: 'Productos', icon: ShoppingBag },
    { label: 'Tienda', icon: Store },
    { label: 'Horarios', icon: Settings },
  ],
  delivery: [
    { label: 'Pedidos disponibles', icon: PackageCheck },
    { label: 'Mis rutas', icon: Bike },
    { label: 'Ganancias', icon: BarChart3 },
    { label: 'Perfil', icon: UserRound },
  ],
  admin: [
    { label: 'Dashboard', icon: BarChart3 },
    { label: 'Pedidos activos', icon: ClipboardList },
    { label: 'Tiendas', icon: Store },
    { label: 'Delivery', icon: Bike },
    { label: 'Usuarios', icon: UserRound },
  ],
};

export function RoleDrawer({
  isOpen,
  user,
  activeRole,
  onClose,
  onNavigate,
  onLogout,
}: RoleDrawerProps) {
  if (!isOpen) {
    return null;
  }

  const menuItems = roleMenus[activeRole];

  return (
    <div className="drawer-backdrop" role="presentation" onClick={onClose}>
      <aside className="role-drawer" onClick={(event) => event.stopPropagation()}>
        <div className="drawer-heading">
          <div>
            <span>{user?.role ?? activeRole}</span>
            <strong>{user?.name ?? 'Invitado'}</strong>
          </div>
          <button aria-label="Cerrar menu" className="icon-button" onClick={onClose} type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <nav className="drawer-menu" aria-label="Menu de secciones">
          {menuItems.map(({ label, icon: Icon }) => (
            <button key={label} onClick={onClose} type="button">
              <Icon size={17} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        {user?.role === 'admin' ? (
          <div className="drawer-role-switch">
            <span>Cambiar vista</span>
            <button onClick={() => onNavigate('admin')} type="button">Admin</button>
            <button onClick={() => onNavigate('delivery')} type="button">Delivery</button>
            <button onClick={() => onNavigate('store')} type="button">Tienda</button>
          </div>
        ) : null}

        <button className="drawer-logout" onClick={onLogout} type="button">
          Cerrar sesion
        </button>
      </aside>
    </div>
  );
}
