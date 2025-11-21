
import {
  HomeRegular,
  DocumentRegular,
  CreditCardRegular,
  PeopleRegular,
  DocumentSettingsRegular,
  DatabaseRegular,
  ChatRegular,
  SettingsRegular,
  PersonRegular,
} from "@/icons/fluent";
import type { UserRole } from "@/lib/roles";
import type { RolePermissions } from "@/lib/roles";

interface NavLink {
  href: string;
  label: string;
  permission?: keyof RolePermissions;
}

interface NavItem {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  sublinks?: NavLink[];
  permission?: keyof RolePermissions;
}

export const navigationLinks: NavItem[] = [
  {
    title: "Inicio",
    icon: HomeRegular,
    href: "/dashboard",
  },
  {
    title: "CFDI",
    icon: DocumentRegular,
    permission: 'canCreateInvoices',
    sublinks: [
      { href: "/dashboard/invoices/new", label: "Crear Facturas 4.0", permission: 'canCreateInvoices' },
      { href: "/dashboard/invoices", label: "Facturas", permission: 'canCreateInvoices' },
      { href: "/dashboard/invoices/pending", label: "Facturas Pendientes", permission: 'canCreateInvoices' },
      { href: "/dashboard/invoices/canceled", label: "Facturas Canceladas", permission: 'canCancelInvoices' },
    ],
  },
  {
    title: "Pagos",
    icon: CreditCardRegular,
    permission: 'canCreatePayments',
    sublinks: [
      { href: "/dashboard/payments/new", label: "Crear Pagos 4.0", permission: 'canCreatePayments' },
      { href: "/dashboard/payments", label: "Pagos", permission: 'canCreatePayments' },
      { href: "/dashboard/payments/canceled", label: "Pagos Cancelados", permission: 'canCancelPayments' },
    ],
  },
  {
    title: "Empresa",
    icon: PeopleRegular,
    permission: 'canManageClients',
    sublinks: [
      { href: "/dashboard/clients/new", label: "Crear Clientes", permission: 'canManageClients' },
      { href: "/dashboard/clients", label: "Clientes", permission: 'canManageClients' },
      { href: "/dashboard/products/new", label: "Crear Productos", permission: 'canManageProducts' },
      { href: "/dashboard/products", label: "Productos", permission: 'canManageProducts' },
      { href: "/dashboard/settings/series/new", label: "Crear Series y Folios", permission: 'canManageSeries' },
      { href: "/dashboard/settings/series", label: "Series y Folios", permission: 'canManageSeries' },
      { href: "/dashboard/settings/bank-accounts/new", label: "Crear Cuentas Bancarias", permission: 'canManageBankAccounts' },
      { href: "/dashboard/settings/bank-accounts", label: "Cuentas Bancarias", permission: 'canManageBankAccounts' },
    ],
  },
  {
    title: "Configuración CFDI 4.0",
    icon: DocumentSettingsRegular,
    permission: 'canManageSettings',
    sublinks: [
      { href: "/dashboard/settings/document-types", label: "Tipos de documentos", permission: 'canManageSettings' },
    ],
  },
  {
    title: "Usuarios",
    icon: PersonRegular,
    permission: 'canManageUsers',
    sublinks: [
      { href: "/dashboard/users", label: "Gestionar Usuarios", permission: 'canManageUsers' },
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
    permission: 'canManageSettings',
    sublinks: [
      { href: "/dashboard/settings", label: "Perfil de Empresa", permission: 'canManageSettings' },
      { href: "/dashboard/settings", label: "Mi Cuenta", permission: 'canManageSettings' },
      { href: "/dashboard/settings", label: "Integraciones", permission: 'canManageSettings' },
    ],
  },
];

/**
 * Filtra los enlaces de navegación según el rol del usuario
 */
export function filterNavigationByRole(role: UserRole | null): NavItem[] {
  if (!role) return [];

  // Importación dinámica para evitar problemas de circular dependency
  const { hasPermission } = require('@/lib/roles');

  return navigationLinks
    .filter((item) => {
      // Si el item tiene un permiso requerido, verificar que el usuario lo tenga
      if (item.permission) {
        return hasPermission(role, item.permission);
      }
      // Si no tiene permiso requerido, siempre mostrar (como "Inicio" y "Ayuda")
      return true;
    })
    .map((item) => {
      // Filtrar sublinks también
      if (item.sublinks) {
        const filteredSublinks = item.sublinks.filter((link) => {
          if (link.permission) {
            return hasPermission(role, link.permission);
          }
          return true;
        });
        return { ...item, sublinks: filteredSublinks };
      }
      return item;
    })
    .filter((item) => {
      // Si después de filtrar sublinks, el item no tiene sublinks y no tiene href directo, ocultarlo
      if (item.sublinks && item.sublinks.length === 0 && !item.href) {
        return false;
      }
      return true;
    });
}
