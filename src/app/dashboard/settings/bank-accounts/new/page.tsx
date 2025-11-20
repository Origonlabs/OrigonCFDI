
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
import { addBankAccount } from "@/app/actions/bank-accounts";
import { bankAccountSchema, type BankAccountFormValues } from "@/lib/schemas";
import { getUserAuth } from "@/lib/auth-client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

// A small list of common banks in Mexico
const commonBanks = [
    { rfc: "BBA830831LJ2", name: "BBVA México, S.A." },
    { rfc: "BNM840515VB1", name: "Banco Nacional de México, S.A." },
    { rfc: "BSM970519DU8", name: "Banco Santander (México), S.A." },
    { rfc: "BBA940707IE1", name: "Banco Mercantil del Norte, S.A." },
    { rfc: "HMI950125KG8", name: "HSBC México, S.A." },
    { rfc: "SBM961002T39", name: "Scotiabank Inverlat, S.A." },
    { rfc: "BIN940223KE0", name: "Banco Inbursa, S.A." },
    { rfc: "BNC061114TQ4", name: "ABC Capital, S.A." },
];

export default function NewBankAccountPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);

    const form = useForm<BankAccountFormValues>({
        resolver: zodResolver(bankAccountSchema),
        defaultValues: {
            bankRfc: "",
            bankName: "",
            shortName: "",
            accountNumber: "",
        },
    });

    useEffect(() => {
        if (!firebaseEnabled || !auth) return;
        const unsubscribe = auth.onAuthStateChanged((currentUser) => {
            setUser(currentUser);
        });
        return () => unsubscribe();
    }, []);

    async function onSubmit(data: BankAccountFormValues) {
        if (!user) {
            toast({ title: "Error", description: "Debes iniciar sesión para agregar una cuenta.", variant: "destructive" });
            return;
        }
        try {
            const { uid, token } = await getUserAuth(user);
            const result = await addBankAccount(data, uid, token);

            if (result.success) {
                toast({ title: "Éxito", description: "La cuenta bancaria se ha guardado correctamente." });
                router.push("/dashboard/settings/bank-accounts");
            } else {
                toast({ title: "Error al guardar", description: result.message || "No se pudo guardar la cuenta.", variant: "destructive" });
            }
        } catch (error) {
            toast({ title: "Error al guardar", description: error instanceof Error ? error.message : "No fue posible validar tu sesión.", variant: "destructive" });
        }
    }
    
    const handleBorrar = () => {
        form.reset();
        toast({ title: "Formulario limpiado." });
    };

    const handleBankSelect = (rfc: string) => {
        const selectedBank = commonBanks.find(b => b.rfc === rfc);
        if (selectedBank) {
            form.setValue("bankRfc", selectedBank.rfc);
            form.setValue("bankName", selectedBank.name);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-between">
                    <h1 className="text-lg font-bold font-headline">Crear Cuenta Bancaria</h1>
                     <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/settings/bank-accounts">Cuentas Bancarias</Link>
                    </Button>
                </div>
                
                <Card>
                    <CardHeader>
                        <CardTitle className="font-headline text-base">Cuentas Bancarias del emisor</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                       <div className="grid md:grid-cols-2 gap-x-6 gap-y-4">
                            <FormField control={form.control} name="bankRfc" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>* RFC del Banco</FormLabel>
                                    <Select onValueChange={(value) => {
                                        field.onChange(value);
                                        handleBankSelect(value);
                                    }} defaultValue={field.value}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {commonBanks.map(bank => (
                                                <SelectItem key={bank.rfc} value={bank.rfc}>{bank.rfc}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="bankName" render={({ field }) => ( <FormItem><FormLabel>* Nombre del Banco</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="shortName" render={({ field }) => ( <FormItem><FormLabel>* Nombre corto</FormLabel><FormControl><Input placeholder="Alias para la cuenta" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="accountNumber" render={({ field }) => ( <FormItem><FormLabel>* No. de Cuenta</FormLabel><FormControl><Input placeholder="Número de cuenta o CLABE" {...field} /></FormControl><FormMessage /></FormItem> )} />
                       </div>
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
