# OrigonCFDI — Arquitectura

## Resumen
- Frontend: Next.js (App Router) + React + Tailwind.
- Backend: Acciones de servidor en el propio Next ("use server").
- Datos: Postgres (Neon) + Drizzle ORM.
- Archivos: Firebase Storage (vía Admin SDK).
- Autenticación: Firebase Auth (cliente).
- Ratelimit: Upstash Redis (opcional, con fallback sin bloqueo en dev).

## Módulos principales
- `src/app`: páginas, layouts y acciones de servidor.
- `src/lib`: integraciones (Drizzle/Neon, Firebase, PAC, validaciones Zod, utilidades).
- `drizzle/schema.ts`: esquema relacional (clientes, facturas, items, pagos, series, etc.).

## Flujo de emisión
1) Usuario crea factura (cliente, conceptos, forma/método de pago).
2) Se guarda como borrador en Postgres (tabla `invoices` + `invoice_items`).
3) Se genera XML (placeholder de sello/certificado en desarrollo) y se envía al PAC.
4) El PAC devuelve XML timbrado (UUID, FechaTimbrado).
5) Se actualiza la factura a `stamped` con `uuid` y `stampDate`.
6) Se genera PDF con `pdf-lib` y se suben PDF/XML a Firebase Storage.

## Seguridad
- Ratelimit por usuario en acciones sensibles.
- Variables de entorno separadas para cliente/servidor.
- Actualmente, los archivos timbrados se marcan `public` en Storage. Para producción, considerar URLs firmadas o reglas de acceso por usuario.

## Entorno
Variables requeridas: ver `.env.example`.

## Notas
- El CSP no está configurado por defecto; puedes añadirlo en `next.config.js` (headers) si tu despliegue lo requiere.
- En desarrollo se usan certificados/sello “placeholder”. Sustituir por CSD reales en producción y ajustar el generador de XML.
