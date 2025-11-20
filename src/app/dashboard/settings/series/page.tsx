
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AddCircleRegular, ArrowClockwiseRegular, DeleteRegular, EditRegular } from "@/icons/fluent";
import { User } from "firebase/auth";

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
import { Skeleton } from "@/components/ui/skeleton";
import { getSeries } from "@/app/actions/series";
import { getCompanyProfile } from "@/app/actions/companies";

interface Serie {
  id: number;
  serie: string;
  folio: number;
  documentType: string;
  createdAt: string;
}

export default function SeriesListPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [series, setSeries] = useState<Serie[]>([]);
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
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { getUserAuth } = await import('@/lib/auth-client');
      const { uid, token } = await getUserAuth(user);
      const [seriesResponse, profileResponse] = await Promise.all([
        getSeries(uid, token),
        getCompanyProfile(uid, token)
      ]);

    if (seriesResponse.success && seriesResponse.data) {
      const seriesData = seriesResponse.data.map((serie: any) => ({
        ...serie,
        id: serie.id,
        createdAt: new Date(serie.createdAt).toISOString(),
      })) as Serie[];
      setSeries(seriesData);
    } else {
      toast({
        title: "Error",
        description: seriesResponse.message || "No se pudieron cargar las series.",
        variant: "destructive",
      });
    }

    if (profileResponse.success && profileResponse.data) {
        setRfc(profileResponse.data.rfc);
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
    <Card className="flex flex-col flex-1">
      <CardHeader className="p-2 border-b bg-muted/30">
          <div className="flex items-center gap-4 flex-wrap">
              <Button asChild size="sm">
                  <Link href="/dashboard/settings/series/new">
                      <AddCircleRegular className="mr-2 h-4 w-4" />
                      Agregar más folios
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
                    <TableHead>Serie</TableHead>
                    <TableHead>Folio Inicial</TableHead>
                    <TableHead>Folio Final</TableHead>
                    <TableHead>Folio Inicio</TableHead>
                    <TableHead>Folio Actual</TableHead>
                    <TableHead>Folios Disponibles</TableHead>
                    <TableHead>Fecha de creación</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
              {loading ? (
                  <TableRow>
                      <TableCell colSpan={9}>
                        <Skeleton className="h-8 w-full" />
                      </TableCell>
                  </TableRow>
              ) : series.length > 0 ? (
                  series.map((serie) => (
                  <TableRow key={serie.id}>
                      <TableCell>{rfc || 'N/A'}</TableCell>
                      <TableCell className="font-medium">{serie.serie}</TableCell>
                      <TableCell>{serie.folio}</TableCell>
                      <TableCell>&#8734;</TableCell>
                      <TableCell>{serie.folio}</TableCell>
                      <TableCell>{serie.folio}</TableCell>
                      <TableCell>&#8734;</TableCell>
                      <TableCell>{formatDate(serie.createdAt)}</TableCell>
                      <TableCell className="text-right">
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive">
                              <DeleteRegular className="h-4 w-4" />
                              <span className="sr-only">Eliminar</span>
                          </Button>
                           <Button variant="ghost" size="icon" className="h-8 w-8">
                              <EditRegular className="h-4 w-4" />
                              <span className="sr-only">Editar</span>
                          </Button>
                      </TableCell>
                  </TableRow>
                  ))
              ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">
                      No has agregado ninguna serie.
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
