
"use client";

import { useState, useEffect } from "react";
import { User } from "firebase/auth";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AppleLoader } from "@/components/ui/apple-loader";
import { ClientForm } from "@/components/client-form";
import { Button } from "@/components/ui/button";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { addClient } from "@/app/actions/clients";
import type { ClientFormValues } from "@/lib/schemas";


export default function NewClientPage() {
    const { toast } = useToast();
    const router = useRouter();
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

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

    async function onSubmit(data: ClientFormValues) {
        if (!user) {
            toast({ title: "Error", description: "Debes iniciar sesión para agregar un cliente.", variant: "destructive" });
            return;
        }
        try {
            const token = await user.getIdToken();
            const result = await addClient(data, user.uid, token);

            if (result.success) {
                toast({ title: "Éxito", description: "El cliente se ha guardado correctamente." });
                router.push("/dashboard/clients");
            } else {
                toast({ title: "Error al guardar", description: result.message || "No se pudo guardar la información del cliente.", variant: "destructive" });
            }
        } catch (error) {
            console.error(error);
            toast({ title: "Error al guardar", description: "No fue posible validar tu sesión.", variant: "destructive" });
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[calc(100vh-10rem)]">
                <AppleLoader />
            </div>
        );
    }

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-8 space-y-4">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold">Agregar Cliente</h1>
                        <p className="text-gray-600">Completa la información para agregar un nuevo cliente a tu base de datos.</p>
                    </div>
                    <Button asChild variant="outline">
                        <Link href="/dashboard/clients">Cancelar</Link>
                    </Button>
                </div>
            </div>
            <ClientForm onSubmit={onSubmit} />
        </div>
    );
}
