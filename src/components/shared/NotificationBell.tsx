// =============================================================================
// NotificationBell — Bell icon with unread badge count
// Validates: Requirements 31.3
// =============================================================================

import { useState } from 'react';
import { Bell } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useUnreadCount } from '@/hooks/useNotifications';
import { useNotificationRealtime } from '@/hooks/useNotificationRealtime';
import NotificationCenter from '@/components/shared/NotificationCenter';

const NotificationBell = () => {
  const { user } = useAuth();
  const { data: unreadCount = 0 } = useUnreadCount(user?.id);
  const [open, setOpen] = useState(false);

  // Subscribe to realtime notifications — shows toast + invalidates bell count
  useNotificationRealtime();

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative"
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <NotificationCenter onClose={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default NotificationBell;
