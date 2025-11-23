'use server';

import db from '@/lib/db';
import { users } from '../../../../drizzle/schema';
import { eq } from 'drizzle-orm';
import { verifyUserRequest } from '@/lib/auth-server';
import type { UserRole } from '@/lib/roles';

/**
 * Obtiene los usuarios de una empresa (multi-tenant)
 * - Admin: ve todos los usuarios
 * - Company: ve solo los usuarios de su organización (mismo tenantId)
 */
export async function getCompanyUsers(userId: string, idToken: string) {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(userId, idToken);

    // Obtener rol y tenantId del usuario actual
    const [currentUser] = await db
      .select({ role: users.role, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.userId, userId))
      .limit(1);

    if (!currentUser) {
      return { success: false, message: "Usuario no encontrado." };
    }

    let query;

    if (currentUser.role === 'admin') {
      // Admin ve todos los usuarios
      query = db
        .select({
          id: users.id,
          userId: users.userId,
          email: users.email,
          role: users.role,
          displayName: users.displayName,
          tenantId: users.tenantId,
          ownerId: users.ownerId,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .orderBy(users.createdAt);
    } else if (currentUser.role === 'company') {
      // Company ve solo usuarios de su organización (mismo tenantId)
      if (!currentUser.tenantId) {
        return { success: false, message: "No tienes una organización asignada." };
      }

      query = db
        .select({
          id: users.id,
          userId: users.userId,
          email: users.email,
          role: users.role,
          displayName: users.displayName,
          tenantId: users.tenantId,
          ownerId: users.ownerId,
          isActive: users.isActive,
          createdAt: users.createdAt,
        })
        .from(users)
        .where(eq(users.tenantId, currentUser.tenantId))
        .orderBy(users.createdAt);
    } else {
      return { success: false, message: "No tienes permisos para gestionar usuarios." };
    }

    const companyUsers = await query;

    return {
      success: true,
      data: companyUsers.map(u => ({
        ...u,
        createdAt: u.createdAt.toISOString(),
      })),
    };
  } catch (error) {
    console.error("Database Error (getCompanyUsers):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener usuarios: ${errorMessage}` };
  }
}

/**
 * Crea un usuario para la empresa (multi-tenant)
 * Solo company y admin pueden crear usuarios
 */
export async function createCompanyUser(
  ownerId: string,
  email: string,
  displayName: string,
  role: UserRole,
  idToken: string
) {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(ownerId, idToken);

    // Obtener rol y tenantId del usuario actual
    const [currentUser] = await db
      .select({ role: users.role, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.userId, ownerId))
      .limit(1);

    if (!currentUser) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Solo admin y company pueden crear usuarios
    if (currentUser.role !== 'admin' && currentUser.role !== 'company') {
      return { success: false, message: "No tienes permisos para crear usuarios." };
    }

    // Company solo puede crear accountant y client, no admin ni company
    if (currentUser.role === 'company' && (role === 'admin' || role === 'company')) {
      return { success: false, message: "Solo puedes crear usuarios con rol Contador o Cliente." };
    }

    // Company debe tener un tenantId
    if (currentUser.role === 'company' && !currentUser.tenantId) {
      return { success: false, message: "No tienes una organización asignada." };
    }

    // Verificar que el email no exista
    const [existingUser] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existingUser) {
      return { success: false, message: "Ya existe un usuario con ese correo electrónico." };
    }

    // Generar un userId temporal (se actualizará cuando el usuario se registre en Firebase)
    const tempUserId = `pending_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    await db.insert(users).values({
      userId: tempUserId,
      email,
      displayName,
      role,
      ownerId: currentUser.role === 'admin' ? null : ownerId, // Admin crea usuarios sin owner
      tenantId: currentUser.tenantId, // Heredar el tenantId de la organización
      isActive: true,
    });

    return { success: true, message: "Usuario creado. Se enviará una invitación por correo." };
  } catch (error) {
    console.error("Database Error (createCompanyUser):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al crear usuario: ${errorMessage}` };
  }
}

/**
 * Actualiza el rol de un usuario (multi-tenant)
 */
