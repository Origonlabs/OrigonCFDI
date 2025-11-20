
"use client";

import { useState, useEffect, useCallback } from "react";
import { AddCircleRegular, MoreHorizontalRegular, FilterRegular } from "@/icons/fluent";
import { User } from "firebase/auth";
import Link from "next/link";
import { ClientForm } from "@/components/client-form";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getClients, updateClient } from "@/app/actions/clients";
import type { ClientFormValues } from "@/lib/schemas";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface Client extends ClientFormValues {
  id: number;
  createdAt: string;
}

export default function ClientsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setClients([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchClients = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const token = await user.getIdToken();
      const response = await getClients(user.uid, token);

      if (response.success && response.data) {
        const clientsData = response.data.map((client: any) => ({
          ...client,
          id: client.id,
          createdAt: new Date(client.created_at).toLocaleDateString(),
        })) as Client[];
        setClients(clientsData);
      } else {
        toast({
          title: "Error",
          description: response.message || "No se pudieron cargar los clientes.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error(error);
      toast({
        title: "Error",
        description: "No fue posible autenticar la sesión actual.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchClients();
    }
  }, [user, fetchClients]);
  
  const handleEditClick = (client: Client) => {
    setEditingClient(client);
    setIsDialogOpen(true);
  };

  const handleUpdateClient = async (data: ClientFormValues) => {
    if (!user || !editingClient) return;

    try {
      const token = await user.getIdToken();
      const result = await updateClient(editingClient.id, data, user.uid, token);

      if (result.success) {
        toast({ title: "Éxito", description: "El cliente se ha actualizado." });
        setIsDialogOpen(false);
        setEditingClient(null);
        await fetchClients(); // Refetch clients to show updated data
      } else {
        toast({ title: "Error al actualizar", description: result.message, variant: "destructive" });
      }
    } catch (error) {
      console.error(error);
      toast({ title: "Error al actualizar", description: "No fue posible validar tu sesión.", variant: "destructive" });
    }
  };


  return (
    <div className="flex flex-col flex-1 gap-4">
      <h1 className="text-lg font-bold font-headline">Clientes</h1>
      
      <Card className="flex flex-col flex-1">
        <CardHeader className="p-2 border-b bg-muted/30">
            <div className="flex items-center gap-2 flex-wrap">
                <Button asChild size="sm">
                    <Link href="/dashboard/clients/new">
                        <AddCircleRegular className="mr-2 h-4 w-4" />
                        Agregar más clientes
                    </Link>
                </Button>
                <Input placeholder="RFC" className="w-40" />
                <Input placeholder="Razón Social" className="w-64" />
                <Input placeholder="Referencia" className="w-40" />
                <Button variant="outline" size="sm">
                    <FilterRegular className="mr-2 h-4 w-4" />
                    Filtrar
                </Button>
                <Button variant="outline" size="sm">
                    <FilterRegular className="mr-2 h-4 w-4" />
                    Mostrar todos
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <div className="overflow-x-auto">
            <Table>
                <TableHeader>
                  <TableRow>
                      <TableHead>RFC</TableHead>
                      <TableHead>Razón social</TableHead>
                      <TableHead>Método de pago</TableHead>
                      <TableHead>Forma de pago</TableHead>
                      <TableHead>País</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Municipio</TableHead>
                      <TableHead>Ciudad</TableHead>
                      <TableHead>Colonia</TableHead>
                      <TableHead>Calle</TableHead>
                      <TableHead>Código postal</TableHead>
                      <TableHead>Num Ext</TableHead>
                      <TableHead>Num Int</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Teléfono</TableHead>
                      <TableHead>Régimen Fiscal</TableHead>
                      <TableHead>Referencia</TableHead>
                      <TableHead>
                        <span className="sr-only">Acciones</span>
                      </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                {loading ? (
                    Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                        <TableCell colSpan={18}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                    ))
                ) : clients.length > 0 ? (
                    clients.map((client) => (
                    <TableRow key={client.id}>
                        <TableCell>{client.rfc}</TableCell>
                        <TableCell className="font-medium">{client.name}</TableCell>
                        <TableCell>{client.paymentMethod || 'N/A'}</TableCell>
                        <TableCell>{client.paymentForm || 'N/A'}</TableCell>
                        <TableCell>{client.country || 'N/A'}</TableCell>
                        <TableCell>{client.state || 'N/A'}</TableCell>
                        <TableCell>{client.municipality || 'N/A'}</TableCell>
                        <TableCell>{client.city || 'N/A'}</TableCell>
                        <TableCell>{client.neighborhood || 'N/A'}</TableCell>
                        <TableCell>{client.street || 'N/A'}</TableCell>
                        <TableCell>{client.zip}</TableCell>
                        <TableCell>{client.exteriorNumber || 'N/A'}</TableCell>
                        <TableCell>{client.interiorNumber || 'N/A'}</TableCell>
                        <TableCell>{client.email || 'N/A'}</TableCell>
                        <TableCell>{client.phone || 'N/A'}</TableCell>
                        <TableCell>{client.taxRegime}</TableCell>
                        <TableCell>{client.reference || 'N/A'}</TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontalRegular className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem onSelect={() => handleEditClick(client)}>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                    </TableRow>
                    ))
                ) : (
                    <TableRow>
                      <TableCell colSpan={18} className="text-center h-24">
                        No has agregado ningún cliente.
                      </TableCell>
                    </TableRow>
                )}
                </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-4xl">
              <DialogHeader>
                  <DialogTitle>Editar Cliente</DialogTitle>
                  <DialogDescription>
                      Actualiza la información de tu cliente. Haz clic en guardar cuando termines.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4">
                  <ClientForm
                      onSubmit={handleUpdateClient}
                      initialData={editingClient}
                      onCancel={() => setIsDialogOpen(false)}
                  />
              </div>
          </DialogContent>
      </Dialog>
    </div>
  );
}
