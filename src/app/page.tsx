'use client';

import Image from "next/image";
import { LoginForm } from "@/components/login-form"
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <div
      className="login-background relative flex min-h-svh flex-col items-center justify-center overflow-hidden p-6 md:p-10"
    >

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex w-[384px] flex-col gap-6"
      >
        <a href="#" className="flex items-center justify-center gap-2 self-center font-medium mb-4">
          <div className="relative h-12 w-40">
            <Image
              src="/LogoOrigonCFDI.webp"
              alt="Origon CFDI Logo"
              fill
              className="object-contain"
              unoptimized={true}
              priority
            />
          </div>
        </a>

        <LoginForm />

        <div className="text-muted-foreground text-center text-xs text-balance">
          <p>
            Al hacer clic en continuar, aceptas nuestros{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
              Términos de Servicio
            </a>{" "}
            y{" "}
            <a href="#" className="underline underline-offset-4 hover:text-primary transition-colors">
              Política de Privacidad
            </a>.
          </p>
          <div className="mt-8 text-muted-foreground/60">
            <p>Developed by <span className="font-semibold text-foreground">Opendex Cloud Platform</span></p>
            <p className="text-[10px] mt-1">© {new Date().getFullYear()} Opendex, Inc. All rights reserved.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
