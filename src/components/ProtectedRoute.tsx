import { Navigate, useLocation } from 'react-router-dom';
import React from 'react';
import { useAuth } from '@/hooks/useAuth';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireAdmin?: boolean;
}

export function ProtectedRoute({ children, requireAdmin = false }: ProtectedRouteProps) {
  const { user, isAdmin, isLoading, refreshUserRole } = useAuth();
  const location = useLocation();
  const [checkingRole, setCheckingRole] = React.useState<boolean>(requireAdmin);

  React.useEffect(() => {
    let cancelled = false;
    async function verify() {
      if (!requireAdmin || !user) {
        if (!cancelled) setCheckingRole(false);
        return;
      }
      setCheckingRole(true);
      try {
        await refreshUserRole();
      } finally {
        if (!cancelled) setCheckingRole(false);
      }
    }
    verify();
    return () => {
      cancelled = true;
    };
  }, [requireAdmin, user?.email, location.pathname]);

  if (isLoading || checkingRole) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
}