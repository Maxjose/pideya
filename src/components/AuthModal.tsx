import { useMemo, useState } from 'react';
import { Bike, LockKeyhole, Mail, ShieldCheck, Store, UserRound, X } from 'lucide-react';
import type { AppUser, Role } from '../types';
import { ActionButton } from './Shared';

type AuthMode = 'login' | 'register';

interface AuthModalProps {
  mode: AuthMode;
  onClose: () => void;
  onComplete: (user: AppUser) => void;
}

const registerRoles: Array<{ role: Exclude<Role, 'admin'>; label: string; icon: typeof UserRound }> = [
  { role: 'client', label: 'Cliente', icon: UserRound },
  { role: 'delivery', label: 'Delivery', icon: Bike },
  { role: 'store', label: 'Tienda', icon: Store },
];

const loginRoles: Array<{ role: Role; label: string; icon: typeof UserRound }> = [
  ...registerRoles,
  { role: 'admin', label: 'Admin', icon: ShieldCheck },
];

const operatorLoginRoles = loginRoles.filter(({ role }) => role !== 'client');

export function AuthModal({ mode, onClose, onComplete }: AuthModalProps) {
  const isRegister = mode === 'register';
  const [selectedRole, setSelectedRole] = useState<Role>('client');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [storeName, setStoreName] = useState('');
  const [closing, setClosing] = useState(false);

  const title = isRegister ? 'Crear cuenta' : 'Iniciar sesion';
  const roles = useMemo(() => (isRegister ? registerRoles : loginRoles), [isRegister]);

  const closeModal = () => {
    if (closing) {
      return;
    }

    setClosing(true);
    window.setTimeout(onClose, 220);
  };

  const submitAuth = (roleOverride?: Role) => {
    const authRole = roleOverride ?? selectedRole;
    const fallbackNames: Record<Role, string> = {
      client: 'Ana Perez',
      delivery: 'Mario Campos',
      store: storeName || 'Carla Medina',
      admin: 'Jose Admin',
    };

    onComplete({
      id: `auth-${authRole}-${Date.now()}`,
      name: name.trim() || fallbackNames[authRole],
      phone: phone.trim() || '+58 412-555-0000',
      role: authRole,
      savedAddresses:
        authRole === 'client'
          ? ['Residencias Turia, Torre B', 'Oficina Torre Platinum, piso 4']
          : undefined,
    });
  };

  return (
    <div
      className={`modal-backdrop auth-modal-backdrop ${closing ? 'closing' : ''}`.trim()}
      onClick={closeModal}
      role="presentation"
    >
      <section
        aria-labelledby="auth-title"
        className={`auth-modal ${closing ? 'closing' : ''}`.trim()}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="modal-heading auth-modal-heading">
          <div>
            <span className="zone-label">
              <LockKeyhole size={15} aria-hidden="true" /> Acceso PideYa
            </span>
            <h2 id="auth-title">{title}</h2>
            {!isRegister ? <p>Entra como cliente con tu correo y contrasena.</p> : null}
          </div>
          <button aria-label="Cerrar" className="icon-button" onClick={closeModal} type="button">
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="auth-fields">
          {isRegister ? (
            <input
              aria-label="Nombre completo"
              onChange={(event) => setName(event.target.value)}
              placeholder={selectedRole === 'store' ? 'Nombre del encargado' : 'Nombre completo'}
              value={name}
            />
          ) : null}
          {isRegister && selectedRole === 'store' ? (
            <div className="auth-field-reveal">
              <input
                aria-label="Nombre de la tienda"
                onChange={(event) => setStoreName(event.target.value)}
                placeholder="Nombre de la tienda"
                value={storeName}
              />
            </div>
          ) : null}
          <label className="auth-input">
            <Mail size={18} aria-hidden="true" />
            <input
              aria-label="Correo electronico"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Correo electronico"
              type="email"
              value={email}
            />
          </label>
          {isRegister ? (
            <input
              aria-label="Telefono"
              onChange={(event) => setPhone(event.target.value)}
              placeholder="Telefono"
              value={phone}
            />
          ) : null}
          <label className="auth-input">
            <LockKeyhole size={18} aria-hidden="true" />
            <input
              aria-label="Contrasena"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contrasena"
              type="password"
              value={password}
            />
          </label>
        </div>

        {isRegister ? (
          <p className="auth-note">
            El registro es simulado; al continuar entraras a la interfaz del rol seleccionado.
          </p>
        ) : null}

        <ActionButton icon={LockKeyhole} onClick={() => submitAuth()} variant="primary">
          {isRegister ? 'Registrarme' : 'Entrar'}
        </ActionButton>

        {isRegister ? (
          <div className="operator-login-panel register-role-panel" role="group" aria-label="Tipo de usuario">
            <span>Tipo de cuenta</span>
            <div>
              {roles.map(({ role, label, icon: Icon }) => (
                <button
                  className={selectedRole === role ? 'active' : ''}
                  key={role}
                  onClick={() => setSelectedRole(role)}
                  type="button"
                >
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {!isRegister ? (
          <div className="operator-login-panel">
            <span>Accesos operativos</span>
            <div>
              {operatorLoginRoles.map(({ role, label, icon: Icon }) => (
                <button key={role} onClick={() => submitAuth(role)} type="button">
                  <Icon size={16} aria-hidden="true" />
                  <span>{label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
