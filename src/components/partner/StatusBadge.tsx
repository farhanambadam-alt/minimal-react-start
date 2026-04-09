import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  confirmed: 'bg-success/15 text-success',
  pending: 'bg-accent/15 text-accent',
  cancelled: 'bg-muted text-muted-foreground',
  completed: 'bg-primary/10 text-primary',
  'in-progress': 'bg-destructive/10 text-destructive',
};

const StatusBadge = ({ status }: { status: string }) => (
  <span className={cn('text-[10px] font-semibold px-2 py-0.5 rounded-full capitalize', statusStyles[status] ?? statusStyles.pending)}>
    {status.replace('-', ' ')}
  </span>
);

export default StatusBadge;
