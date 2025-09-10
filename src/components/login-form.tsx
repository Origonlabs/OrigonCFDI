
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
  <svg role="img" viewBox="0 0 24 24" className="mr-2 h-4 w-4">
    <path
      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
      fill="#4285F4"
    />
    <path
      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
      fill="#34A853"
    />
    <path
      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
      fill="#FBBC05"
    />
    <path
      d="M12 5.16c1.56 0 2.95.53 4.04 1.58l3.15-3.15C17.45 1.99 14.97 1 12 1 7.7 1 3.99 3.47 2.18 6.59l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      fill="#EA4335"
    />
    <path d="M1 1h22v22H1z" fill="none" />
  </svg>
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
    } catch (error: any) {
      let description = "Ocurrió un error inesperado.";
      if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "El correo electrónico o la contraseña son incorrectos.";
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
    try {
      await signInWithPopup(auth, provider);
      router.push('/dashboard');
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user' || error.code === 'auth/cancelled-popup-request') {
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
    } catch (error: any) {
      if (error.code === 'auth/popup-closed-by-user') {
        console.log("Sign-in popup closed by user.");
        return;
      }

      if (error.code === 'auth/multi-factor-required') {
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
      <Card className="border-0">
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Bienvenido de nuevo</CardTitle>
          <CardDescription>
            Inicia sesión con tu cuenta social o empresarial
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6">
              <div className="flex flex-col gap-4">
                <Button variant="secondary" className="w-full" onClick={handleMicrosoftSignIn} disabled>
                  <MicrosoftIcon />
                  Iniciar con Microsoft
                </Button>
                <Button variant="secondary" className="w-full" onClick={handleGoogleSignIn} disabled={!firebaseEnabled || isSubmitting}>
                  <GoogleIcon />
                  Iniciar con Google
                </Button>
              </div>
              <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                <span className="bg-card text-muted-foreground relative z-10 px-2">
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
                <span className="bg-card text-muted-foreground relative z-10 px-2">
                  ¿Eres de una empresa?
                </span>
              </div>
               <Button variant="outline" className="w-full" onClick={() => router.push('/login')} disabled={isSubmitting}>
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
