/**
 * Helper para verificar permisos en acciones del servidor
 */

import { getUserRole } from '@/app/actions/users';
import { hasPermission, type UserRole, type RolePermissions } from './roles';

/**
 * Resultado de verificación de permisos
 */
export interface PermissionCheckResult {
  allowed: boolean;
  role?: UserRole;
  message?: string;
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export async function checkUserPermission(
  userId: string,
  permission: keyof RolePermissions
): Promise<PermissionCheckResult> {
  if (!userId) {
    return { allowed: false, message: 'Usuario no autenticado.' };
  }

  const roleResult = await getUserRole(userId);
  
  if (!roleResult.success) {
    return { allowed: false, message: roleResult.message };
  }

  const allowed = hasPermission(roleResult.role, permission);
  
  return {
    allowed,
    role: roleResult.role,
    message: allowed ? undefined : 'No tienes permisos para realizar esta acción.',
  };
}

/**
 * Verifica múltiples permisos (requiere que el usuario tenga TODOS los permisos)
 */
export async function checkUserPermissions(
  userId: string,
  permissions: Array<keyof RolePermissions>
): Promise<PermissionCheckResult> {
  if (!userId) {
    return { allowed: false, message: 'Usuario no autenticado.' };
  }

  const roleResult = await getUserRole(userId);
  
  if (!roleResult.success) {
    return { allowed: false, message: roleResult.message };
  }

  const allAllowed = permissions.every(permission => hasPermission(roleResult.role, permission));
  
  return {
    allowed: allAllowed,
    role: roleResult.role,
    message: allAllowed ? undefined : 'No tienes permisos para realizar esta acción.',
  };
}

/**
 * Verifica si el usuario tiene al menos uno de los permisos especificados
 */
export async function checkUserAnyPermission(
  userId: string,
  permissions: Array<keyof RolePermissions>
): Promise<PermissionCheckResult> {
  if (!userId) {
    return { allowed: false, message: 'Usuario no autenticado.' };
  }

  const roleResult = await getUserRole(userId);
  
  if (!roleResult.success) {
    return { allowed: false, message: roleResult.message };
  }

  const anyAllowed = permissions.some(permission => hasPermission(roleResult.role, permission));
  
  return {
    allowed: anyAllowed,
    role: roleResult.role,
    message: anyAllowed ? undefined : 'No tienes permisos para realizar esta acción.',
  };
}

/**
 * Verifica si el usuario es admin
 */
export async function isAdmin(userId: string): Promise<boolean> {
  const roleResult = await getUserRole(userId);
  return roleResult.success && roleResult.role === 'admin';
}

