import { useEffect, useState } from 'react';
import { Banknote, CheckCircle2, Coins, Loader2, Smartphone, Trash2 } from 'lucide-react';
import * as api from '../lib/api';
import { ActionButton } from './Shared';
import type { PaymentMethodType, StorePaymentMethod } from '../types';

interface FieldDef {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
  textarea?: boolean;
}

export const paymentMethodCatalog: Record<
  PaymentMethodType,
  { label: string; description: string; icon: typeof Smartphone; fields: FieldDef[] }
> = {
  pago_movil: {
    label: 'Pago móvil',
    description: 'El cliente transfiere desde su banco a tu número.',
    icon: Smartphone,
    fields: [
      { key: 'bank', label: 'Banco', placeholder: 'Ej. Banesco (0134)', required: true },
      { key: 'phone', label: 'Teléfono', placeholder: '0412-0000000', required: true },
      { key: 'document', label: 'Cédula o RIF', placeholder: 'V-12345678', required: true },
      { key: 'holder', label: 'Titular', placeholder: 'Nombre del titular' },
    ],
  },
  binance: {
    label: 'Binance',
    description: 'Pagos en USDT por Binance Pay.',
    icon: Coins,
    fields: [
      { key: 'payId', label: 'Binance Pay ID', placeholder: '123456789', required: true },
      { key: 'email', label: 'Correo de Binance', placeholder: 'correo@ejemplo.com' },
      { key: 'holder', label: 'Titular', placeholder: 'Nombre del titular' },
    ],
  },
  efectivo: {
    label: 'Efectivo',
    description: 'El cliente paga al recibir el pedido.',
    icon: Banknote,
    fields: [
      { key: 'currency', label: 'Monedas aceptadas', placeholder: 'Dólares, bolívares' },
      { key: 'notes', label: 'Indicaciones', placeholder: 'Ej. Tener billetes pequeños; damos vuelto', textarea: true },
    ],
  },
};

const methodTypes = Object.keys(paymentMethodCatalog) as PaymentMethodType[];

interface Props {
  storeId: string;
  readOnly?: boolean;
  compact?: boolean;
}

