'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { CheckmarkCircleRegular } from '@/icons/fluent';

interface ClientData {
  name: string;
  rfc: string;
  email: string;
  phone?: string;
  taxRegime: string;
  zip: string;
  country?: string;
  state?: string;
  municipality?: string;
  city?: string;
  neighborhood?: string;
  street?: string;
  exteriorNumber?: string;
  interiorNumber?: string;
  usoCfdi?: string;
  paymentMethod?: string;
  paymentForm?: string;
  reference?: string;
}

interface ViewClientRequestDialogProps {
  isOpen: boolean;
  onClose: () => void;
  clientData: ClientData | null;
  requestId: number;
  onApprove: (requestId: number) => Promise<void>;
}

export function ViewClientRequestDialog({
  isOpen,
  onClose,
  clientData,
  requestId,
  onApprove,
}: ViewClientRequestDialogProps) {
  const { toast } = useToast();
  const [approving, setApproving] = useState(false);

  if (!clientData) return null;

  async function handleApprove() {
    setApproving(true);
    try {
      await onApprove(requestId);
      toast({
        title: 'Cliente Creado',
        description: 'El cliente ha sido creado exitosamente en tu lista.',
      });
      onClose();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'No se pudo crear el cliente. Intenta de nuevo.',
        variant: 'destructive',
      });
    } finally {
      setApproving(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Datos del Cliente</DialogTitle>
          <DialogDescription>
            Revisa los datos proporcionados por el cliente antes de aprobarlos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Datos Básicos */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Datos Básicos</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Nombre / Razón Social</Label>
                <p className="font-medium">{clientData.name}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">RFC</Label>
                <p className="font-medium">{clientData.rfc}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Email</Label>
                <p className="font-medium">{clientData.email}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Teléfono</Label>
                <p className="font-medium">{clientData.phone || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Régimen Fiscal</Label>
                <p className="font-medium">{clientData.taxRegime}</p>
              </div>
            </div>
          </div>

          {/* Domicilio Fiscal */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Domicilio Fiscal</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Código Postal</Label>
                <p className="font-medium">{clientData.zip}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Estado</Label>
                <p className="font-medium">{clientData.state || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Ciudad</Label>
                <p className="font-medium">{clientData.city || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Municipio</Label>
                <p className="font-medium">{clientData.municipality || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Colonia</Label>
                <p className="font-medium">{clientData.neighborhood || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Calle</Label>
                <p className="font-medium">{clientData.street || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Número Exterior</Label>
                <p className="font-medium">{clientData.exteriorNumber || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Número Interior</Label>
                <p className="font-medium">{clientData.interiorNumber || 'No proporcionado'}</p>
              </div>
            </div>
          </div>

          {/* Preferencias */}
          <div className="space-y-3">
            <h3 className="font-semibold text-sm">Preferencias de Facturación</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <Label className="text-muted-foreground">Uso de CFDI</Label>
                <p className="font-medium">{clientData.usoCfdi || 'No proporcionado'}</p>
              </div>
              <div>
                <Label className="text-muted-foreground">Método de Pago</Label>
                <p className="font-medium">{clientData.paymentMethod || 'No proporcionado'}</p>
              </div>
              {clientData.reference && (
                <div className="col-span-2">
                  <Label className="text-muted-foreground">Referencia / Notas</Label>
                  <p className="font-medium">{clientData.reference}</p>
                </div>
              )}
            </div>
          </div>

          {/* Acciones */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onClose} disabled={approving}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={approving}>
              <CheckmarkCircleRegular className="mr-2 h-4 w-4" />
              {approving ? 'Creando Cliente...' : 'Aprobar y Crear Cliente'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
