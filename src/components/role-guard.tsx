'use client';

import { ReactNode } from 'react';
import { useUserRole } from '@/hooks/use-user-role';
import { hasPermission, type UserRole, type RolePermissions } from '@/lib/roles';
import { Skeleton } from '@/components/ui/skeleton';

interface RoleGuardProps {
  children: ReactNode;
  permission: keyof RolePermissions;
  fallback?: ReactNode;
  showLoading?: boolean;
}

/**
 * Componente que muestra contenido solo si el usuario tiene el permiso requerido
 */
export function RoleGuard({ children, permission, fallback = null, showLoading = true }: RoleGuardProps) {
  const { role, loading } = useUserRole();

  if (loading && showLoading) {
    return <Skeleton className="h-4 w-full" />;
  }

  if (!role) {
    return <>{fallback}</>;
  }

  if (!hasPermission(role, permission)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}

interface RoleCheckProps {
  role: UserRole | null;
  permission: keyof RolePermissions;
}

/**
 * Hook helper para verificar permisos en componentes
 */
export function useHasPermission(role: UserRole | null, permission: keyof RolePermissions): boolean {
  if (!role) return false;
  return hasPermission(role, permission);
}

