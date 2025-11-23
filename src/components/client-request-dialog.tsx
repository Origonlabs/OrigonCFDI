'use client';

import { useState } from 'react';
import { User } from 'firebase/auth';
import { createClientRequest } from '@/app/actions/client-requests';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { MailRegular, DocumentRegular } from '@/icons/fluent';

interface ClientRequestDialogProps {
  user: User;
}

export function ClientRequestDialog({ user }: ClientRequestDialogProps) {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [clientEmail, setClientEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);

  async function handleCreateRequest() {
    if (!user) return;

    setLoading(true);

    const idToken = await user.getIdToken();
    const result = await createClientRequest(
      user.uid,
      clientEmail || null,
      idToken
    );

    if (!result.success) {
      toast({
        title: 'Error',
        description: result.message,
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    setGeneratedLink(result.link || null);
    toast({
      title: 'Link Generado',
      description: 'Comparte este link con tu cliente para que llene sus datos.',
    });
    setLoading(false);
  }

  function handleCopyLink() {
    if (generatedLink) {
      navigator.clipboard.writeText(generatedLink);
      toast({
        title: 'Copiado',
        description: 'Link copiado al portapapeles.',
      });
    }
  }

  function handleClose() {
    setIsOpen(false);
    setClientEmail('');
    setGeneratedLink(null);
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <DocumentRegular className="mr-2 h-4 w-4" />
          Solicitar Datos de Cliente
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Datos de Cliente</DialogTitle>
          <DialogDescription>
            Genera un link único para que tu cliente complete sus datos de facturación.
          </DialogDescription>
        </DialogHeader>

        {!generatedLink ? (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="clientEmail">Email del Cliente (Opcional)</Label>
              <Input
                id="clientEmail"
                type="email"
                placeholder="cliente@ejemplo.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
              <p className="text-sm text-muted-foreground">
                Si proporcionas el email, se pre-llenará en el formulario del cliente.
              </p>
            </div>

            <Button
              onClick={handleCreateRequest}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Generando...' : 'Generar Link'}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Link Generado</Label>
              <div className="flex gap-2">
                <Input
                  value={generatedLink}
                  readOnly
                  className="font-mono text-sm"
                />
                <Button onClick={handleCopyLink} variant="outline">
                  Copiar
                </Button>
              </div>
              <p className="text-sm text-muted-foreground">
                Este link expira en 7 días. Compártelo con tu cliente por email, WhatsApp, etc.
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={handleClose}
              >
                Cerrar
              </Button>
              <Button
                className="flex-1"
                onClick={() => {
                  setGeneratedLink(null);
                  setClientEmail('');
                }}
              >
                Crear Otro
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
