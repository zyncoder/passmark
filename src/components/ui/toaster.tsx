'use client'

import * as React from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, CheckCircle2, AlertCircle, Info } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

export function Toaster() {
  const { toasts, removeToast } = useToast()

  return (
    <div className="fixed bottom-0 right-0 z-50 flex flex-col gap-2 p-6 pointer-events-none w-full max-w-sm">
      <AnimatePresence>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className={cn(
              "pointer-events-auto flex w-full items-start gap-3 rounded-lg border bg-white p-4 shadow-lg",
              {
                "border-l-4 border-l-success": toast.type === "success",
                "border-l-4 border-l-danger": toast.type === "error",
                "border-l-4 border-l-brand": toast.type === "info",
              }
            )}
          >
            <div className="mt-0.5">
              {toast.type === "success" && <CheckCircle2 className="h-5 w-5 text-success" />}
              {toast.type === "error" && <AlertCircle className="h-5 w-5 text-danger" />}
              {toast.type === "info" && <Info className="h-5 w-5 text-brand" />}
            </div>
            <div className="flex-1 text-[14px] font-medium text-neutral-900">
              {toast.message}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-neutral-600 hover:text-neutral-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  )
}
