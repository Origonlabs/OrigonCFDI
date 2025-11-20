
"use server";

import * as z from "zod";
import db from "@/lib/db";
import { companies } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { profileFormSchema, type ProfileFormValues } from "@/lib/schemas";
import { getRateLimiter } from "@/lib/rate-limiter";
import { verifyUserRequest } from "@/lib/auth-server";
import { checkUserPermission } from "@/lib/permissions";

export const getCompanyProfile = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    
    // Verificar permisos
    const permissionCheck = await checkUserPermission(userId, 'canManageSettings');
    if (!permissionCheck.allowed) {
      return { success: false, message: permissionCheck.message || "No tienes permisos para ver el perfil de la empresa." };
    }
    
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const data = await db.select().from(companies).where(eq(companies.userId, verifiedUserId));
    return { success: true, data: data[0] };
  } catch (error) {
    console.error("Database Error (getCompanyProfile):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener el perfil de la empresa. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const saveCompanyProfile = async (formData: ProfileFormValues, userId: string, idToken: string) => {
  const ratelimit = getRateLimiter();
  const { success: rateLimitSuccess } = await ratelimit.limit(userId);
  if (!rateLimitSuccess) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
  }

  // Verificar permisos
  const permissionCheck = await checkUserPermission(userId, 'canManageSettings');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para modificar el perfil de la empresa." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }

    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const validatedData = profileFormSchema.parse(formData);
    
    const existingProfile = await db.select({id: companies.id}).from(companies).where(eq(companies.userId, verifiedUserId));
    
    if (existingProfile.length > 0) {
      const updatedData = await db
        .update(companies)
        .set({ ...validatedData, updatedAt: new Date() })
        .where(eq(companies.userId, verifiedUserId))
        .returning();
      revalidatePath("/dashboard/settings");
      return { success: true, data: updatedData[0], message: "Perfil de empresa actualizado." };
    } else {
      const newData = await db
        .insert(companies)
        .values({ ...validatedData, userId: verifiedUserId })
        .returning();
      revalidatePath("/dashboard/settings");
      return { success: true, data: newData[0], message: "Perfil de empresa guardado." };
    }
  } catch (error) {
     if (error instanceof z.ZodError) {
      return { success: false, message: "Datos del formulario no válidos." };
    }
    console.error("Database Error (saveCompanyProfile):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `No se pudo guardar el perfil de la empresa. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};
