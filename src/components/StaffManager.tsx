import { useEffect, useState } from 'react';
import { Ban, CheckCircle2, Loader2, Pencil, Trash2, UserPlus, X } from 'lucide-react';
import * as api from '../lib/api';
import { ActionButton, InitialAvatar } from './Shared';
import type { StaffPermission, StoreStaffMember } from '../types';

export const staffPermissionCatalog: Record<StaffPermission, { label: string; detail: string }> = {
  orders: { label: 'Pedidos', detail: 'Ver, confirmar, rechazar y preparar pedidos; abrir o cerrar la tienda.' },
  inventory: { label: 'Inventario', detail: 'Crear y editar productos, precios, stock y disponibilidad.' },
  payments: { label: 'Pagos', detail: 'Ver ventas, movimientos y lo que se ha cobrado.' },
  settings: { label: 'Configuración', detail: 'Métodos de pago, horario, ubicación y ajustes de la tienda.' },
};
const allPermissions = Object.keys(staffPermissionCatalog) as StaffPermission[];

interface Form {
  userId?: string;
  name: string;
  phone: string;
  email: string;
  password: string;
  permissions: StaffPermission[];
}
const emptyForm: Form = { name: '', phone: '', email: '', password: '', permissions: ['orders'] };

export function StaffManager({ storeId }: { storeId: string }) {
  const [staff, setStaff] = useState<StoreStaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [confirm, setConfirm] = useState<{ text: string; run: () => Promise<void> } | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const flash = (kind: 'ok' | 'error', text: string) => {
    setMessage({ kind, text });
    window.setTimeout(() => setMessage(null), 4000);
  };

  const load = async () => {
    try {
      setStaff(await api.fetchStoreStaff(storeId));
    } catch (error) {
      flash('error', error instanceof Error ? error.message : 'No se pudo cargar el equipo.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const run = async (body: Record<string, unknown>, success: string) => {
    setBusy(true);
    try {
      await api.storeStaffAction({ storeId, ...body });
      await load();
      flash('ok', success);
      return true;
    } catch (error) {
      flash('error', error instanceof Error ? error.message : 'No se pudo completar.');
      return false;
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (!form) return;
    if (!form.name.trim()) return flash('error', 'Escribe el nombre del empleado.');
    if (!form.permissions.length) return flash('error', 'Elige al menos una función.');
    if (!form.userId && (!form.email.trim() || form.password.length < 6)) {
      return flash('error', 'Correo y contraseña (mínimo 6 caracteres) son obligatorios.');
    }
    const ok = form.userId
      ? await run(
          { action: 'update', userId: form.userId, name: form.name, phone: form.phone, permissions: form.permissions, password: form.password || undefined },
          'Empleado actualizado.',
        )
      : await run(
          { action: 'create', name: form.name, phone: form.phone, email: form.email, password: form.password, permissions: form.permissions },
          'Empleado creado. Ya puede iniciar sesión con su correo y contraseña.',
        );
    if (ok) setForm(null);
  };

  const togglePermission = (permission: StaffPermission) => {
    if (!form) return;
    const has = form.permissions.includes(permission);
    setForm({ ...form, permissions: has ? form.permissions.filter((p) => p !== permission) : [...form.permissions, permission] });
  };

  return (
    <div className="staff-manager">
      <div className="staff-head">
        <p>Crea cuentas para tu equipo y elige qué puede hacer cada uno. Solo tú puedes gestionar empleados.</p>
        <ActionButton icon={UserPlus} onClick={() => setForm({ ...emptyForm })} variant="primary">
          Nuevo empleado
        </ActionButton>
      </div>

      {message ? <p className={`pm-message ${message.kind}`}>{message.text}</p> : null}

      {loading ? (
        <div className="pm-loading"><Loader2 className="spin" size={20} aria-hidden="true" /> Cargando equipo...</div>
      ) : staff.length ? (
        <div className="staff-list">
          {staff.map((member) => (
            <article className={`staff-card ${member.active ? '' : 'inactive'}`} key={member.userId}>
              <InitialAvatar className="staff-avatar" name={member.name || member.email} seed={member.userId} />
              <div className="staff-info">
                <strong>{member.name || 'Sin nombre'}</strong>
                <small>{member.email}</small>
                <div className="staff-perms">
                  {member.permissions.map((permission) => (
                    <span key={permission}>{staffPermissionCatalog[permission]?.label ?? permission}</span>
                  ))}
                  {!member.active ? <span className="off">Desactivado</span> : null}
                </div>
              </div>
              <div className="staff-actions">
                <button
                  className="adm-icon-button"
                  onClick={() => setForm({ userId: member.userId, name: member.name, phone: '', email: member.email, password: '', permissions: member.permissions })}
                  title="Editar"
                  type="button"
                >
                  <Pencil size={16} aria-hidden="true" />
                </button>
                <button
                  className="adm-icon-button"
                  onClick={() =>
                    setConfirm({
                      text: member.active ? `¿Desactivar a ${member.name}? No podrá iniciar sesión.` : `¿Reactivar a ${member.name}?`,
                      run: async () => { await run({ action: 'set_active', userId: member.userId, active: !member.active }, member.active ? 'Empleado desactivado.' : 'Empleado activado.'); },
                    })
                  }
                  title={member.active ? 'Desactivar' : 'Activar'}
                  type="button"
                >
                  {member.active ? <Ban size={16} aria-hidden="true" /> : <CheckCircle2 size={16} aria-hidden="true" />}
                </button>
                <button
                  className="adm-icon-button danger"
                  onClick={() =>
                    setConfirm({
                      text: `¿Eliminar la cuenta de ${member.name}? Esta acción no se puede deshacer.`,
                      run: async () => { await run({ action: 'delete', userId: member.userId }, 'Empleado eliminado.'); },
                    })
                  }
                  title="Eliminar"
                  type="button"
                >
                  <Trash2 size={16} aria-hidden="true" />
                </button>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <p className="pm-empty">Aún no tienes empleados. Crea el primero con "Nuevo empleado".</p>
      )}

      {form ? (
        <div className="adm-modal-backdrop" role="presentation" onClick={() => setForm(null)}>
          <section className="adm-modal" role="dialog" aria-label="Empleado" onClick={(event) => event.stopPropagation()}>
            <header>
              <h2>{form.userId ? 'Editar empleado' : 'Nuevo empleado'}</h2>
              <button aria-label="Cerrar" className="adm-icon-button" onClick={() => setForm(null)} type="button">
                <X size={18} aria-hidden="true" />
              </button>
            </header>
            <div className="adm-modal-body">
              <div className="adm-form-grid">
                <label className="adm-field"><span>Nombre completo</span><input onChange={(e) => setForm({ ...form, name: e.target.value })} value={form.name} /></label>
                <label className="adm-field"><span>Teléfono</span><input onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder={form.userId ? 'Sin cambios' : ''} value={form.phone} /></label>
                <label className="adm-field">
                  <span>Correo electrónico</span>
                  <input disabled={Boolean(form.userId)} onChange={(e) => setForm({ ...form, email: e.target.value })} type="email" value={form.email} />
                </label>
                <label className="adm-field">
                  <span>{form.userId ? 'Nueva contraseña (opcional)' : 'Contraseña'}</span>
                  <input autoComplete="new-password" onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder={form.userId ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'} value={form.password} />
                </label>
                <div className="adm-field wide">
                  <span>Funciones que puede realizar</span>
                  <div className="staff-perm-options">
                    {allPermissions.map((permission) => (
                      <label className={form.permissions.includes(permission) ? 'on' : ''} key={permission}>
                        <input checked={form.permissions.includes(permission)} onChange={() => togglePermission(permission)} type="checkbox" />
                        <div>
                          <strong>{staffPermissionCatalog[permission].label}</strong>
                          <small>{staffPermissionCatalog[permission].detail}</small>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <footer>
              <ActionButton onClick={() => setForm(null)} variant="ghost">Cancelar</ActionButton>
              <ActionButton disabled={busy} icon={CheckCircle2} onClick={() => void submit()} variant="primary">
                {busy ? 'Guardando...' : form.userId ? 'Guardar cambios' : 'Crear empleado'}
              </ActionButton>
            </footer>
          </section>
        </div>
      ) : null}

      {confirm ? (
        <div className="adm-modal-backdrop" role="presentation" onClick={() => setConfirm(null)}>
          <section className="adm-modal" role="dialog" aria-label="Confirmar" onClick={(event) => event.stopPropagation()}>
            <header><h2>Confirmar acción</h2></header>
            <div className="adm-modal-body"><p className="adm-confirm-text">{confirm.text}</p></div>
            <footer>
              <ActionButton onClick={() => setConfirm(null)} variant="ghost">Volver</ActionButton>
              <ActionButton
                disabled={busy}
                onClick={() => {
                  const action = confirm.run;
                  setConfirm(null);
                  void action();
                }}
                variant="danger"
              >
                Confirmar
              </ActionButton>
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}
