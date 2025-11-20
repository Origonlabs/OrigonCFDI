
"use server";

import * as z from "zod";
import db from "@/lib/db";
import { bankAccounts } from "../../../drizzle/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { bankAccountSchema, type BankAccountFormValues } from "@/lib/schemas";
import { getRateLimiter } from "@/lib/rate-limiter";
import { verifyUserRequest } from "@/lib/auth-server";

export const getBankAccounts = async (userId: string, idToken: string) => {
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const data = await db.select().from(bankAccounts).where(eq(bankAccounts.userId, verifiedUserId));
    return { success: true, data };
  } catch (error) {
    console.error("Database Error (getBankAccounts):", error);
    return { success: false, message: "Error al obtener las cuentas bancarias." };
  }
};

export const addBankAccount = async (formData: BankAccountFormValues, userId: string, idToken: string) => {
  const ratelimit = getRateLimiter();
  const { success: rateLimitSuccess } = await ratelimit.limit(userId);
  if (!rateLimitSuccess) {
      return { success: false, message: "Demasiadas solicitudes. Por favor, inténtalo de nuevo más tarde." };
  }
  
  if (!db) {
    return { success: false, message: "Error de configuración: La conexión con la base de datos no está disponible." };
  }
  try {
    if (!userId) {
      return { success: false, message: "Usuario no autenticado." };
    }
    
    const verifiedUserId = await verifyUserRequest(userId, idToken);
    const validatedData = bankAccountSchema.parse(formData);
    
    const data = await db.insert(bankAccounts).values({
      ...validatedData,
      userId: verifiedUserId,
    }).returning();

    revalidatePath("/dashboard/settings/bank-accounts");
    
    return { success: true, data: data[0] };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, message: "Datos del formulario no válidos." };
    }
    console.error("Database Error (addBankAccount):", error);
    return { success: false, message: "No se pudo guardar la cuenta bancaria." };
  }
};
