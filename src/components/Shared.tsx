import type { ButtonHTMLAttributes, ImgHTMLAttributes, ReactNode, SyntheticEvent } from 'react';
import type { LucideIcon } from 'lucide-react';
import { statusLabels, statusTone } from '../utils/format';
import type { OrderStatus } from '../types';

interface ActionButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: LucideIcon;
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
}

export function ActionButton({
  children,
  className = '',
  icon: Icon,
  variant = 'secondary',
  type = 'button',
  ...props
}: ActionButtonProps) {
  return (
    <button className={`action-button ${variant} ${className}`.trim()} type={type} {...props}>
      {Icon ? <Icon aria-hidden="true" size={17} strokeWidth={2.2} /> : null}
      <span>{children}</span>
    </button>
  );
}

interface MetricCardProps {
  label: string;
  value: string;
  detail: string;
  icon: LucideIcon;
  tone?: 'blue' | 'green' | 'amber' | 'coral' | 'ink';
}

export function MetricCard({ label, value, detail, icon: Icon, tone = 'blue' }: MetricCardProps) {
  return (
    <article className={`metric-card metric-${tone}`}>
      <div className="metric-icon">
        <Icon aria-hidden="true" size={20} strokeWidth={2.1} />
      </div>
      <div>
        <p>{label}</p>
        <strong>{value}</strong>
        <span>{detail}</span>
      </div>
    </article>
  );
}

export function StatusPill({ status }: { status: OrderStatus }) {
  return <span className={`status-pill ${statusTone[status]}`}>{statusLabels[status]}</span>;
}

export function Panel({
  children,
  className = '',
  id,
  title,
  action,
}: {
  children: ReactNode;
  className?: string;
  id?: string;
  title?: string;
  action?: ReactNode;
}) {
  return (
    <section className={`panel ${className}`.trim()} id={id}>
      {title || action ? (
        <div className="panel-heading">
          {title ? <h2>{title}</h2> : <span />}
          {action}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

const fallbackImage = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 420">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="#e8f1ff"/>
      <stop offset="0.55" stop-color="#f9fbff"/>
      <stop offset="1" stop-color="#dff7ec"/>
    </linearGradient>
  </defs>
  <rect width="640" height="420" fill="url(#bg)"/>
  <circle cx="485" cy="78" r="72" fill="#1268f3" opacity="0.16"/>
  <circle cx="104" cy="338" r="86" fill="#16815d" opacity="0.14"/>
  <rect x="196" y="132" width="248" height="156" rx="32" fill="#ffffff" opacity="0.86"/>
  <path d="M255 249V171h78c39 0 62 21 62 53s-24 55-64 55h-28v-30h28c18 0 29-9 29-24 0-14-11-23-29-23h-41v47h-35z" fill="#1268f3"/>
  <text x="320" y="323" text-anchor="middle" font-family="Arial, sans-serif" font-size="32" font-weight="700" fill="#0b3f9c">PideYa</text>
</svg>
`)}`;

export function SafeImage({ alt = '', onError, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const handleError = (event: SyntheticEvent<HTMLImageElement>) => {
    event.currentTarget.onerror = null;
    event.currentTarget.src = fallbackImage;
    onError?.(event);
  };

  return <img alt={alt} decoding="async" onError={handleError} {...props} />;
}
