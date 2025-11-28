DO $$ BEGIN
 CREATE TYPE "public"."certificate_status" AS ENUM('active', 'revoked', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."client_request_status" AS ENUM('pending', 'completed', 'expired');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."invoice_status" AS ENUM('draft', 'stamped', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."payment_status" AS ENUM('draft', 'stamped', 'canceled');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."subscription_status" AS ENUM('active', 'canceled', 'past_due', 'unpaid');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."user_role" AS ENUM('admin', 'company', 'accountant', 'client');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"bank_rfc" varchar(13) NOT NULL,
	"bank_name" text NOT NULL,
	"short_name" text NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_bank_accounts" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"client_id" integer NOT NULL,
	"bank_rfc" varchar(13) NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" varchar(50) NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "client_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"tenant_id" varchar(18),
	"token" varchar(64) NOT NULL,
	"client_email" varchar(256),
	"status" "client_request_status" DEFAULT 'pending' NOT NULL,
	"client_data" text,
	"expires_at" timestamp NOT NULL,
	"completed_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "client_requests_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "clients" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"name" text NOT NULL,
	"rfc" varchar(13) NOT NULL,
	"email" varchar(256) NOT NULL,
	"zip" varchar(5) NOT NULL,
	"tax_regime" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"country" text,
	"state" text,
	"municipality" text,
	"city" text,
	"neighborhood" text,
	"street" text,
	"exterior_number" varchar(50),
	"interior_number" varchar(50),
	"phone" varchar(20),
	"payment_method" varchar(3),
	"payment_form" varchar(3),
	"uso_cfdi" varchar(4),
	"reference" text
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "companies" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"company_name" text NOT NULL,
	"rfc" varchar(13) NOT NULL,
	"tax_regime" varchar(10) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"street" text,
	"exterior_number" varchar(50),
	"interior_number" varchar(50),
	"neighborhood" text,
	"municipality" text,
	"state" text,
	"city" text,
	"zip" varchar(5),
	"phone" varchar(20),
	"phone2" varchar(20),
	"fax" varchar(20),
	"contador_email" varchar(256),
	"web" varchar(256),
	"commercial_message" text,
	"logo_url" varchar(256),
	"default_email_message" text,
	"template_cfdi_33" varchar(50),
	"template_cfdi_40" varchar(50),
	"template_rep" varchar(50),
	"custom_domain" varchar(256),
	"brand_primary_color" varchar(7) DEFAULT '#5B47DB',
	"brand_secondary_color" varchar(7) DEFAULT '#E8E5FA',
	"brand_accent_color" varchar(7) DEFAULT '#B19EEF',
	"brand_text_color" varchar(7) DEFAULT '#1F2937',
	"brand_background_color" varchar(7) DEFAULT '#F1F1F1',
	"form_welcome_message" text,
	"form_footer_message" text,
	"pac_provider" varchar(50),
	"pac_environment" varchar(20) DEFAULT 'test',
	"pac_username" varchar(256),
	"pac_password" text,
	"pac_api_key" text,
	"pac_api_url" varchar(512),
	"pac_webhook_url" varchar(512),
	"pac_is_active" boolean DEFAULT false,
	"pac_last_test" timestamp,
	"pac_last_error" text,
	CONSTRAINT "companies_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "csd_certificates" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"certificate_number" varchar(64) NOT NULL,
	"rfc" varchar(13) NOT NULL,
	"valid_from" timestamp NOT NULL,
	"valid_to" timestamp NOT NULL,
	"status" "certificate_status" DEFAULT 'active' NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"private_key" text NOT NULL,
	"certificate" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "csd_certificates_certificate_number_unique" UNIQUE("certificate_number")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoice_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"invoice_id" integer NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"description" text NOT NULL,
	"sat_key" varchar(8) NOT NULL,
	"unit_key" varchar(3) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"quantity" integer NOT NULL,
	"discount" numeric(10, 2) DEFAULT '0' NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"objeto_impuesto" varchar(2) DEFAULT '02' NOT NULL,
	"iva_rate" numeric(10, 6) DEFAULT '0.160000' NOT NULL,
	"ieps_rate" numeric(10, 6) DEFAULT '0.000000' NOT NULL,
	"isr_retention_rate" numeric(10, 6) DEFAULT '0.000000' NOT NULL,
	"iva_retention_rate" numeric(10, 6) DEFAULT '0.000000' NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "invoices" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"client_id" integer NOT NULL,
	"serie" varchar(10) NOT NULL,
	"folio" integer NOT NULL,
	"uso_cfdi" varchar(4) NOT NULL,
	"forma_pago" varchar(3) NOT NULL,
	"metodo_pago" varchar(3) NOT NULL,
	"condiciones_pago" text,
	"subtotal" numeric(10, 2) NOT NULL,
	"discounts" numeric(10, 2) DEFAULT '0' NOT NULL,
	"iva" numeric(10, 2) NOT NULL,
	"retenciones" numeric(10, 2) DEFAULT '0' NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"status" "invoice_status" DEFAULT 'draft' NOT NULL,
	"tipo_comprobante" varchar(1) DEFAULT 'I' NOT NULL,
	"relation_type" varchar(2),
	"related_cfdis" text,
	"pdf_url" text,
	"xml_url" text,
	"pdf_path" text,
	"xml_path" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"uuid" varchar(36),
	"stamp_date" timestamp
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payment_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"payment_id" integer NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"invoice_id" integer NOT NULL,
	"uuid" varchar(36) NOT NULL,
	"serie" varchar(10) NOT NULL,
	"folio" varchar(50) NOT NULL,
	"currency" varchar(3) NOT NULL,
	"exchange_rate" numeric(10, 6) DEFAULT '1' NOT NULL,
	"payment_method" varchar(3) NOT NULL,
	"partiality_number" integer NOT NULL,
	"previous_balance" numeric(10, 2) NOT NULL,
	"amount_paid" numeric(10, 2) NOT NULL,
	"outstanding_balance" numeric(10, 2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"client_id" integer NOT NULL,
	"serie" varchar(10) NOT NULL,
	"folio" integer NOT NULL,
	"payment_date" timestamp NOT NULL,
	"payment_form" varchar(3) NOT NULL,
	"currency" varchar(3) DEFAULT 'MXN' NOT NULL,
	"total_amount" numeric(10, 2) NOT NULL,
	"status" "payment_status" DEFAULT 'draft' NOT NULL,
	"pdf_url" text,
	"xml_url" text,
	"pdf_path" text,
	"xml_path" text,
	"uuid" varchar(36),
	"stamp_date" timestamp,
	"operation_number" varchar(100),
	"relation_type" varchar(2),
	"related_cfdis" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "products" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"code" varchar(50),
	"description" text NOT NULL,
	"sat_key" varchar(8) NOT NULL,
	"unit_key" varchar(3) NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"objeto_impuesto" varchar(2) NOT NULL,
	"image_url" varchar(512),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "series" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"serie" varchar(10) NOT NULL,
	"folio" integer NOT NULL,
	"document_type" varchar(50) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "subscriptions" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"plan_name" text NOT NULL,
	"status" "subscription_status" NOT NULL,
	"payment_provider" text,
	"provider_subscription_id" text,
	"current_period_start" timestamp NOT NULL,
	"current_period_end" timestamp NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "subscriptions_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "subscriptions_provider_subscription_id_unique" UNIQUE("provider_subscription_id")
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "users" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(256) NOT NULL,
	"email" varchar(256) NOT NULL,
	"role" "user_role" DEFAULT 'company' NOT NULL,
	"tenant_id" varchar(18),
	"owner_id" varchar(256),
	"display_name" varchar(256),
	"is_active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_user_id_unique" UNIQUE("user_id"),
	CONSTRAINT "users_email_unique" UNIQUE("email"),
	CONSTRAINT "users_tenant_id_unique" UNIQUE("tenant_id")
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "client_bank_accounts" ADD CONSTRAINT "client_bank_accounts_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoice_items" ADD CONSTRAINT "invoice_items_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "invoices" ADD CONSTRAINT "invoices_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_documents" ADD CONSTRAINT "payment_documents_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE cascade ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payment_documents" ADD CONSTRAINT "payment_documents_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payments" ADD CONSTRAINT "payments_client_id_clients_id_fk" FOREIGN KEY ("client_id") REFERENCES "public"."clients"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
