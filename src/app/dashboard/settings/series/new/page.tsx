
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { addSerie } from "@/app/actions/series";
import { serieSchema, type SerieFormValues } from "@/lib/schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function NewSeriePage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    const form = useForm<SerieFormValues>({
        resolver: zodResolver(serieSchema),
        defaultValues: {
            serie: "",
            folio: 1,
            documentType: "",
        },
    });

    useEffect(() => {
        if (!firebaseEnabled || !auth) return;
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    async function onSubmit(data: SerieFormValues) {
        if (!user) {
            toast({ title: "Error", description: "Debes iniciar sesión para agregar una serie.", variant: "destructive" });
            return;
        }
        try {
            const { getUserAuth } = await import('@/lib/auth-client');
            const { uid, token } = await getUserAuth(user);
            const result = await addSerie(data, uid, token);

        if (result.success) {
            toast({ title: "Éxito", description: "La serie se ha guardado correctamente." });
            router.push("/dashboard/settings/series");
        } else {
            toast({ title: "Error al guardar", description: result.message || "No se pudo guardar la serie.", variant: "destructive" });
        }
        } catch (error) {
            toast({ 
                title: "Error", 
                description: error instanceof Error ? error.message : "No fue posible autenticar la sesión.", 
                variant: "destructive" 
            });
        }
    }
    
    const handleBorrar = () => {
        form.reset();
        toast({ title: "Formulario limpiado." });
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-lg mx-auto">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold font-headline">Crear Serie y Folio</h1>
                     <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/settings/series">Series y Folios</Link>
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-base">Nueva Serie</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <FormField control={form.control} name="serie" render={({ field }) => ( <FormItem><FormLabel>* Serie</FormLabel><FormControl><Input placeholder="A" {...field} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="folio" render={({ field }) => ( <FormItem><FormLabel>* Folio inicial</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                       <FormField control={form.control} name="documentType" render={({ field }) => (
                            <FormItem>
                                <FormLabel>* Tipo de Documento</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="Factura de Ingreso">Factura de Ingreso</SelectItem>
                                        <SelectItem value="Nota de Crédito">Nota de Crédito</SelectItem>
                                        <SelectItem value="Complemento de Pago">Complemento de Pago</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                    </CardContent>
                     <CardFooter className="flex justify-end gap-2">
                        <Button type="submit" disabled={form.formState.isSubmitting}>
                            {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
                        </Button>
                        <Button type="button" variant="outline" onClick={handleBorrar}>
                            Borrar
                        </Button>
                    </CardFooter>
                </Card>
            </form>
        </Form>
    );
}
