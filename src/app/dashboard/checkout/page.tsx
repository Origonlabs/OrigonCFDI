
"use client";

import Link from "next/link";
import { useSearchParams } from 'next/navigation';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import GooglePayButton from "@google-pay/button-react";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftRegular, CreditCardRegular, WalletRegular, BuildingBankRegular, CheckmarkCircleFilled, CheckmarkCircleRegular, InfoRegular, ChevronDownRegular, ReceiptRegular } from "@/icons/fluent";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonImage } from "@/components/ui/skeleton-image";

const plans = {
    'Básico': { price: '99.00', currency: 'MXN' },
    'Profesional': { price: '299.00', currency: 'MXN' },
    'Empresarial': { price: '0.00', currency: 'MXN' },
} as const;

type PlanName = keyof typeof plans;

const PaypalIcon = () => (
    <svg role="img" viewBox="0 0 24 8" height="24" width="60">
      <path
        fill="#003087"
        d="M23.6,1.4c-0.3-0.9-1.1-1.4-2.1-1.4H6.3C5.1,0,4.2,0.6,3.9,1.6L0,20.3c-0.2,0.6,0.2,1.2,0.8,1.2h4.8c0.5,0,0.9-0.3,1-0.8l0.8-4.3c0.1-0.3,0.4-0.6,0.7-0.6h3.4c4.1,0,7.2-2.3,8-6.4C24.3,6.8,24.4,4.2,23.6,1.4"
      ></path>
      <path
        fill="#009cde"
        d="M23.6,1.4c-0.3-0.9-1.1-1.4-2.1-1.4H6.3C5.1,0,4.2,0.6,3.9,1.6L0,20.3c-0.2,0.6,0.2,1.2,0.8,1.2h4.8c0.5,0,0.9-0.3,1-0.8l0.8-4.3c0.1-0.3,0.4-0.6,0.7-0.6h3.4c4.1,0,7.2-2.3,8-6.4C24.3,6.8,24.4,4.2,23.6,1.4"
      ></path>
      <path
        fill="#002f86"
        d="M3.9,1.6L2,13.9c-0.1,0.5-0.5,0.8-1,0.8H0.8C0.2,14.7,0,14.4,0,14.1L3.9,1.6C4,0.9,4.7,0.3,5.4,0.3h0.9C5.1,0.3,4.2,0.6,3.9,1.6"
      ></path>
    </svg>
);