export function PaymentMethodsEditor({ storeId, readOnly = false, compact = false }: Props) {
  const [methods, setMethods] = useState<Record<string, StorePaymentMethod>>({});
  const [drafts, setDrafts] = useState<Record<string, StorePaymentMethod>>({});
  const [loading, setLoading] = useState(true);
  const [savingType, setSavingType] = useState<PaymentMethodType | null>(null);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await api.fetchStorePaymentMethods(storeId);
      const map = Object.fromEntries(list.map((method) => [method.type, method]));
      setMethods(map);
      setDrafts({});
    } catch (error) {
      setMessage({ kind: 'error', text: error instanceof Error ? error.message : 'No se pudieron cargar los métodos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storeId]);

  const current = (type: PaymentMethodType): StorePaymentMethod =>
    drafts[type] ?? methods[type] ?? { storeId, type, enabled: false, details: {} };

  const setDraft = (type: PaymentMethodType, patch: Partial<StorePaymentMethod>) =>
    setDrafts((all) => ({ ...all, [type]: { ...current(type), ...patch } }));

  const flash = (kind: 'ok' | 'error', text: string) => {
    setMessage({ kind, text });
    window.setTimeout(() => setMessage(null), 3500);
  };

  const save = async (type: PaymentMethodType) => {
    const method = current(type);
    const missing = paymentMethodCatalog[type].fields.find((field) => field.required && !method.details[field.key]?.trim());
    if (method.enabled && missing) {
      flash('error', `Completa el campo "${missing.label}" de ${paymentMethodCatalog[type].label}.`);
      return;
    }
    setSavingType(type);
    try {
      await api.saveStorePaymentMethod(method);
      await load();
      flash('ok', `${paymentMethodCatalog[type].label} guardado.`);
    } catch (error) {
      flash('error', error instanceof Error ? error.message : 'No se pudo guardar.');
    } finally {
      setSavingType(null);
    }
  };

  const remove = async (type: PaymentMethodType) => {
    setSavingType(type);
    try {
      await api.deleteStorePaymentMethod(storeId, type);
      await load();
      flash('ok', `${paymentMethodCatalog[type].label} eliminado.`);
    } catch (error) {
      flash('error', error instanceof Error ? error.message : 'No se pudo eliminar.');
    } finally {
      setSavingType(null);
    }
  };

  if (loading) {
    return (
      <div className="pm-loading">
        <Loader2 className="spin" size={20} aria-hidden="true" /> Cargando métodos de pago...
      </div>
    );
  }

  const visibleTypes = readOnly ? methodTypes.filter((type) => methods[type]) : methodTypes;

  return (
    <div className={`pm-list ${compact ? 'compact' : ''}`.trim()}>
      {message ? <p className={`pm-message ${message.kind}`}>{message.text}</p> : null}
      {readOnly && !visibleTypes.length ? (
        <p className="pm-empty">Este negocio aún no ha registrado métodos de pago.</p>
      ) : null}
      {visibleTypes.map((type) => {
        const def = paymentMethodCatalog[type];
        const Icon = def.icon;
        const method = current(type);
        const saved = methods[type];
        const dirty = Boolean(drafts[type]);
        return (
          <article className={`pm-card ${method.enabled ? 'on' : ''}`} key={type}>
            <header>
              <span className="pm-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <div>
                <strong>{def.label}</strong>
                <small>{def.description}</small>
              </div>
              {readOnly ? (
                <span className={`pm-state ${method.enabled ? 'on' : 'off'}`}>{method.enabled ? 'Activo' : 'Inactivo'}</span>
              ) : (
                <button
                  aria-label={`${method.enabled ? 'Desactivar' : 'Activar'} ${def.label}`}
                  aria-pressed={method.enabled}
                  className={`pm-toggle ${method.enabled ? 'on' : ''}`}
                  onClick={() => setDraft(type, { enabled: !method.enabled })}
                  type="button"
                >
                  <span />
                </button>
              )}
            </header>

            {readOnly ? (
              <dl className="pm-details">
                {def.fields.map((field) => (
                  <div key={field.key}>
                    <dt>{field.label}</dt>
                    <dd>{method.details[field.key]?.trim() || '—'}</dd>
                  </div>
                ))}
              </dl>
            ) : method.enabled || saved ? (
              <>
                <div className="pm-fields">
                  {def.fields.map((field) => (
                    <label className={field.textarea ? 'wide' : ''} key={field.key}>
                      <span>
                        {field.label}
                        {field.required ? ' *' : ''}
                      </span>
                      {field.textarea ? (
                        <textarea
                          onChange={(event) => setDraft(type, { details: { ...method.details, [field.key]: event.target.value } })}
                          placeholder={field.placeholder}
                          rows={2}
                          value={method.details[field.key] ?? ''}
                        />
                      ) : (
                        <input
                          onChange={(event) => setDraft(type, { details: { ...method.details, [field.key]: event.target.value } })}
                          placeholder={field.placeholder}
                          value={method.details[field.key] ?? ''}
                        />
                      )}
                    </label>
                  ))}
                </div>
                <div className="pm-actions">
                  {saved ? (
                    <ActionButton disabled={savingType === type} icon={Trash2} onClick={() => void remove(type)} variant="ghost">
                      Eliminar
                    </ActionButton>
                  ) : null}
                  <ActionButton
                    disabled={!dirty || savingType === type}
                    icon={CheckCircle2}
                    onClick={() => void save(type)}
                    variant="primary"
                  >
                    {savingType === type ? 'Guardando...' : 'Guardar'}
                  </ActionButton>
                </div>
              </>
            ) : null}
          </article>
        );
      })}
    </div>
  );
}
