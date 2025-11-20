
"use client";

import { useState, useEffect, useCallback } from "react";
import { User } from "firebase/auth";
import { EyeRegular, FilterRegular, DismissCircleRegular, ArrowDownloadRegular, ChevronDownRegular, ChevronDoubleLeftRegular, ChevronDoubleRightRegular, ChevronLeftRegular, ChevronRightRegular, ArchiveRegular, MoreHorizontalRegular, DocumentRegular, CheckmarkCircleRegular, ErrorCircleRegular } from "@/icons/fluent";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { getPayments } from "@/app/actions/payments";
import { getUserAuth } from "@/lib/auth-client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface Payment {
  id: number;
  clientName: string | null;
  clientRfc: string | null;
  clientEmail: string | null;
  status: 'stamped' | 'canceled';
  createdAt: Date;
  total: string;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  serie: string;
  folio: number;
  currency: string;
  paymentForm: string | null;
  operationNumber: string | null;
}

export default function PaymentsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setPayments([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { uid, token } = await getUserAuth(user);
      const response = await getPayments(uid, token);

      if (response.success && response.data) {
        setPayments(response.data as Payment[]);
      } else {
        toast({
          title: "Error",
          description: response.message || "No se pudieron cargar los pagos.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No fue posible autenticar la sesión.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchPayments();
    }
  }, [user, fetchPayments]);
  
  const getBadgeVariant = (status: Payment['status']) => {
    switch (status) {
      case 'stamped': return 'default';
      case 'canceled': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusLabel = (status: Payment['status']) => {
    switch (status) {
      case 'stamped': return 'Timbrado';
      case 'canceled': return 'Cancelado';
      default: return 'Borrador';
    }
  }

  const formatCurrency = (amount: string) => {
     return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(parseFloat(amount));
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric', month: '2-digit', day: '2-digit',
    });
  }

  return (
    <div className="flex flex-col flex-1 gap-4">
      <h1 className="text-lg font-bold font-headline">Pagos</h1>
      <Card className="flex flex-col flex-1">
        <CardHeader className="p-2 border-b bg-muted/30 flex flex-row items-center gap-2">
            <Button size="sm" variant="outline" className="text-xs h-7"><FilterRegular className="mr-1 h-3.5 w-3.5" />Filtrar</Button>
            <Button size="sm" variant="outline" className="text-xs h-7"><FilterRegular className="mr-1 h-3.5 w-3.5" />Mostrar todos</Button>
            <Button size="sm" variant="destructive" className="text-xs h-7"><DismissCircleRegular className="mr-1 h-3.5 w-3.5" />Cancelar REP</Button>
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button size="sm" variant="outline" className="text-xs h-7">
                        <ArchiveRegular className="mr-1 h-3.5 w-3.5" />
                        Descargar ZIP <ChevronDownRegular className="ml-1 h-3.5 w-3.5" />
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                    <DropdownMenuItem><ArrowDownloadRegular className="mr-2 h-4 w-4" /> Exportar PDF</DropdownMenuItem>
                    <DropdownMenuItem><DocumentRegular className="mr-2 h-4 w-4" /> Exportar Excel</DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </CardHeader>
        <div className="flex-grow overflow-auto">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead>Vista</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead>Serie</TableHead>
                <TableHead>Folio</TableHead>
                <TableHead>UUID</TableHead>
                <TableHead>RFC</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Tipo CFDI</TableHead>
                <TableHead>Moneda</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Forma de Pago</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Número de Operación</TableHead>
                <TableHead>Confirmación</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead><span className="sr-only">Acciones</span></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 1 }).map((_, index) => (
                  <TableRow key={index}>
                    <TableCell colSpan={17}><Skeleton className="h-5 w-full" /></TableCell>
                  </TableRow>
                ))
              ) : payments.length > 0 ? (
                payments.map((payment) => (
                  <TableRow key={payment.id}>
                    <TableCell><Button variant="ghost" size="icon" className="h-6 w-6"><EyeRegular className="h-4 w-4" /></Button></TableCell>
                    <TableCell>{formatDate(payment.createdAt)}</TableCell>
                    <TableCell>{payment.serie}</TableCell>
                    <TableCell>{payment.folio}</TableCell>
                    <TableCell className="font-mono text-xs">...{payment.id.toString().padStart(8, '0')}</TableCell>
                    <TableCell>{payment.clientRfc}</TableCell>
                    <TableCell className="font-medium truncate max-w-32">{payment.clientName}</TableCell>
                    <TableCell>Pago</TableCell>
                    <TableCell>{payment.currency}</TableCell>
                    <TableCell className="text-right">{formatCurrency(payment.total)}</TableCell>
                    <TableCell>{payment.paymentForm}</TableCell>
                    <TableCell>
                      <Badge variant={getBadgeVariant(payment.status)}>
                          {payment.status === 'stamped' && <CheckmarkCircleRegular className="mr-1 h-3 w-3" />}
                          {payment.status === 'canceled' && <ErrorCircleRegular className="mr-1 h-3 w-3" />}
                          {getStatusLabel(payment.status)}
                      </Badge>
                    </TableCell>
                    <TableCell>{payment.operationNumber || 'N/A'}</TableCell>
                    <TableCell>N/A</TableCell>
                    <TableCell>{payment.clientEmail}</TableCell>
                    <TableCell>N/A</TableCell>
                    <TableCell>
                      <div className="flex justify-end">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                              <MoreHorizontalRegular className="h-4 w-4" />
                              <span className="sr-only">Toggle menu</span>
                              </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem><ArrowDownloadRegular className="mr-2 h-4 w-4" />Descargar PDF</DropdownMenuItem>
                            <DropdownMenuItem><ArrowDownloadRegular className="mr-2 h-4 w-4" />Descargar XML</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={17} className="text-center h-24">
                    No hay pagos para mostrar
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <div className="p-2 border-t bg-muted/30 flex justify-between items-center text-xs">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-6 w-6"><ChevronDoubleLeftRegular className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-6 w-6"><ChevronLeftRegular className="h-4 w-4" /></Button>
            <span>Página 1 de 1</span>
            <Button variant="outline" size="icon" className="h-6 w-6"><ChevronRightRegular className="h-4 w-4" /></Button>
            <Button variant="outline" size="icon" className="h-6 w-6"><ChevronDoubleRightRegular className="h-4 w-4" /></Button>
          </div>
          <div className="flex items-center gap-4">
              <span>Comprobante Versión: Pago 2.0</span>
              <div className="flex items-center gap-1">
                  <Label>Mes/Año:</Label>
                  <Input type="month" className="h-6 text-xs w-32" defaultValue={new Date().toISOString().substring(0, 7)} />
              </div>
          </div>
          <div className="text-muted-foreground">
              {payments.length > 0 ? `Mostrando ${payments.length} pagos` : 'No hay pagos para mostrar'}
          </div>
        </div>
      </Card>
    </div>
  )
}
