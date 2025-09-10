
"use client";

import { ArrowDownloadRegular } from "@/icons/fluent";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"


export default function ReportsPage() {
  return (
    <div className="flex flex-col flex-1 gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-bold font-headline">Reportes</h1>
        <div className="flex items-center gap-2">
            <Button variant="outline">Seleccionar Rango de Fechas</Button>
            <Button>
                <ArrowDownloadRegular className="mr-2 h-4 w-4" />
                Exportar
            </Button>
        </div>
      </div>
       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Reporte de Ingresos</CardTitle>
                    <CardDescription>Análisis de facturas timbradas y canceladas.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Próximamente: Visualiza gráficos y totales de tus ingresos por período.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Reporte de Clientes</CardTitle>
                    <CardDescription>Volumen de facturación por cliente.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Próximamente: Descubre quiénes son tus clientes más importantes.</p>
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="font-headline">Reporte de Impuestos</CardTitle>
                    <CardDescription>Resumen de IVA y otros impuestos.</CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">Próximamente: Facilita tu declaración de impuestos con este reporte.</p>
                </CardContent>
            </Card>
        </div>
    </div>
  )
}
