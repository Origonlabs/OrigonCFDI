
"use client";

import { FilterRegular, ChevronDoubleLeftRegular, ChevronDoubleRightRegular, ChevronLeftRegular, ChevronRightRegular } from "@/icons/fluent"
import { useState, useEffect, useCallback } from "react"
import { User } from "firebase/auth"

import { auth, firebaseEnabled } from "@/lib/firebase/client"
import { useToast } from "@/hooks/use-toast"
import { getDeletedPayments } from "@/app/actions/payments"
import { getUserAuth } from "@/lib/auth-client";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardHeader,
} from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label";

interface DeletedPayment {
  id: number;
  clientName: string | null;
  clientRfc: string | null;
  status: 'stamped' | 'canceled';
  createdAt: Date;
  total: string;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  serie: string;
  folio: number;
  paymentForm: string | null;
}

export default function DeletedPaymentsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [payments, setPayments] = useState<DeletedPayment[]>([]);
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

  const fetchDeletedPayments = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { uid, token } = await getUserAuth(user);
      const response = await getDeletedPayments(uid, token);

      if (response.success && response.data) {
        setPayments(response.data as DeletedPayment[]);
      } else {
        toast({
          title: "Error",
          description: response.message || "No se pudieron cargar los pagos eliminados.",
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
      fetchDeletedPayments();
    }
  }, [user, fetchDeletedPayments]);
  
  return (
    <div className="flex flex-col flex-1 gap-4">
        <h1 className="text-lg font-bold font-headline">Pagos Eliminados</h1>
        <Card className="flex flex-col flex-1">
            <CardHeader className="p-2 border-b bg-muted/30 flex flex-row justify-between items-center">
                <span className="text-sm">No se encontraron documentos eliminados Periodo: {new Date().toLocaleString('es-MX', { month: 'long' }).toUpperCase()} {new Date().getFullYear()}</span>
                 <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" className="text-xs h-7"><FilterRegular className="mr-1 h-3.5 w-3.5" />Filtrar</Button>
                    <Button size="sm" variant="outline" className="text-xs h-7"><FilterRegular className="mr-1 h-3.5 w-3.5" />Mostrar todos</Button>
                </div>
            </CardHeader>
            
            <div className="flex-grow overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
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
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={11}><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={11} className="text-center h-[50vh]">
                                No se encontraron documentos eliminados.
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
                <div className="flex items-center gap-2">
                    <Label>Comprobante Versión:</Label>
                    <Select defaultValue="2.0">
                        <SelectTrigger className="h-6 text-xs w-32">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="2.0">Pago 2.0</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-muted-foreground">
                    No hay pagos para mostrar
                </div>
            </div>
        </Card>
    </div>
  )
}
