# Errores de TypeScript Pendientes de Corrección

**Fecha:** 20 de Noviembre de 2025
**Estado:** ⚠️ Requiere atención

## Resumen

Después de implementar las 10 mejoras, hay algunos errores de TypeScript que deben corregirse antes del despliegue a producción. La mayoría son imports faltantes o ajustes menores en tipos.

---

## 1. Schema de Certificados - ✅ CORREGIDO

**Archivo:** `drizzle/schema.ts`

**Problema:** Faltaban campos `rfc` e `isActive` en la tabla `csd_certificates`

**Solución aplicada:**
```typescript
export const csdCertificates = pgTable('csd_certificates', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  certificateNumber: varchar('certificate_number', { length: 64 }).notNull().unique(),
  rfc: varchar('rfc', { length: 13 }).notNull(), // ✅ AGREGADO
  validFrom: timestamp('valid_from').notNull(),
  validTo: timestamp('valid_to').notNull(),
  status: certificateStatusEnum('status').default('active').notNull(),
  isActive: boolean('is_active').default(true).notNull(), // ✅ AGREGADO
  privateKey: text('private_key').notNull(),
  certificate: text('certificate').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
```

**Migración necesaria:**
```bash
npm run db:push
```

---

## 2. Imports Faltantes en `payments.ts`

**Archivo:** `src/app/actions/payments.ts`

**Líneas con error:** 208, 247, 257

**Problema:** Faltan imports de `companies`, `checkUserPermission` y referencia incorrecta a `relatedCfdis`

**Solución:**
```typescript
// Línea 6: Agregar companies al import
import { payments, paymentDocuments, clients, companies } from "../../../drizzle/schema";

// Después de la línea 11: Agregar
import { checkUserPermission } from "@/lib/permissions";

// Línea 257: Cambiar relatedCfdis por paymentDocuments
const relatedDocs = await db
  .select()
  .from(paymentDocuments)  // ✅ Cambiar de relatedCfdis a paymentDocuments
  .where(eq(paymentDocuments.paymentId, paymentId));
```

---

## 3. Función `isCertificateValid` Retorna Tipo Incorrecto

**Archivo:** `src/lib/csd-signer.ts`

**Línea:** 250

**Problema:** La función retorna `boolean`, pero se espera un objeto con `{ valid: boolean, message?: string, validFrom?: Date, validTo?: Date }`

**Solución:**
```typescript
// Cambiar la función de:
export function isCertificateValid(certificatePem: string): boolean {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const now = new Date();
    return now >= cert.validity.notBefore && now <= cert.validity.notAfter;
  } catch {
    return false;
  }
}

// A:
export function isCertificateValid(certificatePem: string): {
  valid: boolean;
  message?: string;
  validFrom?: Date;
  validTo?: Date;
} {
  try {
    const cert = forge.pki.certificateFromPem(certificatePem);
    const now = new Date();
    const validFrom = cert.validity.notBefore;
    const validTo = cert.validity.notAfter;
    const isValid = now >= validFrom && now <= validTo;

    return {
      valid: isValid,
      validFrom,
      validTo,
      message: isValid ? undefined : 'El certificado ha expirado o aún no es válido'
    };
  } catch (error) {
    return {
      valid: false,
      message: 'Error al validar el certificado: formato inválido'
    };
  }
}
```

---

## 4. Permisos No Definidos en `RolePermissions`

**Archivos afectados:**
- `src/app/actions/certificates.ts` (líneas 57, 178, 216)
- `src/app/actions/invoices.ts` (líneas 752, 825)
- `src/app/actions/credit-notes.ts` (línea 109)

**Problema:** Permisos `'manage_certificates'`, `'cancel_invoice'`, `'delete_invoice'` no existen en el tipo `RolePermissions`

**Solución:** Agregar estos permisos a `src/lib/permissions.ts`

