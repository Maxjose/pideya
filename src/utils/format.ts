import type { OrderStatus } from '../types';

export const formatCurrency = (value: number) =>
  new Intl.NumberFormat('es-VE', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(value);

export const formatTime = (value: string) =>
  new Intl.DateTimeFormat('es-VE', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));

export const statusLabels: Record<OrderStatus, string> = {
  pending: 'Nuevo',
  accepted: 'Aceptado',
  preparing: 'Preparando',
  ready: 'Listo',
  assigned: 'Asignado',
  picked_up: 'Retirado',
  in_transit: 'En camino',
  delivered: 'Entregado',
  cancelled: 'Cancelado',
};

export const statusTone: Record<OrderStatus, string> = {
  pending: 'tone-new',
  accepted: 'tone-info',
  preparing: 'tone-warning',
  ready: 'tone-ready',
  assigned: 'tone-info',
  picked_up: 'tone-info',
  in_transit: 'tone-progress',
  delivered: 'tone-success',
  cancelled: 'tone-danger',
};
