"use client";

import { MoreHorizontalRegular, ArrowDownloadRegular, MailRegular, FilterRegular, AddRegular, ArchiveRegular, DismissCircleRegular, ChevronLeftRegular, ChevronRightRegular, EyeRegular, DocumentRegular, ChevronDoubleLeftRegular, ChevronDoubleRightRegular, ChevronDownRegular, StampRegular, CheckmarkCircleRegular, ErrorCircleRegular } from "@/icons/fluent"
import { useState, useEffect, useCallback } from "react"
import { User } from "firebase/auth"

import { auth, firebaseEnabled } from "@/lib/firebase/client"
import { useToast } from "@/hooks/use-toast"
import { getInvoices, stampInvoice } from "@/app/actions/invoices"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input"

interface Invoice {
  id: number;
  clientName: string | null;
  clientRfc: string | null;
  clientEmail: string | null;
  status: 'draft' | 'stamped' | 'canceled';
  createdAt: Date;
  total: string;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
  serie: string;
  folio: number;
  metodoPago: string | null;
  uuid: string | null;
}

export function InvoicesList() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isStamping, setIsStamping] = useState<number | null>(null);


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

  const fetchInvoices = useCallback(async (uid: string) => {
    setLoading(true);
    const response = await getInvoices(uid);

    if (response.success && response.data) {
      setInvoices(response.data as Invoice[]);
    } else {
      toast({
        title: "Error",
        description: response.message || "No se pudieron cargar las facturas.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchInvoices(user.uid);
    }
  }, [user, fetchInvoices]);

  const handleStamp = async (invoiceId: number) => {
    if (!user) return;
    setIsStamping(invoiceId);
    toast({ title: "Timbrando factura..." });
    try {
        const result = await stampInvoice(invoiceId, user.uid);
        if (result.success) {
            toast({ title: "Éxito", description: result.message });
            await fetchInvoices(user.uid);
        } else {
            toast({ title: "Error", description: result.message, variant: "destructive" });
        }
    } catch(e) {
        toast({ title: "Error", description: "No se pudo timbrar la factura.", variant: "destructive" });
    } finally {
        setIsStamping(null);
    }
  };

  const handleDownloadXml = (invoice: Invoice) => {
    if (invoice.xmlUrl) {
      window.open(invoice.xmlUrl, '_blank');
    } else {
      toast({ title: "Archivo no disponible", description: "El XML no está disponible para descargar.", variant: "destructive" });
    }
  };

  const handleDownloadPdf = (invoice: Invoice) => {
     if (invoice.pdfUrl) {
      window.open(invoice.pdfUrl, '_blank');
    } else {
      toast({ title: "Archivo no disponible", description: "El PDF no está disponible para descargar.", variant: "destructive" });
    }
  };


  const getBadgeVariant = (status: Invoice['status']) => {
    switch (status) {
      case 'stamped':
        return 'default';
      case 'canceled':
        return 'destructive';
      case 'draft':
      default:
        return 'secondary';
    }
  };

  const getStatusLabel = (status: Invoice['status']) => {
    switch (status) {
      case 'stamped':
        return 'Timbrada';
      case 'canceled':
        return 'Cancelada';
      case 'draft':
      default:
        return 'Borrador';
    }
  }
  
  const formatCurrency = (amount: string) => {
     return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(parseFloat(amount));
  }

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString('es-MX', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  return (
        <Card className="flex flex-col flex-1">
            <CardHeader className="p-2 border-b">
                <span className="text-sm">Mostrando documentos: Mes-Año: {new Date().toLocaleString('es-MX', { month: 'short', year: 'numeric' }).toUpperCase()}</span>
            </CardHeader>
            <CardContent className="p-2 border-b bg-muted/30 flex flex-wrap items-center gap-2">
                <div className="flex items-center space-x-2">
                    <Checkbox id="filter-pay" />
                    <Label htmlFor="filter-pay" className="text-xs font-normal">Filtrar CFDI a Pagar</Label>
                </div>
                <Button size="sm" variant="outline" className="text-xs h-7"><AddRegular className="mr-1 h-3.5 w-3.5" />Crear REP</Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button size="sm" variant="outline" className="text-xs h-7">Exportar listado <ChevronDownRegular className="ml-1 h-3.5 w-3.5" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                        <DropdownMenuItem><DocumentRegular className="mr-2 h-4 w-4" /> Exportar PDF</DropdownMenuItem>
                        <DropdownMenuItem><DocumentRegular className="mr-2 h-4 w-4" /> Exportar Excel</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
                <Button size="sm" variant="outline" className="text-xs h-7"><ArchiveRegular className="mr-1 h-3.5 w-3.5" />Descargar ZIP</Button>
                <div className="flex-grow"></div>
                <Button size="sm" variant="outline" className="text-xs h-7"><FilterRegular className="mr-1 h-3.5 w-3.5" />Filtrar</Button>
                <Button size="sm" variant="outline" className="text-xs h-7"><FilterRegular className="mr-1 h-3.5 w-3.5" />Mostrar todos</Button>
                <Button size="sm" variant="destructive" className="text-xs h-7"><DismissCircleRegular className="mr-1 h-3.5 w-3.5" />Cancelar seleccionados</Button>
            </CardContent>
            
            <div className="flex-grow overflow-auto">
                <Table>
                <TableHeader>
                    <TableRow className="bg-muted/30 hover:bg-muted/30">
                    <TableHead className="w-12"><Checkbox /></TableHead>
                    <TableHead>Vista</TableHead>
                    <TableHead>Versión</TableHead>
                    <TableHead>Folio</TableHead>
                    <TableHead>UUID</TableHead>
                    <TableHead>Confirmación</TableHead>
                    <TableHead>RFC</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Tipo CFDI</TableHead>
                    <TableHead>Serie</TableHead>
                    <TableHead>Monto</TableHead>
                    <TableHead>Moneda</TableHead>
                    <TableHead>Fecha</TableHead>
                    <TableHead>Saldo</TableHead>
                    <TableHead>Estado PAC</TableHead>
                    <TableHead>Estado SAT</TableHead>
                    <TableHead>CFDI Pagado</TableHead>
                    <TableHead>Referencia</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Vigencia</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                        Array.from({ length: 5 }).map((_, index) => (
                        <TableRow key={index}>
                            <TableCell colSpan={21}><Skeleton className="h-5 w-full" /></TableCell>
                        </TableRow>
                        ))
                    ) : invoices.length > 0 ? (
                        invoices.map((invoice) => (
                        <TableRow key={invoice.id}>
                            <TableCell><Checkbox /></TableCell>
                            <TableCell><Button variant="ghost" size="icon" className="h-6 w-6"><EyeRegular className="h-4 w-4" /></Button></TableCell>
                            <TableCell>4.0</TableCell>
                            <TableCell>{invoice.folio}</TableCell>
                            <TableCell className="font-mono text-xs">{invoice.uuid ? `...${invoice.uuid.substring(invoice.uuid.length - 8)}` : 'N/A'}</TableCell> 
                            <TableCell>N/A</TableCell>
                            <TableCell>{invoice.clientRfc}</TableCell>
                            <TableCell className="font-medium truncate max-w-32">{invoice.clientName}</TableCell>
                            <TableCell>Factura</TableCell>
                            <TableCell>{invoice.serie}</TableCell>
                            <TableCell className="text-right">{formatCurrency(invoice.total)}</TableCell>
                            <TableCell>MXN</TableCell>
                            <TableCell>{formatDate(invoice.createdAt)}</TableCell>
                            <TableCell className="text-right">{invoice.metodoPago === 'PPD' ? formatCurrency(invoice.total) : formatCurrency("0")}</TableCell>
                            <TableCell>
                                <Badge variant={getBadgeVariant(invoice.status)}>
                                    {invoice.status === 'stamped' && <CheckmarkCircleRegular className="mr-1 h-3 w-3" />}
                                    {invoice.status === 'canceled' && <ErrorCircleRegular className="mr-1 h-3 w-3" />}
                                    {getStatusLabel(invoice.status)}
                                </Badge>
                            </TableCell>
                            <TableCell><Badge variant="secondary">N/A</Badge></TableCell>
                            <TableCell>{invoice.metodoPago === 'PUE' ? 'SI' : 'NO'}</TableCell>
                            <TableCell>N/A</TableCell>
                            <TableCell>{invoice.clientEmail}</TableCell>
                            <TableCell>N/A</TableCell>
                            <TableCell>
                            <div className="flex justify-end">
                                <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button aria-haspopup="true" size="icon" variant="ghost" disabled={isStamping === invoice.id}>
                                    <MoreHorizontalRegular className="h-4 w-4" />
                                    <span className="sr-only">Toggle menu</span>
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                                    {invoice.status === 'draft' ? (
                                        <DropdownMenuItem onSelect={() => handleStamp(invoice.id)} disabled={isStamping === invoice.id}>
                                            <StampRegular className="mr-2 h-4 w-4" />
                                            Timbrar Factura
                                        </DropdownMenuItem>
                                    ) : (
                                      <>
                                        <DropdownMenuItem onClick={() => handleDownloadPdf(invoice)} disabled={!invoice.pdfUrl}>
                                            <ArrowDownloadRegular className="mr-2 h-4 w-4" />
                                            Descargar PDF
                                        </DropdownMenuItem>
                                        <DropdownMenuItem onClick={() => handleDownloadXml(invoice)} disabled={!invoice.xmlUrl}>
                                            <ArrowDownloadRegular className="mr-2 h-4 w-4" />
                                            Descargar XML
                                        </DropdownMenuItem>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem><MailRegular className="mr-2 h-4 w-4" />Enviar por correo</DropdownMenuItem>
                                        <DropdownMenuItem className="text-destructive"><DismissCircleRegular className="mr-2 h-4 w-4" />Cancelar CFDI</DropdownMenuItem>
                                      </>
                                    )}
                                </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                            </TableCell>
                        </TableRow>
                        ))
                    ) : (
                        <TableRow>
                        <TableCell colSpan={21} className="text-center h-24">
                            No hay CFDIs para mostrar
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
                    <span>Página 1 de {Math.ceil(invoices.length / 10)}</span>
                    <Button variant="outline" size="icon" className="h-6 w-6"><ChevronRightRegular className="h-4 w-4" /></Button>
                    <Button variant="outline" size="icon" className="h-6 w-6"><ChevronDoubleRightRegular className="h-4 w-4" /></Button>
                </div>
                <div className="flex items-center gap-4">
                    <span>Comprobante Versión: Factura 4.0</span>
                    <div className="flex items-center gap-1">
                        <Label>Mes/Año:</Label>
                        <Input type="month" className="h-6 text-xs w-32" defaultValue={new Date().toISOString().substring(0, 7)} />
                    </div>
                </div>
                <div className="text-muted-foreground">
                    {invoices.length > 0 ? `Mostrando ${invoices.length} CFDIs` : 'No hay CFDIs para mostrar'}
                </div>
            </div>
        </Card>
  )
}
