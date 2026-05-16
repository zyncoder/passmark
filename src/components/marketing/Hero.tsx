"use client"

import * as React from "react"
import { motion } from "framer-motion"
import Link from "next/link"
import { CheckCircle2, Clock, ShieldCheck, ArrowRight } from "lucide-react"

/* ── Mini dashboard mockup built with real components ── */
function DashboardMockup() {
  return (
    <div className="w-full max-w-[520px] bg-white rounded-2xl border border-neutral-200/80 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.1)] overflow-hidden">
      {/* Title bar */}
      <div className="flex items-center gap-2 px-5 py-3 border-b border-neutral-100 bg-neutral-50/50">
        <div className="flex gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-red-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
          <span className="w-2.5 h-2.5 rounded-full bg-green-400" />
        </div>
        <div className="flex-1 text-center">
          <span className="text-[11px] text-neutral-400 font-medium">passmark.in/admin/dashboard</span>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 divide-x divide-neutral-100 border-b border-neutral-100">
        {[
          { label: "Total Applications", value: "1,248", change: "+12.5%", up: true },
          { label: "Approved", value: "943", change: "+8.2%", up: true },
          { label: "Pending Review", value: "67", change: "-4.1%", up: false },
        ].map((stat, i) => (
          <div key={i} className="px-4 py-4">
            <p className="text-[10px] text-neutral-400 font-medium uppercase tracking-wider">{stat.label}</p>
            <p className="text-xl font-bold text-neutral-900 mt-1">{stat.value}</p>
            <p className={`text-[11px] font-medium mt-0.5 ${stat.up ? 'text-green-600' : 'text-red-500'}`}>
              {stat.change}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Applications */}
      <div className="px-4 py-3">
        <p className="text-[11px] text-neutral-400 font-semibold uppercase tracking-wider mb-3">Recent Applications</p>
        <div className="space-y-2">
          {[
            { name: "Sarah Mitchell", org: "Reuters", status: "approved", time: "2m ago" },
            { name: "Raj Patel", org: "NDTV", status: "pending", time: "8m ago" },
            { name: "Emily Zhang", org: "Bloomberg", status: "approved", time: "14m ago" },
          ].map((app, i) => (
            <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-neutral-50 transition-colors">
              <div className="w-8 h-8 rounded-full bg-neutral-100 flex items-center justify-center text-xs font-bold text-neutral-600 shrink-0">
                {app.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-neutral-900 truncate">{app.name}</p>
                <p className="text-[11px] text-neutral-400">{app.org} · {app.time}</p>
              </div>
              {app.status === 'approved' ? (
                <span className="flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" /> Approved
                </span>
              ) : (
                <span className="flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                  <Clock className="w-3 h-3" /> Pending
                </span>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  return (
    <section className="relative bg-[#FAFAFA] overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 pt-28 pb-20 md:pt-40 md:pb-28 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        {/* ── Left: Copy ── */}
        <div className="relative z-10 max-w-xl">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 text-[13px] font-medium text-neutral-500 mb-8"
          >
            <ShieldCheck className="w-4 h-4 text-green-500" />
            Real-time accreditation management & vendor analytics
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="text-[44px] md:text-[56px] font-bold tracking-[-0.02em] text-neutral-900 leading-[1.1] mb-6"
          >
            The operating{" "}
            <span className="text-neutral-300">system</span>
            <br />
            for active events
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-[17px] text-neutral-500 leading-[1.7] mb-10"
          >
            Unified control over vendor accreditations, access zones, and credential workflows — built for modern event organizers.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="flex items-center gap-4"
          >
            <Link href="/login">
              <button className="h-[50px] px-8 rounded-full bg-neutral-900 text-white font-medium text-[15px] hover:bg-neutral-800 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.1)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.15)] active:scale-[0.98]">
                Get started
              </button>
            </Link>
            <Link href="/admin/login">
              <button className="group h-[50px] px-8 rounded-full bg-white border border-neutral-200 text-neutral-700 font-medium text-[15px] hover:border-neutral-300 hover:text-neutral-900 transition-all flex items-center gap-2">
                View Live Demo
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </Link>
          </motion.div>
        </div>

        {/* ── Right: Dashboard Mockup ── */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.6 }}
          className="relative flex justify-center lg:justify-end"
        >
          <DashboardMockup />
        </motion.div>
      </div>

      {/* Decorative gradient blob */}
      <div className="absolute top-1/2 right-0 w-[600px] h-[600px] bg-blue-100/40 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/3 pointer-events-none" />
    </section>
  )
}
