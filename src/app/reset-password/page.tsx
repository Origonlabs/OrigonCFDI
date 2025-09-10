
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { auth, firebaseEnabled } from '@/lib/firebase/client';
import { useToast } from "@/hooks/use-toast";
import { sendPasswordResetEmail } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MailRegular } from "@/icons/fluent";

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast({
        title: "Correo Requerido",
        description: "Por favor, ingresa tu correo electrónico para restablecer la contraseña.",
        variant: "destructive",
      });
      return;
    }
    if (!firebaseEnabled || !auth) {
      toast({
        title: "Error de Configuración",
        description: "Firebase no está configurado.",
        variant: "destructive",
      });
      return;
    }
    setIsSubmitting(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: "Correo Enviado",
        description: `Se ha enviado un enlace a ${email} para restablecer tu contraseña.`,
      });
      setEmailSent(true);
    } catch (error: any) {
      console.error("Error al enviar correo de restablecimiento", error);
      let description = "Ocurrió un error inesperado.";
       if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-email') {
        description = "No se encontró ninguna cuenta con ese correo electrónico.";
      }
      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
        setIsSubmitting(false);
    }
  };

  return (
    <div className="login-background bg-cover bg-center flex items-center justify-center min-h-screen px-4">
        <Card className="w-full max-w-md border-0">
            <CardHeader className="text-center">
                <CardTitle className="text-xl font-bold font-headline">Restablecer Contraseña</CardTitle>
                <CardDescription>
                    Sigue los pasos para recuperar el acceso a tu cuenta.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {emailSent ? (
                    <div className="text-center space-y-4">
                        <MailRegular className="mx-auto h-12 w-12 text-green-500" />
                        <h3 className="text-lg font-semibold">Revisa tu correo</h3>
                        <p className="text-muted-foreground">
                            Hemos enviado un enlace a <strong>{email}</strong>. Sigue las instrucciones del correo para crear tu nueva contraseña.
                        </p>
                        <p className="text-xs text-muted-foreground">Si no lo encuentras, revisa tu carpeta de spam.</p>
                        <Button onClick={() => router.push('/login')} className="w-full">
                            Volver a Iniciar Sesión
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-6">
                        <div className="space-y-4">
                            <div className="flex items-start gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                    <span className="font-bold text-sm">1</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Ingresa tu correo</h4>
                                    <p className="text-sm text-muted-foreground">Escribe la dirección de correo asociada a tu cuenta.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                     <span className="font-bold text-sm">2</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Revisa tu bandeja de entrada</h4>
                                    <p className="text-sm text-muted-foreground">Te enviaremos un enlace seguro para que puedas continuar.</p>
                                </div>
                            </div>
                             <div className="flex items-start gap-4">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary">
                                     <span className="font-bold text-sm">3</span>
                                </div>
                                <div>
                                    <h4 className="font-semibold">Crea tu nueva contraseña</h4>
                                    <p className="text-sm text-muted-foreground">Sigue el enlace y establece una nueva contraseña para tu cuenta.</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handlePasswordReset} className="grid gap-4 pt-6 border-t">
                            <div className="grid gap-2">
                                <Label htmlFor="email">Correo electrónico</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="tu@correo.com"
                                    required
                                    disabled={!firebaseEnabled || isSubmitting}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={!firebaseEnabled || isSubmitting}>
                                {isSubmitting ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
                            </Button>
                            {!firebaseEnabled && (
                                <p className="text-center text-xs text-destructive pt-2">
                                La configuración de Firebase está incompleta. La autenticación está deshabilitada.
                                </p>
                            )}
                        </form>
                    </div>
                )}
                <div className="mt-4 text-center text-sm">
                    ¿Recordaste tu contraseña?{' '}
                    <Link href="/" className="underline">
                        Iniciar sesión
                    </Link>
                </div>
            </CardContent>
        </Card>
    </div>
  );
}
