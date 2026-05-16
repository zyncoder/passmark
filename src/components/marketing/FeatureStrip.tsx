"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ShieldCheck, Users, FileCheck, BarChart3, Sparkles } from "lucide-react"

const quickFeatures = [
  { icon: <ShieldCheck className="w-5 h-5" />, label: "Verify", desc: "Secure ID verification" },
  { icon: <Users className="w-5 h-5" />, label: "Manage", desc: "Vendor account control" },
  { icon: <FileCheck className="w-5 h-5" />, label: "Review", desc: "Application approval flow" },
  { icon: <BarChart3 className="w-5 h-5" />, label: "Analyse", desc: "Real-time event analytics" },
  { icon: <Sparkles className="w-5 h-5" />, label: "Automate", desc: "Email & status workflows", isNew: true },
]

export function FeatureStrip() {
  return (
    <div className="border-t border-b border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-neutral-100">
          {quickFeatures.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
              className="flex flex-col items-center text-center py-8 px-4 group cursor-default hover:bg-neutral-50/60 transition-colors"
            >
              <div className="text-neutral-300 group-hover:text-neutral-600 transition-colors mb-3">
                {f.icon}
              </div>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-[14px] font-semibold text-neutral-900">{f.label}</span>
                {f.isNew && (
                  <span className="text-[9px] font-bold text-green-600 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full leading-none">New</span>
                )}
              </div>
              <p className="text-[12px] text-neutral-400">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  )
}
