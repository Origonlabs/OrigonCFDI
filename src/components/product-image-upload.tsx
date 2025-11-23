'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { ImageRegular, DeleteRegular, LinkRegular } from '@/icons/fluent';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ProductImageUploadProps {
  value?: string;
  onChange: (url: string) => void;
}

export function ProductImageUpload({ value, onChange }: ProductImageUploadProps) {
  const [imageUrl, setImageUrl] = useState<string>(value || '');
  const [urlInput, setUrlInput] = useState<string>(value || '');
  const [previewUrl, setPreviewUrl] = useState<string>(value || '');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validar que sea una imagen
      if (!file.type.startsWith('image/')) {
        alert('Por favor selecciona un archivo de imagen válido.');
        return;
      }

      // Validar tamaño (máximo 5MB)
      if (file.size > 5 * 1024 * 1024) {
        alert('La imagen no debe superar los 5MB.');
        return;
      }

      // Crear una URL temporal para previsualización
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setPreviewUrl(base64String);
        setImageUrl(base64String);
        onChange(base64String);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUrlChange = (url: string) => {
    setUrlInput(url);
  };

  const handleUrlApply = () => {
    if (urlInput) {
      setImageUrl(urlInput);
      setPreviewUrl(urlInput);
      onChange(urlInput);
    }
  };

  const handleRemoveImage = () => {
    setImageUrl('');
    setPreviewUrl('');
    setUrlInput('');
    onChange('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="upload" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="upload">Subir Imagen</TabsTrigger>
          <TabsTrigger value="url">URL de Imagen</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="space-y-4">
          <div className="space-y-2">
            <Label>Imagen del Producto</Label>
            <div className="flex items-center gap-2">
              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="flex-1"
              />
              {previewUrl && (
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={handleRemoveImage}
                >
                  <DeleteRegular className="h-4 w-4" />
                </Button>
              )}
            </div>
            <p className="text-xs text-muted-foreground">
              Formatos aceptados: JPG, PNG, GIF. Tamaño máximo: 5MB
            </p>
          </div>
        </TabsContent>

        <TabsContent value="url" className="space-y-4">
          <div className="space-y-2">
            <Label>URL de la Imagen</Label>
            <div className="flex items-center gap-2">
              <Input
                type="url"
                placeholder="https://ejemplo.com/imagen.jpg"
                value={urlInput}
                onChange={(e) => handleUrlChange(e.target.value)}
              />
              <Button type="button" onClick={handleUrlApply}>
                <LinkRegular className="mr-2 h-4 w-4" />
                Aplicar
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Ingresa la URL completa de una imagen en línea
            </p>
          </div>
        </TabsContent>
      </Tabs>

      {previewUrl && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <Label>Vista Previa</Label>
              <div className="relative w-full max-w-xs mx-auto aspect-square rounded-lg overflow-hidden border bg-muted">
                <img
                  src={previewUrl}
                  alt="Vista previa del producto"
                  className="w-full h-full object-contain"
                  onError={() => {
                    setPreviewUrl('');
                    alert('No se pudo cargar la imagen. Verifica la URL.');
                  }}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {!previewUrl && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <ImageRegular className="h-12 w-12 mb-2" />
              <p className="text-sm">No hay imagen seleccionada</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
