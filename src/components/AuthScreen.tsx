import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bike,
  Loader2,
  LockKeyhole,
  Mail,
  MessageCircle,
  Phone,
  Store,
  UserRound,
} from 'lucide-react';
import pideyaLogo from '../assets/pideya-logo.png';
import { fetchProfile } from '../lib/api';
import { supabase } from '../lib/supabase';
import type { AppUser } from '../types';

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

export function AuthScreen({ mode, onBack, onComplete, onModeChange }: AuthScreenProps) {
  const isRegister = mode === 'register';
  const [selectedRole, setSelectedRole] = useState<'client' | 'delivery'>('client');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [closing, setClosing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

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
    setError('');
    setInfo('');
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

  const translateError = (message: string) => {
    if (/invalid login/i.test(message)) return 'Correo o contraseña incorrectos.';
    if (/already registered/i.test(message)) return 'Ya existe una cuenta con este correo.';
    if (/password should be/i.test(message)) return 'La contraseña debe tener al menos 6 caracteres.';
    if (/email not confirmed/i.test(message)) return 'Confirma tu correo antes de iniciar sesión.';
    if (/valid email|invalid format/i.test(message)) return 'Escribe un correo válido.';
    return message;
  };

  const finish = (user: AppUser) => {
    setClosing(true);
    window.setTimeout(() => onComplete(user), 280);
  };

  const submitAuth = async () => {
    if (busy) return;
    setError('');
    setInfo('');

    if (!email.trim() || !password) {
      setError('Escribe tu correo y contraseña.');
      return;
    }
    if (isRegister && (!name.trim() || !phone.trim())) {
      setError('Completa tu nombre y teléfono.');
      return;
    }

    setBusy(true);
    try {
      if (isRegister) {
        const { data, error: signUpError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { name: name.trim(), phone: phone.trim(), role: selectedRole } },
        });
        if (signUpError) throw signUpError;
        if (!data.session) {
          setInfo('Te enviamos un correo para confirmar tu cuenta. Luego inicia sesión.');
          return;
        }
        const profile = await fetchProfile(data.session.user.id);
        if (profile) finish(profile);
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });
        if (signInError) throw signInError;
        const profile = await fetchProfile(data.user.id);
        if (!profile) throw new Error('No encontramos el perfil de esta cuenta.');
        finish(profile);
      }
    } catch (caught) {
      setError(translateError(caught instanceof Error ? caught.message : 'No se pudo completar.'));
    } finally {
      setBusy(false);
    }
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

          {error ? <p className="auth-screen-error" role="alert">{error}</p> : null}
          {info ? <p className="auth-screen-info" role="status">{info}</p> : null}

          <button className="auth-screen-primary" disabled={busy} onClick={() => void submitAuth()} type="button">
            {busy ? <Loader2 className="spin" size={19} aria-hidden="true" /> : <LockKeyhole size={19} aria-hidden="true" />}
            <span>{isRegister ? `Registrarme como ${selectedRoleLabel.toLowerCase()}` : 'Iniciar sesión'}</span>
          </button>

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
        ) : null}

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
