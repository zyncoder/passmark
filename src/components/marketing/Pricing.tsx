"use client"

import * as React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { Check } from "lucide-react"

const plans = [
  {
    name: "Starter",
    price: "4,999",
    credentials: "100",
    description: "Perfect for small events and conferences.",
    features: [
      "Up to 100 credentials per event",
      "Vendor self-serve portal",
      "ID verification & photo upload",
      "Admin review dashboard",
      "Email notifications",
      "CSV export",
    ],
    cta: "Get Started",
    highlighted: false,
  },
  {
    name: "Growth",
    price: "9,999",
    credentials: "300",
    description: "For mid-size events with multiple vendor organizations.",
    features: [
      "Up to 300 credentials per event",
      "Everything in Starter",
      "Multi-zone access control",
      "Quota management per vendor",
      "Priority email support",
      "Custom branding",
    ],
    cta: "Get Started",
    highlighted: true,
  },
  {
    name: "Pro",
    price: "14,999",
    credentials: "500",
    description: "Enterprise-grade for large-scale events and expos.",
    features: [
      "Up to 500 credentials per event",
      "Everything in Growth",
      "Bulk import & export",
      "API access",
      "Dedicated account manager",
      "On-site support available",
    ],
    cta: "Contact Sales",
    highlighted: false,
  },
]

export function Pricing() {
  return (
    <section id="pricing" className="py-24 md:py-32 bg-white border-t border-neutral-100">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-[13px] font-semibold text-neutral-400 mb-4 tracking-widest uppercase"
          >
            Pricing
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-[42px] font-bold tracking-[-0.02em] text-neutral-900 leading-[1.15] mb-5"
          >
            Simple, transparent pricing.
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-[17px] text-neutral-500 leading-relaxed"
          >
            Pay per event. No subscriptions. No hidden fees.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
          {plans.map((plan, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: idx * 0.1 }}
              className={`relative rounded-2xl border p-8 transition-all ${
                plan.highlighted
                  ? "bg-brand border-brand shadow-xl shadow-brand/10 text-white scale-[1.02]"
                  : "bg-white border-neutral-200 hover:border-neutral-300 hover:shadow-[0_8px_30px_-12px_rgba(0,0,0,0.06)]"
              }`}
            >
              {plan.highlighted && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                  <span className="bg-white text-brand text-[11px] font-bold px-4 py-1.5 rounded-full shadow-sm">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <h3 className={`text-lg font-semibold mb-1 ${plan.highlighted ? "text-white" : "text-neutral-900"}`}>
                  {plan.name}
                </h3>
                <p className={`text-[13px] ${plan.highlighted ? "text-white/60" : "text-neutral-500"}`}>
                  {plan.description}
                </p>
              </div>

              <div className="mb-8">
                <div className="flex items-baseline gap-1">
                  <span className={`text-[13px] font-medium ${plan.highlighted ? "text-white/70" : "text-neutral-500"}`}>₹</span>
                  <span className={`text-4xl font-bold tracking-tight ${plan.highlighted ? "text-white" : "text-neutral-900"}`}>
                    {plan.price}
                  </span>
                </div>
                <p className={`text-[13px] mt-1 ${plan.highlighted ? "text-white/50" : "text-neutral-400"}`}>
                  per event · up to {plan.credentials} credentials
                </p>
              </div>

              <div className="space-y-3 mb-8">
                {plan.features.map((feature, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center shrink-0 ${
                      plan.highlighted ? "bg-white/20" : "bg-brand-light"
                    }`}>
                      <Check className={`w-2.5 h-2.5 ${plan.highlighted ? "text-white" : "text-brand"}`} strokeWidth={3} />
                    </div>
                    <span className={`text-[14px] leading-snug ${plan.highlighted ? "text-white/80" : "text-neutral-600"}`}>
                      {feature}
                    </span>
                  </div>
                ))}
              </div>

              <Link href="/login" className="block">
                <button className={`w-full h-12 rounded-xl font-semibold text-[15px] transition-all active:scale-[0.98] ${
                  plan.highlighted
                    ? "bg-white text-brand hover:bg-white/90 shadow-sm"
                    : "bg-neutral-900 text-white hover:bg-neutral-800 shadow-sm"
                }`}>
                  {plan.cta}
                </button>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  )
}
