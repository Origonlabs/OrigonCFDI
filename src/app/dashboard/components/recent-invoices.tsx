
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { MoreHorizontalRegular, CheckmarkCircleRegular, ClockRegular, DismissCircleRegular } from "@/icons/fluent";
import { User } from "firebase/auth";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { getInvoices } from "@/app/actions/invoices";
import { cn } from "@/lib/utils";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

interface Invoice {
  id: number;
  clientName: string | null;
  clientEmail: string | null;
  status: 'draft' | 'stamped' | 'canceled';
  createdAt: Date;
  total: string;
}

const StatusBadge = ({ status }: { status: Invoice['status'] }) => {
    const statusConfig = {
        stamped: {
            label: "Timbrada",
            icon: <CheckmarkCircleRegular className="h-3.5 w-3.5" />,
            className: "bg-green-100 text-green-700 border-green-200 hover:bg-green-100",
        },
        canceled: {
            label: "Cancelada",
            icon: <DismissCircleRegular className="h-3.5 w-3.5" />,
            className: "bg-red-100 text-red-700 border-red-200 hover:bg-red-100",
        },
        draft: {
            label: "Borrador",
            icon: <ClockRegular className="h-3.5 w-3.5" />,
            className: "bg-gray-100 text-gray-700 border-gray-200 hover:bg-gray-100",
        },
    };

    const config = statusConfig[status] || statusConfig.draft;

    return (
        <Badge variant="outline" className={cn('gap-1.5 font-normal rounded-full', config.className)}>
            {config.icon}
            {config.label}
        </Badge>
    );
};


export function RecentInvoices() {
    const { toast } = useToast();
    const [user, setUser] = useState<User | null>(null);
    const [invoices, setInvoices] = useState<Invoice[]>([]);
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

    const fetchInvoices = useCallback(async (uid: string) => {
        setLoading(true);
        const response = await getInvoices(uid);

        if (response.success && response.data) {
            setInvoices((response.data as Invoice[]).slice(0, 5));
        } else {
            toast({
                title: "Error",
                description: response.message || "No se pudieron cargar las facturas recientes.",
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
    
    const formatCurrency = (amount: string) => {
        return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(parseFloat(amount));
    }

    return (
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <div>
                        <CardTitle>Facturas Recientes</CardTitle>
                        <CardDescription>
                            Las 5 facturas más recientes de tu cuenta.
                        </CardDescription>
                    </div>
                     <Button asChild size="sm" variant="outline">
                        <Link href="/dashboard/invoices">
                            Ver todas
                        </Link>
                    </Button>
                </div>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Cliente</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Monto</TableHead>
                                <TableHead className="hidden md:table-cell text-center">Fecha</TableHead>
                                <TableHead className="text-right">
                                    <span className="sr-only">Acciones</span>
                                </TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, index) => (
                                    <TableRow key={index}>
                                        <TableCell colSpan={5}><Skeleton className="h-8 w-full" /></TableCell>
                                    </TableRow>
                                ))
                            ) : invoices.length > 0 ? (
                                invoices.map((invoice) => (
                                    <TableRow key={invoice.id}>
                                        <TableCell>
                                            <div className="font-medium">{invoice.clientName}</div>
                                            <div className="text-sm text-muted-foreground">
                                                {invoice.clientEmail}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={invoice.status} />
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {formatCurrency(invoice.total)}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell text-center">
                                            {new Date(invoice.createdAt).toLocaleDateString('es-MX')}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button aria-haspopup="true" size="icon" variant="ghost">
                                                        <MoreHorizontalRegular className="h-4 w-4" />
                                                        <span className="sr-only">Toggle menu</span>
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem>Ver detalles</DropdownMenuItem>
                                                    <DropdownMenuItem>Descargar PDF</DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} className="h-24 text-center">
                                        No hay facturas recientes.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}