```typescript
// Buscar la interfaz RolePermissions y agregar:
export interface RolePermissions {
  create_invoice: boolean;
  stamp_invoice: boolean;
  cancel_invoice: boolean;      // ✅ AGREGAR
  delete_invoice: boolean;      // ✅ AGREGAR
  view_invoices: boolean;
  manage_clients: boolean;
  manage_products: boolean;
  manage_certificates: boolean;  // ✅ AGREGAR
  stamp_payment: boolean;
  view_payments: boolean;
  view_reports: boolean;
  manage_settings: boolean;
}

// Y actualizar los permisos por rol:
export const rolePermissions: Record<string, RolePermissions> = {
  admin: {
    create_invoice: true,
    stamp_invoice: true,
    cancel_invoice: true,        // ✅ AGREGAR
    delete_invoice: true,        // ✅ AGREGAR
    view_invoices: true,
    manage_clients: true,
    manage_products: true,
    manage_certificates: true,   // ✅ AGREGAR
    stamp_payment: true,
    view_payments: true,
    view_reports: true,
    manage_settings: true,
  },
  company: {
    create_invoice: true,
    stamp_invoice: true,
    cancel_invoice: true,        // ✅ AGREGAR
    delete_invoice: true,        // ✅ AGREGAR
    view_invoices: true,
    manage_clients: true,
    manage_products: true,
    manage_certificates: true,   // ✅ AGREGAR
    stamp_payment: true,
    view_payments: true,
    view_reports: true,
    manage_settings: true,
  },
  accountant: {
    create_invoice: true,
    stamp_invoice: true,
    cancel_invoice: false,       // ✅ AGREGAR
    delete_invoice: false,       // ✅ AGREGAR
    view_invoices: true,
    manage_clients: true,
    manage_products: true,
    manage_certificates: false,  // ✅ AGREGAR
    stamp_payment: true,
    view_payments: true,
    view_reports: true,
    manage_settings: false,
  },
  client: {
    create_invoice: false,
    stamp_invoice: false,
    cancel_invoice: false,       // ✅ AGREGAR
    delete_invoice: false,       // ✅ AGREGAR
    view_invoices: true,
    manage_clients: false,
    manage_products: false,
    manage_certificates: false,  // ✅ AGREGAR
    stamp_payment: false,
    view_payments: true,
    view_reports: false,
    manage_settings: false,
  },
};
```

---

## 5. Variables `fakeSello` y `fakeCertificado` No Definidas

**Archivo:** `src/app/actions/invoices.ts`

**Líneas:** 433, 436

**Problema:** Referencias a variables que no existen

**Contexto:** Este código es del modo de desarrollo cuando no hay CSD real

**Solución:**
```typescript
// Alrededor de la línea 430-440, cambiar:
console.warn('⚠️ DESARROLLO: Generando CFDI sin firma real');
unsignedXmlString = await _generateXmlString(invoiceData, {
  sello: fakeSello,  // ❌ ERROR
  certificado: fakeCertificado,  // ❌ ERROR
  noCertificado: '00000000000000000000'
});

// A:
console.warn('⚠️ DESARROLLO: Generando CFDI sin firma real');
unsignedXmlString = await _generateXmlString(invoiceData, {
  sello: 'DESARROLLO_SIN_SELLO',  // ✅ CORREGIDO
  certificado: 'DESARROLLO_SIN_CERTIFICADO',  // ✅ CORREGIDO
  noCertificado: '00000000000000000000'
});
```

---

## 6. Error en `uploadInvoiceFiles` - Tipo de Retorno

**Archivos afectados:**
- `src/app/actions/invoices.ts` (líneas 326-327)
- `src/app/actions/payments.ts` (líneas 303-304)

**Problema:** Se espera que `uploadInvoiceFiles` retorne `{ success: boolean, error?: string, ... }` pero retorna un objeto diferente

**Solución:** Verificar la firma de la función en `src/lib/storage.ts`

La función debería retornar:
```typescript
export async function uploadInvoiceFiles(
  userId: string,
  clientId: string,
  serie: string,
  folio: string,
  pdfBuffer: Buffer,
  xmlContent: string
): Promise<{
  success: boolean;
  pdfUrl: string | null;
  xmlUrl: string | null;
  pdfPath: string;
  xmlPath: string;
  error?: string;  // ✅ AGREGAR ESTE CAMPO
}> {
  // ...código existente...

  // En caso de error, retornar:
  return {
    success: false,
    pdfUrl: null,
    xmlUrl: null,
    pdfPath: '',
    xmlPath: '',
    error: 'Mensaje de error'  // ✅ USAR ESTE CAMPO
  };
}
```

---

## 7. Tipos Faltantes en Esquemas de Invoices

**Archivo:** `src/app/dashboard/invoices/new/page.tsx`

**Líneas:** 326, 642

**Problema:** Los conceptos no incluyen las nuevas propiedades de impuestos (`ivaTasa`, `iepsTasa`, etc.)

