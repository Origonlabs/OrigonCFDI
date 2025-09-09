# OrigonCFDI

OrigonCFDI es una aplicación privada construida con Next.js, TypeScript, Drizzle (Postgres) y Firebase para generar y administrar Comprobantes Fiscales Digitales por Internet (CFDI) en México.

## Características principales

- Autenticación de usuarios con Firebase Auth  
- CRUD de Clientes, Facturas y Cuentas Bancarias  
- Generación de PDF de CFDI con datos de cliente, desglose de impuestos y código QR  
- Integración con PAC (Proveedor Autorizado de Certificación) vía XML (xmlbuilder2)  
- Conversión de importes a letras (`numero-a-letras`)  
- Dashboard responsivo con el nuevo sistema de rutas `/app` de Next.js  
- Temas claros/oscuro con `next-themes`  
- (Opcional) Políticas de seguridad HTTP vía Content Security Policy

## Tecnologías

- Next.js (App Router)  
- React + TypeScript  
- Firebase (Auth, Storage)  
- Drizzle ORM + Postgres (configurado en `drizzle.config.ts`)  
- xmlbuilder2 para armado de XML CFDI  
- `pdf-lib` para generar PDF  
- Tailwind CSS + componentes personalizados  
- Zod + React Hook Form para validación  
- ESLint, Prettier

## Instalación y puesta en marcha

1. Clona el repositorio (acceso privado)  
2. Copia `.env.example` a `.env.local` y define:
   - NEXT_PUBLIC_FIREBASE_API_KEY  
   - NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN  
   - NEXT_PUBLIC_FIREBASE_PROJECT_ID  
   - NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET  
   - NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID  
   - NEXT_PUBLIC_FIREBASE_APP_ID  
   - FIREBASE_SERVICE_ACCOUNT_JSON (JSON en una sola línea)  
   - DATABASE_URL (cadena de conexión Postgres/Neon)  
   - FACTURALOPLUS_USER, FACTURALOPLUS_API_KEY  
   - (Opcional) UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN
3. Instala dependencias  
   ```bash
   npm install
   ```
4. Ejecuta en modo desarrollo  
   ```bash
   npm run dev
   ```
5. Para producción:  
   ```bash
   npm run build
   npm start
   ```

## Estructura del proyecto

```text
/
├─ src/
│  ├─ app/               # Rutas de Next.js (páginas y layouts)
│  ├─ components/        # Componentes UI reutilizables
│  ├─ lib/               # Integraciones (Firebase, PAC, utilidades)
│  ├─ types/             # Declaraciones y esquemas Zod
│  └─ styles/            # Estilos globales y configuración Tailwind
├─ drizzle.config.ts     # Configuración de ORM
├─ next.config.js        # Configuración de Next.js
├─ .env.example
└─ package.json
```

## Flujo de emisión de CFDI

1. El usuario crea o selecciona un cliente  
2. Genera la factura con detalle de productos/servicios  
3. Se arma el XML con xmlbuilder2 y se envía al PAC  
4. El PAC devuelve el XML timbrado con sello digital  
5. Se genera el PDF y el código QR para descarga/visualización  
6. Se guarda el registro en la base de datos (Postgres/Drizzle) y los archivos (PDF/XML) en Firebase Storage

## Testing

- Aún no hay una suite de tests incluida en el repo.  
- Recomendado: habilitar `npm run typecheck` y `next lint` en CI/CD.

## Mantenimiento

- Asegúrate de mantener actualizadas las credenciales del PAC y Firebase.  
- Revisa `next.config.js` si agregas nuevos dominios de imágenes.  
- Actualiza `drizzle.config.ts` y tus migraciones cuando modifiques el esquema de la base de datos.

Nota: Los archivos timbrados (PDF/XML) se publican actualmente en Firebase Storage. Para entornos productivos, considera restringir acceso (URLs firmadas o reglas por usuario) en lugar de `makePublic()`.

---

**Este proyecto es propietario y no está autorizado su uso parcial o total sin el consentimiento expreso por escrito de los autores.**
