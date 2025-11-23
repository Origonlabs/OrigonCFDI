'use client';

import { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import { auth, firebaseEnabled } from '@/lib/firebase/client';
import { getPendingClientRequests, approveClientRequest } from '@/app/actions/client-requests';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { CheckmarkCircleRegular, ClockRegular, ErrorCircleRegular, EyeRegular } from '@/icons/fluent';
import { ViewClientRequestDialog } from '@/components/view-client-request-dialog';

export default function ClientRequestsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<any>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!firebaseEnabled) {
      console.warn('Firebase is not enabled');
      setLoading(false);
      return;
    }

    if (!auth) {
      setLoading(false);
      return;
    }

    const unsubscribe = auth.onAuthStateChanged((user) => {
      setUser(user);
      if (user) {
        loadRequests(user);
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  async function loadRequests(currentUser: User) {
    setLoading(true);
    const idToken = await currentUser.getIdToken();
    const result = await getPendingClientRequests(currentUser.uid, idToken);

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setRequests(result.requests || []);
    setLoading(false);
  }

  function handleCopyLink(token: string) {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const link = `${baseUrl}/client-form/${token}`;
    navigator.clipboard.writeText(link);
    toast({
      title: 'Copiado',
      description: 'Link copiado al portapapeles.',
    });
  }

  function handleViewRequest(request: any) {
    setSelectedRequest(request);
    setIsDialogOpen(true);
  }

  async function handleApproveRequest(requestId: number) {
    if (!user) return;

    const idToken = await user.getIdToken();
    const result = await approveClientRequest(requestId, user.uid, idToken);

    if (result.success) {
      // Recargar solicitudes
      loadRequests(user);
    } else {
      throw new Error(result.message);
    }
  }

  function getStatusBadge(status: string, expiresAt: string) {
    const now = new Date();
    const expires = new Date(expiresAt);

    if (status === 'completed') {
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckmarkCircleRegular className="mr-1 h-3 w-3" />
          Completado
        </Badge>
      );
    }

    if (now > expires) {
      return (
        <Badge variant="destructive">
          <ErrorCircleRegular className="mr-1 h-3 w-3" />
          Expirado
        </Badge>
      );
    }

    return (
      <Badge variant="secondary">
        <ClockRegular className="mr-1 h-3 w-3" />
        Pendiente
      </Badge>
    );
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  }

  if (loading) {
    return (
      <div className="flex flex-col p-4 gap-4 flex-1">
        <h1 className="text-lg font-bold font-headline">Solicitudes de Datos</h1>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!firebaseEnabled || !user) {
    return (
      <div className="flex flex-col p-4 gap-4 flex-1">
        <h1 className="text-lg font-bold font-headline">Solicitudes de Datos</h1>
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground">Debes iniciar sesión para ver las solicitudes.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col p-4 gap-4 flex-1">
      <h1 className="text-lg font-bold font-headline">Solicitudes de Datos de Clientes</h1>

      <Card>
        <CardHeader>
          <CardTitle>Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No hay solicitudes aún.</p>
              <p className="text-sm mt-2">
                Crea una solicitud desde la página de Clientes.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email del Cliente</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead>Expira</TableHead>
                    <TableHead>Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        {request.clientEmail || <span className="text-muted-foreground italic">No especificado</span>}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status, request.expiresAt)}
                      </TableCell>
                      <TableCell>{formatDate(request.createdAt)}</TableCell>
                      <TableCell>{formatDate(request.expiresAt)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleCopyLink(request.token)}
                          >
                            Copiar Link
                          </Button>
                          {request.status === 'completed' && request.clientData && (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleViewRequest(request)}
                            >
                              <EyeRegular className="mr-2 h-4 w-4" />
                              Ver Datos
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <ViewClientRequestDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setSelectedRequest(null);
        }}
        clientData={selectedRequest?.clientData || null}
        requestId={selectedRequest?.id || 0}
        onApprove={handleApproveRequest}
      />
    </div>
  );
}
