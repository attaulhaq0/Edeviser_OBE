import { useEffect, useRef, useState } from 'react';
import { useAuth } from './use-auth';
import { useToast } from './use-toast';

interface WebSocketMessage {
  type: 'auth_success' | 'notification' | 'alert' | 'error' | 'pong' | 'unread_notifications';
  data?: any;
  socketId?: string;
  message?: string;
}

interface NotificationData {
  id: string;
  type: string;
  title: string;
  message: string;
  priority: string;
  alertType: string;
  createdAt: string;
}

export const useWebSocket = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  const connect = () => {
    if (!user || wsRef.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    // Fix for Replit environment where window.location.host might be undefined
    const host = window.location.host || window.location.hostname + (window.location.port ? `:${window.location.port}` : ':5000');
    const wsUrl = `${protocol}//${host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        
        // Authentication is handled server-side via session
        // No need to send credentials from client
        
        // Start ping interval to keep connection alive
        pingIntervalRef.current = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 30000); // Ping every 30 seconds
      };

      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          
          switch (message.type) {
            case 'auth_success':
              console.log('WebSocket authenticated:', message.message);
              break;
              
            case 'notification':
              if (message.data) {
                handleNotification(message.data);
                // Acknowledge receipt
                ws.send(JSON.stringify({
                  type: 'ack_notification',
                  notificationId: message.data.id
                }));
              }
              break;
              
            case 'unread_notifications':
              if (message.data && Array.isArray(message.data)) {
                message.data.forEach((notif: any) => handleNotification(notif));
              }
              break;
              
            case 'alert':
              if (message.data) {
                handleAlert(message.data);
              }
              break;
              
            case 'error':
              console.error('WebSocket error:', message.message);
              toast({
                title: "Connection Error",
                description: message.message || "WebSocket error occurred",
                variant: "destructive",
              });
              break;
              
            case 'pong':
              // Keep-alive response
              break;
              
            default:
              console.log('Unknown WebSocket message type:', message.type);
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        
        // Clear intervals
        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = setTimeout(() => {
          console.log('Attempting to reconnect WebSocket...');
          connect();
        }, 3000);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
      
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }
  };

  const disconnect = () => {
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }
    
    if (reconnectTimeoutRef.current) {
      clearTimeout(reconnectTimeoutRef.current);
      reconnectTimeoutRef.current = null;
    }
    
    if (pingIntervalRef.current) {
      clearInterval(pingIntervalRef.current);
      pingIntervalRef.current = null;
    }
  };

  const handleNotification = (notificationData: NotificationData) => {
    setNotifications(prev => [notificationData, ...prev.slice(0, 49)]); // Keep latest 50
    setUnreadCount(prev => prev + 1);

    // Show toast notification
    toast({
      title: notificationData.title,
      description: notificationData.message,
      variant: notificationData.priority === 'critical' ? 'destructive' : 'default',
    });

    // Play notification sound (optional)
    try {
      const audio = new Audio('/notification-sound.mp3');
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore audio play errors (user interaction required)
      });
    } catch (error) {
      // Ignore audio errors
    }
  };

  const handleAlert = (alertData: NotificationData) => {
    // Handle real-time alerts (similar to notifications but may have different UI treatment)
    handleNotification(alertData);
  };

  const markAllAsRead = () => {
    setUnreadCount(0);
  };

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(notif => notif.id !== id));
  };

  // Connect when user is available
  useEffect(() => {
    if (user) {
      connect();
    } else {
      disconnect();
    }

    // Cleanup on unmount
    return () => {
      disconnect();
    };
  }, [user]);

  // Cleanup on page unload
  useEffect(() => {
    const handleBeforeUnload = () => {
      disconnect();
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, []);

  return {
    isConnected,
    notifications,
    unreadCount,
    markAllAsRead,
    removeNotification,
    connect,
    disconnect,
  };
};