
'use server';

import { Buffer } from 'buffer';
import { create } from 'xmlbuilder2';

const PAC_URL = 'https://dev.facturaloplus.com/api/rest/servicio/timbrar';
const PAC_PROD_URL = process.env.FACTURALOPLUS_PROD_URL;
const PAC_USER = process.env.FACTURALOPLUS_USER;
const PAC_API_KEY = process.env.FACTURALOPLUS_API_KEY;

export type PacConfig = {
  pacProvider?: string | null;
  pacEnvironment?: 'test' | 'production' | null;
  pacUsername?: string | null;
  pacPassword?: string | null;
  pacApiKey?: string | null;
  pacApiUrl?: string | null;
  pacIsActive?: boolean | null;
};

interface PacSuccessResponse {
  data: {
    xml: string; // Base64 encoded stamped XML
  };
  status?: string;
  response?: string;
  message?: string;
  [key: string]: unknown; // Permite propiedades adicionales pero con tipo más seguro
}

export async function stampWithFacturaLoPlus(
  xmlString: string,
  config?: PacConfig
): Promise<{ success: true; stampedXml: string; uuid: string; stampDate: string; } | { success: false; message: string; }> {
  const isActive = config?.pacIsActive ?? true;
  const pacUser = config?.pacUsername || PAC_USER;
  const pacKey = config?.pacApiKey || config?.pacPassword || PAC_API_KEY;
  const environment = (config?.pacEnvironment || 'test') as 'test' | 'production';
  const pacUrl = config?.pacApiUrl || (environment === 'production' ? PAC_PROD_URL : PAC_URL);

  if (!isActive) {
    return { success: false, message: 'El PAC está desactivado en la configuración de la empresa.' };
  }

  if (!pacUser || !pacKey || !pacUrl) {
    const message = 'Configura tu PAC en Configuración > PAC / Timbrado (usuario, API key y URL).';
    console.error(message);
    return { success: false, message };
  }

  const xmlBase64 = Buffer.from(xmlString).toString('base64');

  const requestBody = {
    user: pacUser,
    apikey: pacKey,
    xml: xmlBase64,
  };

  try {
    const response = await fetch(pacUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });

    const result = await response.json();

    if (!response.ok || result.status === 'error' || result.response === 'error') {
      const errorMessage = result.message || 'Error desconocido del PAC.';
      console.error('PAC Error Response:', result);
      return { success: false, message: `Error del PAC: ${errorMessage}` };
    }

    const stampedXmlBase64 = (result as PacSuccessResponse).data.xml;
    if (!stampedXmlBase64) {
      console.error('PAC Success Response missing XML:', result);
      return { success: false, message: 'Respuesta del PAC no contenía el XML timbrado.' };
    }
    
    const stampedXml = Buffer.from(stampedXmlBase64, 'base64').toString('utf-8');
    
    const doc = create(stampedXml);
    const timbreNode = doc.find(e => e.node.nodeName === 'tfd:TimbreFiscalDigital', true);
    
    if (!timbreNode) {
      return { success: false, message: 'El XML timbrado no contiene el Timbre Fiscal Digital.' };
    }

    // Usar una expresión regular para extraer los atributos del XML
    const uuidMatch = stampedXml.match(/UUID="([^"]+)"/);
    const stampDateMatch = stampedXml.match(/FechaTimbrado="([^"]+)"/);
    
    const uuid = uuidMatch ? uuidMatch[1] : '';
    const stampDate = stampDateMatch ? stampDateMatch[1] : '';
    
    if (!uuid || !stampDate) {
        return { success: false, message: 'No se pudo extraer el UUID o la Fecha de Timbrado del XML.' };
    }
    
    return { success: true, stampedXml, uuid, stampDate };

  } catch (error) {
    console.error("Fallo de comunicación con el PAC:", error);
    const message = error instanceof Error ? error.message : 'Error desconocido';
    return { success: false, message: `Fallo de comunicación con el servicio de timbrado: ${message}` };
  }
}