export default function CheckoutPage() {
    const searchParams = useSearchParams();
    const { toast } = useToast();
    const planName = searchParams.get('plan') as PlanName | null;
    const planDetails = planName ? plans[planName] : null;
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState("card");
    const [needsInvoice, setNeedsInvoice] = useState(false);

    return (
        <div className="flex flex-col lg:flex-row min-h-screen bg-muted/30 font-body">
            {/* Main content */}
            <main className="lg:w-1/2 xl:w-3/5 p-6 sm:p-12">
                <div className="max-w-xl mx-auto">
                    <h1 className="text-2xl font-bold font-headline text-primary mb-6">OrigonCFDI</h1>
                    
                    <div className="space-y-8">
                        {/* Contact Information */}
                        <div className="p-5 border rounded-lg bg-background">
                            <div className="flex justify-between items-center mb-4">
                                <h2 className="text-lg font-semibold">Contacto</h2>
                                <p className="text-sm">¿Ya tienes una cuenta? <Link href="/" className="text-primary hover:underline">Iniciar sesión</Link></p>
                            </div>
                            <Input id="email" placeholder="Correo electrónico" />
                        </div>

                        {/* Invoicing Section */}
                        <div className="p-5 border rounded-lg bg-background space-y-4">
                            <div className="flex items-center space-x-3">
                                <Checkbox id="needs-invoice" checked={needsInvoice} onCheckedChange={(checked) => setNeedsInvoice(!!checked)} />
                                <Label htmlFor="needs-invoice" className="text-base font-semibold cursor-pointer">
                                    Necesito factura
                                </Label>
                            </div>
                            {needsInvoice && (
                                <div className="pt-4 border-t space-y-4 animate-in fade-in-0">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div className="space-y-1">
                                            <Label htmlFor="razon-social">Razón Social</Label>
                                            <Input id="razon-social" placeholder="Nombre completo o de la empresa" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="rfc">RFC</Label>
                                                <Input id="rfc" placeholder="RFC" />
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="cp-fiscal">Código Postal Fiscal</Label>
                                                <Input id="cp-fiscal" placeholder="12345" />
                                            </div>
                                        </div>
                                         <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <Label htmlFor="regimen-fiscal">Régimen Fiscal</Label>
                                                <Select>
                                                    <SelectTrigger id="regimen-fiscal">
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                                                        <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales</SelectItem>
                                                        <SelectItem value="626">626 - Régimen Simplificado de Confianza (RESICO)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                            <div className="space-y-1">
                                                <Label htmlFor="uso-cfdi">Uso de CFDI</Label>
                                                <Select>
                                                    <SelectTrigger id="uso-cfdi">
                                                        <SelectValue placeholder="Seleccionar..." />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                                                        <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                                                        <SelectItem value="I08">I08 - Otra maquinaria y equipo</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Payment Section */}
                        <div className="space-y-4">
                             <h2 className="text-lg font-semibold">Pago</h2>
                             <p className="text-sm text-muted-foreground">Todas las transacciones son seguras y están encriptadas.</p>
                             <RadioGroup defaultValue="card" onValueChange={setSelectedPaymentMethod} className="border rounded-lg bg-background">
                                <div className={cn("flex items-center space-x-4 p-4", selectedPaymentMethod === "card" && "bg-primary/5")}>
                                    <RadioGroupItem value="card" id="card" />
                                    <Label htmlFor="card" className="flex-1 cursor-pointer">Tarjeta de crédito</Label>
                                    <div className="flex items-center gap-1">
                                        <SkeletonImage src="https://img.buoucoding.com/visa.svg" alt="Visa" width={32} height={20} />
                                        <SkeletonImage src="https://img.buoucoding.com/mastercard.svg" alt="Mastercard" width={32} height={20} />
                                        <SkeletonImage src="https://img.buoucoding.com/amex.svg" alt="American Express" width={32} height={20} />
                                    </div>
                                </div>
                                {selectedPaymentMethod === "card" && (
                                    <div className="p-5 border-t bg-muted/50">
                                       <div className="space-y-4">
                                            <Input placeholder="Número de tarjeta" />
                                            <Input placeholder="Nombre en la tarjeta" />
                                            <div className="grid grid-cols-2 gap-4">
                                                <Input placeholder="MM / AA" />
                                                <Input placeholder="CVC" />
                                            </div>
                                       </div>
                                    </div>
                                )}
                                <Separator />
                                <div className={cn("flex items-center space-x-4 p-4", selectedPaymentMethod === "paypal" && "bg-primary/5")}>
                                     <RadioGroupItem value="paypal" id="paypal" />
                                     <Label htmlFor="paypal" className="flex-1 cursor-pointer">PayPal</Label>
                                     <PaypalIcon />
                                </div>
                                {selectedPaymentMethod === "paypal" && (
                                     <div className="p-5 border-t bg-muted/50 flex justify-center">
                                       <Button className="bg-[#0070ba] hover:bg-[#005ea6] text-white w-full">
                                         Pagar con PayPal
                                       </Button>
                                     </div>
                                )}
                                <Separator />
                                <div className={cn("flex items-center space-x-4 p-4", selectedPaymentMethod === "gpay" && "bg-primary/5")}>
                                    <RadioGroupItem value="gpay" id="gpay" />
                                    <Label htmlFor="gpay" className="flex-1 cursor-pointer">Google Pay</Label>
                                </div>
                                 {selectedPaymentMethod === "gpay" && (
                                     <div className="p-5 border-t bg-muted/50 flex justify-center">
                                       <GooglePayButton
                                            environment="TEST"
                                            paymentRequest={{
                                                apiVersion: 2,
                                                apiVersionMinor: 0,
                                                allowedPaymentMethods: [{
                                                    type: 'CARD',
                                                    parameters: { allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'], allowedCardNetworks: ['MASTERCARD', 'VISA'] },
                                                    tokenizationSpecification: { type: 'PAYMENT_GATEWAY', parameters: { gateway: 'example', gatewayMerchantId: 'exampleGatewayMerchantId' } },
                                                }],
                                                merchantInfo: { merchantId: '12345678901234567890', merchantName: 'OrigonCFDI' },
                                                transactionInfo: {
                                                    totalPriceStatus: 'FINAL',
                                                    totalPriceLabel: 'Total',
                                                    totalPrice: planDetails?.price || '0.00',
                                                    currencyCode: planDetails?.currency || 'MXN',
                                                    countryCode: 'MX',
                                                },
                                            }}
                                            onLoadPaymentData={(paymentData) => { console.log('load payment data', paymentData); }}
                                            buttonType="pay"
                                            buttonColor="black"
                                        />
                                     </div>
                                )}
                             </RadioGroup>
                        </div>
                    </div>
                     <div className="mt-8">
                        <Button className="w-full">
                            {planDetails ? `Pagar $${planDetails.price} ${planDetails.currency}` : "Completar pago"}
                        </Button>
                        <Button variant="ghost" asChild className="w-full mt-2">
                             <Link href="/dashboard/billing">
                                <ArrowLeftRegular className="mr-2 h-4 w-4" />
                                Volver a Planes
                            </Link>
                        </Button>
                     </div>
                </div>
            </main>

            {/* Order Summary */}
            <aside className="lg:w-1/2 xl:w-2/5 p-6 sm:p-12 bg-background border-l">
                 <div className="max-w-md mx-auto">
                    <h2 className="text-lg font-semibold mb-4">Resumen de la orden</h2>
                    {planDetails ? (
                         <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-4">
                                    <div className="bg-muted p-2 rounded-lg">
                                        <WalletRegular className="h-6 w-6 text-primary" />
                                    </div>
                                    <div>
                                        <p className="font-medium">Plan {planName}</p>
                                        <p className="text-sm text-muted-foreground">Suscripción mensual</p>
                                    </div>
                                </div>
                                <p className="font-semibold">${planDetails.price}</p>
                            </div>
                            <Separator />
                            <div className="flex justify-between text-sm">
                                <p className="text-muted-foreground">Subtotal</p>
                                <p>${planDetails.price}</p>
                            </div>
                            <div className="flex justify-between text-sm">
                                <p className="text-muted-foreground">Impuestos (IVA 16%)</p>
                                <p>${(parseFloat(planDetails.price) * 0.16).toFixed(2)}</p>
                            </div>
                            <Separator />
                            <div className="flex justify-between font-bold text-lg">
                                <p>Total</p>
                                <p>
                                    <span className="text-sm text-muted-foreground font-normal mr-2">{planDetails.currency}</span>
                                    ${(parseFloat(planDetails.price) * 1.16).toFixed(2)}
                                </p>
                            </div>
                         </div>
                    ) : (
                        <p className="text-muted-foreground">No hay ningún plan seleccionado.</p>
                    )}
                 </div>
            </aside>
        </div>
    );
}
