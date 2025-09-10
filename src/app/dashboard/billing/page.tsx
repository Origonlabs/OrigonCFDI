
"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useAuthState } from "react-firebase-hooks/auth";
import { auth } from "@/lib/firebase/client";
import { getActiveSubscription } from "@/app/actions/subscriptions";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Estandar",
    price: { monthly: "Gratis", annual: "Gratis" },
    frequency: { monthly: "mes", annual: "año" },
    description: "Para empezar a facturar sin costo y conocer la plataforma.",
    features: [
      "Hasta 5 CFDIs al mes",
      "Soporte comunitario",
      "Funciones básicas de facturación",
      "Almacenamiento por 6 meses",
    ],
    isPopular: false,
    button: { content: "Seleccionar Plan" },
  },
  {
    name: "Básico",
    price: { monthly: "$99", annual: "$891" },
    frequency: { monthly: "mes", annual: "año" },
    description: "Ideal para freelancers y pequeños negocios que recién comienzan.",
    features: [
      "Hasta 50 CFDIs al mes",
      "Soporte por correo electrónico",
      "Personalización básica de PDF",
      "Reportes de Ingresos",
      "Almacenamiento por 1 año",
    ],
    isPopular: false,
    button: { content: "Seleccionar Plan" },
  },
  {
    name: "Profesional",
    price: { monthly: "$720", annual: "$6480" },
    frequency: { monthly: "mes", annual: "año" },
    description: "Perfecto para empresas en crecimiento con mayor volumen de facturación.",
    features: [
      "Hasta 250 CFDIs al mes",
      "Soporte prioritario por chat y teléfono",
      "Personalización avanzada de plantillas PDF",
      "Reportes avanzados y exportación",
      "Integración con 1 sistema contable",
      "Almacenamiento por 5 años",
    ],
    isPopular: true,
    button: { content: "Seleccionar Plan" },
  },
  {
    name: "Empresarial",
    price: { monthly: "Contacto", annual: "Contacto" },
    frequency: { monthly: "mes", annual: "año" },
    description: "Soluciones a la medida para grandes corporaciones y necesidades específicas.",
    features: [
      "CFDIs ilimitados",
      "Soporte dedicado y SLA",
      "Acceso a la API para integraciones",
      "Múltiples empresas y usuarios",
      "Roles y permisos avanzados",
      "Auditoría y logs de actividad",
    ],
    isPopular: false,
    button: { content: "Contactar Ventas" },
  },
];

