// features/subscriptions/components/pro-badge.tsx
import { Badge } from '@/components/ui/badge';

interface ProBadgeProps {
  className?: string;
}

export function ProBadge({ className }: ProBadgeProps) {
  return (
    <Badge variant="default" className={className}>
      PRO
    </Badge>
  );
}
