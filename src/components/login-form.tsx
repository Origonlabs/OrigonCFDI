
'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, signInWithEmailAndPassword, getMultiFactorResolver } from 'firebase/auth';
import { EyeRegular, EyeOffRegular } from '@/icons/fluent';

import { cn } from "@/lib/utils"
import { auth, firebaseEnabled } from '@/lib/firebase/client';
import { useToast } from "@/hooks/use-toast";

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


const GoogleIcon = () => (
  <img src="/Logo-Google.svg" alt="Google" className="mr-2 h-4 w-4" />
);

const MicrosoftIcon = () => (
  <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
    <path fill="#F25022" d="M11.25 11.25H2.5V2.5h8.75v8.75z" />
    <path fill="#7FBA00" d="M21.5 11.25h-8.75V2.5h8.75v8.75z" />
    <path fill="#00A4EF" d="M11.25 21.5H2.5v-8.75h8.75V21.5z" />
    <path fill="#FFB900" d="M21.5 21.5h-8.75v-8.75h8.75V21.5z" />
  </svg>
);


export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firebaseEnabled || !auth) {
      toast({ title: "Error de Configuración", description: "Firebase no está configurado.", variant: "destructive", });
      return;
    }

    setIsSubmitting(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.push('/dashboard');
    } catch (error) {
      const authError = error as { code?: string };
      let description = "Ocurrió un error inesperado.";
      if (authError.code === 'auth/user-not-found' || authError.code === 'auth/wrong-password' || authError.code === 'auth/invalid-credential') {
        description = "El correo electrónico o la contraseña son incorrectos.";
      } else if (authError.code === 'auth/too-many-requests') {
        description = "Demasiados intentos fallidos. Por favor, inténtalo de nuevo más tarde.";
      }
      toast({ title: "Error de Autenticación", description, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  }

  const handleMicrosoftSignIn = async () => {
    if (!firebaseEnabled || !auth) {
      toast({ title: "Error de Configuración", description: "Firebase no está configurado.", variant: "destructive", });
      return;
    }
    setIsSubmitting(true);
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({ prompt: 'consent' });
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code === 'auth/popup-closed-by-user' || authError.code === 'auth/cancelled-popup-request') {
        console.log("Sign-in popup closed by user.");
      } else {
        console.error("Error al iniciar sesión con Microsoft", error);
        toast({ title: "Error de Autenticación", description: "No se pudo iniciar sesión con Microsoft.", variant: "destructive", });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!firebaseEnabled || !auth) {
      toast({ title: "Error de Configuración", description: "Firebase no está configurado.", variant: "destructive", });
      return;
    }
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error) {
      const authError = error as { code?: string };
      if (authError.code === 'auth/popup-closed-by-user') {
        console.log("Sign-in popup closed by user.");
        return;
      }

      if (authError.code === 'auth/multi-factor-required') {
        // @ts-ignore - getMultiFactorResolver types might be tricky with unknown error
        const resolver = getMultiFactorResolver(auth, error);
        console.log('MFA is required. Resolver:', resolver);
        toast({
          title: "Verificación Requerida",
          description: "Se necesita un segundo factor de autenticación para continuar.",
          variant: "default",
        });
      } else {
        console.error("Error al iniciar sesión con Google", error);
        toast({ title: "Error de Autenticación", description: "No se pudo iniciar sesión con Google. Revisa la configuración de tu proyecto en Firebase.", variant: "destructive", });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card className="border-0 shadow-none bg-card/80 backdrop-blur-sm p-6 rounded-xl">
        <CardHeader className="text-center px-0 pb-6">
          <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
          <CardDescription>
            Inicia sesión con tu cuenta social o empresarial
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="grid gap-6">
            <div className="flex flex-col gap-4">
              <Button
                variant="secondary"
                className="w-full"
                onClick={handleMicrosoftSignIn}
                disabled={!firebaseEnabled || isSubmitting}
              >
                <MicrosoftIcon />
                Iniciar con Microsoft
              </Button>
              <Button variant="secondary" className="w-full" onClick={handleGoogleSignIn} disabled={!firebaseEnabled || isSubmitting}>
                <GoogleIcon />
                Iniciar con Google
              </Button>
            </div>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-transparent text-muted-foreground relative z-10 px-2">
                O continuar con
              </span>
            </div>
            <form onSubmit={handleEmailSignIn}>
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="email">Correo electrónico</Label>
                  <Input id="email" type="email" placeholder="GlobalID@Company.com" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={!firebaseEnabled || isSubmitting} />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Contraseña</Label>
                    <Link href="/reset-password" className="ml-auto text-sm underline-offset-4 hover:underline">
                      ¿Olvidaste tu contraseña?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input id="password" type={showPassword ? "text" : "password"} required value={password} onChange={(e) => setPassword(e.target.value)} disabled={!firebaseEnabled || isSubmitting} />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                      {showPassword ? <EyeOffRegular className="h-4 w-4" /> : <EyeRegular className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={!firebaseEnabled || isSubmitting}>
                  {isSubmitting ? 'Iniciando...' : 'Iniciar Sesión'}
                </Button>
                {!firebaseEnabled && (
                  <p className="text-center text-xs text-destructive pt-2">
                    La configuración de Firebase está incompleta. La autenticación está deshabilitada.
                  </p>
                )}
              </div>
            </form>
            <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
              <span className="bg-transparent text-muted-foreground relative z-10 px-2">
                ¿Eres de una empresa?
              </span>
            </div>
            <Button variant="outline" className="w-full" onClick={() => {
              toast({
                title: "No disponible",
                description: "El inicio de sesión con SSO no está disponible por el momento.",
                variant: "default",
              });
            }} disabled={isSubmitting}>
              Iniciar Sesión con SSO
            </Button>
            <div className="text-center text-sm">
              ¿No tienes una cuenta?{" "}
              <Link href="/signup" className="underline underline-offset-4">
                Regístrate
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
