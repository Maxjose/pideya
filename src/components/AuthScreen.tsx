import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  ShieldCheck,
  Store,
  UserRound,
} from 'lucide-react';
import pideyaLogo from '../assets/pideya-logo.png';
import type { AppUser, Role } from '../types';

type AuthMode = 'login' | 'register';

interface AuthScreenProps {
  mode: AuthMode;
  onBack: () => void;
  onComplete: (user: AppUser) => void;
  onModeChange: (mode: AuthMode) => void;
}

const registerRoles: Array<{ role: 'client' | 'delivery'; label: string; icon: typeof UserRound }> = [
  { role: 'client', label: 'Cliente', icon: UserRound },
  { role: 'delivery', label: 'Delivery', icon: Bike },
];

const operatorLoginRoles: Array<{ role: Exclude<Role, 'client'>; label: string; icon: typeof UserRound }> = [
  { role: 'delivery', label: 'Delivery', icon: Bike },
  { role: 'store', label: 'Tienda', icon: Store },
  { role: 'admin', label: 'Admin', icon: ShieldCheck },
];

export function AuthScreen({ mode, onBack, onComplete, onModeChange }: AuthScreenProps) {
  const isRegister = mode === 'register';
  const [selectedRole, setSelectedRole] = useState<'client' | 'delivery'>('client');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [closing, setClosing] = useState(false);

  const title = isRegister ? 'Crea tu cuenta' : 'Bienvenido de nuevo';
  const subtitle = isRegister
    ? 'Regístrate para pedir o trabajar como delivery.'
    : 'Inicia sesión para continuar en PideYa.';

  const selectedRoleLabel = useMemo(
    () => registerRoles.find(({ role }) => role === selectedRole)?.label ?? 'Cliente',
    [selectedRole],
  );

  useEffect(() => {
    setClosing(false);
  }, [mode]);

  const closeScreen = () => {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onBack, 280);
  };

  const changeMode = (nextMode: AuthMode) => {
    if (closing || nextMode === mode) return;
    setClosing(true);
    window.setTimeout(() => onModeChange(nextMode), 220);
  };

  const submitAuth = (roleOverride?: Role) => {
    const authRole: Role = roleOverride ?? selectedRole;
    const fallbackNames: Record<Role, string> = {
      client: 'Ana Perez',
      delivery: 'Mario Campos',
      store: 'Carla Medina',
      admin: 'Jose Admin',
    };

    setClosing(true);
    window.setTimeout(() => {
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
    }, 280);
  };

  return (
    <section
      className={`auth-screen ${closing ? 'closing' : ''}`.trim()}
      aria-labelledby="auth-screen-title"
    >
      <header className="auth-screen-topbar">
        <button aria-label="Volver" className="auth-screen-back" onClick={closeScreen} type="button">
          <ArrowLeft size={24} aria-hidden="true" />
        </button>
        <div className="auth-screen-mini-brand">
          <img src={pideyaLogo} alt="" />
          <strong>PideYa</strong>
        </div>
        <span aria-hidden="true" />
      </header>

      <div className="auth-screen-content">
        <div className="auth-screen-heading">
          <div className="auth-screen-logo">
            <img src={pideyaLogo} alt="PideYa" />
          </div>
          <h1 id="auth-screen-title">{title}</h1>
          <p>{subtitle}</p>
        </div>

        <div className="auth-screen-form">
          {isRegister ? (
            <>
              <div className="auth-screen-role-picker" role="group" aria-label="Tipo de cuenta">
                {registerRoles.map(({ role, label, icon: Icon }) => (
                  <button
                    className={selectedRole === role ? 'active' : ''}
                    key={role}
                    onClick={() => setSelectedRole(role)}
                    type="button"
                  >
                    <Icon size={19} aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                ))}
              </div>

              <label className="auth-screen-input">
                <UserRound size={19} aria-hidden="true" />
                <input
                  aria-label="Nombre completo"
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Nombre completo"
                  value={name}
                />
              </label>
            </>
          ) : null}

          <label className="auth-screen-input">
            <Mail size={19} aria-hidden="true" />
            <input
              aria-label="Correo electrónico"
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Correo electrónico"
              type="email"
              value={email}
            />
          </label>

          {isRegister ? (
            <label className="auth-screen-input">
              <Phone size={19} aria-hidden="true" />
              <input
                aria-label="Teléfono"
                onChange={(event) => setPhone(event.target.value)}
                placeholder="Teléfono"
                value={phone}
              />
            </label>
          ) : null}

          <label className="auth-screen-input">
            <LockKeyhole size={19} aria-hidden="true" />
            <input
              aria-label="Contraseña"
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Contraseña"
              type="password"
              value={password}
            />
          </label>

          <button className="auth-screen-primary" onClick={() => submitAuth()} type="button">
            <LockKeyhole size={19} aria-hidden="true" />
            <span>{isRegister ? `Registrarme como ${selectedRoleLabel.toLowerCase()}` : 'Iniciar sesión'}</span>
          </button>

          {!isRegister ? (
            <>
              <div className="auth-screen-divider">
                <span>o</span>
              </div>
              <button className="auth-screen-google" type="button">
                <span className="google-mark" aria-hidden="true">G</span>
                <span>Continuar con Google</span>
              </button>
            </>
          ) : null}
        </div>

        {isRegister ? (
          <section className="merchant-registration-card" aria-label="Registro de comercios">
            <div className="merchant-registration-icon">
              <Store size={22} aria-hidden="true" />
            </div>
            <div>
              <strong>¿Quieres registrar tu comercio?</strong>
              <p>
                Las tiendas se registran directamente con administración para validar los datos del negocio.
              </p>
            </div>
            <a
              className="merchant-whatsapp-button"
              href="https://wa.me/584126655273?text=Hola%2C%20quisiera%20registrar%20mi%20comercio%20en%20PideYa.%20Me%20gustar%C3%ADa%20recibir%20informaci%C3%B3n%20sobre%20el%20proceso%20de%20registro%20y%20los%20requisitos."
              rel="noreferrer"
              target="_blank"
            >
              <MessageCircle size={18} aria-hidden="true" />
              <span>Contactar administración por WhatsApp</span>
            </a>
            <small>Te abriremos un chat con un mensaje preparado para solicitar el registro de tu comercio.</small>
          </section>
        ) : (
          <section className="auth-operator-access">
            <span>Accesos operativos</span>
            <div>
              {operatorLoginRoles.map(({ role, label, icon: Icon }) => (
                <button key={role} onClick={() => submitAuth(role)} type="button">
                  <Icon size={18} aria-hidden="true" />
                  <span>Entrar como {label}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <p className="auth-screen-switch">
          {isRegister ? '¿Ya tienes una cuenta?' : '¿Aún no tienes una cuenta?'}
          <button onClick={() => changeMode(isRegister ? 'login' : 'register')} type="button">
            {isRegister ? 'Iniciar sesión' : 'Registrarse'}
          </button>
        </p>
      </div>
    </section>
  );
}
