import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Bell, X, Check, AlertTriangle, Info, Clock, User, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWebSocket } from '@/hooks/useWebSocket';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { AlertNotifications } from '@shared/schema';

interface UnifiedNotificationCenterProps {
  className?: string;
}

export function UnifiedNotificationCenter({ className }: UnifiedNotificationCenterProps) {
  const { user } = useAuth();
  const { isConnected, notifications: liveNotifications, unreadCount: liveUnreadCount } = useWebSocket();
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'live' | 'all'>('live');

  // Fetch all notifications from API
  const { data: allNotifications = [], isLoading } = useQuery<AlertNotifications[]>({
    queryKey: ['/api/notifications'],
    enabled: !!user && isOpen,
    refetchInterval: isOpen ? 30000 : false, // Refetch every 30 seconds when open
  });

  // Fetch unread count separately for badge
  const { data: unreadNotifications = [] } = useQuery<AlertNotifications[]>({
    queryKey: ['/api/notifications/unread'],
    enabled: !!user,
    refetchInterval: 30000, // Always keep unread count updated
  });

  // Mark notification as read mutation
  const markAsReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      const response = await fetch(`/api/notifications/${notificationId}/read`, { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to mark as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
    },
  });

  // Mark all notifications as read mutation
  const markAllAsReadMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/notifications/mark-all-read', { 
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      });
      if (!response.ok) throw new Error('Failed to mark all as read');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notifications'] });
      queryClient.invalidateQueries({ queryKey: ['/api/notifications/unread'] });
    },
  });

  if (!user) return null;

  const totalUnreadCount = Math.max(liveUnreadCount || 0, unreadNotifications.length || 0);
  const hasUrgentNotifications = liveNotifications.some(n => 
    n.priority === 'critical' || n.priority === 'high'
  ) || allNotifications.some(n => 
    !n.isRead && (n.alertType === 'low_performance' || n.alertType === 'missed_deadline' || n.alertType === 'help_request')
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
        return 'border-gray-500 bg-gray-50 dark:bg-gray-950';
      default:
        return 'border-blue-500 bg-blue-50 dark:bg-blue-950';
    }
  };

  const getNotificationTypeIcon = (type: string) => {
    switch (type) {
      case 'success':
      case 'achievement':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
      case 'low_performance':
      case 'missed_deadline':
        return <AlertCircle className="h-4 w-4 text-orange-500" />;
      case 'urgent':
      case 'help_request':
        return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default:
        return <Info className="h-4 w-4 text-blue-500" />;
    }
  };

  const getAlertTypeLabel = (alertType: string) => {
    switch (alertType) {
      case 'low_performance':
        return 'Low Performance';
      case 'inactivity':
        return 'Inactivity Alert';
      case 'missed_deadline':
        return 'Missed Deadline';
      case 'help_request':
        return 'Help Request';
      case 'achievement':
        return 'Achievement';
      case 'streak_break':
        return 'Streak Break';
      default:
        return alertType?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Notification';
    }
  };

  const handleMarkAsRead = (notificationId: string) => {
    markAsReadMutation.mutate(notificationId);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const renderNotification = (notification: any, isLive: boolean = false) => {
    const isRead = isLive ? false : notification.isRead;
    
    return (
      <Card 
        key={notification.id} 
        className={cn(
          "mb-3 border-l-4 transition-all duration-200",
          isRead ? "opacity-70" : "shadow-sm",
          getPriorityColor(notification.priority || 'medium')
        )}
        data-testid={`notification-${notification.id}`}
      >
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3 flex-1">
              <div className="flex-shrink-0 mt-1">
                {isLive ? 
                  getNotificationTypeIcon(notification.type) : 
                  getPriorityIcon(notification.priority || 'medium')
                }
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="text-sm font-medium text-foreground truncate">
                    {notification.title || getAlertTypeLabel(notification.alertType)}
                  </h4>
                  <div className="flex items-center space-x-2 ml-2">
                    {!isRead && (
                      <div className="w-2 h-2 bg-primary rounded-full" />
                    )}
                    <span className="text-xs text-muted-foreground flex-shrink-0">
                      {format(new Date(notification.createdAt), 'MMM d, h:mm a')}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                  {notification.message || notification.body}
                </p>
                {notification.alertType && (
                  <Badge variant="outline" className="text-xs">
                    {getAlertTypeLabel(notification.alertType)}
                  </Badge>
                )}
              </div>
            </div>
            {!isRead && !isLive && (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleMarkAsRead(notification.id)}
                className="ml-2 p-1 h-auto"
                data-testid={`mark-read-${notification.id}`}
              >
                <Check className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className={cn("relative", className)}>
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="relative h-9 w-9 p-0"
            data-testid="notification-trigger"
          >
            <Bell className="h-4 w-4" />
            {totalUnreadCount > 0 && (
              <Badge 
                variant={hasUrgentNotifications ? "destructive" : "default"}
                className="absolute -top-1 -right-1 h-5 w-5 p-0 text-xs flex items-center justify-center min-w-[20px]"
                data-testid="notification-count-badge"
              >
                {totalUnreadCount > 99 ? '99+' : totalUnreadCount}
              </Badge>
            )}
            {/* Connection status indicator */}
            <div 
              className={cn(
                "absolute top-0 left-0 w-2 h-2 rounded-full",
                isConnected ? "bg-green-500" : "bg-gray-400"
              )}
              title={isConnected ? "Connected" : "Disconnected"}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent 
          className="w-96 p-0" 
          align="end"
          data-testid="notification-popover"
        >
          <div className="border-b p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-base" data-testid="notification-title">
                Notifications
                {user.role && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                  </Badge>
                )}
              </h3>
              <div className="flex items-center space-x-2">
                <div className={cn(
                  "flex items-center space-x-1 text-xs",
                  isConnected ? "text-green-600" : "text-gray-500"
                )}>
                  <div className={cn(
                    "w-2 h-2 rounded-full",
                    isConnected ? "bg-green-500" : "bg-gray-400"
                  )} />
                  <span>{isConnected ? "Live" : "Offline"}</span>
                </div>
              </div>
            </div>
          </div>

          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'live' | 'all')}>
            <div className="border-b">
              <TabsList className="grid w-full grid-cols-2 h-9">
                <TabsTrigger value="live" className="text-xs" data-testid="tab-live">
                  Live ({liveUnreadCount || 0})
                </TabsTrigger>
                <TabsTrigger value="all" className="text-xs" data-testid="tab-all">
                  All ({unreadNotifications.length || 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="live" className="mt-0">
              <div className="max-h-96">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {liveNotifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No live notifications</p>
                        <p className="text-xs opacity-75">You're all caught up!</p>
                      </div>
                    ) : (
                      <div>
                        {liveNotifications.map((notification) => 
                          renderNotification(notification, true)
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>
            </TabsContent>

            <TabsContent value="all" className="mt-0">
              <div className="max-h-96">
                <ScrollArea className="h-full">
                  <div className="p-4">
                    {isLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                          <div key={i} className="h-16 bg-muted animate-pulse rounded" />
                        ))}
                      </div>
                    ) : allNotifications.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <User className="h-12 w-12 mx-auto mb-3 opacity-50" />
                        <p className="text-sm">No notifications yet</p>
                        <p className="text-xs opacity-75">Check back later for updates</p>
                      </div>
                    ) : (
                      <div>
                        {allNotifications.map((notification) => 
                          renderNotification(notification, false)
                        )}
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </div>

              {/* Mark all as read button for all notifications tab */}
              {allNotifications.some(n => !n.isRead) && (
                <div className="border-t p-3">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleMarkAllAsRead}
                    disabled={markAllAsReadMutation.isPending}
                    className="w-full"
                    data-testid="mark-all-read"
                  >
                    {markAllAsReadMutation.isPending ? "Marking..." : "Mark all as read"}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </PopoverContent>
      </Popover>
    </div>
  );
}