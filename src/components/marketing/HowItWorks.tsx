"use client"

import * as React from "react"
import { motion } from "framer-motion"

const steps = [
  {
    number: "01",
    title: "Onboard Vendors",
    description: "Admins create vendor accounts and set application quotas. Vendors receive automated login credentials via email."
  },
  {
    number: "02",
    title: "Collect Applications",
    description: "Vendors log in, complete their organizational profile, and submit accreditation forms with ID proofs and photos."
  },
  {
    number: "03",
    title: "Review & Approve",
    description: "Admins review from a centralized dashboard — request more info, approve, or reject with a single click."
  }
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="py-24 md:py-32 bg-[#FAFAFA] border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="max-w-2xl mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[13px] font-semibold text-neutral-400 mb-4 tracking-widest uppercase"
          >
            How it works
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-[42px] font-bold tracking-[-0.02em] text-neutral-900 leading-[1.15]"
          >
            Three steps to streamlined accreditation.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.12 }}
              className="relative"
            >
              <span className="text-[64px] font-bold text-neutral-100 leading-none select-none">{step.number}</span>
              <h3 className="text-xl font-semibold text-neutral-900 mt-2 mb-3">{step.title}</h3>
              <p className="text-[15px] text-neutral-500 leading-relaxed">{step.description}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
