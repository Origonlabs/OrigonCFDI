"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AddCircleRegular } from "@/icons/fluent";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { addClient } from "@/app/actions/clients";
import { clientSchema, type ClientFormValues } from "@/lib/schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewClientPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    const form = useForm<ClientFormValues>({
        resolver: zodResolver(clientSchema),
        defaultValues: {
            name: "",
            rfc: "",
            email: "",
            phone: "",
            city: "",
            state: "",
            zip: "",
            country: "México",
            taxRegime: "601",
        },
    });

    useEffect(() => {
        if (!firebaseEnabled || !auth) {
            setLoading(false);
            return;
        }
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) {
        return (
            <div className="container mx-auto px-4 py-8">
                <div className="mb-8 space-y-4">
                    <Skeleton className="h-10 w-48" />
                    <Skeleton className="h-4 w-96" />
                </div>
                <Card>
                    <CardHeader>
                        <Skeleton className="h-6 w-48" />
                        <Skeleton className="h-4 w-72" />
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </CardContent>
                </Card>
            </div>
        );
    }

    async function onSubmit(data: ClientFormValues) {
        if (!user) {
            toast({ title: "Error", description: "Debes iniciar sesión para agregar un cliente.", variant: "destructive" });
            return;
        }
        const result = await addClient(data, user.uid);

        if (result.success) {
            toast({ title: "Éxito", description: "El cliente se ha guardado correctamente." });
            router.push("/dashboard/clients");
        } else {
            toast({ title: "Error al guardar", description: result.message || "No se pudo guardar la información del cliente.", variant: "destructive" });
        }
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 space-y-4">
                <h1 className="text-3xl font-bold">Agregar Cliente</h1>
                <p className="text-gray-600">Completa la información para agregar un nuevo cliente a tu base de datos.</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Información del Cliente</CardTitle>
                    <CardDescription>Proporciona los detalles del cliente</CardDescription>
                </CardHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)}>
                        <CardContent className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Nombre / Razón Social</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Nombre completo o razón social" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="rfc"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>RFC</FormLabel>
                                            <FormControl>
                                                <Input placeholder="RFC (13 caracteres)" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="email"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="correo@ejemplo.com" type="email" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="phone"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Teléfono</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Teléfono" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Dirección eliminada porque no está en el esquema */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control}
                                    name="city"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Ciudad</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Ciudad" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="state"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Estado</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Estado" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="zip"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Código Postal</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Código Postal" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="country"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>País</FormLabel>
                                            <FormControl>
                                                <Input placeholder="País" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="taxRegime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Régimen Fiscal</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona un régimen fiscal" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="601">General de Ley Personas Morales</SelectItem>
                                                    <SelectItem value="603">Personas Morales con Fines no Lucrativos</SelectItem>
                                                    <SelectItem value="605">Sueldos y Salarios e Ingresos Asimilados a Salarios</SelectItem>
                                                    <SelectItem value="606">Arrendamiento</SelectItem>
                                                    <SelectItem value="607">Régimen de Enajenación o Adquisición de Bienes</SelectItem>
                                                    <SelectItem value="608">Demás ingresos</SelectItem>
                                                    <SelectItem value="610">Residentes en el Extranjero sin Establecimiento Permanente en México</SelectItem>
                                                    <SelectItem value="611">Ingresos por Dividendos (socios y accionistas)</SelectItem>
                                                    <SelectItem value="612">Personas Físicas con Actividades Empresariales y Profesionales</SelectItem>
                                                    <SelectItem value="614">Ingresos por intereses</SelectItem>
                                                    <SelectItem value="615">Régimen de los ingresos por obtención de premios</SelectItem>
                                                    <SelectItem value="616">Sin obligaciones fiscales</SelectItem>
                                                    <SelectItem value="620">Sociedades Cooperativas de Producción que optan por diferir sus ingresos</SelectItem>
                                                    <SelectItem value="621">Incorporación Fiscal</SelectItem>
                                                    <SelectItem value="622">Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</SelectItem>
                                                    <SelectItem value="623">Opcional para Grupos de Sociedades</SelectItem>
                                                    <SelectItem value="624">Coordinados</SelectItem>
                                                    <SelectItem value="625">Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas</SelectItem>
                                                    <SelectItem value="626">Régimen Simplificado de Confianza</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <Button type="button" variant="outline" asChild>
                                <Link href="/dashboard/clients">Cancelar</Link>
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? "Guardando..." : "Guardar Cliente"}
                            </Button>
                        </CardFooter>
                    </form>
                </Form>
            </Card>
        </div>
    );
}
