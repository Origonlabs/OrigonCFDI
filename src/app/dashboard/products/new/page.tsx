
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AddCircleRegular, QuestionCircleRegular } from "@/icons/fluent";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { addProduct } from "@/app/actions/products";
import { productSchema as newProductSchema, type ProductFormValues } from "@/lib/schemas";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipProvider, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";
import { Textarea } from "@/components/ui/textarea";

export default function NewProductPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    const form = useForm<ProductFormValues>({
        resolver: zodResolver(newProductSchema),
        defaultValues: {
            code: "",
            unitKey: "",
            objetoImpuesto: "",
            description: "",
            unitPrice: 0,
            satKey: "",
        },
    });

    useEffect(() => {
        if (!firebaseEnabled || !auth) return;
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    async function onSubmit(data: ProductFormValues) {
        if (!user) {
            toast({ title: "Error", description: "Debes iniciar sesión para agregar un producto.", variant: "destructive" });
            return;
        }
        const result = await addProduct(data, user.uid);

        if (result.success) {
            toast({ title: "Éxito", description: "El producto se ha guardado correctamente." });
            router.push("/dashboard/products");
        } else {
            toast({ title: "Error al guardar", description: result.message || "No se pudo guardar la información del producto.", variant: "destructive" });
        }
    }

    const handleBorrar = () => {
        form.reset();
        toast({ title: "Formulario limpiado." });
    };

    return (
      <TooltipProvider>
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-4xl mx-auto">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold font-headline">Crear Producto o Servicio</h1>
                    <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/products">Productos</Link>
                    </Button>
                </div>
                
                <Card>
                    <CardContent className="pt-6">
                        <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                           <FormField control={form.control} name="code" render={({ field }) => ( <FormItem><FormLabel>Código</FormLabel><FormControl><Input placeholder="Código interno del producto" {...field} /></FormControl><FormMessage /></FormItem> )} />
                           <FormField control={form.control} name="unitKey" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>* Unidad</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar unidad..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="H87">H87 - Pieza</SelectItem>
                                            <SelectItem value="E48">E48 - Servicio</SelectItem>
                                            <SelectItem value="KGM">KGM - Kilogramo</SelectItem>
                                            <SelectItem value="XUN">XUN - Unidad</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                           <FormField control={form.control} name="objetoImpuesto" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>* Objeto Impuesto</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar objeto impuesto..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            <SelectItem value="01">01 - No objeto de impuesto.</SelectItem>
                                            <SelectItem value="02">02 - Sí objeto de impuesto.</SelectItem>
                                            <SelectItem value="03">03 - Sí objeto del impuesto y no obligado al desglose.</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="unitPrice" render={({ field }) => ( <FormItem><FormLabel>Precio Unitario</FormLabel><FormControl><Input type="number" placeholder="0.00" step="0.01" {...field} /></FormControl><FormMessage /></FormItem> )} />
                             <FormField control={form.control} name="description" render={({ field }) => ( 
                                <FormItem className="md:col-span-2">
                                  <FormLabel>* Descripción</FormLabel>
                                  <FormControl><Textarea placeholder="Descripción detallada del producto o servicio" {...field} /></FormControl>
                                  <FormMessage />
                                </FormItem> 
                              )} />
                        </div>
                    </CardContent>
                </Card>

                <Accordion type="single" collapsible defaultValue="item-1" className="w-full">
                  <AccordionItem value="item-1">
                    <AccordionTrigger className="text-base font-medium px-4 bg-muted rounded-t-lg data-[state=closed]:rounded-b-lg">Información de Producto (Catálogos SAT)</AccordionTrigger>
                    <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                      <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                         <FormField control={form.control} name="satKey" render={({ field }) => ( <FormItem><FormLabel>* Clave Producto o Servicio</FormLabel><FormControl><Input placeholder="Escribe por lo menos 3 caracteres para buscar" {...field} /></FormControl><FormMessage /></FormItem> )} />
                         <FormItem>
                            <FormLabel>Clave Unidad</FormLabel>
                            <Input placeholder="Se llena con el campo 'Unidad'" value={form.watch('unitKey')} disabled />
                         </FormItem>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                </Accordion>

                <Card>
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle className="font-headline text-base">Impuestos</CardTitle>
                            <CardDescription>Próximamente: Configura los impuestos aplicables a este producto.</CardDescription>
                        </div>
                         <div className="flex gap-2">
                            <Button variant="outline" size="sm" type="button" disabled>
                                <AddCircleRegular className="mr-2 h-4 w-4" />
                                Agregar Impuestos
                            </Button>
                            <Tooltip>
                                <TooltipTrigger asChild><Button variant="ghost" size="icon" type="button" disabled><QuestionCircleRegular className="h-4 w-4" /></Button></TooltipTrigger>
                                <TooltipContent><p>Ayuda Impuestos</p></TooltipContent>
                            </Tooltip>
                         </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Efecto</TableHead>
                                    <TableHead>Base</TableHead>
                                    <TableHead>Impuesto</TableHead>
                                    <TableHead>Tipo factor</TableHead>
                                    <TableHead>Tasa o cuota</TableHead>
                                    <TableHead>IVA S/ IEPS</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center h-24 text-muted-foreground">
                                        No hay impuestos agregados.
                                    </TableCell>
                                </TableRow>
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>

                <div className="flex justify-end gap-2">
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting ? "Guardando..." : "Guardar"}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleBorrar}>
                        Borrar
                    </Button>
                </div>
            </form>
        </Form>
      </TooltipProvider>
    );
}
