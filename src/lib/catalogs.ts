export const usoCfdiOptions = [
  {"clave":"G01","descripcion":"Adquisición de mercancías"},
  {"clave":"G02","descripcion":"Devoluciones, descuentos o bonificaciones"},
  {"clave":"G03","descripcion":"Gastos en general"},
  {"clave":"I01","descripcion":"Construcciones"},
  {"clave":"I02","descripcion":"Mobiliario y equipo de oficina por inversiones"},
  {"clave":"I03","descripcion":"Equipo de transporte"},
  {"clave":"I04","descripcion":"Equipo de cómputo y accesorios"},
  {"clave":"I05","descripcion":"Dados, troqueles, moldes, matrices y herramental"},
  {"clave":"I06","descripcion":"Comunicaciones telefónicas"},
  {"clave":"I07","descripcion":"Comunicaciones satelitales"},
  {"clave":"I08","descripcion":"Otra maquinaria y equipo"},
  {"clave":"D01","descripcion":"Honorarios médicos, dentales y gastos hospitalarios"},
  {"clave":"D02","descripcion":"Gastos médicos por incapacidad o discapacidad"},
  {"clave":"D03","descripcion":"Gastos funerales"},
  {"clave":"D04","descripcion":"Donativos"},
  {"clave":"D05","descripcion":"Intereses reales efectivamente pagados por créditos hipotecarios (casa habitación)"},
  {"clave":"D06","descripcion":"Aportaciones voluntarias al SAR"},
  {"clave":"D07","descripcion":"Primas por seguros de gastos médicos"},
  {"clave":"D08","descripcion":"Gastos de transportación escolar obligatoria"},
  {"clave":"D09","descripcion":"Depósitos en cuentas para el ahorro, primas que tengan como base planes de pensiones"},
  {"clave":"D10","descripcion":"Pagos por servicios educativos (colegiaturas)"},
  {"clave":"S01","descripcion":"Sin efectos fiscales"},
  {"clave":"CP01","descripcion":"Pagos"},
  {"clave":"CN01","descripcion":"Nómina"}
];

export const regimenFiscalOptions = [
  { clave: '601', descripcion: 'General de Ley Personas Morales' },
  { clave: '603', descripcion: 'Personas Morales con Fines no Lucrativos' },
  { clave: '605', descripcion: 'Sueldos y Salarios e Ingresos Asimilados a Salarios' },
  { clave: '606', descripcion: 'Arrendamiento' },
  { clave: '607', descripcion: 'Régimen de Enajenación o Adquisición de Bienes' },
  { clave: '608', descripcion: 'Demás ingresos' },
  { clave: '610', descripcion: 'Residentes en el Extranjero sin Establecimiento Permanente en México' },
  { clave: '611', descripcion: 'Ingresos por Dividendos (socios y accionistas)' },
  { clave: '612', descripcion: 'Personas Físicas con Actividades Empresariales y Profesionales' },
  { clave: '614', descripcion: 'Ingresos por intereses' },
  { clave: '615', descripcion: 'Régimen de los ingresos por obtención de premios' },
  { clave: '616', descripcion: 'Sin obligaciones fiscales' },
  { clave: '620', descripcion: 'Sociedades Cooperativas de Producción que optan por diferir sus ingresos' },
  { clave: '621', descripcion: 'Incorporación Fiscal' },
  { clave: '622', descripcion: 'Actividades Agrícolas, Ganaderas, Silvícolas y Pesqueras' },
  { clave: '623', descripcion: 'Opcional para Grupos de Sociedades' },
  { clave: '624', descripcion: 'Coordinados' },
  { clave: '625', descripcion: 'Régimen de las Actividades Empresariales con ingresos a través de Plataformas Tecnológicas' },
  { clave: '626', descripcion: 'Régimen Simplificado de Confianza' },
];

// c_FormaPago - Formas de Pago
export const formaPagoOptions = [
  { clave: '01', descripcion: 'Efectivo' },
  { clave: '02', descripcion: 'Cheque nominativo' },
  { clave: '03', descripcion: 'Transferencia electrónica de fondos' },
  { clave: '04', descripcion: 'Tarjeta de crédito' },
  { clave: '05', descripcion: 'Monedero electrónico' },
  { clave: '06', descripcion: 'Dinero electrónico' },
  { clave: '08', descripcion: 'Vales de despensa' },
  { clave: '12', descripcion: 'Dación en pago' },
  { clave: '13', descripcion: 'Pago por subrogación' },
  { clave: '14', descripcion: 'Pago por consignación' },
  { clave: '15', descripcion: 'Condonación' },
  { clave: '17', descripcion: 'Compensación' },
  { clave: '23', descripcion: 'Novación' },
  { clave: '24', descripcion: 'Confusión' },
  { clave: '25', descripcion: 'Remisión de deuda' },
  { clave: '26', descripcion: 'Prescripción o caducidad' },
  { clave: '27', descripcion: 'A satisfacción del acreedor' },
  { clave: '28', descripcion: 'Tarjeta de débito' },
  { clave: '29', descripcion: 'Tarjeta de servicios' },
  { clave: '30', descripcion: 'Aplicación de anticipos' },
  { clave: '31', descripcion: 'Intermediario pagos' },
  { clave: '99', descripcion: 'Por definir' },
];

