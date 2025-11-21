'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase/client';
import { useUserRole } from '@/hooks/use-user-role';
import { getCompanyUsers, updateUserRole as updateUserRoleAction, createCompanyUser, toggleUserActive, deleteCompanyUser } from './actions';
import { getRoleDisplayName, getRoleDescription, type UserRole } from '@/lib/roles';
import { AddRegular, DeleteRegular } from '@/icons/fluent';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { AppleLoader } from '@/components/ui/apple-loader';

interface UserData {
  id: number;
  userId: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  ownerId: string | null;
  isActive: boolean;
  createdAt: string;
}

export default function UsersPage() {
  const [firebaseUser] = useAuthState(auth!);
  const { role: currentUserRole, loading: roleLoading } = useUserRole();
  const { toast } = useToast();

  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  // Form state
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('accountant');
  const [creating, setCreating] = useState(false);

  const loadUsers = async () => {
    if (!firebaseUser) return;

    try {
      const token = await firebaseUser.getIdToken();
      const result = await getCompanyUsers(firebaseUser.uid, token);

      if (result.success) {
        setUsers(result.data || []);
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los usuarios.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (firebaseUser && !roleLoading) {
      loadUsers();
    }
  }, [firebaseUser, roleLoading]);

  const handleRoleChange = async (targetUserId: string, newRole: UserRole) => {
    if (!firebaseUser) return;

    setUpdating(targetUserId);
    try {
      const token = await firebaseUser.getIdToken();
      const result = await updateUserRoleAction(firebaseUser.uid, targetUserId, newRole, token);

      if (result.success) {
        setUsers(users.map(u =>
          u.userId === targetUserId ? { ...u, role: newRole } : u
        ));
        toast({
          title: 'Rol actualizado',
          description: `El rol ha sido actualizado a ${getRoleDisplayName(newRole)}.`,
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el rol.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleToggleActive = async (targetUserId: string, isActive: boolean) => {
    if (!firebaseUser) return;

    setUpdating(targetUserId);
    try {
      const token = await firebaseUser.getIdToken();
      const result = await toggleUserActive(firebaseUser.uid, targetUserId, isActive, token);

      if (result.success) {
        setUsers(users.map(u =>
          u.userId === targetUserId ? { ...u, isActive } : u
        ));
        toast({
          title: isActive ? 'Usuario activado' : 'Usuario desactivado',
        });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo actualizar el usuario.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleDelete = async (targetUserId: string) => {
    if (!firebaseUser) return;
    if (!confirm('¿Estás seguro de eliminar este usuario?')) return;

    setUpdating(targetUserId);
    try {
      const token = await firebaseUser.getIdToken();
      const result = await deleteCompanyUser(firebaseUser.uid, targetUserId, token);

      if (result.success) {
        setUsers(users.filter(u => u.userId !== targetUserId));
        toast({ title: 'Usuario eliminado' });
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo eliminar el usuario.',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const handleCreateUser = async () => {
    if (!firebaseUser) return;

    if (!newUserEmail || !newUserName) {
      toast({
        title: 'Error',
        description: 'Por favor completa todos los campos.',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);
    try {
      const token = await firebaseUser.getIdToken();
      const result = await createCompanyUser(
        firebaseUser.uid,
        newUserEmail,
        newUserName,
        newUserRole,
        token
      );

      if (result.success) {
        toast({
          title: 'Usuario creado',
          description: result.message,
        });
        setIsDialogOpen(false);
        setNewUserEmail('');
        setNewUserName('');
        setNewUserRole('accountant');
        loadUsers();
      } else {
        toast({
          title: 'Error',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el usuario.',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  // Roles que puede asignar según el rol actual
  const availableRoles: UserRole[] = currentUserRole === 'admin'
    ? ['admin', 'company', 'accountant', 'client']
    : ['accountant', 'client'];

  if (loading || roleLoading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <AppleLoader />
      </div>
    );
  }

  if (currentUserRole !== 'admin' && currentUserRole !== 'company') {
    return (
      <div className="flex h-[50vh] flex-col items-center justify-center gap-4">
        <h1 className="text-2xl font-bold">Acceso Denegado</h1>
        <p className="text-muted-foreground">No tienes permisos para acceder a esta página.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Gestión de Usuarios</h1>
          <p className="text-muted-foreground">
            {currentUserRole === 'admin'
              ? 'Administra todos los usuarios del sistema.'
              : 'Administra los usuarios de tu empresa.'}
          </p>
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <AddRegular className="mr-2 h-4 w-4" />
              Crear Usuario
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Crear Nuevo Usuario</DialogTitle>
              <DialogDescription>
                El usuario recibirá una invitación por correo para acceder al sistema.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nombre</Label>
                <Input
                  id="name"
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Juan Pérez"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="email">Correo electrónico</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="usuario@empresa.com"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="role">Rol</Label>
                <Select value={newUserRole} onValueChange={(v) => setNewUserRole(v as UserRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((role) => (
                      <SelectItem key={role} value={role}>
                        {getRoleDisplayName(role)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {getRoleDescription(newUserRole)}
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleCreateUser} disabled={creating}>
                {creating ? 'Creando...' : 'Crear Usuario'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Usuario</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No hay usuarios registrados.
                </TableCell>
              </TableRow>
            ) : (
              users.map((user) => {
                const isCurrentUser = user.userId === firebaseUser?.uid;
                const canEdit = currentUserRole === 'admin' ||
                  (currentUserRole === 'company' && user.ownerId === firebaseUser?.uid);

                return (
                  <TableRow key={user.userId} className={!user.isActive ? 'opacity-50' : ''}>
                    <TableCell>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {user.displayName || 'Sin nombre'}
                        </span>
                        {isCurrentUser && (
                          <Badge variant="secondary" className="w-fit mt-1">Tú</Badge>
                        )}
                        {user.ownerId && currentUserRole === 'admin' && (
                          <span className="text-xs text-muted-foreground">
                            Pertenece a: {users.find(u => u.userId === user.ownerId)?.email || user.ownerId}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.email}
                    </TableCell>
                    <TableCell>
                      {canEdit && !isCurrentUser ? (
                        <Select
                          value={user.role}
                          onValueChange={(value) => handleRoleChange(user.userId, value as UserRole)}
                          disabled={updating === user.userId}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {availableRoles.map((role) => (
                              <SelectItem key={role} value={role}>
                                {getRoleDisplayName(role)}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Badge variant={user.role === 'admin' ? 'default' : 'outline'}>
                          {getRoleDisplayName(user.role)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {canEdit && !isCurrentUser ? (
                        <Switch
                          checked={user.isActive}
                          onCheckedChange={(checked) => handleToggleActive(user.userId, checked)}
                          disabled={updating === user.userId}
                        />
                      ) : (
                        <Badge variant={user.isActive ? 'default' : 'secondary'}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {new Date(user.createdAt).toLocaleDateString('es-MX')}
                    </TableCell>
                    <TableCell>
                      {canEdit && !isCurrentUser && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(user.userId)}
                          disabled={updating === user.userId}
                        >
                          <DeleteRegular className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      <div className="rounded-lg border p-4 bg-muted/50">
        <h3 className="font-semibold mb-2">Descripción de Roles</h3>
        <div className="grid gap-2 text-sm">
          {availableRoles.map((role) => (
            <div key={role} className="flex gap-2">
              <Badge variant="outline" className="shrink-0">{getRoleDisplayName(role)}</Badge>
              <span className="text-muted-foreground">{getRoleDescription(role)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
