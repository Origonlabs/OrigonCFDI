"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Upload, CheckCircle, XCircle, AlertTriangle, FileKey, Shield } from "lucide-react";
import { getCertificates, uploadCertificate, activateCertificate, deactivateCertificate } from "@/app/actions/certificates";
import { useToast } from "@/hooks/use-toast";

interface Certificate {
  id: number;
  certificateNumber: string;
  rfc: string;
  validFrom: Date;
  validTo: Date;
  isActive: boolean;
  createdAt: Date;
}

export default function CertificatesPage() {
  const { user, idToken } = useAuth();
  const { toast } = useToast();
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [password, setPassword] = useState("");

  useEffect(() => {
    loadCertificates();
  }, [user, idToken]);

  const loadCertificates = async () => {
    if (!user || !idToken) return;

    setLoading(true);
    const result = await getCertificates(user.uid, idToken);

    if (result.success && result.data) {
      setCertificates(result.data as Certificate[]);
    } else {
      toast({
        title: "Error",
        description: result.message || "No se pudieron cargar los certificados",
        variant: "destructive"
      });
    }
    setLoading(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'cert' | 'key') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (type === 'cert') {
      if (!file.name.endsWith('.cer')) {
        toast({
          title: "Error",
          description: "El certificado debe ser un archivo .cer",
          variant: "destructive"
        });
        return;
      }
      setCertFile(file);
    } else {
      if (!file.name.endsWith('.key')) {
        toast({
          title: "Error",
          description: "La llave debe ser un archivo .key",
          variant: "destructive"
        });
        return;
      }
      setKeyFile(file);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user || !idToken || !certFile || !keyFile || !password) {
      toast({
        title: "Error",
        description: "Por favor complete todos los campos",
        variant: "destructive"
      });
      return;
    }

    setUploading(true);

    try {
      // Leer archivos como Base64
      const certBase64 = await fileToBase64(certFile);
      const keyBase64 = await fileToBase64(keyFile);

      const result = await uploadCertificate(
        user.uid,
        idToken,
        certBase64,
        keyBase64,
        password
      );

      if (result.success) {
        toast({
          title: "Éxito",
          description: result.message || "Certificado configurado correctamente"
        });

        // Limpiar formulario
        setCertFile(null);
        setKeyFile(null);
        setPassword("");
        (document.getElementById('cert-file') as HTMLInputElement).value = '';
        (document.getElementById('key-file') as HTMLInputElement).value = '';

        // Recargar certificados
        loadCertificates();
      } else {
        toast({
          title: "Error",
          description: result.message || "No se pudo configurar el certificado",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al procesar los archivos",
        variant: "destructive"
      });
    } finally {
      setUploading(false);
    }
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleToggleActive = async (certId: number, currentlyActive: boolean) => {
    if (!user || !idToken) return;

    const result = currentlyActive
      ? await deactivateCertificate(certId, user.uid, idToken)
      : await activateCertificate(certId, user.uid, idToken);

    if (result.success) {
      toast({
        title: "Éxito",
        description: result.message
      });
      loadCertificates();
    } else {
      toast({
        title: "Error",
        description: result.message,
        variant: "destructive"
      });
    }
  };

  const isExpired = (validTo: Date) => {
    return new Date(validTo) < new Date();
  };

  const isExpiringSoon = (validTo: Date) => {
    const daysUntilExpiry = Math.floor((new Date(validTo).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry > 0 && daysUntilExpiry <= 30;
  };

  if (loading) {
    return (
      <div className="container mx-auto py-10">
        <p>Cargando certificados...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-10 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Certificados CSD</h1>
        <p className="text-muted-foreground mt-2">
          Gestiona los certificados de sello digital (CSD) del SAT para firmar tus facturas electrónicas.
        </p>
      </div>

      {/* Alert informativo */}
      <Alert>
        <Shield className="h-4 w-4" />
        <AlertDescription>
          Los certificados CSD son emitidos por el SAT y tienen una vigencia de 4 años.
          Tu certificado y llave privada se almacenan cifrados con AES-256-GCM.
        </AlertDescription>
      </Alert>

      {/* Formulario de subida */}
      <Card>
        <CardHeader>
          <CardTitle>Subir Nuevo Certificado</CardTitle>
          <CardDescription>
            Sube tu archivo .cer y .key proporcionados por el SAT
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpload} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cert-file">Certificado (.cer)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="cert-file"
                    type="file"
                    accept=".cer"
                    onChange={(e) => handleFileChange(e, 'cert')}
                    disabled={uploading}
                  />
                  {certFile && <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="key-file">Llave Privada (.key)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    id="key-file"
                    type="file"
                    accept=".key"
                    onChange={(e) => handleFileChange(e, 'key')}
                    disabled={uploading}
                  />
                  {keyFile && <CheckCircle className="h-5 w-5 text-green-600" />}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Contraseña de la Llave Privada</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Ingresa la contraseña de tu archivo .key"
                disabled={uploading}
              />
              <p className="text-sm text-muted-foreground">
                Esta es la contraseña que estableciste al descargar tu certificado del SAT
              </p>
            </div>

            <Button type="submit" disabled={!certFile || !keyFile || !password || uploading}>
              <Upload className="mr-2 h-4 w-4" />
              {uploading ? "Subiendo..." : "Subir Certificado"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Lista de certificados */}
      <Card>
        <CardHeader>
          <CardTitle>Certificados Configurados</CardTitle>
          <CardDescription>
            {certificates.length === 0
              ? "No tienes certificados configurados"
              : `${certificates.length} certificado(s) configurado(s)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {certificates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileKey className="mx-auto h-12 w-12 mb-4 opacity-50" />
              <p>No hay certificados configurados</p>
              <p className="text-sm mt-2">Sube tu primer certificado CSD para comenzar a timbrar facturas</p>
            </div>
          ) : (
            <div className="space-y-4">
              {certificates.map((cert) => {
                const expired = isExpired(cert.validTo);
                const expiringSoon = !expired && isExpiringSoon(cert.validTo);

                return (
                  <div
                    key={cert.id}
                    className={`border rounded-lg p-4 ${
                      cert.isActive ? 'border-green-500 bg-green-50/50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">RFC: {cert.rfc}</h3>
                          {cert.isActive && (
                            <Badge variant="default" className="bg-green-600">
                              Activo
                            </Badge>
                          )}
                          {expired && (
                            <Badge variant="destructive">
                              Expirado
                            </Badge>
                          )}
                          {expiringSoon && (
                            <Badge variant="secondary" className="bg-yellow-500 text-white">
                              <AlertTriangle className="mr-1 h-3 w-3" />
                              Expira pronto
                            </Badge>
                          )}
                        </div>

                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Número de Certificado: {cert.certificateNumber}</p>
                          <p>
                            Vigencia: {new Date(cert.validFrom).toLocaleDateString()} - {new Date(cert.validTo).toLocaleDateString()}
                          </p>
                          <p>Subido: {new Date(cert.createdAt).toLocaleDateString()}</p>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {!expired && (
                          <Button
                            variant={cert.isActive ? "outline" : "default"}
                            size="sm"
                            onClick={() => handleToggleActive(cert.id, cert.isActive)}
                          >
                            {cert.isActive ? (
                              <>
                                <XCircle className="mr-2 h-4 w-4" />
                                Desactivar
                              </>
                            ) : (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Activar
                              </>
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Información adicional */}
      <Card>
        <CardHeader>
          <CardTitle>¿Cómo obtener mi certificado CSD?</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <ol className="list-decimal list-inside space-y-2">
            <li>Ingresa al portal del SAT con tu RFC y contraseña</li>
            <li>Ve a la sección "Trámites" {">"} "Certificado de Sello Digital"</li>
            <li>Genera tu certificado (si es la primera vez) o renuévalo</li>
            <li>Descarga los archivos .cer (certificado) y .key (llave privada)</li>
            <li>Guarda la contraseña que estableciste para la llave privada</li>
            <li>Sube ambos archivos en esta página junto con la contraseña</li>
          </ol>
          <Alert className="mt-4">
            <AlertDescription>
              <strong>Importante:</strong> Los certificados CSD tienen una vigencia de 4 años.
              Te notificaremos 30 días antes de que expire para que puedas renovarlo.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
