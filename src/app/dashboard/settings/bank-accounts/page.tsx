
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AddCircleRegular, MoreHorizontalRegular, ArrowClockwiseRegular } from "@/icons/fluent";
import { User } from "firebase/auth";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { getBankAccounts } from "@/app/actions/bank-accounts";
import { getCompanyProfile } from "@/app/actions/companies";
import type { BankAccountFormValues } from "@/lib/schemas";

interface BankAccount extends BankAccountFormValues {
  id: number;
  isActive: boolean;
  isDefault: boolean;
  createdAt: string;
}

export default function BankAccountsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [rfc, setRfc] = useState<string>('');
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
        setAccounts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const [accountsResponse, profileResponse] = await Promise.all([
        getBankAccounts(user.uid),
        getCompanyProfile(user.uid)
    ]);

    if (accountsResponse.success && accountsResponse.data) {
      const processedAccounts = accountsResponse.data.map(account => ({
        ...account,
        createdAt: account.createdAt instanceof Date ? account.createdAt.toISOString() : account.createdAt
      }));
      setAccounts(processedAccounts as BankAccount[]);
    } else {
      toast({
        title: "Error",
        description: accountsResponse.message || "No se pudieron cargar las cuentas.",
        variant: "destructive",
      });
    }

    if (profileResponse.success && profileResponse.data) {
        setRfc(profileResponse.data.rfc);
    }

    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchData();
    }
  }, [user, fetchData]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-MX', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  return (
    <div className="flex flex-col flex-1 gap-4">
      <Card className="flex flex-col flex-1">
        <CardHeader className="p-2 border-b bg-muted/30">
            <div className="flex items-center gap-2 flex-wrap">
                <Button asChild size="sm">
                    <Link href="/dashboard/settings/bank-accounts/new">
                        <AddCircleRegular className="mr-2 h-4 w-4" />
                        Agregar cuentas bancarias
                    </Link>
                </Button>
                <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
                    <ArrowClockwiseRegular className="mr-2 h-4 w-4" />
                    Recargar
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>RFC</TableHead>
                  <TableHead>Nombre del Banco</TableHead>
                  <TableHead>Nombre corto</TableHead>
                  <TableHead>No. de Cuenta</TableHead>
                  <TableHead>Activa</TableHead>
                  <TableHead>Predeterminada</TableHead>
                  <TableHead>Fecha de Creación</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 3 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={8}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : accounts.length > 0 ? (
                  accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>{rfc || 'N/A'}</TableCell>
                      <TableCell>{account.bankName}</TableCell>
                      <TableCell className="font-medium">{account.shortName}</TableCell>
                      <TableCell>{account.accountNumber}</TableCell>
                      <TableCell><Switch checked={account.isActive} disabled /></TableCell>
                      <TableCell><Switch checked={account.isDefault} disabled /></TableCell>
                      <TableCell>{formatDate(account.createdAt)}</TableCell>
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
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center h-24">
                      No has agregado ninguna cuenta bancaria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