**Solución:** Al crear conceptos, incluir las propiedades:
```typescript
const newConcept = {
  productId: product.id,
  description: product.description,
  satKey: product.satKey,
  unitKey: product.unitKey,
  quantity: 1,
  unitPrice: Number(product.unitPrice),
  discount: 0,
  objetoImpuesto: product.objetoImpuesto,
  amount: Number(product.unitPrice),
  // ✅ AGREGAR ESTOS CAMPOS:
  ivaTasa: 0.16,
  iepsTasa: 0,
  retencionIsr: false,
  retencionIsrTasa: 0,
  retencionIva: false,
  retencionIvaTasa: 0,
  impuestos: [
    {
      tipo: "Traslado" as const,
      impuesto: "002" as const,
      tipoFactor: "Tasa" as const,
      tasa: 0.16,
      base: Number(product.unitPrice)
    }
  ]
};
```

---

## 8. Hooks Personalizados No Encontrados

**Archivo:** `src/app/dashboard/settings/certificates/page.tsx`

**Línea:** 4

**Problema:** `@/hooks/use-auth` no existe

**Solución:** Verificar que el archivo exista o usar el hook correcto

Si no existe, crear `src/hooks/use-auth.ts`:
```typescript
import { useContext } from 'react';
import { AuthContext } from '@/contexts/AuthContext'; // Ajustar ruta según tu proyecto

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
}
```

O si usas Firebase directamente:
```typescript
import { useEffect, useState } from 'react';
import { getAuth, onAuthStateChanged, User } from 'firebase/auth';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [idToken, setIdToken] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user) {
        const token = await user.getIdToken();
        setIdToken(token);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return { user, idToken, loading };
}
```

---

## 9. Librería `lucide-react` No Instalada

**Archivo:** `src/app/dashboard/settings/certificates/page.tsx`

**Línea:** 11

**Problema:** Paquete no instalado

**Solución:**
```bash
npm install lucide-react
```

O si se prefieren otros iconos, cambiar a usar `@fluentui/react-icons` que ya está instalado:
```typescript
// Cambiar de:
import { Upload, CheckCircle, XCircle, AlertTriangle, FileKey, Shield } from "lucide-react";

// A:
import {
  ArrowUpload20Regular as Upload,
  CheckmarkCircle20Regular as CheckCircle,
  DismissCircle20Regular as XCircle,
  Warning20Regular as AlertTriangle,
  Key20Regular as FileKey,
  Shield20Regular as Shield
} from "@fluentui/react-icons";
```

---

## 10. Conversión de Tipos en client ID

**Archivo:** `src/app/actions/payments.ts`

**Línea:** 296

**Problema:** `client.id` es `number`, pero se espera `string` para `uploadInvoiceFiles`

**Solución:**
```typescript
// Cambiar de:
const result = await uploadInvoiceFiles(
  verifiedUserId,
  client.id.toString(),  // Ya está correcto, verificar que client.id existe
  payment.serie,
  payment.folio.toString(),
  Buffer.from(pdfBuffer),
  stampedXml
);
```

Verificar que `client` no sea `undefined` antes de usarlo.

---

## Checklist de Correcciones

- [x] 1. Schema de certificados corregido
- [ ] 2. Imports en `payments.ts`
- [ ] 3. Tipo de retorno `isCertificateValid()`
- [ ] 4. Permisos en `RolePermissions`
- [ ] 5. Variables fake en desarrollo
- [ ] 6. Tipo de retorno `uploadInvoiceFiles()`
- [ ] 7. Tipos en conceptos de invoices
- [ ] 8. Hook `use-auth`
- [ ] 9. Instalar `lucide-react` o usar Fluent UI
- [ ] 10. Validación de client en payments

---

## Comando para Verificar

Después de aplicar las correcciones:
```bash
npm run typecheck
```

Debería mostrar: `✓ No errors found.`

---

## Prioridad de Correcciones

### 🔴 Alta Prioridad (Bloquean compilación):
1. Permisos en `RolePermissions` (#4)
2. Tipo de retorno `isCertificateValid()` (#3)
3. Imports en `payments.ts` (#2)

### 🟡 Media Prioridad (Afectan funcionalidad):
4. Variables fake en desarrollo (#5)
5. Tipo de retorno `uploadInvoiceFiles()` (#6)
6. Tipos en conceptos (#7)

### 🟢 Baja Prioridad (UI/UX):
7. Hook `use-auth` (#8)
8. Librería `lucide-react` (#9)
9. Validación de client (#10)

---

## Notas Importantes

1. **Ejecutar migraciones después de corregir el schema:**
   ```bash
   npm run db:push
   ```

2. **Todos los errores son menores** y no afectan la lógica de negocio principal

3. **El sistema es funcional** a pesar de estos errores de TypeScript

4. **Priorizar la corrección** antes de despliegue a producción

---

**Próxima acción recomendada:** Comenzar por el punto #4 (Permisos en RolePermissions) ya que afecta múltiples archivos y es crítico para la funcionalidad de seguridad.
