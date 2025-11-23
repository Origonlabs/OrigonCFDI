'use client';

import { useState, useEffect, lazy, Suspense } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getClientRequestByToken, submitClientData } from '@/app/actions/client-requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckmarkCircleRegular, ErrorCircleRegular } from '@/icons/fluent';

const PixelBlast = lazy(() => import('@/components/ui/pixel-blast'));

export default function ClientFormPage() {
  const params = useParams();
  const router = useRouter();
  const token = params.token as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [request, setRequest] = useState<any>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [branding, setBranding] = useState<any>(null);

  const [formData, setFormData] = useState({
    // Datos básicos
    name: '',
    rfc: '',
    email: '',
    phone: '',
    taxRegime: '',

    // Domicilio fiscal
    zip: '',
    country: 'México',
    state: '',
    municipality: '',
    city: '',
    neighborhood: '',
    street: '',
    exteriorNumber: '',
    interiorNumber: '',

    // Preferencias
    usoCfdi: '',
    paymentMethod: '',
    paymentForm: '',
    reference: '',
  });

  useEffect(() => {
    loadRequest();
  }, [token]);

  async function loadRequest() {
    setLoading(true);
    setError(null);

    const result = await getClientRequestByToken(token);

    if (!result.success) {
      setError(result.message || 'No se pudo cargar la solicitud');
      setLoading(false);
      return;
    }

    setRequest(result.request);
    setBranding(result.branding);

    // Pre-llenar email si está disponible
    if (result.request?.clientEmail) {
      setFormData(prev => ({ ...prev, email: result.request.clientEmail }));
    }

    setLoading(false);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const requiredFields: Array<[string, string]> = [
      ['name', formData.name],
      ['rfc', formData.rfc],
      ['email', formData.email],
      ['taxRegime', formData.taxRegime],
      ['zip', formData.zip],
      ['state', formData.state],
    ];

    const missingField = requiredFields.find(([, value]) => !value?.trim());
    if (missingField) {
      setError('Por favor completa todos los campos obligatorios marcados con *.');
      return;
    }

    // Mostrar vista previa
    setShowPreview(true);
  }

  async function handleConfirmSubmit() {
    setSubmitting(true);
    setError(null);

    const result = await submitClientData(token, formData);

    if (!result.success) {
      setError(result.message || 'Error al enviar los datos');
      setSubmitting(false);
      return;
    }

    setSuccess(true);
    setSubmitting(false);
    setShowPreview(false);
  }

  function handleChange(field: string, value: string) {
    setFormData(prev => ({ ...prev, [field]: value }));
  }

  // Renderizar contenido según el estado
  let content;

  if (loading) {
    content = (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card>
            <CardHeader>
              <div className="h-7 bg-muted rounded animate-pulse w-2/3" />
              <div className="h-5 bg-muted rounded animate-pulse w-full mt-2" />
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Skeleton para Datos Básicos */}
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded animate-pulse w-32" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      <div className="h-9 bg-muted rounded animate-pulse w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Skeleton para Domicilio Fiscal */}
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded animate-pulse w-40" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      <div className="h-9 bg-muted rounded animate-pulse w-full" />
                    </div>
                  ))}
                </div>
              </div>

              {/* Skeleton para Preferencias */}
              <div className="space-y-4">
                <div className="h-6 bg-muted rounded animate-pulse w-48" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="space-y-2">
                      <div className="h-4 bg-muted rounded animate-pulse w-24" />
                      <div className="h-9 bg-muted rounded animate-pulse w-full" />
                    </div>
                  ))}
                  <div className="space-y-2 md:col-span-2">
                    <div className="h-4 bg-muted rounded animate-pulse w-32" />
                    <div className="h-9 bg-muted rounded animate-pulse w-full" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end">
                <div className="h-10 bg-muted rounded animate-pulse w-32" />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } else if (error && !request) {
    content = (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-red-600">
              <ErrorCircleRegular className="h-6 w-6" />
              <CardTitle>Error</CardTitle>
            </div>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  } else if (success) {
    content = (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-2xl mx-4">
          <CardHeader>
            <div className="flex items-center gap-2 text-green-600">
              <CheckmarkCircleRegular className="h-6 w-6" />
              <CardTitle>¡Datos Enviados Exitosamente!</CardTitle>
            </div>
            <CardDescription>
              Tus datos han sido recibidos. El vendedor se pondrá en contacto contigo pronto.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  } else if (showPreview) {
    // Helper function to get tax regime label
    const getTaxRegimeLabel = (code: string) => {
      const regimes: Record<string, string> = {
        '601': '601 - General de Ley Personas Morales',
        '603': '603 - Personas Morales con Fines no Lucrativos',
        '605': '605 - Sueldos y Salarios e Ingresos Asimilados a Salarios',
        '606': '606 - Arrendamiento',
        '607': '607 - Régimen de Enajenación o Adquisición de Bienes',
        '608': '608 - Demás ingresos',
        '610': '610 - Residentes en el Extranjero sin Establecimiento Permanente en México',
        '611': '611 - Ingresos por Dividendos (socios y accionistas)',
        '612': '612 - Personas Físicas con Actividades Empresariales y Profesionales',
        '614': '614 - Ingresos por intereses',
        '615': '615 - Régimen de los ingresos por obtención de premios',
        '616': '616 - Sin obligaciones fiscales',
        '620': '620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos',
        '621': '621 - Incorporación Fiscal',
        '622': '622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras',
        '623': '623 - Opcional para Grupos de Sociedades',
        '624': '624 - Coordinados',
        '625': '625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas',
        '626': '626 - Régimen Simplificado de Confianza',
      };
      return regimes[code] || code;
    };

    const getUsoCfdiLabel = (code: string) => {
      const usos: Record<string, string> = {
        'G01': 'G01 - Adquisición de mercancías',
        'G02': 'G02 - Devoluciones, descuentos o bonificaciones',
        'G03': 'G03 - Gastos en general',
        'I01': 'I01 - Construcciones',
        'I02': 'I02 - Mobilario y equipo de oficina por inversiones',
        'I03': 'I03 - Equipo de transporte',
        'I04': 'I04 - Equipo de cómputo y accesorios',
        'I05': 'I05 - Dados, troqueles, moldes, matrices y herramental',
        'I06': 'I06 - Comunicaciones telefónicas',
        'I07': 'I07 - Comunicaciones satelitales',
        'I08': 'I08 - Otra maquinaria y equipo',
        'D01': 'D01 - Honorarios médicos, dentales y gastos hospitalarios',
        'D02': 'D02 - Gastos médicos por incapacidad o discapacidad',
        'D03': 'D03 - Gastos funerales',
        'D04': 'D04 - Donativos',
        'D05': 'D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)',
        'D06': 'D06 - Aportaciones voluntarias al SAR',
        'D07': 'D07 - Primas por seguros de gastos médicos',
        'D08': 'D08 - Gastos de transportación escolar obligatoria',
        'D09': 'D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones',
        'D10': 'D10 - Pagos por servicios educativos (colegiaturas)',
        'S01': 'S01 - Sin efectos fiscales',
        'CP01': 'CP01 - Pagos',
        'CN01': 'CN01 - Nómina',
      };
      return usos[code] || code;
    };

    const getPaymentMethodLabel = (code: string) => {
      const methods: Record<string, string> = {
        'PUE': 'PUE - Pago en una sola exhibición',
        'PPD': 'PPD - Pago en parcialidades o diferido',
      };
      return methods[code] || code;
    };

    content = (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <Card>
            <CardHeader>
              {branding?.logoUrl && (
                <div className="flex justify-center mb-4">
                  <img
                    src={branding.logoUrl}
                    alt={branding.companyName || 'Logo'}
                    className="h-16 object-contain"
                  />
                </div>
              )}
              <CardTitle>Confirmación de Datos</CardTitle>
              <CardDescription>
                Por favor revise cuidadosamente la información antes de enviarla. ¿Está de acuerdo con los datos ingresados?
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Datos Básicos */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Datos Básicos</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Nombre o Razón Social:</span>
                    <p className="text-muted-foreground">{formData.name}</p>
                  </div>
                  <div>
                    <span className="font-medium">RFC:</span>
                    <p className="text-muted-foreground">{formData.rfc}</p>
                  </div>
                  <div>
                    <span className="font-medium">Email:</span>
                    <p className="text-muted-foreground">{formData.email}</p>
                  </div>
                  {formData.phone && (
                    <div>
                      <span className="font-medium">Teléfono:</span>
                      <p className="text-muted-foreground">{formData.phone}</p>
                    </div>
                  )}
                  <div className="md:col-span-2">
                    <span className="font-medium">Régimen Fiscal:</span>
                    <p className="text-muted-foreground">{getTaxRegimeLabel(formData.taxRegime)}</p>
                  </div>
                </div>
              </div>

              {/* Domicilio Fiscal */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold border-b pb-2">Domicilio Fiscal</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <span className="font-medium">Código Postal:</span>
                    <p className="text-muted-foreground">{formData.zip}</p>
                  </div>
                  <div>
                    <span className="font-medium">Estado:</span>
                    <p className="text-muted-foreground">{formData.state}</p>
                  </div>
                  {formData.municipality && (
                    <div>
                      <span className="font-medium">Municipio:</span>
                      <p className="text-muted-foreground">{formData.municipality}</p>
                    </div>
                  )}
                  {formData.city && (
                    <div>
                      <span className="font-medium">Ciudad:</span>
                      <p className="text-muted-foreground">{formData.city}</p>
                    </div>
                  )}
                  {formData.neighborhood && (
                    <div>
                      <span className="font-medium">Colonia:</span>
                      <p className="text-muted-foreground">{formData.neighborhood}</p>
                    </div>
                  )}
                  {formData.street && (
                    <div>
                      <span className="font-medium">Calle:</span>
                      <p className="text-muted-foreground">{formData.street}</p>
                    </div>
                  )}
                  {formData.exteriorNumber && (
                    <div>
                      <span className="font-medium">Número Exterior:</span>
                      <p className="text-muted-foreground">{formData.exteriorNumber}</p>
                    </div>
                  )}
                  {formData.interiorNumber && (
                    <div>
                      <span className="font-medium">Número Interior:</span>
                      <p className="text-muted-foreground">{formData.interiorNumber}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Preferencias de Facturación */}
              {(formData.usoCfdi || formData.paymentMethod || formData.reference) && (
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold border-b pb-2">Preferencias de Facturación</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                    {formData.usoCfdi && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Uso de CFDI:</span>
                        <p className="text-muted-foreground">{getUsoCfdiLabel(formData.usoCfdi)}</p>
                      </div>
                    )}
                    {formData.paymentMethod && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Método de Pago:</span>
                        <p className="text-muted-foreground">{getPaymentMethodLabel(formData.paymentMethod)}</p>
                      </div>
                    )}
                    {formData.reference && (
                      <div className="md:col-span-2">
                        <span className="font-medium">Referencia o Notas:</span>
                        <p className="text-muted-foreground">{formData.reference}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex gap-3 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPreview(false)}
                  disabled={submitting}
                >
                  Regresar
                </Button>
                <Button
                  type="button"
                  onClick={handleConfirmSubmit}
                  disabled={submitting}
                >
                  {submitting ? 'Enviando...' : 'Confirmar y Enviar'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  } else {
    content = (
      <div className="min-h-screen py-12">
        <div className="container mx-auto px-4 max-w-3xl">
        <Card>
          <CardHeader>
            {branding?.logoUrl && (
              <div className="flex justify-center mb-4">
                <img
                  src={branding.logoUrl}
                  alt={branding.companyName || 'Logo'}
                  className="h-16 object-contain"
                />
              </div>
            )}
            <CardTitle>
              {branding?.formWelcomeMessage || 'Formulario de Datos del Cliente'}
            </CardTitle>
            <CardDescription>
              Por favor completa todos los campos solicitados a continuación. Esta información es necesaria para poder generar sus facturas correctamente. Los campos marcados con asterisco (*) son obligatorios.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Datos Básicos */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Datos Básicos</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nombre o Razón Social *</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) => handleChange('name', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="rfc">RFC *</Label>
                    <Input
                      id="rfc"
                      value={formData.rfc}
                      onChange={(e) => handleChange('rfc', e.target.value.toUpperCase())}
                      maxLength={13}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email">Email *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => handleChange('email', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Teléfono</Label>
                    <Input
                      id="phone"
                      value={formData.phone}
                      onChange={(e) => handleChange('phone', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taxRegime">Régimen Fiscal *</Label>
                    <Select
                      value={formData.taxRegime}
                      onValueChange={(value) => handleChange('taxRegime', value)}
                      required
                    >
                      <SelectTrigger className="h-[28px] text-[13px]">
                        <SelectValue placeholder="Selecciona un régimen fiscal" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="601">601 - General de Ley Personas Morales</SelectItem>
                        <SelectItem value="603">603 - Personas Morales con Fines no Lucrativos</SelectItem>
                        <SelectItem value="605">605 - Sueldos y Salarios e Ingresos Asimilados a Salarios</SelectItem>
                        <SelectItem value="606">606 - Arrendamiento</SelectItem>
                        <SelectItem value="607">607 - Régimen de Enajenación o Adquisición de Bienes</SelectItem>
                        <SelectItem value="608">608 - Demás ingresos</SelectItem>
                        <SelectItem value="610">610 - Residentes en el Extranjero sin Establecimiento Permanente en México</SelectItem>
                        <SelectItem value="611">611 - Ingresos por Dividendos (socios y accionistas)</SelectItem>
                        <SelectItem value="612">612 - Personas Físicas con Actividades Empresariales y Profesionales</SelectItem>
                        <SelectItem value="614">614 - Ingresos por intereses</SelectItem>
                        <SelectItem value="615">615 - Régimen de los ingresos por obtención de premios</SelectItem>
                        <SelectItem value="616">616 - Sin obligaciones fiscales</SelectItem>
                        <SelectItem value="620">620 - Sociedades Cooperativas de Producción que optan por diferir sus ingresos</SelectItem>
                        <SelectItem value="621">621 - Incorporación Fiscal</SelectItem>
                        <SelectItem value="622">622 - Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras</SelectItem>
                        <SelectItem value="623">623 - Opcional para Grupos de Sociedades</SelectItem>
                        <SelectItem value="624">624 - Coordinados</SelectItem>
                        <SelectItem value="625">625 - Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas</SelectItem>
                        <SelectItem value="626">626 - Régimen Simplificado de Confianza</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Domicilio Fiscal */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Domicilio Fiscal</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="zip">Código Postal *</Label>
                    <Input
                      id="zip"
                      value={formData.zip}
                      onChange={(e) => handleChange('zip', e.target.value)}
                      maxLength={5}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="state">Estado *</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => handleChange('state', e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="municipality">Municipio</Label>
                    <Input
                      id="municipality"
                      value={formData.municipality}
                      onChange={(e) => handleChange('municipality', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city">Ciudad</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => handleChange('city', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="neighborhood">Colonia</Label>
                    <Input
                      id="neighborhood"
                      value={formData.neighborhood}
                      onChange={(e) => handleChange('neighborhood', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="street">Calle</Label>
                    <Input
                      id="street"
                      value={formData.street}
                      onChange={(e) => handleChange('street', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="exteriorNumber">Número Exterior</Label>
                    <Input
                      id="exteriorNumber"
                      value={formData.exteriorNumber}
                      onChange={(e) => handleChange('exteriorNumber', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="interiorNumber">Número Interior</Label>
                    <Input
                      id="interiorNumber"
                      value={formData.interiorNumber}
                      onChange={(e) => handleChange('interiorNumber', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Preferencias */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Preferencias de Facturación</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="usoCfdi">Uso de CFDI</Label>
                    <Select
                      value={formData.usoCfdi}
                      onValueChange={(value) => handleChange('usoCfdi', value)}
                    >
                      <SelectTrigger className="h-[28px] text-[13px]">
                        <SelectValue placeholder="Selecciona el uso de CFDI" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="G01">G01 - Adquisición de mercancías</SelectItem>
                        <SelectItem value="G02">G02 - Devoluciones, descuentos o bonificaciones</SelectItem>
                        <SelectItem value="G03">G03 - Gastos en general</SelectItem>
                        <SelectItem value="I01">I01 - Construcciones</SelectItem>
                        <SelectItem value="I02">I02 - Mobilario y equipo de oficina por inversiones</SelectItem>
                        <SelectItem value="I03">I03 - Equipo de transporte</SelectItem>
                        <SelectItem value="I04">I04 - Equipo de cómputo y accesorios</SelectItem>
                        <SelectItem value="I05">I05 - Dados, troqueles, moldes, matrices y herramental</SelectItem>
                        <SelectItem value="I06">I06 - Comunicaciones telefónicas</SelectItem>
                        <SelectItem value="I07">I07 - Comunicaciones satelitales</SelectItem>
                        <SelectItem value="I08">I08 - Otra maquinaria y equipo</SelectItem>
                        <SelectItem value="D01">D01 - Honorarios médicos, dentales y gastos hospitalarios</SelectItem>
                        <SelectItem value="D02">D02 - Gastos médicos por incapacidad o discapacidad</SelectItem>
                        <SelectItem value="D03">D03 - Gastos funerales</SelectItem>
                        <SelectItem value="D04">D04 - Donativos</SelectItem>
                        <SelectItem value="D05">D05 - Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)</SelectItem>
                        <SelectItem value="D06">D06 - Aportaciones voluntarias al SAR</SelectItem>
                        <SelectItem value="D07">D07 - Primas por seguros de gastos médicos</SelectItem>
                        <SelectItem value="D08">D08 - Gastos de transportación escolar obligatoria</SelectItem>
                        <SelectItem value="D09">D09 - Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones</SelectItem>
                        <SelectItem value="D10">D10 - Pagos por servicios educativos (colegiaturas)</SelectItem>
                        <SelectItem value="S01">S01 - Sin efectos fiscales</SelectItem>
                        <SelectItem value="CP01">CP01 - Pagos</SelectItem>
                        <SelectItem value="CN01">CN01 - Nómina</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="paymentMethod">Método de Pago</Label>
                    <Select
                      value={formData.paymentMethod}
                      onValueChange={(value) => handleChange('paymentMethod', value)}
                    >
                      <SelectTrigger className="h-[28px] text-[13px]">
                        <SelectValue placeholder="Selecciona el método de pago" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PUE">PUE - Pago en una sola exhibición</SelectItem>
                        <SelectItem value="PPD">PPD - Pago en parcialidades o diferido</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="reference">Referencia o Notas</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => handleChange('reference', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {error && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg text-red-600 dark:text-red-400">
                  {error}
                </div>
              )}

              <div className="flex justify-end">
                <Button type="submit">
                  Continuar
                </Button>
              </div>
            </form>

            {branding?.formFooterMessage && (
              <div className="mt-6 pt-6 border-t text-center text-sm text-muted-foreground">
                {branding.formFooterMessage}
              </div>
            )}
          </CardContent>
        </Card>
        </div>
      </div>
    );
  }

  // Obtener color de acento del branding o usar default
  const accentColor = branding?.brandAccentColor || '#B19EEF';

  return (
    <>
      <Suspense fallback={null}>
        <PixelBlast color={accentColor} />
      </Suspense>
      <div className="relative z-10">
        {content}
      </div>
    </>
  );
}