export async function updateUserRole(
  requesterId: string,
  targetUserId: string,
  newRole: UserRole,
  idToken: string
) {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(requesterId, idToken);

    // Obtener rol y tenantId del usuario actual
    const [currentUser] = await db
      .select({ role: users.role, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.userId, requesterId))
      .limit(1);

    if (!currentUser) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Obtener el usuario objetivo
    const [targetUser] = await db
      .select({ tenantId: users.tenantId, role: users.role })
      .from(users)
      .where(eq(users.userId, targetUserId))
      .limit(1);

    if (!targetUser) {
      return { success: false, message: "Usuario objetivo no encontrado." };
    }

    // Verificar permisos
    if (currentUser.role === 'admin') {
      // Admin puede cambiar cualquier rol excepto quitarse su propio admin
      if (requesterId === targetUserId && newRole !== 'admin') {
        return { success: false, message: "No puedes quitarte tu propio rol de administrador." };
      }
    } else if (currentUser.role === 'company') {
      // Company solo puede modificar usuarios de su misma organización
      if (targetUser.tenantId !== currentUser.tenantId) {
        return { success: false, message: "No tienes permisos para modificar este usuario." };
      }
      // Company no puede asignar roles admin o company
      if (newRole === 'admin' || newRole === 'company') {
        return { success: false, message: "Solo puedes asignar roles de Contador o Cliente." };
      }
    } else {
      return { success: false, message: "No tienes permisos para modificar usuarios." };
    }

    // Validar rol
    const validRoles: UserRole[] = ['admin', 'company', 'accountant', 'client'];
    if (!validRoles.includes(newRole)) {
      return { success: false, message: "Rol inválido." };
    }

    await db
      .update(users)
      .set({ role: newRole, updatedAt: new Date() })
      .where(eq(users.userId, targetUserId));

    return { success: true };
  } catch (error) {
    console.error("Database Error (updateUserRole):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al actualizar el rol: ${errorMessage}` };
  }
}

/**
 * Activa/desactiva un usuario
 */
export async function toggleUserActive(
  requesterId: string,
  targetUserId: string,
  isActive: boolean,
  idToken: string
) {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(requesterId, idToken);

    // Obtener rol y tenantId del usuario actual
    const [currentUser] = await db
      .select({ role: users.role, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.userId, requesterId))
      .limit(1);

    if (!currentUser) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Obtener el usuario objetivo
    const [targetUser] = await db
      .select({ tenantId: users.tenantId })
      .from(users)
      .where(eq(users.userId, targetUserId))
      .limit(1);

    if (!targetUser) {
      return { success: false, message: "Usuario objetivo no encontrado." };
    }

    // Verificar permisos
    if (currentUser.role === 'company' && targetUser.tenantId !== currentUser.tenantId) {
      return { success: false, message: "No tienes permisos para modificar este usuario." };
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'company') {
      return { success: false, message: "No tienes permisos para modificar usuarios." };
    }

    // No permitir desactivarse a sí mismo
    if (requesterId === targetUserId) {
      return { success: false, message: "No puedes desactivarte a ti mismo." };
    }

    await db
      .update(users)
      .set({ isActive, updatedAt: new Date() })
      .where(eq(users.userId, targetUserId));

    return { success: true };
  } catch (error) {
    console.error("Database Error (toggleUserActive):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al actualizar usuario: ${errorMessage}` };
  }
}

/**
 * Elimina un usuario (solo si es de la misma organización)
 */
export async function deleteCompanyUser(
  requesterId: string,
  targetUserId: string,
  idToken: string
) {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }

  try {
    await verifyUserRequest(requesterId, idToken);

    // Obtener rol y tenantId del usuario actual
    const [currentUser] = await db
      .select({ role: users.role, tenantId: users.tenantId })
      .from(users)
      .where(eq(users.userId, requesterId))
      .limit(1);

    if (!currentUser) {
      return { success: false, message: "Usuario no encontrado." };
    }

    // Obtener el usuario objetivo
    const [targetUser] = await db
      .select({ tenantId: users.tenantId, userId: users.userId })
      .from(users)
      .where(eq(users.userId, targetUserId))
      .limit(1);

    if (!targetUser) {
      return { success: false, message: "Usuario objetivo no encontrado." };
    }

    // No permitir eliminarse a sí mismo
    if (requesterId === targetUserId) {
      return { success: false, message: "No puedes eliminarte a ti mismo." };
    }

    // Verificar permisos
    if (currentUser.role === 'company' && targetUser.tenantId !== currentUser.tenantId) {
      return { success: false, message: "No tienes permisos para eliminar este usuario." };
    }

    if (currentUser.role !== 'admin' && currentUser.role !== 'company') {
      return { success: false, message: "No tienes permisos para eliminar usuarios." };
    }

    await db.delete(users).where(eq(users.userId, targetUserId));

    return { success: true };
  } catch (error) {
    console.error("Database Error (deleteCompanyUser):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al eliminar usuario: ${errorMessage}` };
  }
}
