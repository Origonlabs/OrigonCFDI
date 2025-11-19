'use server';

import db from '@/lib/db';
import { users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { UserRole } from '@/lib/roles';

/**
 * Obtiene el rol de un usuario
 */
export async function getUserRole(userId: string): Promise<{ success: true; role: UserRole } | { success: false; message: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }

    const [user] = await db
      .select({ role: users.role })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!user) {
      // Si no existe el usuario en la BD, retornar error (debe crearse en signup)
      return { success: false, message: "Usuario no encontrado en la base de datos." };
    }

    return { success: true, role: user.role as UserRole };
  } catch (error) {
    console.error("Database Error (getUserRole):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener el rol del usuario: ${errorMessage}` };
  }
}

/**
 * Crea un nuevo usuario en la base de datos
 */
export async function createUser(userId: string, email: string, role: UserRole = 'company'): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await db.insert(users).values({
      userId,
      email,
      role,
    });

    return { success: true };
  } catch (error) {
    console.error("Database Error (createUser):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al crear el usuario: ${errorMessage}` };
  }
}

/**
 * Actualiza el rol de un usuario (solo para admins)
 */
export async function updateUserRole(
  userId: string,
  targetUserId: string,
  newRole: UserRole
): Promise<{ success: boolean; message?: string }> {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    // Verificar que el usuario que hace la petición es admin
    const requesterRole = await getUserRole(userId);
    if (!requesterRole.success || requesterRole.role !== 'admin') {
      return { success: false, message: "No tienes permisos para realizar esta acción." };
    }

    await db
      .update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.userId, targetUserId));

    return { success: true };
  } catch (error) {
    console.error("Database Error (updateUserRole):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al actualizar el rol del usuario: ${errorMessage}` };
  }
}

/**
 * Verifica si un usuario tiene un permiso específico
 */
export async function checkPermission(
  userId: string,
  permission: keyof import('@/lib/roles').RolePermissions
): Promise<{ success: boolean; hasPermission: boolean; message?: string }> {
  const roleResult = await getUserRole(userId);
  
  if (!roleResult.success) {
    return { success: false, hasPermission: false, message: roleResult.message };
  }

  const { hasPermission } = await import('@/lib/roles');
  const hasAccess = hasPermission(roleResult.role, permission);

  return { success: true, hasPermission: hasAccess };
}

