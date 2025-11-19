
"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { ChevronLeftRegular, AddCircleRegular, DeleteRegular, DocumentRegular, QuestionCircleRegular, EditRegular } from "@/icons/fluent"
import { useForm, useFieldArray, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { User } from "firebase/auth"
import { useRouter } from "next/navigation"

import { auth, firebaseEnabled } from "@/lib/firebase/client"
import { useToast } from "@/hooks/use-toast"
import { getClients } from "@/app/actions/clients"
import { getProducts } from "@/app/actions/products"
import { saveInvoice } from "@/app/actions/invoices";
import { invoiceSchema, type InvoiceFormValues, type ClientFormValues, type ProductFormValues, type Concepto } from "@/lib/schemas"
import { usoCfdiOptions } from "@/lib/catalogs"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { cn } from "@/lib/utils"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Progress } from "@/components/ui/progress"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"

interface Client extends ClientFormValues {
  id: number;
  taxRegime: string;
}
interface Product extends ProductFormValues {
  id: number;
  unitPrice: number;
}
interface SavedInvoice {
  id: number;
  serie: string;
  folio: number;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
}

const ImpuestosDialog = ({
  concepto,
  conceptoIndex,
  updateConceptoImpuestos,
}: {
  concepto: Concepto,
  conceptoIndex: number,
  updateConceptoImpuestos: (conceptoIndex: number, impuestos: Concepto['impuestos']) => void,
}) => {
    const [impuestos, setImpuestos] = useState(concepto.impuestos || []);
    const [tipo, setTipo] = useState('Traslado');
    const [impuesto, setImpuesto] = useState('002');
    const [tasa, setTasa] = useState('0.160000');

    const handleAddImpuesto = () => {
        const newImpuesto = {
            tipo,
            impuesto,
            tipoFactor: 'Tasa',
            tasa: parseFloat(tasa),
            base: (concepto.quantity * concepto.unitPrice) - (concepto.discount || 0),
        };
        // @ts-ignore
        setImpuestos([...impuestos, newImpuesto]);
    }

    const handleRemoveImpuesto = (index: number) => {
        setImpuestos(impuestos.filter((_, i) => i !== index));
    }

    const handleSave = () => {
        updateConceptoImpuestos(conceptoIndex, impuestos);
    }
    
    return (
        <DialogContent className="sm:max-w-[625px]">
            <DialogHeader>
                <DialogTitle>Gestionar Impuestos</DialogTitle>
                <DialogDescription>
                    Agrega o elimina los impuestos aplicables para &quot;{concepto.description}&quot;.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Select value={tipo} onValueChange={setTipo}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="Traslado">Traslado</SelectItem>
                            <SelectItem value="Retencion">Retención</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={impuesto} onValueChange={setImpuesto}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="001">ISR</SelectItem>
                            <SelectItem value="002">IVA</SelectItem>
                            <SelectItem value="003">IEPS</SelectItem>
                        </SelectContent>
                    </Select>
                     <Select value={tasa} onValueChange={setTasa}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="0.160000">16%</SelectItem>
                            <SelectItem value="0.080000">8%</SelectItem>
                            <SelectItem value="0.000000">0%</SelectItem>
                            <SelectItem value="0.000000">Exento</SelectItem>
                        </SelectContent>
                    </Select>
                    <Button onClick={handleAddImpuesto}>Agregar</Button>
                </div>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Impuesto</TableHead>
                            <TableHead>Tasa/Cuota</TableHead>
                            <TableHead>Importe</TableHead>
                            <TableHead></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {impuestos.map((imp, index) => (
                            <TableRow key={index}>
                                <TableCell>{imp.tipo}</TableCell>
                                <TableCell>{imp.impuesto}</TableCell>
                                <TableCell>{imp.tasa}</TableCell>
                                <TableCell>{(imp.base * imp.tasa).toFixed(2)}</TableCell>
                                <TableCell>
                                    <Button variant="ghost" size="icon" onClick={() => handleRemoveImpuesto(index)}>
                                        <DeleteRegular className="h-4 w-4 text-destructive" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <DialogFooter>
                <DialogTrigger asChild>
                    <Button onClick={handleSave}>Guardar cambios</Button>
                </DialogTrigger>
            </DialogFooter>
        </DialogContent>
    )
}

export default function NewInvoicePage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [savedInvoice, setSavedInvoice] = useState<SavedInvoice | null>(null);
  const [progress, setProgress] = useState(0);
  const [tempUuid, setTempUuid] = useState("");

  const form = useForm<InvoiceFormValues>({
    resolver: zodResolver(invoiceSchema),
    defaultValues: {
      clientId: 0,
      serie: "A",
      folio: 1025,
      tipoDocumento: "I",
      exportacion: "01",
      usoCfdi: "",
      formaPago: "",
      metodoPago: "PUE",
      moneda: "MXN",
      concepts: [],
      relationType: "",
      relatedCfdis: [],
    },
  });

  const { fields: conceptFields, append: conceptAppend, remove: conceptRemove, update: conceptUpdate } = useFieldArray({
    control: form.control,
    name: "concepts",
  });
  
  const { fields: cfdiFields, append: cfdiAppend, remove: cfdiRemove } = useFieldArray({
      control: form.control,
      name: "relatedCfdis"
  });

  const watchedConcepts = useWatch({ control: form.control, name: "concepts" });

  const { subtotal, totalTraslados, totalRetenidos, total } = React.useMemo(() => {
    let sub = 0;
    let tras = 0;
    let ret = 0;

    watchedConcepts.forEach(c => {
        const base = (c.quantity * c.unitPrice) - (c.discount || 0);
        sub += base;
        c.impuestos?.forEach(imp => {
            if(imp.tipo === 'Traslado') {
                tras += base * imp.tasa;
            } else if (imp.tipo === 'Retencion') {
                ret += base * imp.tasa;
            }
        })
    });
    
    return {
        subtotal: sub,
        totalTraslados: tras,
        totalRetenidos: ret,
        total: sub + tras - ret
    };

  }, [watchedConcepts]);


  useEffect(() => {
    const subscription = form.watch((value) => {
      const { clientId, usoCfdi, formaPago, concepts } = value;
      let completedSteps = 0;
      const totalSteps = 4;

      if (clientId && clientId > 0) completedSteps++;
      if (usoCfdi) completedSteps++;
      if (formaPago) completedSteps++;
      if (concepts && concepts.length > 0) completedSteps++;
      
      const newProgress = Math.round((completedSteps / totalSteps) * 100);
      setProgress(newProgress);
    });
    return () => subscription.unsubscribe();
  }, [form]);


  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const fetchData = useCallback(async (uid: string) => {
    setLoading(true);
    try {
      const [clientsRes, productsRes] = await Promise.all([
        getClients(uid),
        getProducts(uid),
      ]);

      if (clientsRes.success && clientsRes.data) {
        setClients(clientsRes.data as Client[]);
      } else {
        toast({ title: "Error", description: clientsRes.message || "No se pudieron cargar los clientes.", variant: "destructive" });
      }

      if (productsRes.success && productsRes.data) {
        const productsData = productsRes.data.map((p: any) => ({ ...p, unitPrice: parseFloat(p.unitPrice) }));
        setProducts(productsData);
      } else {
        toast({ title: "Error", description: productsRes.message || "No se pudieron cargar los productos.", variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Ocurrió un error al cargar los datos.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (user) {
      fetchData(user.uid);
    }
  }, [user, fetchData]);

  const updateConcepto = (index: number, newValues: Partial<Concepto>) => {
    const concepto = { ...form.getValues('concepts')[index], ...newValues };
    const amount = (concepto.quantity * concepto.unitPrice) - (concepto.discount || 0);
    conceptUpdate(index, { ...concepto, amount });
  };
  
  const updateConceptoImpuestos = (conceptoIndex: number, impuestos: Concepto['impuestos']) => {
    updateConcepto(conceptoIndex, { impuestos });
  }

  const addProductToConcepts = (productId: string) => {
    const product = products.find(p => p.id.toString() === productId);
    if (product) {
        conceptAppend({
          productId: product.id,
          description: product.description,
          satKey: product.satKey,
          unitKey: product.unitKey,
          quantity: 1,
          unitPrice: product.unitPrice,
          discount: 0,
          objetoImpuesto: '02',
          amount: product.unitPrice,
          impuestos: [{ tipo: 'Traslado', impuesto: '002', tipoFactor: 'Tasa', tasa: 0.16, base: product.unitPrice }]
        });
    }
  };

  async function onSubmit(data: InvoiceFormValues) {
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión para guardar una factura.", variant: "destructive" });
      return;
    }
    const result = await saveInvoice(data, user.uid);
    if (result.success && result.data) {
      toast({ title: "Éxito", description: "La factura se ha guardado como borrador." });
      setSavedInvoice(result.data);
    } else {
      toast({ title: "Error al guardar", description: result.message || "No se pudo guardar la factura.", variant: "destructive" });
    }
  }

  const handleDiscard = () => {
    form.reset();
    setSavedInvoice(null);
    router.push("/dashboard/invoices");
  }
  
  if (savedInvoice) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 flex-1 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-center font-headline">¡Factura Guardada!</CardTitle>
            <CardDescription className="text-center">
              La factura borrador con folio <strong>{savedInvoice.serie}-{savedInvoice.folio}</strong> ha sido creada exitosamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Tus archivos han sido generados y guardados. Ahora puedes descargarlos o crear una nueva factura.
            </p>
            <div className="flex justify-center gap-4">
              <Button asChild disabled={!savedInvoice.pdfUrl}><a href={savedInvoice.pdfUrl ?? '#'} target="_blank" rel="noopener noreferrer"><DocumentRegular className="mr-2 h-4 w-4" />Descargar PDF</a></Button>
              <Button asChild disabled={!savedInvoice.xmlUrl}><a href={savedInvoice.xmlUrl ?? '#'} target="_blank" rel="noopener noreferrer"><DocumentRegular className="mr-2 h-4 w-4" />Descargar XML</a></Button>
            </div>
            {!savedInvoice.pdfUrl && <p className="text-xs text-center text-muted-foreground">La subida de archivos está en proceso o no está configurada.</p>}
          </CardContent>
          <CardFooter className="flex-col gap-4 pt-6">
            <Button variant="outline" className="w-full" onClick={() => { form.reset(); setSavedInvoice(null); }}><AddCircleRegular className="mr-2 h-4 w-4" />Crear Nueva Factura</Button>
            <Button variant="ghost" asChild><Link href="/dashboard/invoices">Volver al listado de facturas</Link></Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const selectedClient = clients.find(c => c.id === form.getValues('clientId'));

  return (
    <TooltipProvider>
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto grid w-full max-w-[966px] flex-1 auto-rows-max gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" className="h-7 w-7" asChild><Link href="/dashboard/invoices"><ChevronLeftRegular className="h-4 w-4" /><span className="sr-only">Back</span></Link></Button>
          <h1 className="flex-1 shrink-0 whitespace-nowrap text-base font-bold tracking-tight sm:grow-0 font-headline">Nueva Factura 4.0</h1>
          <div className="hidden items-center gap-4 md:ml-auto md:flex">
            <div className="flex items-center gap-2">
                <Progress value={progress} className="w-32" aria-label={`${progress}% completado`} />
                <span className="text-sm font-medium text-muted-foreground">{progress}%</span>
            </div>
            <Button variant="outline" size="sm" type="button" onClick={handleDiscard}>Descartar</Button>
            <Button size="sm" type="submit" disabled={form.formState.isSubmitting || progress < 100}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Guardar Borrador'}
            </Button>
          </div>
        </div>

        <div className="grid gap-4">
          {/* Top Level Info */}
            <Card>
                <CardContent className="pt-6 grid md:grid-cols-4 gap-4">
                <FormField control={form.control} name="serie" render={({ field }) => ( <FormItem><FormLabel>Serie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="folio" render={({ field }) => ( <FormItem><FormLabel>Folio</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="tipoDocumento" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Tipo de Documento</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="I">I - Ingreso</SelectItem></SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="exportacion" render={({ field }) => (
                    <FormItem>
                        <FormLabel className="flex items-center gap-1">Exportación <Tooltip><TooltipTrigger asChild><button type="button"><QuestionCircleRegular className="h-3 w-3"/></button></TooltipTrigger><TooltipContent><p>Clave para identificar si la operación es de exportación.</p></TooltipContent></Tooltip></FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                            <SelectContent><SelectItem value="01">01 - No aplica</SelectItem></SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )} />
                </CardContent>
            </Card>

          <Accordion type="multiple" defaultValue={['receptor']} className="w-full space-y-4">
             <AccordionItem value="info-global" disabled>
                <AccordionTrigger className="bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Información Global</AccordionTrigger>
                <AccordionContent className="p-4 border border-t-0 rounded-b-lg"><p>Próximamente.</p></AccordionContent>
            </AccordionItem>
             <AccordionItem value="cfdi-relacionados">
                <AccordionTrigger className="bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">CFDI Relacionados</AccordionTrigger>
                <AccordionContent className="p-4 border border-t-0 rounded-b-lg space-y-4">
                  <FormField
                    control={form.control}
                    name="relationType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tipo Relación</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar tipo de relación..." /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="01">01 - Nota de crédito de los documentos relacionados</SelectItem>
                            <SelectItem value="02">02 - Nota de débito de los documentos relacionados</SelectItem>
                            <SelectItem value="03">03 - Devolución de mercancía sobre facturas o traslados previos</SelectItem>
                            <SelectItem value="04">04 - Sustitución de los CFDI previos</SelectItem>
                            <SelectItem value="07">07 - CFDI por aplicación de anticipo</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex gap-2 items-end">
                    <div className="flex-grow">
                          <Label htmlFor="uuid-input">UUID a relacionar</Label>
                          <Input 
                              id="uuid-input"
                              placeholder="Escribe o pega un UUID válido y presiona Agregar"
                              value={tempUuid}
                              onChange={(e) => setTempUuid(e.target.value)}
                          />
                    </div>
                    <Button 
                      type="button" 
                      variant="outline"
                      size="sm" 
                      onClick={() => {
                          if (tempUuid.match(/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/)) {
                              cfdiAppend({ uuid: tempUuid });
                              setTempUuid("");
                          } else {
                              toast({
                                  title: "UUID Inválido",
                                  description: "El formato del UUID no es correcto.",
                                  variant: "destructive"
                              })
                          }
                      }}
                      disabled={!tempUuid || !form.watch("relationType")}
                    >
                      <AddCircleRegular className="mr-2 h-4 w-4"/>
                      Agregar
                    </Button>
                  </div>
                  <FormMessage>{form.formState.errors.relatedCfdis?.message}</FormMessage>

                  {cfdiFields.length > 0 && (
                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>UUID Relacionado</TableHead>
                            <TableHead className="w-[50px] text-right">Acción</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {cfdiFields.map((field, index) => (
                            <TableRow key={field.id}>
                              <TableCell className="font-mono text-xs">{field.uuid}</TableCell>
                              <TableCell className="text-right">
                                <Button variant="ghost" size="icon" type="button" className="h-8 w-8" onClick={() => cfdiRemove(index)}>
                                  <DeleteRegular className="h-4 w-4 text-destructive" />
                                  <span className="sr-only">Eliminar UUID</span>
                                </Button>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
             <AccordionItem value="impuestos-locales" disabled>
                <AccordionTrigger className="bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Impuestos Locales</AccordionTrigger>
                 <AccordionContent className="p-4 border border-t-0 rounded-b-lg"><p>Próximamente.</p></AccordionContent>
            </AccordionItem>
            <AccordionItem value="receptor">
              <AccordionTrigger className="bg-muted px-4 rounded-t-lg">Información del receptor</AccordionTrigger>
              <AccordionContent className="p-4 border border-t-0 rounded-b-lg">
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem className="lg:col-span-2">
                      <FormLabel>* Nombre o Razón Social</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} defaultValue={field.value?.toString()}>
                        <FormControl><SelectTrigger disabled={loading}><SelectValue placeholder={loading ? "Cargando..." : "Seleccionar cliente"} /></SelectTrigger></FormControl>
                        <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.name}</SelectItem>))}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormItem>
                    <FormLabel>* Código Postal del Receptor</FormLabel>
                    <Input value={selectedClient?.zip || ''} disabled placeholder="Se llena al seleccionar cliente" />
                  </FormItem>
                  <FormItem>
                    <FormLabel>* Régimen Fiscal</FormLabel>
                    <Input value={selectedClient?.taxRegime || ''} disabled placeholder="Se llena al seleccionar cliente" />
                  </FormItem>
                  <FormField control={form.control} name="usoCfdi" render={({ field }) => (
                    <FormItem>
                      <FormLabel>* Uso del CFDI</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar Uso CFDI" /></SelectTrigger></FormControl>
                        <SelectContent>
                          {usoCfdiOptions.map(option => (
                              <SelectItem key={option.clave} value={option.clave}>
                                  {option.clave} - {option.descripcion}
                              </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </AccordionContent>
            </AccordionItem>
          </Accordion>

            <Card>
                <CardContent className="pt-6">
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <FormField control={form.control} name="moneda" render={({ field }) => (
                            <FormItem>
                                <FormLabel>* Moneda</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent><SelectItem value="MXN">MXN - Peso Mexicano</SelectItem></SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                         <FormField control={form.control} name="formaPago" render={({ field }) => (
                            <FormItem>
                                <FormLabel>* Forma de Pago</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Forma de Pago" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="01">01 - Efectivo</SelectItem>
                                        <SelectItem value="03">03 - Transferencia electrónica</SelectItem>
                                        <SelectItem value="04">04 - Tarjeta de crédito</SelectItem>
                                        <SelectItem value="28">28 - Tarjeta de débito</SelectItem>
                                        <SelectItem value="99">99 - Por definir</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="metodoPago" render={({ field }) => (
                            <FormItem>
                                <FormLabel className="flex items-center gap-1">* Método de Pago<Tooltip><TooltipTrigger asChild><button type="button"><QuestionCircleRegular className="h-3 w-3" /></button></TooltipTrigger><TooltipContent><p>PUE: Pago en una sola exhibición<br/>PPD: Pago en parcialidades o diferido</p></TooltipContent></Tooltip></FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="PUE">PUE - Pago en una sola exhibición</SelectItem>
                                        <SelectItem value="PPD">PPD - Pago en parcialidades o diferido</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="condicionesPago" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Condiciones de Pago</FormLabel>
                                <FormControl><Input placeholder="Pago de contado" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormItem>
                            <FormLabel>* Código Postal de Expedición</FormLabel>
                            <Input value={"66064"} disabled />
                        </FormItem>
                    </div>
                </CardContent>
            </Card>

          {/* Concepts Table */}
          <Card className="mt-4">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Button type="button" variant="outline" size="sm" onClick={() => conceptAppend({ productId: 0, description: "", satKey: "", unitKey: "", quantity: 1, unitPrice: 0, discount: 0, objetoImpuesto: '02', amount: 0, impuestos: [{ tipo: 'Traslado', impuesto: '002', tipoFactor: 'Tasa', tasa: 0.16, base: 0 }] })}>
                  <AddCircleRegular className="mr-2 h-4 w-4" />
                   Agregar partida (productos y servicios) al documento
                </Button>
                 <Select onValueChange={addProductToConcepts} disabled={loading}>
                    <SelectTrigger className="w-[300px]"><SelectValue placeholder={loading ? "Cargando..." : "O agregar producto del catálogo..."} /></SelectTrigger>
                    <SelectContent>{products.map(p => (<SelectItem key={p.id} value={p.id.toString()}><span className="font-medium">{p.description}</span> - <span>${p.unitPrice.toFixed(2)}</span></SelectItem>))}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
               <FormMessage className={cn(!form.formState.errors.concepts?.root?.message && "hidden")}>{form.formState.errors.concepts?.root?.message}</FormMessage>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[40px]"><span className="sr-only">Eliminar</span></TableHead>
                      <TableHead className="min-w-[120px]">Clave Prod/Serv</TableHead>
                      <TableHead className="min-w-[250px]">Descripción</TableHead>
                      <TableHead className="min-w-[120px]">Clave Unidad</TableHead>
                      <TableHead className="w-[120px] text-right">Precio Unit.</TableHead>
                      <TableHead className="w-[100px] text-right">Cantidad</TableHead>
                      <TableHead className="w-[120px] text-right">Descuento</TableHead>
                      <TableHead className="w-[120px] text-right">Impuestos</TableHead>
                      <TableHead className="w-[120px] text-right">Importe</TableHead>
                      <TableHead className="w-[150px]">Obj. Impuesto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {conceptFields.map((field, index) => {
                      const base = (field.quantity * field.unitPrice) - (field.discount || 0);
                      const totalImpuestos = field.impuestos?.reduce((acc, imp) => {
                        return acc + (base * imp.tasa);
                      }, 0) || 0;
                      
                      return (
                      <TableRow key={field.id}>
                        <TableCell><Button variant="ghost" size="icon" type="button" onClick={() => conceptRemove(index)}><DeleteRegular className="h-4 w-4 text-destructive" /></Button></TableCell>
                        <TableCell><Input value={field.satKey} onChange={e => updateConcepto(index, { satKey: e.target.value })}/></TableCell>
                        <TableCell><Input value={field.description} onChange={e => updateConcepto(index, { description: e.target.value })} /></TableCell>
                        <TableCell><Input value={field.unitKey} onChange={e => updateConcepto(index, { unitKey: e.target.value })}/></TableCell>
                        <TableCell><Input type="number" value={field.unitPrice} onChange={e => updateConcepto(index, { unitPrice: Number(e.target.value) })} className="text-right" /></TableCell>
                        <TableCell><Input type="number" value={field.quantity} onChange={e => updateConcepto(index, { quantity: Number(e.target.value) })} className="text-right" /></TableCell>
                        <TableCell><Input type="number" value={field.discount} onChange={e => updateConcepto(index, { discount: Number(e.target.value) })} className="text-right" /></TableCell>
                        <TableCell className="text-right">
                           <Dialog>
                               <DialogTrigger asChild>
                                    <Button variant="outline" size="sm" type="button">
                                        ${totalImpuestos.toFixed(2)}
                                        <EditRegular className="ml-2 h-3 w-3"/>
                                    </Button>
                               </DialogTrigger>
                               <ImpuestosDialog concepto={field} conceptoIndex={index} updateConceptoImpuestos={updateConceptoImpuestos} />
                           </Dialog>
                        </TableCell>
                        <TableCell className="text-right font-medium">${field.amount.toFixed(2)}</TableCell>
                        <TableCell>
                          <FormField control={form.control} name={`concepts.${index}.objetoImpuesto`} render={({ field: formField }) => (
                            <Select onValueChange={(value) => { formField.onChange(value); updateConcepto(index, { objetoImpuesto: value }); }} defaultValue={formField.value}>
                              <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                              <SelectContent>
                                <SelectItem value="01">01 - No objeto</SelectItem>
                                <SelectItem value="02">02 - Sí objeto</SelectItem>
                                <SelectItem value="03">03 - Sí objeto y no obligado</SelectItem>
                              </SelectContent>
                            </Select>
                           )} />
                        </TableCell>
                      </TableRow>
                    )})}
                    {conceptFields.length === 0 && (<TableRow><TableCell colSpan={10} className="text-center h-24">Agrega productos del catálogo o una nueva partida.</TableCell></TableRow>)}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
                <div className="w-full max-w-sm space-y-2 text-sm">
                    <div className="flex justify-between"><span>Subtotal:</span><span>${subtotal.toFixed(2)}</span></div>
                    <div className="flex justify-between text-muted-foreground"><span>Total Descuentos:</span><span>${(watchedConcepts.reduce((acc, c) => acc + (c.discount || 0), 0)).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span>Total Impuestos Trasladados:</span><span>${totalTraslados.toFixed(2)}</span></div>
                     <div className="flex justify-between text-muted-foreground"><span>Total Impuestos Retenidos:</span><span>-${totalRetenidos.toFixed(2)}</span></div>
                    <div className="flex justify-between font-bold text-base border-t pt-2 mt-2"><span>Total:</span><span>${total.toFixed(2)}</span></div>
                </div>
            </CardFooter>
          </Card>
        </div>
        <div className="flex items-center justify-center gap-2 md:hidden">
          <Button variant="outline" size="sm" type="button" onClick={handleDiscard}>Descartar</Button>
          <Button size="sm" type="submit" disabled={form.formState.isSubmitting || progress < 100}>{form.formState.isSubmitting ? 'Guardando...' : 'Guardar Borrador'}</Button>
        </div>
      </form>
    </Form>
    </TooltipProvider>
  )
}
