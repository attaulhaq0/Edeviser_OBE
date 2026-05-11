// Task 95.1: Session management page
// Display active sessions with sign-out-other-sessions action

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  useActiveSessions,
  useSignOutOtherSessions,
} from "@/hooks/useSessionManagement";
import { toast } from "sonner";
import { Loader2, Monitor, LogOut, Shield } from "lucide-react";

const SessionManagement = () => {
  const { user } = useAuth();
  const { data: sessions, isLoading } = useActiveSessions(user?.id);
  const signOutOthers = useSignOutOtherSessions();

  const handleSignOutOthers = () => {
    signOutOthers.mutate(undefined, {
      onSuccess: () => toast.success("Other sessions signed out"),
      onError: (err) => toast.error(err.message),
    });
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <h1 className="text-2xl font-bold tracking-tight">Session Management</h1>

      <Card className="bg-white border-0 shadow-md rounded-xl overflow-hidden">
        <CardHeader className="flex flex-row items-center gap-2">
          <Shield className="h-5 w-5 text-blue-600" />
          <CardTitle>Active Sessions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading && (
            <div className="flex items-center justify-center py-6">
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            </div>
          )}

          {!isLoading &&
            sessions?.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between p-3 rounded-lg bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <Monitor className="h-5 w-5 text-gray-500" />
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {session.device}
                      {session.isCurrent && (
                        <span className="ms-2 text-xs text-green-600 font-bold">
                          Current
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-500">
                      {session.ip} · Last active{" "}
                      {new Date(session.lastActive).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}

          {!isLoading && (!sessions || sessions.length === 0) && (
            <p className="text-sm text-gray-500 text-center py-4">
              No active sessions found
            </p>
          )}
        </CardContent>
      </Card>

      <Button
        variant="outline"
        onClick={handleSignOutOthers}
        disabled={signOutOthers.isPending}
        className="gap-2"
      >
        {signOutOthers.isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <LogOut className="h-4 w-4" />
        )}
        Sign Out Other Sessions
      </Button>
    </div>
  );
};

export default SessionManagement;
