'use client';

import Image from "next/image";
import { LoginForm } from "@/components/login-form"
import { motion } from "framer-motion";

export default function LoginPage() {
  return (
    <div
      className="relative flex min-h-svh flex-col items-center justify-center overflow-hidden bg-background p-6 md:p-10"
    >
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-background" />
        <div className="absolute -top-[40%] -left-[20%] h-[800px] w-[800px] rounded-full bg-primary/5 blur-3xl" />
        <div className="absolute top-[20%] -right-[20%] h-[600px] w-[600px] rounded-full bg-blue-500/5 blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 flex w-full max-w-sm flex-col gap-6"
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

        <div className="backdrop-blur-sm bg-card/50 shadow-xl rounded-xl overflow-hidden">
          <LoginForm className="p-6" />
        </div>

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
            <p className="text-[10px] mt-1">© {new Date().getFullYear()} Opendex Corporation. All rights reserved.</p>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
