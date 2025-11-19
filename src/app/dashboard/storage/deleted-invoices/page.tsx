
"use client";

import { FilterRegular, ChevronDoubleLeftRegular, ChevronDoubleRightRegular, ChevronLeftRegular, ChevronRightRegular, ChevronDownRegular } from "@/icons/fluent"
import { useState, useEffect, useCallback } from "react"
import { User } from "firebase/auth"

import { auth, firebaseEnabled } from "@/lib/firebase/client"
import { useToast } from "@/hooks/use-toast"
import { getDeletedInvoices } from "@/app/actions/invoices"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
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
import { Label } from "@/components/ui/label"

interface DeletedInvoice {
  id: number;
  clientName: string | null;
  clientRfc: string | null;
  status: 'draft' | 'stamped' | 'canceled';
  createdAt: Date;
  total: string;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  serie: string;
  folio: number;
  metodoPago: string | null;
}

export default function DeletedInvoicesPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<DeletedInvoice[]>([]);
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
        setInvoices([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchDeletedInvoices = useCallback(async (uid: string) => {
    setLoading(true);
    const response = await getDeletedInvoices(uid);

    if (response.success && response.data) {
      setInvoices(response.data as unknown as DeletedInvoice[]);
    } else {
      toast({
        title: "Error",
        description: response.message || "No se pudieron cargar las facturas eliminadas.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchDeletedInvoices(user.uid);
    }
  }, [user, fetchDeletedInvoices]);
  
  return (
    <div className="flex flex-col flex-1 gap-4">
        <h1 className="text-lg font-bold font-headline">CFDI Eliminados</h1>
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
                        <TableHead>Versión</TableHead>
                        <TableHead>Tipo CFDI</TableHead>
                        <TableHead>Fecha</TableHead>
                        <TableHead>Folio</TableHead>
                        <TableHead>Serie</TableHead>
                        <TableHead>UUID</TableHead>
                        <TableHead>RFC</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Moneda</TableHead>
                        <TableHead>Monto</TableHead>
                        <TableHead>Estado</TableHead>
                        <TableHead>Referencia</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        <TableRow>
                            <TableCell colSpan={12}><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                    ) : (
                        <TableRow>
                            <TableCell colSpan={12} className="text-center h-[50vh]">
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
                    <Select defaultValue="4.0">
                        <SelectTrigger className="h-6 text-xs w-32">
                           <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="4.0">Factura 4.0</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-muted-foreground">
                    No hay CFDIs para mostrar
                </div>
            </div>
        </Card>
    </div>
  )
}