export default function BillingPage() {
  const router = useRouter();
  const [user, authLoading] = useAuthState(auth!);
  const [activePlan, setActivePlan] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('annual');

  useEffect(() => {
    async function fetchSubscription() {
      if (user) {
        const sub = await getActiveSubscription(user.uid);
        if (sub?.success && sub.data) {
          setActivePlan(sub.data.planName);
        }
        setLoading(false);
      } else if (!authLoading) {
        setLoading(false);
      }
    }
    fetchSubscription();
  }, [user, authLoading]);

  const handleSelectPlan = (planName: string) => {
    if (planName === 'Estandar' || activePlan) return;
    router.push(`/dashboard/checkout?plan=${encodeURIComponent(planName)}`);
  };

  if (loading || authLoading) {
      return (
          <div className="flex flex-col flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
              <div className="text-center mb-12">
                  <Skeleton className="h-10 w-64 mx-auto" />
                  <Skeleton className="h-4 w-96 mx-auto mt-4" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-start justify-center">
                  {plans.map((plan) => (
                      <Card key={plan.name} className="w-72">
                          <CardHeader><Skeleton className="h-6 w-32" /><Skeleton className="h-4 w-48 mt-2" /></CardHeader>
                          <CardContent><Skeleton className="h-40 w-full" /></CardContent>
                          <CardFooter><Skeleton className="h-10 w-full" /></CardFooter>
                      </Card>
                  ))}
              </div>
          </div>
      )
  }

  return (
    <div className="flex flex-col flex-1 max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="text-center mb-12">
        <h1 className="text-3xl font-bold font-headline">Planes de Suscripción</h1>
        <p className="text-muted-foreground mt-2 max-w-xl mx-auto">
          Elige el plan que mejor se adapte a tus necesidades de facturación. Todos los precios están en MXN.
        </p>
      </div>

      <div className="flex justify-center items-center mb-10">
        <div className="relative flex items-center p-1 rounded-full border border-green-300 bg-white">
          <button
            onClick={() => setBillingCycle('monthly')}
            className={cn(
              "relative z-10 px-6 py-1.5 text-sm font-medium rounded-full transition-colors duration-300",
              billingCycle === 'monthly' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Pago mensual
          </button>
          <button
            onClick={() => setBillingCycle('annual')}
            className={cn(
              "relative z-10 px-6 py-1.5 text-sm font-medium rounded-full transition-colors duration-300",
               billingCycle === 'annual' ? 'text-white' : 'text-gray-600 hover:text-gray-900'
            )}
          >
            Pago anual (ahorra un 25%)*
          </button>
           <div
            className={cn(
              "absolute h-[85%] bg-black rounded-full transition-transform duration-300 ease-in-out",
              billingCycle === 'monthly'
                ? 'w-[140px] transform translate-x-[4px]'
                : 'w-[250px] transform translate-x-[140px]'
            )}
          />
        </div>
      </div>


      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-8 items-start justify-center">
        {plans.map((plan) => {
          const isCurrentPlan = activePlan === plan.name;
          const hasActivePlan = !!activePlan;
          const currentPrice = plan.price[billingCycle];
          const currentFrequency = plan.frequency[billingCycle];

          return (
            <div key={plan.name} className={cn(
                "relative w-72 rounded-xl transition-transform duration-300 ease-in-out hover:scale-105",
                plan.isPopular && "shadow-[0px_0px_15px_4px_#CDFEE1] dark:shadow-[0px_0px_15px_4px_rgba(205,254,225,0.2)]"
            )}>
              {plan.isPopular && (
                <div className="absolute -top-3 right-1.5 z-10">
                    <Badge className="bg-green-100 text-green-800 border-green-200 hover:bg-green-200 text-sm">MÁS POPULAR</Badge>
                </div>
              )}
               {isCurrentPlan && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
                    <Badge className="bg-primary/20 text-primary border-primary/30 text-sm">Plan Actual</Badge>
                  </div>
              )}
              <Card className={cn(
                  "flex flex-col h-full", 
                  isCurrentPlan && "ring-2 ring-primary"
              )}>
                <CardContent className="p-6 flex flex-col gap-4">
                  {/* Title and Description */}
                  <div className="flex flex-col gap-2 text-left">
                    <h3 className="text-lg font-bold font-headline">{plan.name}</h3>
                     <p className="text-sm text-muted-foreground">{plan.description}</p>
                  </div>
                  
                  {/* Price */}
                  <div className="flex items-end gap-1 text-left">
                    <h2 className="text-4xl font-bold">{currentPrice}</h2>
                    {currentPrice !== 'Gratis' && currentPrice !== 'Contacto' && <p className="text-sm text-muted-foreground pb-1">/ {currentFrequency}</p>}
                  </div>
                  {plan.name === 'Profesional' && <p className="text-xs text-muted-foreground -mt-3">no incluye iva</p>}


                  {/* Features */}
                  <div className="flex flex-col gap-2 text-left pt-2">
                    {plan.features.map((feature) => (
                      <p key={feature} className="text-sm text-muted-foreground">{feature}</p>
                    ))}
                  </div>

                  {/* Button */}
                  <div className="pt-4 pb-2">
                     <Button 
                        className="w-full" 
                        onClick={() => handleSelectPlan(plan.name)}
                        disabled={hasActivePlan && !isCurrentPlan}
                      >
                        {isCurrentPlan 
                          ? 'Administrar Suscripción'
                          : plan.button.content
                        }
                      </Button>
                  </div>

                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>
    </div>
  );
}
