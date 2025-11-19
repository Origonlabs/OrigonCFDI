/**
 * Sistema de roles y permisos para OrigonCFDI
 */

export type UserRole = 'admin' | 'company' | 'accountant' | 'client';

export interface RolePermissions {
  canCreateInvoices: boolean;
  canEditInvoices: boolean;
  canCancelInvoices: boolean;
  canCreatePayments: boolean;
  canEditPayments: boolean;
  canCancelPayments: boolean;
  canManageClients: boolean;
  canManageProducts: boolean;
  canManageSeries: boolean;
  canManageBankAccounts: boolean;
  canManageSettings: boolean;
  canViewReports: boolean;
  canManageUsers: boolean;
  canManageCertificates: boolean;
}

/**
 * Permisos por rol
 */
export const rolePermissions: Record<UserRole, RolePermissions> = {
  admin: {
    canCreateInvoices: true,
    canEditInvoices: true,
    canCancelInvoices: true,
    canCreatePayments: true,
    canEditPayments: true,
    canCancelPayments: true,
    canManageClients: true,
    canManageProducts: true,
    canManageSeries: true,
    canManageBankAccounts: true,
    canManageSettings: true,
    canViewReports: true,
    canManageUsers: true,
    canManageCertificates: true,
  },
  company: {
    canCreateInvoices: true,
    canEditInvoices: true,
    canCancelInvoices: true,
    canCreatePayments: true,
    canEditPayments: true,
    canCancelPayments: true,
    canManageClients: true,
    canManageProducts: true,
    canManageSeries: true,
    canManageBankAccounts: true,
    canManageSettings: true,
    canViewReports: true,
    canManageUsers: false,
    canManageCertificates: true,
  },
  accountant: {
    canCreateInvoices: true,
    canEditInvoices: true,
    canCancelInvoices: false,
    canCreatePayments: true,
    canEditPayments: true,
    canCancelPayments: false,
    canManageClients: true,
    canManageProducts: true,
    canManageSeries: false,
    canManageBankAccounts: false,
    canManageSettings: false,
    canViewReports: true,
    canManageUsers: false,
    canManageCertificates: false,
  },
  client: {
    canCreateInvoices: false,
    canEditInvoices: false,
    canCancelInvoices: false,
    canCreatePayments: false,
    canEditPayments: false,
    canCancelPayments: false,
    canManageClients: false,
    canManageProducts: false,
    canManageSeries: false,
    canManageBankAccounts: false,
    canManageSettings: false,
    canViewReports: false,
    canManageUsers: false,
    canManageCertificates: false,
  },
};

/**
 * Obtiene los permisos de un rol
 */
export function getRolePermissions(role: UserRole): RolePermissions {
  return rolePermissions[role];
}

/**
 * Verifica si un rol tiene un permiso específico
 */
export function hasPermission(role: UserRole, permission: keyof RolePermissions): boolean {
  return rolePermissions[role][permission];
}

/**
 * Verifica si un rol puede realizar una acción
 */
export function canPerformAction(role: UserRole, action: keyof RolePermissions): boolean {
  return hasPermission(role, action);
}

/**
 * Obtiene el nombre legible de un rol
 */
export function getRoleDisplayName(role: UserRole): string {
  const names: Record<UserRole, string> = {
    admin: 'Administrador',
    company: 'Empresa',
    accountant: 'Contador',
    client: 'Cliente',
  };
  return names[role];
}

/**
 * Obtiene la descripción de un rol
 */
export function getRoleDescription(role: UserRole): string {
  const descriptions: Record<UserRole, string> = {
    admin: 'Acceso completo al sistema. Puede gestionar usuarios, configuraciones y todos los recursos.',
    company: 'Acceso completo a facturación y gestión de su empresa. Puede crear y administrar CFDI, clientes y productos.',
    accountant: 'Puede crear y editar facturas y pagos, pero no puede cancelar documentos ni modificar configuraciones.',
    client: 'Acceso de solo lectura. Puede ver sus facturas y documentos relacionados.',
  };
  return descriptions[role];
}

