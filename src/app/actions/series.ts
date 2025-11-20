
"use server";

import * as z from "zod";
import db from "@/lib/db";
import { series } from "../../../drizzle/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { serieSchema, type SerieFormValues } from "@/lib/schemas";
import { getRateLimiter } from "@/lib/rate-limiter";
import { verifyUserRequest } from "@/lib/auth-server";
import { checkUserPermission } from "@/lib/permissions";

export const getSeries = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    
    // Verificar permisos
    const permissionCheck = await checkUserPermission(userId, 'canManageSeries');
    if (!permissionCheck.allowed) {
      return { success: false, message: permissionCheck.message || "No tienes permisos para ver series." };
    }
    
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const data = await db.select().from(series).where(eq(series.userId, verifiedUserId));
    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getSeries):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener las series. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const addSerie = async (formData: SerieFormValues, userId: string, idToken: string) => {
  const ratelimit = getRateLimiter();
  const { success: rateLimitSuccess } = await ratelimit.limit(userId);
  if (!rateLimitSuccess) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
  }

  // Verificar permisos
  const permissionCheck = await checkUserPermission(userId, 'canManageSeries');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para crear series." };
  }

  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const validatedData = serieSchema.parse(formData);

    // Check if serie already exists for this user
    const existingSerie = await db.select().from(series).where(and(eq(series.userId, verifiedUserId), eq(series.serie, validatedData.serie)));
    if (existingSerie.length > 0) {
      return { success: false, message: `La serie '${validatedData.serie}' ya existe.` };
    }
    
    const data = await db.insert(series).values({
      ...validatedData,
      userId: verifiedUserId,
    }).returning();

    revalidatePath("/dashboard/settings/series");
    
    return { success: true, data: data[0] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Datos del formulario no válidos." };
    }
    console.error("Database Error (addSerie):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `No se pudo guardar la serie. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};
