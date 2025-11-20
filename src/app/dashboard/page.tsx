
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { User } from "firebase/auth";
import { AlertCircleRegular, InfoRegular, CheckmarkCircleRegular } from "@/icons/fluent";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Overview } from "./components/overview";
import { firebaseEnabled, auth } from "@/lib/firebase/client";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { RecentInvoices } from "./components/recent-invoices";
import { useToast } from "@/hooks/use-toast";
import { getDashboardStats } from "../actions/dashboard";
import { getSetupStatus } from "../actions/setup";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

interface DashboardStats {
  totalFacturadoMes: number;
  facturasTimbradasMes: number;
  clientesActivos: number;
  saldoPendiente: number;
  facturacionUltimos90Dias: { date: string, total: number }[];
}

const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [setupStatus, setSetupStatus] = useState<{ hasCsd: boolean } | null>(null);
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
        setStats(null);
        setSetupStatus(null);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchDashboardData = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { getUserAuth } = await import('@/lib/auth-client');
      const { uid, token } = await getUserAuth(user);
      const [statsResponse, setupResponse] = await Promise.all([
        getDashboardStats(uid, token),
        getSetupStatus(uid, token)
      ]);

    if (statsResponse.success && statsResponse.data) {
      const processedStats = {
        totalFacturadoMes: typeof statsResponse.data.totalFacturadoMes === 'string' 
          ? parseFloat(statsResponse.data.totalFacturadoMes) 
          : statsResponse.data.totalFacturadoMes,
        facturasTimbradasMes: statsResponse.data.facturasTimbradasMes,
        clientesActivos: statsResponse.data.clientesActivos,
        saldoPendiente: typeof statsResponse.data.saldoPendiente === 'string' 
          ? parseFloat(statsResponse.data.saldoPendiente) 
          : statsResponse.data.saldoPendiente,
        facturacionUltimos90Dias: statsResponse.data.facturacionUltimos90Dias
      };
      setStats(processedStats);
    } else {
      toast({
        title: "Error",
        description: statsResponse.message || "No se pudieron cargar las estadísticas.",
        variant: "destructive",
      });
    }

    if (setupResponse.success && setupResponse.data) {
      setSetupStatus(setupResponse.data);
    } else {
      toast({
        title: "Error",
        description: setupResponse.message || "No se pudo verificar el estado de la configuración.",
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
      fetchDashboardData();
    }
  }, [user, fetchDashboardData]);
  
  const isCoreSetupComplete = setupStatus?.hasCsd && user?.emailVerified;
  const showSetupAlert = !isCoreSetupComplete;


  return (
    <div className="flex-1 space-y-4">
      {showSetupAlert && !loading && (
        <Alert>
          <InfoRegular className="h-4 w-4" />
          <AlertTitle>Completa la configuración de tu cuenta</AlertTitle>
          <AlertDescription>
            <p className="mb-2">Para una experiencia completa y segura, te recomendamos completar los siguientes pasos:</p>
            <ul className="space-y-1">
              <li className="flex items-center gap-2">
                {setupStatus?.hasCsd ? <CheckmarkCircleRegular className="h-4 w-4 text-green-500" /> : <AlertCircleRegular className="h-4 w-4 text-yellow-500" />}
                <span>Subir tu Certificado de Sello Digital (CSD).</span>
              </li>
              <li className="flex items-center gap-2">
                {user?.emailVerified ? <CheckmarkCircleRegular className="h-4 w-4 text-green-500" /> : <AlertCircleRegular className="h-4 w-4 text-yellow-500" />}
                <span>Verificar tu correo electrónico.</span>
                {!user?.emailVerified && <span className="text-xs text-muted-foreground">(Revisa tu bandeja de entrada)</span>}
              </li>
            </ul>
            <Button asChild size="sm" className="mt-4">
              <Link href="/dashboard/settings">Ir a Configuración</Link>
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!firebaseEnabled && (
        <Alert variant="destructive">
          <AlertCircleRegular className="h-4 w-4" />
          <AlertTitle>Configuración Incompleta de Firebase</AlertTitle>
          <AlertDescription>
            Para habilitar la autenticación y todas las funcionalidades, agrega la configuración de tu proyecto de Firebase al archivo{" "}
            <code className="relative rounded bg-muted px-[0.3rem] py-[0.2rem] font-mono text-sm font-semibold">
              .env.local
            </code>
            .
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="h-[80px] flex flex-col justify-center p-6">
          <CardTitle className="text-sm font-medium">Total Facturado (Mes)</CardTitle>
          {loading ? (
            <Skeleton className="h-7 w-3/4 mt-2" />
          ) : (
            <div className="text-2xl font-bold">{formatCurrency(stats?.totalFacturadoMes ?? 0)}</div>
          )}
        </Card>

        <Card className="h-[80px] flex flex-col justify-center p-6">
          <CardTitle className="text-sm font-medium">Facturas Timbradas (Mes)</CardTitle>
          {loading ? (
            <Skeleton className="h-7 w-1/2 mt-2" />
          ) : (
            <div className="text-2xl font-bold">+{stats?.facturasTimbradasMes ?? 0}</div>
          )}
        </Card>

        <Card className="h-[80px] flex flex-col justify-center p-6">
          <CardTitle className="text-sm font-medium">Clientes Activos</CardTitle>
          {loading ? (
            <Skeleton className="h-7 w-1/4 mt-2" />
          ) : (
            <div className="text-2xl font-bold">{stats?.clientesActivos ?? 0}</div>
          )}
        </Card>

        <Card className="h-[80px] flex flex-col justify-center p-6">
          <CardTitle className="text-sm font-medium">Saldo Pendiente (PPD)</CardTitle>
          {loading ? (
            <Skeleton className="h-7 w-3/4 mt-2" />
          ) : (
            <div className="text-2xl font-bold">{formatCurrency(stats?.saldoPendiente ?? 0)}</div>
          )}
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Resumen de Facturación</CardTitle>
            <CardDescription>Total facturado en los últimos 90 días.</CardDescription>
          </div>
          <Tabs defaultValue="90days" className="w-full sm:w-auto">
            <TabsList className="grid w-full grid-cols-1 sm:w-auto">
              <TabsTrigger value="90days">Últimos 90 días</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="pl-2">
          <Overview data={stats?.facturacionUltimos90Dias} loading={loading} />
        </CardContent>
      </Card>
      <RecentInvoices />
    </div>
  );
}