// c_MetodoPago - Métodos de Pago
export const metodoPagoOptions = [
  { clave: 'PUE', descripcion: 'Pago en una sola exhibición' },
  { clave: 'PPD', descripcion: 'Pago en parcialidades o diferido' },
];

// c_Moneda - Monedas
export const monedaOptions = [
  { clave: 'MXN', descripcion: 'Peso Mexicano' },
  { clave: 'USD', descripcion: 'Dólar americano' },
  { clave: 'EUR', descripcion: 'Euro' },
  { clave: 'GBP', descripcion: 'Libra Esterlina' },
  { clave: 'CAD', descripcion: 'Dólar Canadiense' },
  { clave: 'JPY', descripcion: 'Yen' },
  { clave: 'ARS', descripcion: 'Peso Argentino' },
  { clave: 'BRL', descripcion: 'Real' },
  { clave: 'CLP', descripcion: 'Peso Chileno' },
  { clave: 'COP', descripcion: 'Peso Colombiano' },
  { clave: 'PEN', descripcion: 'Nuevo Sol' },
  { clave: 'XXX', descripcion: 'Los códigos asignados para operaciones no se pueden clasificar' },
];

// c_TipoRelacion - Tipos de Relación entre CFDI
export const tipoRelacionOptions = [
  { clave: '01', descripcion: 'Nota de crédito de los documentos relacionados' },
  { clave: '02', descripcion: 'Nota de débito de los documentos relacionados' },
  { clave: '03', descripcion: 'Devolución de mercancía sobre facturas o traslados previos' },
  { clave: '04', descripcion: 'Sustitución de los CFDI previos' },
  { clave: '05', descripcion: 'Traslados de mercancías facturados previamente' },
  { clave: '06', descripcion: 'Factura generada por los traslados previos' },
  { clave: '07', descripcion: 'CFDI por aplicación de anticipo' },
  { clave: '08', descripcion: 'Factura generada por pagos en parcialidades' },
  { clave: '09', descripcion: 'Factura generada por pagos diferidos' },
];

// c_Pais - Países (principales)
export const paisOptions = [
  { clave: 'MEX', descripcion: 'México' },
  { clave: 'USA', descripcion: 'Estados Unidos' },
  { clave: 'CAN', descripcion: 'Canadá' },
  { clave: 'ESP', descripcion: 'España' },
  { clave: 'ARG', descripcion: 'Argentina' },
  { clave: 'BRA', descripcion: 'Brasil' },
  { clave: 'CHL', descripcion: 'Chile' },
  { clave: 'COL', descripcion: 'Colombia' },
  { clave: 'PER', descripcion: 'Perú' },
  { clave: 'VEN', descripcion: 'Venezuela' },
  { clave: 'CHN', descripcion: 'China' },
  { clave: 'JPN', descripcion: 'Japón' },
  { clave: 'DEU', descripcion: 'Alemania' },
  { clave: 'FRA', descripcion: 'Francia' },
  { clave: 'GBR', descripcion: 'Reino Unido' },
  { clave: 'ITA', descripcion: 'Italia' },
];

