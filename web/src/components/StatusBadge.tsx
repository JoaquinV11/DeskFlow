type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'CLOSED' | 'CANCELLED';

const STATUS_LABELS: Record<TicketStatus, string> = {
  OPEN: 'Abierto',
  IN_PROGRESS: 'En progreso',
  WAITING_USER: 'Esperando al usuario',
  CLOSED: 'Cerrado',
  CANCELLED: 'Cancelado',
};

const STATUS_STYLES: Record<TicketStatus, string> = {
  OPEN: 'border-blue-300 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-950/40 dark:text-blue-300',
  IN_PROGRESS:
    'border-amber-300 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-300',
  WAITING_USER:
    'border-violet-300 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-950/40 dark:text-violet-300',
  CLOSED:
    'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300',
  CANCELLED:
    'border-zinc-300 bg-zinc-50 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
};

export default function StatusBadge({ status }: { status: TicketStatus }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium ${STATUS_STYLES[status]}`}
      title={status}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
