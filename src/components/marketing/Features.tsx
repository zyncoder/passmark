"use client"

import * as React from "react"
import { motion } from "framer-motion"
import { ShieldCheck, Zap, Users, Clock, ArrowUpRight } from "lucide-react"

const features = [
  {
    icon: <Zap className="w-5 h-5" />,
    title: "Instant Setup",
    description: "Launch your accreditation portal in minutes. Add vendors, set quotas, and start collecting applications immediately.",
    color: "text-amber-600 bg-amber-50 border-amber-100"
  },
  {
    icon: <ShieldCheck className="w-5 h-5" />,
    title: "Secure Verification",
    description: "Built-in ID uploads and strict validation rules ensure only authenticated personnel receive event access.",
    color: "text-brand bg-brand-light border-brand-light"
  },
  {
    icon: <Users className="w-5 h-5" />,
    title: "Vendor Autonomy",
    description: "Give vendors a self-serve dashboard to track quotas, save drafts, and manage their own team's passes.",
    color: "text-emerald-600 bg-emerald-50 border-emerald-100"
  },
  {
    icon: <Clock className="w-5 h-5" />,
    title: "Fast Turnaround",
    description: "Reduce approval times from days to hours with our streamlined admin review panel and bulk actions.",
    color: "text-violet-600 bg-violet-50 border-violet-100"
  }
]

export function Features() {
  return (
    <section id="features" className="py-24 md:py-32 bg-white">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[13px] font-semibold text-neutral-400 mb-4 tracking-widest uppercase"
          >
            Platform Features
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-[42px] font-bold tracking-[-0.02em] text-neutral-900 leading-[1.15] mb-5"
          >
            Everything you need to manage event access.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[17px] text-neutral-500 leading-relaxed"
          >
            Replace messy spreadsheets and expensive enterprise tools with a purpose-built platform.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {features.map((feature, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.08 }}
              className="group relative p-8 rounded-2xl border border-neutral-100 bg-neutral-50 hover:bg-white hover:border-neutral-200 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)] transition-all duration-300 cursor-default"
            >
              <div className="flex items-start justify-between mb-5">
                <div className={`w-10 h-10 rounded-xl border flex items-center justify-center ${feature.color}`}>
                  {feature.icon}
                </div>
                <ArrowUpRight className="w-4 h-4 text-neutral-200 group-hover:text-neutral-400 transition-colors" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 mb-2">{feature.title}</h3>
              <p className="text-[15px] text-neutral-500 leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
