
import {
  HomeRegular,
  DocumentRegular,
  CreditCardRegular,
  PeopleRegular,
  DocumentSettingsRegular,
  DatabaseRegular,
  ChatRegular,
  SettingsRegular,
} from "@/icons/fluent";

export const navigationLinks = [
  {
    title: "Inicio",
    icon: HomeRegular,
    href: "/dashboard",
  },
  {
    title: "CFDI",
    icon: DocumentRegular,
    sublinks: [
      { href: "/dashboard/invoices/new", label: "Crear Facturas 4.0" },
      { href: "/dashboard/invoices", label: "Facturas" },
      { href: "/dashboard/invoices/pending", label: "Facturas Pendientes" },
      { href: "/dashboard/invoices/canceled", label: "Facturas Canceladas" },
    ],
  },
  {
    title: "Pagos",
    icon: CreditCardRegular,
    sublinks: [
      { href: "/dashboard/payments/new", label: "Crear Pagos 4.0" },
      { href: "/dashboard/payments", label: "Pagos" },
      { href: "/dashboard/payments/canceled", label: "Pagos Cancelados" },
    ],
  },
  {
    title: "Empresa",
    icon: PeopleRegular,
    sublinks: [
      { href: "/dashboard/clients/new", label: "Crear Clientes" },
      { href: "/dashboard/clients", label: "Clientes" },
      { href: "/dashboard/products/new", label: "Crear Productos" },
      { href: "/dashboard/products", label: "Productos" },
      { href: "/dashboard/settings/series/new", label: "Crear Series y Folios" },
      { href: "/dashboard/settings/series", label: "Series y Folios" },
      { href: "/dashboard/settings/bank-accounts/new", label: "Crear Cuentas Bancarias" },
      { href: "/dashboard/settings/bank-accounts", label: "Cuentas Bancarias" },
    ],
  },
  {
    title: "Configuración CFDI 4.0",
    icon: DocumentSettingsRegular,
    sublinks: [
      { href: "/dashboard/settings/document-types", label: "Tipos de documentos" },
    ],
  },
  {
    title: "Almacenamiento",
    icon: DatabaseRegular,
    sublinks: [
      { href: "/dashboard/storage/deleted-invoices", label: "CFDI Eliminados" },
      { href: "/dashboard/storage/deleted-payments", label: "Pagos Eliminados" },
    ],
  },
  {
    title: "Ayuda",
    icon: ChatRegular,
    sublinks: [
      { href: "#", label: "BD de Conocimiento" },
      { href: "#", label: "Manual del usuario" },
      { href: "#", label: "Solicitud de soporte/quejas" },
      { href: "#", label: "Tutorial del usuario" },
      { href: "#", label: "Preguntas Frecuentes" },
    ],
  },
  {
    title: "Configuracion",
    icon: SettingsRegular,
    sublinks: [
      { href: "/dashboard/settings", label: "Perfil de Empresa" },
      { href: "/dashboard/settings", label: "Mi Cuenta" },
      { href: "/dashboard/settings", label: "Integraciones" },
    ],
  },
];
