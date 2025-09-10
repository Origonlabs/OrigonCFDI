
"use client"

import { useState, useEffect, useCallback } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { User } from "firebase/auth"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { AddCircleRegular, DeleteRegular, ArrowDownloadRegular, CalendarRegular } from "@/icons/fluent";

import { auth, firebaseEnabled } from "@/lib/firebase/client"
import { useToast } from "@/hooks/use-toast"
import { getClients } from "@/app/actions/clients"
import { getPendingInvoices } from "@/app/actions/invoices"
import { savePayment } from "@/app/actions/payments"
import { paymentSchema, type PaymentFormValues, type ClientFormValues } from "@/lib/schemas"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog"

// Data structures
interface Client extends ClientFormValues {
  id: number;
  taxRegime: string;
  zip: string;
  rfc: string;
}
interface PendingInvoice {
  id: number;
  clientName: string | null;
  clientRfc: string | null;
  folio: number;
  serie: string;
  total: string;
  createdAt: Date;
  uuid: string; // Now using real UUID
  metodoPago: string | null;
}
interface SavedPayment {
  id: number;
  serie: string;
  folio: number;
  pdfUrl?: string | null;
  xmlUrl?: string | null;
}

export default function NewPaymentPage() {
  const { toast } = useToast();
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [pendingInvoices, setPendingInvoices] = useState<PendingInvoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDocsDialogOpen, setIsDocsDialogOpen] = useState(false);
  const [tempUuid, setTempUuid] = useState("");
  const [savedPayment, setSavedPayment] = useState<SavedPayment | null>(null);
  
  const form = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentSchema),
    defaultValues: {
      clientId: 0,
      serie: "P",
      folio: 1,
      fechaPago: new Date(),
      horaPago: "12:00",
      formaPago: "",
      moneda: "MXN",
      totalPago: 0,
      relatedDocuments: [],
      relatedCfdis: [],
    },
  });

  const { fields, append, remove, update } = useFieldArray({
    control: form.control,
    name: "relatedDocuments",
  });

  const { fields: cfdiFields, append: cfdiAppend, remove: cfdiRemove } = useFieldArray({
      control: form.control,
      name: "relatedCfdis"
  });
  
  const watchedClientId = form.watch("clientId");
  const watchedDocs = form.watch("relatedDocuments");

  const totalPagoCalculado = watchedDocs.reduce((acc, doc) => acc + doc.montoPago, 0);

  useEffect(() => {
    form.setValue('totalPago', totalPagoCalculado);
  }, [totalPagoCalculado, form]);

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
      const [clientsRes, invoicesRes] = await Promise.all([
          getClients(uid),
          getPendingInvoices(uid)
      ]);

      if (clientsRes.success && clientsRes.data) {
        setClients(clientsRes.data as Client[]);
      } else {
        toast({ title: "Error", description: "No se pudieron cargar los clientes.", variant: "destructive" });
      }

      if (invoicesRes.success && invoicesRes.data) {
        setPendingInvoices(invoicesRes.data as PendingInvoice[]);
      } else {
        toast({ title: "Error", description: "No se pudieron cargar las facturas pendientes.", variant: "destructive" });
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
  
  const selectedClient = clients.find(c => c.id === watchedClientId);
  const clientPendingInvoices = pendingInvoices.filter(inv => inv.clientRfc === selectedClient?.rfc);

  async function onSubmit(data: PaymentFormValues) {
    if (!user) {
      toast({ title: "Error", description: "Debes iniciar sesión para guardar un pago.", variant: "destructive" });
      return;
    }
    const result = await savePayment(data, user.uid);
    if (result.success && result.data) {
        toast({ title: "Éxito", description: "El pago se ha guardado como borrador." });
        setSavedPayment(result.data);
    } else {
        toast({ title: "Error al guardar", description: result.message || "No se pudo guardar el pago.", variant: "destructive" });
    }
  }
  
  const handleAddDocument = (invoice: PendingInvoice) => {
      const alreadyAdded = fields.some(field => field.invoiceId === invoice.id);
      if(alreadyAdded) {
          toast({ title: "Documento ya agregado", variant: "default" });
          return;
      }

      const existingPartials = fields.filter(f => f.folio === invoice.folio.toString() && f.serie === invoice.serie);
      const nextPartial = existingPartials.length > 0 ? Math.max(...existingPartials.map(p => p.numParcialidad)) + 1 : 1;

      const total = parseFloat(invoice.total);

      append({
          invoiceId: invoice.id,
          uuid: invoice.uuid,
          fecha: format(new Date(invoice.createdAt), "yyyy-MM-dd"),
          serie: invoice.serie,
          folio: invoice.folio.toString(),
          moneda: 'MXN',
          tipoCambio: 1,
          metodoPago: invoice.metodoPago ?? 'PPD',
          numParcialidad: nextPartial,
          saldoAnterior: total,
          montoPago: total,
          importePagado: total,
          saldoInsoluto: 0,
          totalDocumento: total,
          objetoImpuesto: "02" // Sí objeto de impuesto
      });
  }

  const updateRelatedDoc = (index: number, newValues: Partial<(typeof fields)[0]>) => {
      const doc = form.getValues(`relatedDocuments.${index}`);
      const updatedDoc = {...doc, ...newValues};
      const saldoInsoluto = updatedDoc.saldoAnterior - updatedDoc.montoPago;
      update(index, {...updatedDoc, saldoInsoluto, importePagado: updatedDoc.montoPago});
  }
  
  const handleBorrar = () => {
    form.reset();
    toast({ title: "Formulario limpiado."});
  }

  if (savedPayment) {
    return (
      <div className="flex flex-col items-center justify-center gap-6 flex-1 py-12">
        <Card className="w-full max-w-lg">
          <CardHeader>
            <CardTitle className="text-center font-headline">¡Pago Guardado!</CardTitle>
            <CardDescription className="text-center">
              El pago borrador con folio <strong>{savedPayment.serie}-{savedPayment.folio}</strong> ha sido creado exitosamente.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground text-center">
              Aún no puedes descargar los archivos hasta que el pago sea timbrado.
            </p>
             <div className="flex justify-center gap-4">
              <Button asChild disabled={!savedPayment.pdfUrl}><a href={savedPayment.pdfUrl ?? '#'} target="_blank" rel="noopener noreferrer"><ArrowDownloadRegular className="mr-2 h-4 w-4" />Descargar PDF</a></Button>
              <Button asChild disabled={!savedPayment.xmlUrl}><a href={savedPayment.xmlUrl ?? '#'} target="_blank" rel="noopener noreferrer"><ArrowDownloadRegular className="mr-2 h-4 w-4" />Descargar XML</a></Button>
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-4 pt-6">
            <Button variant="outline" className="w-full" onClick={() => { form.reset(); setSavedPayment(null); }}><AddCircleRegular className="mr-2 h-4 w-4" />Crear Nuevo Pago</Button>
            <Button variant="ghost" asChild><Link href="/dashboard/payments">Volver al listado de pagos</Link></Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="mx-auto grid w-full max-w-7xl flex-1 auto-rows-max gap-4">
        <h1 className="text-xl font-bold font-headline">Nuevo Complemento de Pago (REP) 4.0</h1>

        <div className="grid grid-cols-12 gap-4">
          <div className="col-span-12">
            <Card>
              <CardContent className="pt-6 grid grid-cols-4 gap-4">
                {/* Row 1 */}
                <FormField control={form.control} name="clientId" render={({ field }) => (
                    <FormItem>
                    <FormLabel>* RFC</FormLabel>
                    <Select onValueChange={(value) => {
                        field.onChange(parseInt(value));
                        form.setValue('relatedDocuments', []);
                    }} defaultValue={field.value?.toString()}>
                        <FormControl><SelectTrigger disabled={loading}><SelectValue placeholder={loading ? "Cargando..." : "Seleccionar cliente"} /></SelectTrigger></FormControl>
                        <SelectContent>{clients.map((c) => (<SelectItem key={c.id} value={c.id.toString()}>{c.rfc} - {c.name}</SelectItem>))}</SelectContent>
                    </Select>
                    <FormMessage />
                    </FormItem>
                )} />
                 <FormItem>
                    <FormLabel>* Nombre o Razón Social</FormLabel>
                    <Input value={selectedClient?.name || ''} disabled />
                </FormItem>
                <FormField control={form.control} name="serie" render={({ field }) => ( <FormItem><FormLabel>Serie</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem> )} />
                <FormField control={form.control} name="folio" render={({ field }) => ( <FormItem><FormLabel>Folio</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem> )} />
                
                {/* Row 2 */}
                <FormItem>
                    <FormLabel>Email</FormLabel>
                    <Input value={selectedClient?.email || ''} disabled />
                </FormItem>
                <FormItem>
                    <FormLabel>* Código Postal de Expedición</FormLabel>
                    <Input value={"66064"} disabled />
                </FormItem>
                <FormField
                    control={form.control}
                    name="fechaPago"
                    render={({ field }) => (
                        <FormItem className="flex flex-col">
                        <FormLabel>* Fecha de pago</FormLabel>
                        <Popover>
                            <PopoverTrigger asChild>
                            <FormControl>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "pl-3 text-left font-normal justify-start",
                                    !field.value && "text-muted-foreground"
                                )}
                                >
                                <CalendarRegular className="mr-2 h-4 w-4 opacity-50" />
                                {field.value ? format(field.value, "yyyy-MM-dd") : <span>Elige una fecha</span>}
                                </Button>
                            </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                            <Calendar mode="single" selected={field.value} onSelect={field.onChange} initialFocus />
                            </PopoverContent>
                        </Popover>
                        <FormMessage />
                        </FormItem>
                    )}
                />
                <FormField control={form.control} name="horaPago" render={({ field }) => ( <FormItem><FormLabel>* Hora de pago</FormLabel><FormControl><Input type="time" {...field} /></FormControl><FormMessage /></FormItem> )} />

                {/* Row 3 */}
                <FormItem>
                    <FormLabel>* Código Postal del Receptor</FormLabel>
                    <Input value={selectedClient?.zip || ''} disabled placeholder="Se llena al seleccionar cliente"/>
                </FormItem>
                <FormItem>
                    <FormLabel>* Régimen Fiscal</FormLabel>
                    <Input value={selectedClient?.taxRegime || ''} disabled />
                </FormItem>
              </CardContent>
            </Card>

            <Accordion type="multiple" defaultValue={['bancaria']} className="w-full space-y-4 mt-4">
               <AccordionItem value="cfdi-relacionados">
                <AccordionTrigger className="text-base bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">CFDI Relacionados</AccordionTrigger>
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
                            <SelectItem value="04">04 - Sustitución de los CFDI previos</SelectItem>
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
              <AccordionItem value="bancaria">
                <AccordionTrigger className="text-base bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Información Bancaria</AccordionTrigger>
                <AccordionContent>
                  <div className="grid md:grid-cols-4 gap-4 p-4 border border-t-0 rounded-b-lg">
                      <FormField control={form.control} name="formaPago" render={({ field }) => (
                          <FormItem>
                              <FormLabel>* Forma de Pago</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                  <FormControl><SelectTrigger><SelectValue placeholder="Seleccionar..." /></SelectTrigger></FormControl>
                                  <SelectContent>
                                      <SelectItem value="01">01 - Efectivo</SelectItem>
                                      <SelectItem value="03">03 - Transferencia electrónica</SelectItem>
                                      <SelectItem value="04">04 - Tarjeta de crédito</SelectItem>
                                  </SelectContent>
                              </Select>
                              <FormMessage />
                          </FormItem>
                      )} />
                      <FormField control={form.control} name="numeroOperacion" render={({ field }) => (
                          <FormItem>
                          <FormLabel>Número de operación</FormLabel>
                          <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                          <FormMessage />
                          </FormItem>
                      )} />
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
                      <FormField control={form.control} name="totalPago" render={({ field }) => (
                          <FormItem>
                          <FormLabel>* Total del pago</FormLabel>
                          <FormControl><Input type="number" {...field} disabled /></FormControl>
                          <FormMessage />
                          </FormItem>
                      )} />
                  </div>
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="busqueda">
                <AccordionTrigger className="text-base bg-muted px-4 rounded-t-lg data-[state=closed]:rounded-b-lg">Filtros de búsqueda</AccordionTrigger>
                <AccordionContent>
                    <div className="grid md:grid-cols-4 gap-4 p-4 border border-t-0 rounded-b-lg items-end">
                      <FormItem>
                        <FormLabel>Mes</FormLabel>
                        <Select disabled><SelectTrigger><SelectValue placeholder="Seleccionar Mes"/></SelectTrigger><SelectContent/></Select>
                      </FormItem>
                      <FormItem>
                        <FormLabel>Año</FormLabel>
                        <Select disabled><SelectTrigger><SelectValue placeholder="Seleccionar Año"/></SelectTrigger><SelectContent/></Select>
                      </FormItem>
                      <Button type="button" variant="outline" disabled>Filtrar</Button>
                    </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
            
            <Card className="mt-4">
                <CardHeader>
                    <Dialog open={isDocsDialogOpen} onOpenChange={setIsDocsDialogOpen}>
                        <DialogTrigger asChild>
                            <Button type="button" variant="outline" size="sm" disabled={!selectedClient || clientPendingInvoices.length === 0}>
                                <AddCircleRegular className="mr-2 h-4 w-4" />
                                Agregar documentos relacionados
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl">
                            <DialogHeader>
                                <DialogTitle>Facturas Pendientes de {selectedClient?.name}</DialogTitle>
                            </DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>Agregar</TableHead>
                                            <TableHead>Serie</TableHead>
                                            <TableHead>Folio</TableHead>
                                            <TableHead>Fecha</TableHead>
                                            <TableHead className="text-right">Total</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {clientPendingInvoices.map(inv => (
                                            <TableRow key={inv.id}>
                                                <TableCell>
                                                    <Button size="sm" onClick={() => { handleAddDocument(inv); setIsDocsDialogOpen(false); }} disabled={fields.some(f => f.invoiceId === inv.id)}>
                                                        {fields.some(f => f.invoiceId === inv.id) ? 'Agregado' : 'Agregar'}
                                                    </Button>
                                                </TableCell>
                                                <TableCell>{inv.serie}</TableCell>
                                                <TableCell>{inv.folio}</TableCell>
                                                <TableCell>{format(new Date(inv.createdAt), "yyyy-MM-dd")}</TableCell>
                                                <TableCell className="text-right">${parseFloat(inv.total).toFixed(2)}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </div>
                            <DialogFooter>
                                <Button onClick={() => setIsDocsDialogOpen(false)}>Cerrar</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead><span className="sr-only">Acciones</span></TableHead>
                                    <TableHead className="min-w-[150px]">UUID</TableHead>
                                    <TableHead>Fecha</TableHead>
                                    <TableHead>Folio</TableHead>
                                    <TableHead>Moneda</TableHead>
                                    <TableHead>Tipo Cambio</TableHead>
                                    <TableHead>Método de Pago</TableHead>
                                    <TableHead>Num. Parcialidad</TableHead>
                                    <TableHead>Saldo Anterior</TableHead>
                                    <TableHead>Monto Pago</TableHead>
                                    <TableHead>Importe pagado</TableHead>
                                    <TableHead>Saldo Insoluto</TableHead>
                                    <TableHead>Total Documento</TableHead>
                                    <TableHead>Objeto de Impuesto</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {fields.length === 0 && <TableRow><TableCell colSpan={14} className="text-center h-24">Aún no has agregado documentos.</TableCell></TableRow>}
                                {fields.map((field, index) => (
                                    <TableRow key={field.id}>
                                        <TableCell><Button variant="ghost" size="icon" type="button" onClick={() => remove(index)}><DeleteRegular className="h-4 w-4 text-destructive" /></Button></TableCell>
                                        <TableCell className="font-mono text-xs truncate max-w-24">{field.uuid}</TableCell>
                                        <TableCell>{field.fecha}</TableCell>
                                        <TableCell>{field.serie}-{field.folio}</TableCell>
                                        <TableCell>{field.moneda}</TableCell>
                                        <TableCell><Input type="number" value={field.tipoCambio} onChange={e => updateRelatedDoc(index, { tipoCambio: Number(e.target.value) })} className="w-20" /></TableCell>
                                        <TableCell>{field.metodoPago}</TableCell>
                                        <TableCell><Input type="number" value={field.numParcialidad} onChange={e => updateRelatedDoc(index, { numParcialidad: Number(e.target.value) })} className="w-20" /></TableCell>
                                        <TableCell className="text-right">${field.saldoAnterior.toFixed(2)}</TableCell>
                                        <TableCell><Input type="number" step="0.01" value={field.montoPago} onChange={e => updateRelatedDoc(index, { montoPago: Number(e.target.value) })} className="w-28 text-right" /></TableCell>
                                        <TableCell className="text-right">${field.importePagado.toFixed(2)}</TableCell>
                                        <TableCell className="text-right font-medium">${field.saldoInsoluto.toFixed(2)}</TableCell>
                                        <TableCell className="text-right">${field.totalDocumento.toFixed(2)}</TableCell>
                                        <TableCell>
                                           <Select onValueChange={(value) => updateRelatedDoc(index, { objetoImpuesto: value })} defaultValue={field.objetoImpuesto}>
                                             <SelectTrigger className="w-36"><SelectValue/></SelectTrigger>
                                             <SelectContent>
                                                <SelectItem value="02">02 - Sí objeto</SelectItem>
                                             </SelectContent>
                                           </Select>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                         <FormMessage className="mt-2">{form.formState.errors.relatedDocuments?.root?.message || form.formState.errors.relatedDocuments?.message}</FormMessage>
                    </div>
                </CardContent>
                <CardFooter className="flex flex-col items-end gap-2 text-right font-medium text-sm">
                    <p>Total Impuestos Trasladados REP (MXN): $0.00</p>
                    <p>Total Impuestos Retenidos REP (MXN): $0.00</p>
                    <p>Monto Total del Pago (MXN): ${totalPagoCalculado.toFixed(2)}</p>
                </CardFooter>
            </Card>

            <div className="flex justify-end gap-2 mt-4">
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Guardando...' : 'Crear'}
              </Button>
              <Button variant="outline" type="button" onClick={handleBorrar}>Borrar</Button>
            </div>
          </div>
        </div>
      </form>
    </Form>
  )
}