// c_Estado - Estados de México
export const estadoOptions = [
  { clave: 'AGU', descripcion: 'Aguascalientes' },
  { clave: 'BCN', descripcion: 'Baja California' },
  { clave: 'BCS', descripcion: 'Baja California Sur' },
  { clave: 'CAM', descripcion: 'Campeche' },
  { clave: 'CHP', descripcion: 'Chiapas' },
  { clave: 'CHH', descripcion: 'Chihuahua' },
  { clave: 'CMX', descripcion: 'Ciudad de México' },
  { clave: 'COA', descripcion: 'Coahuila de Zaragoza' },
  { clave: 'COL', descripcion: 'Colima' },
  { clave: 'DUR', descripcion: 'Durango' },
  { clave: 'GUA', descripcion: 'Guanajuato' },
  { clave: 'GRO', descripcion: 'Guerrero' },
  { clave: 'HID', descripcion: 'Hidalgo' },
  { clave: 'JAL', descripcion: 'Jalisco' },
  { clave: 'MEX', descripcion: 'México' },
  { clave: 'MIC', descripcion: 'Michoacán de Ocampo' },
  { clave: 'MOR', descripcion: 'Morelos' },
  { clave: 'NAY', descripcion: 'Nayarit' },
  { clave: 'NLE', descripcion: 'Nuevo León' },
  { clave: 'OAX', descripcion: 'Oaxaca' },
  { clave: 'PUE', descripcion: 'Puebla' },
  { clave: 'QUE', descripcion: 'Querétaro' },
  { clave: 'ROO', descripcion: 'Quintana Roo' },
  { clave: 'SLP', descripcion: 'San Luis Potosí' },
  { clave: 'SIN', descripcion: 'Sinaloa' },
  { clave: 'SON', descripcion: 'Sonora' },
  { clave: 'TAB', descripcion: 'Tabasco' },
  { clave: 'TAM', descripcion: 'Tamaulipas' },
  { clave: 'TLA', descripcion: 'Tlaxcala' },
  { clave: 'VER', descripcion: 'Veracruz de Ignacio de la Llave' },
  { clave: 'YUC', descripcion: 'Yucatán' },
  { clave: 'ZAC', descripcion: 'Zacatecas' },
];

// c_Impuesto - Impuestos
export const impuestoOptions = [
  { clave: '001', descripcion: 'ISR - Impuesto Sobre la Renta' },
  { clave: '002', descripcion: 'IVA - Impuesto al Valor Agregado' },
  { clave: '003', descripcion: 'IEPS - Impuesto Especial sobre Producción y Servicios' },
];

// c_TipoFactor - Tipos de Factor
export const tipoFactorOptions = [
  { clave: 'Tasa', descripcion: 'Tasa' },
  { clave: 'Cuota', descripcion: 'Cuota' },
  { clave: 'Exento', descripcion: 'Exento' },
];

// c_TasaOCuota - Tasas o Cuotas de IVA e IEPS más comunes
export const tasaOCuotaOptions = [
  { clave: '0.000000', descripcion: '0% - IVA Tasa 0' },
  { clave: '0.080000', descripcion: '8% - IVA Frontera' },
  { clave: '0.160000', descripcion: '16% - IVA General' },
  { clave: '0.030000', descripcion: '3% - IEPS' },
  { clave: '0.080000', descripcion: '8% - IEPS' },
  { clave: '0.265000', descripcion: '26.5% - IEPS' },
  { clave: '0.300000', descripcion: '30% - IEPS' },
  { clave: '0.530000', descripcion: '53% - IEPS' },
  { clave: '0.106667', descripcion: '10.6667% - ISR Retención' },
  { clave: '0.106666', descripcion: '10.6666% - IVA Retención (2/3)' },
  { clave: '0.040000', descripcion: '4% - IVA Retención (servicios profesionales)' },
];

// c_Exportacion - Exportación
export const exportacionOptions = [
  { clave: '01', descripcion: 'No aplica' },
  { clave: '02', descripcion: 'Definitiva' },
  { clave: '03', descripcion: 'Temporal' },
  { clave: '04', descripcion: 'Definitiva con clave A1' },
];

// c_ObjetoImp - Objeto de Impuesto
export const objetoImpOptions = [
  { clave: '01', descripcion: 'No objeto de impuesto' },
  { clave: '02', descripcion: 'Sí objeto de impuesto' },
  { clave: '03', descripcion: 'Sí objeto del impuesto y no obligado al desglose' },
  { clave: '04', descripcion: 'Sí objeto del impuesto y no causa impuesto' },
];

// c_TipoDeComprobante - Tipos de Comprobante
export const tipoComprobanteOptions = [
  { clave: 'I', descripcion: 'Ingreso' },
  { clave: 'E', descripcion: 'Egreso' },
  { clave: 'T', descripcion: 'Traslado' },
  { clave: 'N', descripcion: 'Nómina' },
  { clave: 'P', descripcion: 'Pago' },
];

// c_MotivosCancelacion - Motivos de Cancelación
export const motivoCancelacionOptions = [
  { clave: '01', descripcion: 'Comprobante emitido con errores con relación' },
  { clave: '02', descripcion: 'Comprobante emitido con errores sin relación' },
  { clave: '03', descripcion: 'No se llevó a cabo la operación' },
  { clave: '04', descripcion: 'Operación nominativa relacionada en una factura global' },
];
