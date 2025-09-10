
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import { onAuthStateChanged, User, updateProfile, reauthenticateWithCredential, EmailAuthProvider, updatePassword, deleteUser } from "firebase/auth";
import { CheckmarkCircleRegular, DismissCircleRegular, WarningRegular } from "@/icons/fluent";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { getCompanyProfile, saveCompanyProfile } from "@/app/actions/companies";
import { getCertificateDetails } from "@/app/actions/setup";
import { profileFormSchema, type ProfileFormValues, passwordChangeSchema, type PasswordChangeValues } from "@/lib/schemas";
import { regimenFiscalOptions } from "@/lib/catalogs";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";


interface Certificate {
    id: number;
    certificateNumber: string;
    validFrom: string;
    validTo: string;
    status: 'active' | 'revoked' | 'expired';
}

export default function SettingsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [certificate, setCertificate] = useState<Certificate | null>(null);
  const [deletePassword, setDeletePassword] = useState('');
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  // User profile state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  
  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      companyName: "", rfc: "", street: "", exteriorNumber: "", interiorNumber: "", state: "", municipality: "", neighborhood: "", zip: "", phone: "", phone2: "", fax: "", city: "", web: "", contadorEmail: "",
      taxRegime: "", commercialMessage: "", logoUrl: "", defaultEmailMessage: "", templateCfdi33: "costine-33", templateCfdi40: "costine-40", templateRep: "costine-rep",
    },
  });

  const passwordForm = useForm<PasswordChangeValues>({
    resolver: zodResolver(passwordChangeSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });
  
  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        if (currentUser.displayName) {
          const nameParts = currentUser.displayName.split(" ");
          const lName = nameParts.length > 1 ? nameParts.pop() || "" : "";
          const fName = nameParts.join(" ");
          setFirstName(fName);
          setLastName(lName);
        }
        await fetchProfile(currentUser.uid);
      } else {
        setLoading(false);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProfile = useCallback(async (uid: string) => {
      const [profileResponse, certificateResponse] = await Promise.all([
          getCompanyProfile(uid),
          getCertificateDetails(uid)
      ]);
      
      if (profileResponse.success && profileResponse.data) {
        profileForm.reset(profileResponse.data as any);
      } else if (!profileResponse.success && profileResponse.message) {
        // toast({ title: "Error al cargar perfil", description: profileResponse.message, variant: "destructive" });
      }

      if (certificateResponse.success && certificateResponse.data) {
          const processedCertificate = {
            ...certificateResponse.data,
            validFrom: certificateResponse.data.validFrom instanceof Date 
              ? certificateResponse.data.validFrom.toISOString() 
              : certificateResponse.data.validFrom,
            validTo: certificateResponse.data.validTo instanceof Date 
              ? certificateResponse.data.validTo.toISOString() 
              : certificateResponse.data.validTo
          };
          setCertificate(processedCertificate as Certificate);
      }
      setLoading(false);
  }, [profileForm]);

  async function onProfileSubmit(data: ProfileFormValues) {
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión para guardar los cambios.", variant: "destructive" });
      return;
    }

    // Update company profile
    const result = await saveCompanyProfile(data, user.uid);
    
    // Update user display name
    if (user && (user.displayName !== `${firstName} ${lastName}`.trim())) {
        await updateProfile(user, { displayName: `${firstName} ${lastName}`.trim() });
    }
    
    if (result.success) {
      toast({ title: "Éxito", description: "La configuración se ha actualizado." });
    } else {
      toast({ title: "Error al guardar", description: result.message || "No se pudo guardar la información.", variant: "destructive" });
    }
  }

  async function onPasswordSubmit(data: PasswordChangeValues) {
    if (!user || !user.email) {
        toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
        return;
    }
    
    const credential = EmailAuthProvider.credential(user.email, data.currentPassword);
    
    try {
        await reauthenticateWithCredential(user, credential);
        await updatePassword(user, data.newPassword);
        toast({ title: "Éxito", description: "Tu contraseña ha sido actualizada." });
        passwordForm.reset();
    } catch (error) {
        toast({ title: "Error", description: "La contraseña actual es incorrecta o ha ocurrido otro error.", variant: "destructive" });
    }
  }

  async function handleAccountDelete() {
    if (!user || !user.email) {
      toast({ title: "Error", description: "Usuario no autenticado.", variant: "destructive" });
      return;
    }
    if (!deletePassword) {
      toast({ title: "Error", description: "Por favor, introduce tu contraseña para confirmar.", variant: "destructive" });
      return;
    }

    const credential = EmailAuthProvider.credential(user.email, deletePassword);

    try {
      await reauthenticateWithCredential(user, credential);
      
      // Backend logic would go here to delete database records and handle re-registration blocking.
      console.log("User re-authenticated. In a real app, backend would delete associated data now.");

      await deleteUser(user);
      
      toast({ 
        title: "Cuenta Eliminada", 
        description: "Tu cuenta ha sido eliminada. No podrás registrarte de nuevo con el mismo correo durante 3 meses." 
      });
      // The onAuthStateChanged listener will handle redirection.
      
    } catch (error: any) {
      console.error("Error deleting account:", error);
      let description = "Ocurrió un error al intentar eliminar la cuenta.";
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        description = "La contraseña que ingresaste es incorrecta.";
      }
      toast({ title: "Error de Eliminación", description, variant: "destructive" });
    }
  }

  const CertificateStatusBadge = ({ status }: { status: 'active' | 'revoked' | 'expired' | null }) => {
    if (!status) return <Badge variant="secondary">Desconocido</Badge>;

    const config = {
        active: { label: 'Activo', variant: 'default' as const, icon: <CheckmarkCircleRegular className="mr-1 h-3.5 w-3.5" /> },
        revoked: { label: 'Revocado', variant: 'destructive' as const, icon: <DismissCircleRegular className="mr-1 h-3.5 w-3.5" /> },
        expired: { label: 'Expirado', variant: 'secondary' as const, icon: <WarningRegular className="mr-1 h-3.5 w-3.5" /> },
    };

    const currentConfig = config[status];

    return (
        <Badge variant={currentConfig.variant}>
            {currentConfig.icon}
            {currentConfig.label}
        </Badge>
    );
  };
  
  const isLoading = loading || profileForm.formState.isSubmitting || passwordForm.formState.isSubmitting;

  return (
    <>
    <div className="mx-auto w-full max-w-5xl">
      <h1 className="text-2xl font-bold font-headline mb-6">Mi cuenta</h1>
      
      {loading ? (
        <div className="space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-48 w-full" />
        </div>
      ) : (
      <Form {...profileForm}>
        <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
          <Accordion type="single" collapsible className="w-full space-y-4">
              <AccordionItem value="domicilio">
                  <AccordionTrigger className="text-lg font-semibold bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Domicilio</AccordionTrigger>
                  <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                    <Alert variant="destructive" className="mb-4">
                      <WarningRegular className="h-4 w-4" />
                      <AlertTitle>Información Crítica Requerida</AlertTitle>
                      <AlertDescription>
                        <p>Es fundamental que completes toda la información de domicilio de tu empresa.</p>
                        <ul className="list-disc pl-5 mt-2">
                          <li>Sin esta información, no podrás generar facturas, adquirir suscripciones ni utilizar las funciones principales del sistema.</li>
                          <li>Si no completas tu domicilio fiscal en los próximos 30 días, tu cuenta será suspendida y posteriormente eliminada de forma permanente.</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                    <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        {/* Left Column */}
                        <div className="space-y-4">
                            <FormField control={profileForm.control} name="companyName" render={({ field }) => ( <FormItem><FormLabel>*Nombre o Razón Social</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="rfc" render={({ field }) => ( <FormItem><FormLabel>RFC</FormLabel><FormControl><Input {...field} disabled/></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="street" render={({ field }) => ( <FormItem><FormLabel>Calle</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="exteriorNumber" render={({ field }) => ( <FormItem><FormLabel>Número exterior</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="interiorNumber" render={({ field }) => ( <FormItem><FormLabel>Número interior</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="state" render={({ field }) => ( <FormItem><FormLabel>Estado</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="municipality" render={({ field }) => ( <FormItem><FormLabel>Municipio</FormLabel><Select onValueChange={field.onChange} value={field.value ?? ''}><FormControl><SelectTrigger><SelectValue placeholder="Seleccionar"/></SelectTrigger></FormControl><SelectContent></SelectContent></Select><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="neighborhood" render={({ field }) => ( <FormItem><FormLabel>Colonia</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="contadorEmail" render={({ field }) => ( <FormItem><FormLabel>Email contador</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        {/* Right Column */}
                        <div className="space-y-4">
                            <FormField control={profileForm.control} name="zip" render={({ field }) => ( <FormItem><FormLabel>*Código Postal</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="phone" render={({ field }) => ( <FormItem><FormLabel>Teléfono</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="phone2" render={({ field }) => ( <FormItem><FormLabel>Teléfono 2</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="fax" render={({ field }) => ( <FormItem><FormLabel>Fax</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="space-y-2">
                                <Label>Nombre</Label>
                                <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <Label>Apellidos</Label>
                                <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
                            </div>
                            <FormField control={profileForm.control} name="city" render={({ field }) => ( <FormItem><FormLabel>Ciudad</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                            <div className="space-y-2">
                              <Label>*Email</Label>
                              <Input value={user?.email || ''} disabled/>
                            </div>
                            <FormField control={profileForm.control} name="web" render={({ field }) => ( <FormItem><FormLabel>Web</FormLabel><FormControl><Input {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                        </div>
                    </div>
                  </AccordionContent>
              </AccordionItem>

              <AccordionItem value="configuracion">
                <AccordionTrigger className="text-lg font-semibold bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Configuración</AccordionTrigger>
                <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                    <div className="space-y-6">
                        <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                            <FormField control={profileForm.control} name="taxRegime" render={({ field }) => (
                                <FormItem>
                                    <FormLabel>*Régimen Fiscal</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value ?? ''}>
                                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar régimen..." /></SelectTrigger></FormControl>
                                        <SelectContent>
                                            {regimenFiscalOptions.map(option => (
                                                <SelectItem key={option.clave} value={option.clave}>
                                                    {option.clave} - {option.descripcion}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={profileForm.control} name="commercialMessage" render={({ field }) => ( <FormItem><FormLabel>Mensaje comercial</FormLabel><FormControl><Input placeholder="Mensaje para el pie de factura" {...field} value={field.value ?? ''} /></FormControl><FormMessage /></FormItem> )} />
                            <FormField control={profileForm.control} name="logoUrl" render={({ field }) => ( 
                                <FormItem>
                                    <FormLabel>URL del Logotipo</FormLabel>
                                    <FormControl><Input placeholder="https://example.com/logo.png" {...field} value={field.value ?? ''} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )} />
                            <FormField control={profileForm.control} name="defaultEmailMessage" render={({ field }) => ( <FormItem><FormLabel>Mensaje predefinido para envio</FormLabel><FormControl><Textarea rows={4} {...field} value={field.value ?? ''}/></FormControl><FormMessage /></FormItem> )} />
                        </div>
                        <Separator/>
                        <div className="space-y-8">
                            <FormField control={profileForm.control} name="templateCfdi40" render={({ field }) => (
                              <FormItem className="space-y-3">
                                  <FormLabel>Plantilla de representación impresa CFDI 4.0:</FormLabel>
                                  <FormControl>
                                      <RadioGroup onValueChange={field.onChange} value={field.value ?? ''} className="flex flex-col sm:flex-row gap-8">
                                          <Label htmlFor="t40-1" className="flex flex-col items-center gap-2 cursor-pointer">
                                              <div className="border rounded-md p-2 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                                                  <RadioGroupItem value="costine-40" id="t40-1" className="sr-only"/>
                                                  <Image src="https://placehold.co/200x283.png" alt="Plantilla 1" width={200} height={283} data-ai-hint="invoice template" />
                                              </div>
                                          </Label>
                                          <Label htmlFor="t40-2" className="flex flex-col items-center gap-2 cursor-pointer">
                                               <div className="border rounded-md p-2 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                                                  <RadioGroupItem value="elegant-40" id="t40-2" className="sr-only"/>
                                                  <Image src="https://placehold.co/200x283.png" alt="Plantilla 2" width={200} height={283} data-ai-hint="invoice template" />
                                              </div>
                                          </Label>
                                      </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                            )} />
                            <FormField control={profileForm.control} name="templateRep" render={({ field }) => (
                              <FormItem className="space-y-3">
                                  <FormLabel>Plantilla de representación impresa REP:</FormLabel>
                                  <FormControl>
                                      <RadioGroup onValueChange={field.onChange} value={field.value ?? ''} className="flex flex-col sm:flex-row gap-8">
                                          <Label htmlFor="trep-1" className="flex flex-col items-center gap-2 cursor-pointer">
                                              <div className="border rounded-md p-2 has-[:checked]:border-primary has-[:checked]:ring-2 has-[:checked]:ring-primary">
                                                  <RadioGroupItem value="costine-rep" id="trep-1" className="sr-only" />
                                                  <Image src="https://placehold.co/200x283.png" alt="Plantilla REP" width={200} height={283} data-ai-hint="invoice template" />
                                              </div>
                                          </Label>
                                      </RadioGroup>
                                  </FormControl>
                                  <FormMessage />
                              </FormItem>
                            )} />
                        </div>
                    </div>
                </AccordionContent>
              </AccordionItem>

              <AccordionItem value="sso">
                <AccordionTrigger className="text-lg font-semibold bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Inicio de Sesión Único (SSO)</AccordionTrigger>
                <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                    <div className="space-y-4">
                        <CardDescription>
                            Permite a los usuarios de tu organización iniciar sesión con su proveedor de identidad corporativo.
                        </CardDescription>
                        <Button type="button" disabled>Habilitar SSO (Próximamente)</Button>
                    </div>
                </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="firma">
                  <AccordionTrigger className="text-lg font-semibold bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Firma</AccordionTrigger>
                  <AccordionContent className="p-4 border border-t-0 rounded-b-lg space-y-6">
                    <div>
                      <h3 className="text-base font-medium mb-2">Certificado Instalado</h3>
                      <div className="border rounded-lg overflow-hidden">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>No. de certificado</TableHead>
                              <TableHead>Fecha Inicial</TableHead>
                              <TableHead>Fecha Final</TableHead>
                              <TableHead>Estado</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {certificate ? (
                                <TableRow>
                                    <TableCell className="font-mono text-sm">{certificate.certificateNumber}</TableCell>
                                    <TableCell>{new Date(certificate.validFrom).toLocaleDateString('es-MX')}</TableCell>
                                    <TableCell>{new Date(certificate.validTo).toLocaleDateString('es-MX')}</TableCell>
                                    <TableCell>
                                        <CertificateStatusBadge status={certificate.status} />
                                    </TableCell>
                                </TableRow>
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No hay ningún certificado instalado.
                                    </TableCell>
                                </TableRow>
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-base font-medium mb-2">Instalar Nuevo Certificado de Sello Digital</h3>
                      <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="key-file">* Archivo .key</Label>
                          <Input id="key-file" type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="cer-file">* Archivo .cer</Label>
                          <Input id="cer-file" type="file" />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="key-password">* Contraseña de la clave privada</Label>
                          <Input id="key-password" type="password" />
                        </div>
                        <div className="flex items-end gap-2">
                            <Button type="button" disabled>Subir</Button>
                            <Button type="button" variant="outline" disabled>Borrar</Button>
                        </div>
                      </div>
                    </div>
                  </AccordionContent>
              </AccordionItem>

              <AccordionItem value="usuario">
                  <AccordionTrigger className="text-lg font-semibold bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Datos de Usuario</AccordionTrigger>
                  <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                      <Form {...passwordForm}>
                          <div className="space-y-6">
                            <div className="grid md:grid-cols-2 gap-x-8 gap-y-4">
                                <div className="space-y-2">
                                    <Label>Usuario</Label>
                                    <Input value={user?.email || ''} disabled />
                                </div>
                                <div></div>
                                <FormField control={passwordForm.control} name="currentPassword" render={({ field }) => ( <FormItem><FormLabel>*Contraseña Anterior</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <div></div>
                                <FormField control={passwordForm.control} name="newPassword" render={({ field }) => ( <FormItem><FormLabel>*Nueva Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
                                <FormField control={passwordForm.control} name="confirmPassword" render={({ field }) => ( <FormItem><FormLabel>*Repetir Contraseña</FormLabel><FormControl><Input type="password" {...field} /></FormControl><FormMessage /></FormItem> )} />
                            </div>
                            <div className="flex justify-end pt-4">
                                <Button type="button" onClick={passwordForm.handleSubmit(onPasswordSubmit)} disabled={isLoading}>Actualizar Contraseña</Button>
                            </div>
                          </div>
                      </Form>
                  </AccordionContent>
              </AccordionItem>
              
              <AccordionItem value="eliminacion">
                  <AccordionTrigger className="text-lg font-semibold bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Eliminación de la Cuenta</AccordionTrigger>
                  <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                      <div className="space-y-4">
                        <div className="p-4 border border-destructive/50 bg-destructive/10 rounded-md">
                            <h4 className="font-bold text-destructive">¡Atención! Acción Irreversible</h4>
                            <p className="text-sm text-destructive/90 mt-1">
                                Si eliminas tu cuenta, todos tus datos (empresa, clientes, facturas, etc.) serán borrados permanentemente. No podrás recuperarlos.
                            </p>
                        </div>
                        <div className="flex justify-end pt-4">
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="destructive" disabled={isLoading}>Solicitar Eliminación de Cuenta</Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>¿Estás realmente seguro?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Esta acción es irreversible. Se eliminarán permanentemente todos tus datos, incluyendo clientes, facturas y configuraciones.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                                <AlertDialogAction onClick={() => setIsPasswordDialogOpen(true)}>
                                  Sí, eliminar mi cuenta
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>

                        <Dialog open={isPasswordDialogOpen} onOpenChange={setIsPasswordDialogOpen}>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Confirma para eliminar tu cuenta</DialogTitle>
                              <DialogDescription>
                                Para confirmar esta acción, por favor ingresa tu contraseña.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="py-4">
                              <Label htmlFor="confirm-password-delete" className="sr-only">
                                Contraseña
                              </Label>
                              <Input
                                id="confirm-password-delete"
                                type="password"
                                placeholder="Ingresa tu contraseña"
                                value={deletePassword}
                                onChange={(e) => setDeletePassword(e.target.value)}
                              />
                            </div>
                            <DialogFooter>
                               <Button variant="outline" onClick={() => setIsPasswordDialogOpen(false)}>Cancelar</Button>
                              <Button variant="destructive" onClick={handleAccountDelete} disabled={!deletePassword || isLoading}>Confirmar y Eliminar Cuenta</Button>
                            </DialogFooter>
                          </DialogContent>
                        </Dialog>
                      </div>
                  </AccordionContent>
              </AccordionItem>
            </Accordion>
            <div className="flex justify-end pt-8">
                <Button type="submit" disabled={isLoading}>Guardar Cambios</Button>
            </div>
          </form>
        </Form>
      )}
    </div>
    </>
  );
}
