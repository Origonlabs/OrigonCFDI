
import { pgTable, serial, text, varchar, timestamp, numeric, integer, pgEnum, boolean } from "drizzle-orm/pg-core";

// --- Roles de Usuario ---
export const userRoleEnum = pgEnum('user_role', ['admin', 'company', 'accountant', 'client']);

// --- Usuarios ---
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull().unique(), // Firebase UID
  email: varchar('email', { length: 256 }).notNull().unique(),
  role: userRoleEnum('role').default('company').notNull(),
  // Multi-tenant: tenantId identifica la organización (18 caracteres alfanuméricos)
  // null = usuario sin organización (admin)
  // valor = ID único de la organización a la que pertenece
  tenantId: varchar('tenant_id', { length: 18 }).unique(),
  // ownerId vincula usuarios secundarios a la cuenta principal de la empresa
  // null = es una cuenta principal (company owner)
  // valor = userId del owner que creó este usuario (accountant, client)
  ownerId: varchar('owner_id', { length: 256 }),
  displayName: varchar('display_name', { length: 256 }),
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Solicitudes de Datos de Clientes ---
export const clientRequestStatusEnum = pgEnum('client_request_status', ['pending', 'completed', 'expired']);

export const clientRequests = pgTable('client_requests', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(), // Vendedor/Company que solicita
  tenantId: varchar('tenant_id', { length: 18 }), // Organización del solicitante
  token: varchar('token', { length: 64 }).notNull().unique(), // Token único para el link
  clientEmail: varchar('client_email', { length: 256 }), // Email del cliente (opcional)
  status: clientRequestStatusEnum('status').default('pending').notNull(),
  // Datos recibidos del cliente (JSON)
  clientData: text('client_data'), // JSON con todos los datos del formulario
  expiresAt: timestamp('expires_at').notNull(), // Link expira después de X días
  completedAt: timestamp('completed_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Clientes ---
export const clients = pgTable('clients', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  name: text('name').notNull(),
  rfc: varchar('rfc', { length: 13 }).notNull(),
  email: varchar('email', { length: 256 }).notNull(),
  zip: varchar('zip', { length: 5 }).notNull(),
  taxRegime: varchar('tax_regime', { length: 10 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),

  // Domicilio Fiscal
  country: text('country'),
  state: text('state'),
  municipality: text('municipality'),
  city: text('city'),
  neighborhood: text('neighborhood'),
  street: text('street'),
  exteriorNumber: varchar('exterior_number', { length: 50 }),
  interiorNumber: varchar('interior_number', { length: 50 }),

  // Contacto y Preferencias
  phone: varchar('phone', { length: 20 }),
  paymentMethod: varchar('payment_method', { length: 3 }),
  paymentForm: varchar('payment_form', { length: 3 }),
  usoCfdi: varchar('uso_cfdi', { length: 4 }),
  reference: text('reference'),
});

export const clientBankAccounts = pgTable('client_bank_accounts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  clientId: integer('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  bankRfc: varchar('bank_rfc', { length: 13 }).notNull(),
  bankName: text('bank_name').notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// --- Empresa del Usuario ---
export const companies = pgTable('companies', {
    id: serial('id').primaryKey(),
    userId: varchar('user_id', { length: 256 }).notNull().unique(),
    companyName: text('company_name').notNull(),
    rfc: varchar('rfc', { length: 13 }).notNull(),
    taxRegime: varchar('tax_regime', { length: 10 }).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
    
    // Domicilio Fiscal
    street: text('street'),
    exteriorNumber: varchar('exterior_number', { length: 50 }),
    interiorNumber: varchar('interior_number', { length: 50 }),
    neighborhood: text('neighborhood'),
    municipality: text('municipality'),
    state: text('state'),
    city: text('city'),
    zip: varchar('zip', { length: 5 }),

    // Contacto
    phone: varchar('phone', { length: 20 }),
    phone2: varchar('phone2', { length: 20 }),
    fax: varchar('fax', { length: 20 }),
    contadorEmail: varchar('contador_email', { length: 256 }),
    web: varchar('web', { length: 256 }),
    
    // Configuración
    commercialMessage: text('commercial_message'),
    logoUrl: varchar('logo_url', { length: 256 }),
    defaultEmailMessage: text('default_email_message'),
    templateCfdi33: varchar('template_cfdi_33', { length: 50 }),
    templateCfdi40: varchar('template_cfdi_40', { length: 50 }),
    templateRep: varchar('template_rep', { length: 50 }),
    customDomain: varchar('custom_domain', { length: 256 }), // Dominio personalizado para links públicos
});

export const certificateStatusEnum = pgEnum('certificate_status', ['active', 'revoked', 'expired']);

export const csdCertificates = pgTable('csd_certificates', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  certificateNumber: varchar('certificate_number', { length: 64 }).notNull().unique(),
  rfc: varchar('rfc', { length: 13 }).notNull(),
  validFrom: timestamp('valid_from').notNull(),
  validTo: timestamp('valid_to').notNull(),
  status: certificateStatusEnum('status').default('active').notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  privateKey: text('private_key').notNull(),
  certificate: text('certificate').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// --- Productos y Servicios ---
export const products = pgTable('products', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  code: varchar('code', { length: 50 }),
  description: text('description').notNull(),
  satKey: varchar('sat_key', { length: 8 }).notNull(),
  unitKey: varchar('unit_key', { length: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  objetoImpuesto: varchar('objeto_impuesto', { length: 2 }).notNull(),
  imageUrl: varchar('image_url', { length: 512 }), // URL de la imagen del producto
  createdAt: timestamp('created_at').defaultNow().notNull(),
});


// --- Facturas (CFDI) ---
export const invoiceStatusEnum = pgEnum('invoice_status', ['draft', 'stamped', 'canceled']);

export const invoices = pgTable('invoices', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  serie: varchar('serie', { length: 10 }).notNull(),
  folio: integer('folio').notNull(),
  usoCfdi: varchar('uso_cfdi', { length: 4 }).notNull(),
  formaPago: varchar('forma_pago', { length: 3 }).notNull(),
  metodoPago: varchar('metodo_pago', { length: 3 }).notNull(),
  condicionesPago: text('condiciones_pago'),
  subtotal: numeric('subtotal', { precision: 10, scale: 2 }).notNull(),
  discounts: numeric('discounts', { precision: 10, scale: 2 }).default('0').notNull(),
  iva: numeric('iva', { precision: 10, scale: 2 }).notNull(),
  retenciones: numeric('retenciones', { precision: 10, scale: 2 }).default('0').notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(),
  status: invoiceStatusEnum('status').default('draft').notNull(),
  tipoComprobante: varchar('tipo_comprobante', { length: 1 }).default('I').notNull(), // I=Ingreso, E=Egreso, T=Traslado, P=Pago
  relationType: varchar('relation_type', { length: 2 }), // Tipo de relación con otros CFDI
  relatedCfdis: text('related_cfdis'), // JSON con UUIDs de CFDI relacionados
  pdfUrl: text('pdf_url'),
  xmlUrl: text('xml_url'),
  pdfPath: text('pdf_path'), // Ruta en Storage para regenerar URL firmada
  xmlPath: text('xml_path'), // Ruta en Storage para regenerar URL firmada
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  uuid: varchar('uuid', { length: 36 }),
  stampDate: timestamp('stamp_date'),
});

export const invoiceItems = pgTable('invoice_items', {
  id: serial('id').primaryKey(),
  invoiceId: integer('invoice_id').references(() => invoices.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  description: text('description').notNull(),
  satKey: varchar('sat_key', { length: 8 }).notNull(),
  unitKey: varchar('unit_key', { length: 3 }).notNull(),
  unitPrice: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  quantity: integer('quantity').notNull(),
  discount: numeric('discount', { precision: 10, scale: 2 }).default('0').notNull(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  objetoImpuesto: varchar('objeto_impuesto', { length: 2 }).default('02').notNull(), // 01=No objeto, 02=Sí objeto
  ivaRate: numeric('iva_rate', { precision: 10, scale: 6 }).default('0.160000').notNull(), // Tasa de IVA (0.16, 0.08, 0.00)
  iepsRate: numeric('ieps_rate', { precision: 10, scale: 6 }).default('0.000000').notNull(), // Tasa de IEPS si aplica
  isrRetentionRate: numeric('isr_retention_rate', { precision: 10, scale: 6 }).default('0.000000').notNull(), // Retención ISR
  ivaRetentionRate: numeric('iva_retention_rate', { precision: 10, scale: 6 }).default('0.000000').notNull(), // Retención IVA
});

// --- Pagos (REP) ---
export const paymentStatusEnum = pgEnum('payment_status', ['draft', 'stamped', 'canceled']);

export const payments = pgTable('payments', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  clientId: integer('client_id').references(() => clients.id).notNull(),
  serie: varchar('serie', { length: 10 }).notNull(),
  folio: integer('folio').notNull(),
  paymentDate: timestamp('payment_date').notNull(),
  paymentForm: varchar('payment_form', { length: 3 }).notNull(),
  currency: varchar('currency', { length: 3 }).default('MXN').notNull(),
  totalAmount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  status: paymentStatusEnum('status').default('draft').notNull(),
  pdfUrl: text('pdf_url'),
  xmlUrl: text('xml_url'),
  pdfPath: text('pdf_path'), // Ruta en Storage para regenerar URL firmada
  xmlPath: text('xml_path'), // Ruta en Storage para regenerar URL firmada
  uuid: varchar('uuid', { length: 36 }),
  stampDate: timestamp('stamp_date'),
  operationNumber: varchar('operation_number', { length: 100 }),
  relationType: varchar('relation_type', { length: 2 }),
  relatedCfdis: text('related_cfdis'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const paymentDocuments = pgTable('payment_documents', {
  id: serial('id').primaryKey(),
  paymentId: integer('payment_id').references(() => payments.id, { onDelete: 'cascade' }).notNull(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  invoiceId: integer('invoice_id').references(() => invoices.id).notNull(),
  uuid: varchar('uuid', { length: 36 }).notNull(),
  serie: varchar('serie', { length: 10 }).notNull(),
  folio: varchar('folio', {length: 50}).notNull(),
  currency: varchar('currency', { length: 3 }).notNull(),
  exchangeRate: numeric('exchange_rate', { precision: 10, scale: 6 }).default('1').notNull(),
  paymentMethod: varchar('payment_method', { length: 3 }).notNull(),
  partialityNumber: integer('partiality_number').notNull(),
  previousBalance: numeric('previous_balance', { precision: 10, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 10, scale: 2 }).notNull(),
  outstandingBalance: numeric('outstanding_balance', { precision: 10, scale: 2 }).notNull(),
});


// --- Configuración General ---
export const series = pgTable('series', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  serie: varchar('serie', { length: 10 }).notNull(),
  folio: integer('folio').notNull(),
  documentType: varchar('document_type', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const bankAccounts = pgTable('bank_accounts', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull(),
  bankRfc: varchar('bank_rfc', { length: 13 }).notNull(),
  bankName: text('bank_name').notNull(),
  shortName: text('short_name').notNull(),
  accountNumber: varchar('account_number', { length: 50 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  isActive: boolean('is_active').default(true).notNull(),
  isDefault: boolean('is_default').default(false).notNull(),
});

// --- Suscripciones de la App ---
export const subscriptionStatusEnum = pgEnum('subscription_status', ['active', 'canceled', 'past_due', 'unpaid']);

export const subscriptions = pgTable('subscriptions', {
  id: serial('id').primaryKey(),
  userId: varchar('user_id', { length: 256 }).notNull().unique(),
  planName: text('plan_name').notNull(),
  status: subscriptionStatusEnum('status').notNull(),
  paymentProvider: text('payment_provider'), // e.g., 'stripe', 'paypal'
  providerSubscriptionId: text('provider_subscription_id').unique(),
  currentPeriodStart: timestamp('current_period_start').notNull(),
  currentPeriodEnd: timestamp('current_period_end').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});
