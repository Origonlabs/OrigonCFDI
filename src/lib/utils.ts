import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Genera un Tenant ID único de 18 caracteres alfanuméricos
 * Combina letras minúsculas, mayúsculas y números
 * Similar al formato usado por Microsoft para IDs de organización
 */
export function generateTenantId(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let tenantId = '';
  for (let i = 0; i < 18; i++) {
    tenantId += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return tenantId;
}
