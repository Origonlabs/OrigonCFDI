
"use client";

import Link from 'next/link'
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth, firebaseEnabled } from '@/lib/firebase/client';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { createUserWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { OrigonLogo } from '@/components/logo';
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

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      nombre: "",
      apellidos: "",
      usuario: "",
      email: "",
      confirmEmail: "",
      rfc: "",
      passwordCertificado: "",
    }
  });

  async function onSubmit(data: SignupFormValues) {
    if (!firebaseEnabled || !auth) {
      toast({
        title: "Error de Configuración",
        description: "Firebase no está configurado. Revisa tus variables de entorno.",
        variant: "destructive",
      });
      return;
    }
    
    setIsSubmitting(true);
    try {
      // For now, we will use a dummy password for Firebase Auth, as it's not in the new form.
      // In a real scenario, you'd need a password field.
      const tempPassword = `${data.rfc}_${new Date().getTime()}`;
      
      const userCredential = await createUserWithEmailAndPassword(auth, data.email, tempPassword);
      const user = userCredential.user;

      if (user) {
        await updateProfile(user, { displayName: `${data.nombre} ${data.apellidos}` });
        
        // Crear usuario en la BD con rol 'company' por defecto
        const { createUser } = await import('../actions/users');
        await createUser(user.uid, data.email, 'company');
        
        // We need to adapt the profile data to what `saveCompanyProfile` expects.
        // This is a partial mapping based on the new form.
        const profileData: Partial<ProfileFormValues> = {
            companyName: `${data.nombre} ${data.apellidos}`, // Or however you want to map this
            rfc: data.rfc,
        };
        
        // This part would need a new server action to handle the certificate files
        // For now, we'll just save the basic info.
        // En signup, no tenemos token aún, así que usamos una versión sin verificación
        // o pasamos un token temporal. Por ahora, omitimos la verificación en signup.
        const tempToken = await user.getIdToken();
        await saveCompanyProfile(profileData as ProfileFormValues, user.uid, tempToken);
      }
      
      toast({
        title: "¡Registro Exitoso!",
        description: "Hemos enviado un correo para verificar tu cuenta. Serás redirigido."
      });
      router.push('/dashboard');

    } catch (error: any) {
      console.error("Error al registrar", error);
      let description = "No se pudo crear la cuenta.";
      if (error.code === 'auth/email-already-in-use') {
        description = "Este correo electrónico ya está en uso.";
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

  return (
    <div className="login-background bg-cover bg-center flex min-h-svh w-full flex-col items-center justify-center gap-6 p-4 md:p-10">
        <Link href="/" className="flex items-center gap-2 self-center font-medium">
            <div className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-md p-1">
                <OrigonLogo />
            </div>
            <span className="font-headline text-lg">Origon CFDI</span>
        </Link>
        <Card className="w-full max-w-xl border-0">
            <CardHeader className="text-center">
                <CardTitle className="text-xl">Crear una cuenta</CardTitle>
                <CardDescription>
                Asegúrese y rectifique que su información proporcionada sea correcta.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <FormField control={form.control} name="nombre" render={({ field }) => ( <FormItem><FormLabel>*Nombre:</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="apellidos" render={({ field }) => ( <FormItem><FormLabel>*Apellidos:</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="usuario" render={({ field }) => ( <FormItem><FormLabel>*Usuario:</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="rfc" render={({ field }) => ( <FormItem><FormLabel>*RFC:</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="email" render={({ field }) => ( <FormItem><FormLabel>*Email:</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={form.control} name="confirmEmail" render={({ field }) => ( <FormItem><FormLabel>*Confirmación de Email:</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            
                            <FormField control={form.control} name="archivoCer" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>*Archivo .cer:</FormLabel>
                                    <FormControl><Input type="file" accept=".cer" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="archivoKey" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>*Archivo .key:</FormLabel>
                                    <FormControl><Input type="file" accept=".key" onChange={(e) => field.onChange(e.target.files?.[0])} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                             <FormField control={form.control} name="passwordCertificado" render={({ field }) => ( 
                                <FormItem className="md:col-span-2">
                                    <FormLabel>*Contraseña del Certificado:</FormLabel>
                                    <FormControl>
                                      <div className="relative">
                                        <Input type={showPassword ? "text" : "password"} {...field} />
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
                             <Button type="submit" disabled={!firebaseEnabled || isSubmitting}>
                                {isSubmitting ? 'Registrando...' : 'Registrarme'}
                             </Button>
                             <Button variant="destructive" type="button" onClick={() => router.push('/')}>
                                Cancelar
                             </Button>
                           </div>
                           {!firebaseEnabled && (
                            <p className="pt-2 text-center text-xs text-destructive">
                            La configuración de Firebase está incompleta. La autenticación está deshabilitada.
                            </p>
                           )}
                        </CardFooter>
                    </form>
                </Form>
            </CardContent>
        </Card>
        <div className="mt-4 text-center text-sm">
            <p>
                ¿Ya tienes una cuenta?{' '}
                <Link href="/" className="underline">
                Iniciar sesión
                </Link>
            </p>
        </div>
    </div>
  );
}
