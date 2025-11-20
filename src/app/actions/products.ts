
"use server";

import * as z from "zod";
import db from "@/lib/db";
import { products } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { productSchema, type ProductFormValues } from "@/lib/schemas";
import { getRateLimiter } from "@/lib/rate-limiter";
import { verifyUserRequest } from "@/lib/auth-server";
import { checkUserPermission } from "@/lib/permissions";

export const getProducts = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    
    // Verificar permisos
    const permissionCheck = await checkUserPermission(userId, 'canManageProducts');
    if (!permissionCheck.allowed) {
      return { success: false, message: permissionCheck.message || "No tienes permisos para ver productos." };
    }
    
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const data = await db.select().from(products).where(eq(products.userId, verifiedUserId));
    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getProducts):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `Error al obtener los productos. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};

export const addProduct = async (formData: ProductFormValues, userId: string, idToken: string) => {
  const ratelimit = getRateLimiter();
  const { success: rateLimitSuccess } = await ratelimit.limit(userId);
  if (!rateLimitSuccess) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
  }
  
  // Verificar permisos
  const permissionCheck = await checkUserPermission(userId, 'canManageProducts');
  if (!permissionCheck.allowed) {
    return { success: false, message: permissionCheck.message || "No tienes permisos para crear productos." };
  }
  
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const validatedData = productSchema.parse(formData);
    
    const data = await db.insert(products).values({
      ...validatedData,
      unitPrice: validatedData.unitPrice.toString(),
      userId: verifiedUserId,
    }).returning();

    revalidatePath("/dashboard/products");
    
    return { success: true, data: data[0] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Datos del formulario no válidos.", errors: error.flatten().fieldErrors };
    }
    console.error("Database Error (addProduct):", error);
    const errorMessage = error instanceof Error ? error.message : "Ocurrió un error desconocido.";
    return { success: false, message: `No se pudo guardar el producto. Verifique la consola del servidor para más detalles: ${errorMessage}` };
  }
};
