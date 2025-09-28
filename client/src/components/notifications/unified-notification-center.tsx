import { useState } from 'react';
import { useAuth } from '@/hooks/useSupabaseAuth';
import { Bell, X, Check, AlertTriangle, Info, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useWebSocket } from '@/hooks/useWebSocket';
import { cn } from '@/lib/utils';

interface UnifiedNotificationCenterProps {
  className?: string;
}

export function UnifiedNotificationCenter({ className }: UnifiedNotificationCenterProps) {
  const { user } = useAuth();
  const { isConnected, notifications: liveNotifications, unreadCount: liveUnreadCount } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);

  if (!user) return null;

  const totalUnreadCount = liveUnreadCount || 0;
  const hasUrgentNotifications = liveNotifications.some((n: any) => 
    n.priority === 'critical' || n.priority === 'high'
  );

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'critical':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      case 'high':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      case 'medium':
        return <Info className="h-4 w-4 text-blue-500" />;
      case 'low':
        return <Clock className="h-4 w-4 text-gray-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical':
        return 'border-red-500 bg-red-50 dark:bg-red-950';
      case 'high':
        return 'border-orange-500 bg-orange-50 dark:bg-orange-950';
      case 'medium':
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
      case 'low':
        return 'border-gray-300 bg-gray-50 dark:bg-gray-900';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
    }
  };

  const handleMarkAsRead = async (notificationId: string) => {
    // TODO: Implement with Supabase
    console.log('Mark as read:', notificationId);
  };

  const handleMarkAllAsRead = async () => {
    // TODO: Implement with Supabase
    console.log('Mark all as read');
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className={cn(
            "relative p-2 hover:bg-gray-100 transition-colors duration-200",
            className
          )}
        >
          <Bell className="h-5 w-5 text-gray-300" />
          {totalUnreadCount > 0 && (
            <Badge 
              variant={hasUrgentNotifications ? "destructive" : "default"}
              className={cn(
                "absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs font-bold",
                hasUrgentNotifications 
                  ? "bg-red-500 animate-pulse" 
                  : "bg-blue-500"
              )}
            >
              {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      
      <PopoverContent align="end" className="w-96 p-0 bg-white border border-gray-200 shadow-xl">
        <Card className="border-0 shadow-none bg-white">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Notifications</CardTitle>
                <CardDescription className="flex items-center gap-2">
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-500" : "bg-red-500"
                  )} />
                  {isConnected ? "Connected" : "Disconnected"} • {totalUnreadCount} unread
                </CardDescription>
              </div>
              {totalUnreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
          </CardHeader>

          <Separator />

          <CardContent className="p-0">
            <ScrollArea className="h-96">
              {liveNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
                  <Bell className="h-8 w-8 mb-2 opacity-50" />
                  <p className="text-sm">No notifications</p>
                </div>
              ) : (
                <div className="space-y-1">
                  {liveNotifications.map((notification: any) => (
                    <div
                      key={notification.id}
                      className={cn(
                        "flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors cursor-pointer border-l-4 bg-white",
                        getPriorityColor(notification.priority)
                      )}
                      onClick={() => handleMarkAsRead(notification.id)}
                    >
                      <div className="flex-shrink-0 mt-0.5">
                        {getPriorityIcon(notification.priority)}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="text-sm font-medium leading-none">
                            {notification.title}
                          </p>
                          <div className="flex items-center gap-1">
                            {notification.priority && (
                              <Badge 
                                variant="outline" 
                                className="text-xs capitalize"
                              >
                                {notification.priority}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {notification.timestamp ? new Date(notification.timestamp).toLocaleString() : 'Just now'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </PopoverContent>
    </Popover>
  );
}