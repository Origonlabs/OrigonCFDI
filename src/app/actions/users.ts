'use server';

import db from '@/lib/db';
import { users } from '../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import type { UserRole } from '@/lib/roles';
import { generateTenantId } from '@/lib/utils';

/**
 * Obtiene el rol de un usuario
 * Si el usuario no existe en la BD pero está autenticado, lo crea con rol 'company' por defecto
 */
export async function getUserRole(userId: string, email?: string): Promise<{ success: true; role: UserRole } | { success: false; message: string }> {
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
      // Si no existe el usuario en la BD pero está autenticado, crearlo con rol 'company'
      // Esto permite que usuarios existentes en Firebase que no tienen registro en la BD puedan acceder
      console.log(`Usuario ${userId} no encontrado en BD, creando con rol 'company'...`);

      try {
        // Generar un tenantId único, reintentando si ya existe
        let tenantId = generateTenantId();
        let attempts = 0;
        const maxAttempts = 10;

        while (attempts < maxAttempts) {
          const [existingTenant] = await db
            .select({ id: users.id })
            .from(users)
            .where(eq(users.tenantId, tenantId))
            .limit(1);

          if (!existingTenant) {
            break; // tenantId es único, salir del loop
          }

          tenantId = generateTenantId(); // Generar nuevo ID
          attempts++;
        }

        if (attempts >= maxAttempts) {
          throw new Error('No se pudo generar un Tenant ID único después de varios intentos.');
        }

        await db.insert(users).values({
          userId,
          email: email || `${userId}@temp.local`, // Email temporal si no se proporciona
          role: 'company',
          tenantId, // Asignar nuevo tenant ID único de 18 caracteres
        });
        return { success: true, role: 'company' };
      } catch (insertError) {
        // Si falla por duplicado, intentar obtener de nuevo
        const [retryUser] = await db
          .select({ role: users.role })
          .from(users)
          .where(eq(users.userId, userId))
          .limit(1);

        if (retryUser) {
          return { success: true, role: retryUser.role as UserRole };
        }
        throw insertError;
      }
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
    // Solo generar tenantId si es una cuenta 'company' (dueño de organización)
    let tenantId: string | undefined = undefined;

    if (role === 'company') {
      // Generar un tenantId único, reintentando si ya existe
      tenantId = generateTenantId();
      let attempts = 0;
      const maxAttempts = 10;

      while (attempts < maxAttempts) {
        const [existingTenant] = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.tenantId, tenantId))
          .limit(1);

        if (!existingTenant) {
          break; // tenantId es único, salir del loop
        }

        tenantId = generateTenantId(); // Generar nuevo ID
        attempts++;
      }

      if (attempts >= maxAttempts) {
        return { success: false, message: 'No se pudo generar un Tenant ID único después de varios intentos.' };
      }
    }

    await db.insert(users).values({
      userId,
      email,
      role,
      tenantId,
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

