
"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AddCircleRegular, MoreHorizontalRegular, FilterRegular, ImageRegular } from "@/icons/fluent";
import { User } from "firebase/auth";

import { auth, firebaseEnabled } from "@/lib/firebase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { getProducts } from "@/app/actions/products";
import type { ProductFormValues } from "@/lib/schemas";
import { Input } from "@/components/ui/input";

interface Product extends ProductFormValues {
  id: string;
  unitPrice: number;
}

export default function ProductsPage() {
  const { toast } = useToast();
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseEnabled || !auth) {
      setLoading(false);
      return;
    }
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
      if (!currentUser) {
        setLoading(false);
        setProducts([]);
      }
    });
    return () => unsubscribe();
  }, []);

  const fetchProducts = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { getUserAuth } = await import('@/lib/auth-client');
      const { uid, token } = await getUserAuth(user);
      const response = await getProducts(uid, token);

    if (response.success && response.data) {
      const productsData = response.data.map((product: any) => ({
        ...product,
        id: product.id.toString(),
        unitPrice: parseFloat(product.unitPrice),
      })) as Product[];
      setProducts(productsData);
    } else {
      toast({
        title: "Error",
        description: response.message || "No se pudieron cargar los productos.",
        variant: "destructive",
      });
    }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No fue posible autenticar la sesión.",
        variant: "destructive",
      });
    }
    setLoading(false);
  }, [user, toast]);

  useEffect(() => {
    if (user) {
      fetchProducts();
    }
  }, [user, fetchProducts]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
  }

  const getObjetoImpuestoLabel = (value: string) => {
    switch (value) {
      case '01': return 'No objeto de impuesto.';
      case '02': return 'Sí objeto de impuesto.';
      case '03': return 'Sí objeto del impuesto y no obligado al desglose.';
      default: return 'N/A';
    }
  };

  return (
    <div className="flex flex-col flex-1 gap-4">
      <Card className="flex flex-col flex-1">
        <CardHeader className="p-2 border-b bg-muted/30">
            <div className="flex items-center gap-2 flex-wrap">
                <Button asChild size="sm">
                    <Link href="/dashboard/products/new">
                        <AddCircleRegular className="mr-2 h-4 w-4" />
                        Agregar más productos
                    </Link>
                </Button>
                <Input placeholder="Código" className="w-40" />
                <Input placeholder="Descripción" className="w-64" />
                <Button variant="outline" size="sm">
                    <FilterRegular className="mr-2 h-4 w-4" />
                    Filtrar
                </Button>
                <Button variant="outline" size="sm">
                    <FilterRegular className="mr-2 h-4 w-4" />
                    Mostrar todos
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-0 flex-grow">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Imagen</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Unidad</TableHead>
                  <TableHead>Descripción</TableHead>
                  <TableHead>Precio Base</TableHead>
                  <TableHead>Clave Producto o Servicio</TableHead>
                  <TableHead>Clave Unidad</TableHead>
                  <TableHead>Objeto Impuesto</TableHead>
                  <TableHead>
                    <span className="sr-only">Acciones</span>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell colSpan={9}><Skeleton className="h-5 w-full" /></TableCell>
                    </TableRow>
                  ))
                ) : products.length > 0 ? (
                  products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="w-12 h-12 rounded-lg overflow-hidden border bg-muted flex items-center justify-center">
                          {product.imageUrl ? (
                            <img
                              src={product.imageUrl}
                              alt={product.description}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageRegular className="h-6 w-6 text-muted-foreground" />
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{product.code || 'N/A'}</TableCell>
                      <TableCell>{product.unitKey}</TableCell>
                      <TableCell className="font-medium">{product.description}</TableCell>
                      <TableCell className="text-right">{formatCurrency(product.unitPrice)}</TableCell>
                      <TableCell>{product.satKey}</TableCell>
                      <TableCell>{product.unitKey}</TableCell>
                      <TableCell>{getObjetoImpuestoLabel(product.objetoImpuesto)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button aria-haspopup="true" size="icon" variant="ghost">
                                <MoreHorizontalRegular className="h-4 w-4" />
                                <span className="sr-only">Toggle menu</span>
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Acciones</DropdownMenuLabel>
                              <DropdownMenuItem>Editar</DropdownMenuItem>
                              <DropdownMenuItem>Eliminar</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center h-24">
                      No has agregado ningún producto o servicio.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
