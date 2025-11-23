
"use client";

import Link from 'next/link'
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { auth, firebaseEnabled } from '@/lib/firebase/client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { GoogleAuthProvider, OAuthProvider, signInWithPopup, updateProfile, createUserWithEmailAndPassword } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { saveCompanyProfile } from '@/app/actions/companies';
import { type ProfileFormValues, signupSchema, type SignupFormValues } from '@/lib/schemas';
import { EyeRegular, EyeOffRegular } from '@/icons/fluent';

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"

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

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<'auth' | 'details'>('auth');
  const [oauthUser, setOauthUser] = useState<{ uid: string; email: string; displayName: string | null } | null>(null);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      usuario: "",
      email: "",
      confirmEmail: "",
      rfc: "",
      password: "",
      confirmPassword: "",
      passwordCertificado: "",
    }
  });

  const handleGoogleSignUp = async () => {
    if (!firebaseEnabled || !auth) {
      toast({ title: "Error de Configuración", description: "Firebase no está configurado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar si el usuario ya existe
      const { getUserRole } = await import('../actions/users');
      const roleResult = await getUserRole(user.uid);

      if (roleResult.success && roleResult.role) {
        // Usuario ya existe, redirigir al dashboard
        toast({ title: "Bienvenido de nuevo", description: "Ya tienes una cuenta registrada." });
        router.push('/dashboard');
        return;
      }

      // Usuario nuevo, mostrar formulario de datos adicionales
      setOauthUser({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName
      });

      // Pre-llenar el formulario con datos de Google
      const nameParts = user.displayName?.split(' ') || ['', ''];
      form.setValue('nombre', nameParts[0] || '');
      form.setValue('apellidos', nameParts.slice(1).join(' ') || '');
      form.setValue('email', user.email || '');
      form.setValue('confirmEmail', user.email || '');
      form.setValue('usuario', user.email?.split('@')[0] || '');

      setStep('details');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user') {
        console.error("Error al registrar con Google", error);
        toast({ title: "Error de Registro", description: "No se pudo registrar con Google.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMicrosoftSignUp = async () => {
    if (!firebaseEnabled || !auth) {
      toast({ title: "Error de Configuración", description: "Firebase no está configurado.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    const provider = new OAuthProvider('microsoft.com');
    provider.setCustomParameters({ prompt: 'consent' });
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Verificar si el usuario ya existe
      const { getUserRole } = await import('../actions/users');
      const roleResult = await getUserRole(user.uid);

      if (roleResult.success && roleResult.role) {
        // Usuario ya existe, redirigir al dashboard
        toast({ title: "Bienvenido de nuevo", description: "Ya tienes una cuenta registrada." });
        router.push('/dashboard');
        return;
      }

      // Usuario nuevo, mostrar formulario de datos adicionales
      setOauthUser({
        uid: user.uid,
        email: user.email || '',
        displayName: user.displayName
      });

      // Pre-llenar el formulario con datos de Microsoft
      const nameParts = user.displayName?.split(' ') || ['', ''];
      form.setValue('nombre', nameParts[0] || '');
      form.setValue('apellidos', nameParts.slice(1).join(' ') || '');
      form.setValue('email', user.email || '');
      form.setValue('confirmEmail', user.email || '');
      form.setValue('usuario', user.email?.split('@')[0] || '');

      setStep('details');
    } catch (error: any) {
      if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
        console.error("Error al registrar con Microsoft", error);
        toast({ title: "Error de Registro", description: "No se pudo registrar con Microsoft.", variant: "destructive" });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  async function onSubmit(data: SignupFormValues) {
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
      let user = auth.currentUser;

      // Si no hay usuario OAuth, crear con email/password
      if (!oauthUser) {
        if (!data.password) {
          toast({
            title: "Error",
            description: "La contraseña es requerida para registro con correo.",
            variant: "destructive",
          });
          setIsSubmitting(false);
          return;
        }
        const userCredential = await createUserWithEmailAndPassword(auth, data.email, data.password);
        user = userCredential.user;
      }

      if (!user) {
        throw new Error("No hay usuario autenticado");
      }

      // Actualizar el perfil con el nombre completo
      await updateProfile(user, { displayName: `${data.nombre} ${data.apellidos}` });

      // Crear usuario en la BD con rol 'company' por defecto
      const { createUser } = await import('../actions/users');
      const createUserResult = await createUser(user.uid, data.email, 'company');

      if (!createUserResult.success) {
        console.error("Error al crear usuario en BD:", createUserResult.message);
        toast({
          title: "Error",
          description: createUserResult.message || "No se pudo crear el usuario en la base de datos.",
          variant: "destructive",
        });
        setIsSubmitting(false);
        return;
      }

      // Guardar datos del perfil de empresa
      const profileData: Partial<ProfileFormValues> = {
        companyName: `${data.nombre} ${data.apellidos}`,
        rfc: data.rfc,
      };

      const tempToken = await user.getIdToken();
      const profileResult = await saveCompanyProfile(profileData as ProfileFormValues, user.uid, tempToken);

      if (!profileResult.success) {
        console.warn("Error al guardar perfil (no crítico):", profileResult.message);
        // No bloquear el registro por esto, el perfil se puede completar después
      }

      toast({
        title: "¡Registro Exitoso!",
        description: "Tu cuenta ha sido creada correctamente."
      });
      window.location.href = '/dashboard';

    } catch (error: any) {
      console.error("Error al completar registro", error);
      let description = "No se pudo completar el registro.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este correo electrónico ya está en uso.";
      } else if (error.code === 'auth/weak-password') {
        description = "La contraseña debe tener al menos 6 caracteres.";
      }
      toast({
        title: "Error de Registro",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Paso 1: Selección de método de autenticación
  if (step === 'auth') {
    return (
      <div className="login-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
        <div className="relative z-10 flex w-[384px] flex-col gap-6">
          <Link href="/" className="flex items-center justify-center gap-2 self-center font-medium mb-4">
            <div className="relative h-12 w-40">
              <Image
                src="/LogoOrigonCFDI.webp"
                alt="Origon CFDI Logo"
                fill
                className="object-contain"
                unoptimized={true}
                priority
              />
            </div>
          </Link>

          <Card className="border-0 shadow-none bg-card/80 backdrop-blur-sm p-6 rounded-xl">
            <CardHeader className="text-center px-0 pb-6">
              <CardTitle className="text-xl">Crear una cuenta</CardTitle>
              <CardDescription>
                Regístrate con tu cuenta social o con correo
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid gap-4">
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleMicrosoftSignUp}
                  disabled={!firebaseEnabled || isSubmitting}
                >
                  <MicrosoftIcon />
                  Registrarme con Microsoft
                </Button>
                <Button
                  variant="secondary"
                  className="w-full"
                  onClick={handleGoogleSignUp}
                  disabled={!firebaseEnabled || isSubmitting}
                >
                  <GoogleIcon />
                  Registrarme con Google
                </Button>
                <div className="after:border-border relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t">
                  <span className="bg-transparent text-muted-foreground relative z-10 px-2">
                    O continuar con
                  </span>
                </div>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setStep('details');
                    setOauthUser(null);
                  }}
                  disabled={!firebaseEnabled || isSubmitting}
                >
                  Registrarme con correo
                </Button>
                {!firebaseEnabled && (
                  <p className="text-center text-xs text-destructive pt-2">
                    La configuración de Firebase está incompleta. La autenticación está deshabilitada.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="text-muted-foreground text-center text-xs text-balance">
            <p>
              ¿Ya tienes una cuenta?{' '}
              <Link href="/" className="underline underline-offset-4 hover:text-primary transition-colors">
                Iniciar sesión
              </Link>
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Paso 2: Formulario de datos adicionales
  return (
    <div className="login-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10">
      <div className="relative z-10 flex w-full max-w-lg flex-col gap-6">
        <Link href="/" className="flex items-center justify-center gap-2 self-center font-medium mb-4">
          <div className="relative h-12 w-40">
            <Image
              src="/LogoOrigonCFDI.webp"
              alt="Origon CFDI Logo"
              fill
              className="object-contain"
              unoptimized={true}
              priority
            />
          </div>
        </Link>

        <Card className="border-0 shadow-none bg-card/80 backdrop-blur-sm p-6 rounded-xl overflow-hidden">
          <CardHeader className="text-center px-0 pb-6">
            <CardTitle className="text-xl">Completa tu registro</CardTitle>
            <CardDescription>
              Proporciona la información adicional para tu cuenta
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit, (errors) => {
                  console.log("Errores de validación:", errors);
                  toast({
                    title: "Error de validación",
                    description: "Por favor, revisa los campos marcados en rojo.",
                    variant: "destructive",
                  });
                })} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <FormField control={form.control} name="nombre" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>*Nombre:</FormLabel>
                      <FormControl><Input className="w-full" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="apellidos" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>*Apellidos:</FormLabel>
                      <FormControl><Input className="w-full" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="usuario" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>*Usuario:</FormLabel>
                      <FormControl><Input className="w-full" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="rfc" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>*RFC:</FormLabel>
                      <FormControl><Input className="w-full" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>*Email:</FormLabel>
                      <FormControl><Input className="w-full" type="email" {...field} disabled={!!oauthUser} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="confirmEmail" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>*Confirmación de Email:</FormLabel>
                      <FormControl><Input className="w-full" type="email" {...field} disabled={!!oauthUser} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {/* Campos de contraseña solo para registro con correo */}
                  {!oauthUser && (
                    <>
                      <FormField control={form.control} name="password" render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormLabel>*Contraseña:</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input className="w-full pr-10" type={showPassword ? "text" : "password"} {...field} />
                              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                                {showPassword ? <EyeOffRegular className="h-4 w-4" /> : <EyeRegular className="h-4 w-4" />}
                              </button>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                        <FormItem className="min-w-0">
                          <FormLabel>*Confirmar Contraseña:</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Input className="w-full" type={showPassword ? "text" : "password"} {...field} />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </>
                  )}

                  <FormField control={form.control} name="archivoCer" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Archivo .cer (opcional):</FormLabel>
                      <FormControl><Input className="w-full" type="file" accept=".cer" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="archivoKey" render={({ field }) => (
                    <FormItem className="min-w-0">
                      <FormLabel>Archivo .key (opcional):</FormLabel>
                      <FormControl><Input className="w-full" type="file" accept=".key" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="passwordCertificado" render={({ field }) => (
                    <FormItem className="md:col-span-2 min-w-0">
                      <FormLabel>Contraseña del Certificado (opcional):</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Input className="w-full pr-10" type={showPassword ? "text" : "password"} {...field} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground">
                            {showPassword ? <EyeOffRegular className="h-4 w-4" /> : <EyeRegular className="h-4 w-4" />}
                          </button>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <CardFooter className="flex-col gap-4 px-0 pt-6">
                  <div className="flex gap-4">
                    <Button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? 'Registrando...' : 'Completar Registro'}
                    </Button>
                    <Button variant="destructive" type="button" onClick={() => {
                      setStep('auth');
                      setOauthUser(null);
                    }}>
                      Cancelar
                    </Button>
                  </div>
                </CardFooter>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
