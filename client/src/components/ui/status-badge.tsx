import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, Clock, AlertCircle, XCircle } from 'lucide-react';

type StatusType = 'not_processed' | 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

interface StatusBadgeProps {
  status: StatusType;
  showIcon?: boolean;
}

const statusConfig: Record<StatusType, { label: string; className: string; icon: typeof Clock }> = {
  not_processed: {
    label: 'Not Processed',
    className: 'bg-muted text-muted-foreground',
    icon: Clock,
  },
  pending: {
    label: 'Pending',
    className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: Clock,
  },
  processing: {
    label: 'Processing',
    className: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: Clock,
  },
  completed: {
    label: 'Completed',
    className: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: CheckCircle,
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: AlertCircle,
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200',
    icon: XCircle,
  },
};

export function StatusBadge({ status, showIcon = true }: StatusBadgeProps) {
  const config = statusConfig[status] || statusConfig.not_processed;
  const Icon = config.icon;

  return (
    <Badge className={cn('font-medium flex items-center gap-1', config.className)}>
      {showIcon && <Icon className="h-3 w-3" />}
      {config.label}
    </Badge>
  );
}
