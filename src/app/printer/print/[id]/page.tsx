"use client"

import * as React from "react"
import { createClient } from "@/utils/supabase/client"

export default function PrintCardPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const supabase = createClient()
  const [id, setId] = React.useState<string | null>(null)
  const [cred, setCred] = React.useState<any>(null)
  const [zones, setZones] = React.useState<string[]>([])
  const printedOnce = React.useRef(false)

  React.useEffect(() => {
    params.then((p) => setId(p.id))
  }, [params])

  React.useEffect(() => {
    if (!id) return
    async function load() {
      const { data } = await supabase
        .from("credentials")
        .select(`
          id, qr_data_url, serial_number, print_status,
          applications ( first_name, last_name, designation, photo_url, vendor_profiles ( org_name ) )
        `)
        .eq("id", id)
        .single()
      setCred(data)
      const { data: cz } = await supabase
        .from("credential_zones")
        .select("zones ( name )")
        .eq("credential_id", id)
      setZones((cz || []).map((z: any) => z.zones?.name).filter(Boolean))
    }
    load()
  }, [id, supabase])

  // Auto-open the print dialog after the layout renders.
  React.useEffect(() => {
    if (!cred || printedOnce.current) return
    printedOnce.current = true
    const t = setTimeout(() => window.print(), 350)
    return () => clearTimeout(t)
  }, [cred])

  if (!cred) return <div className="p-8">Preparing card...</div>

  const a = cred.applications

  return (
    <div className="min-h-screen bg-neutral-100 p-8 print:p-0 print:bg-white">
      <div className="print:hidden max-w-md mx-auto mb-6 text-center">
        <h1 className="text-lg font-semibold">Print preview</h1>
        <p className="text-[13px] text-neutral-600">
          Card sized 85×54&nbsp;mm (CR80). Use your printer's actual-size setting.
        </p>
        <button
          onClick={() => window.print()}
          className="mt-3 px-4 py-2 rounded-lg bg-brand text-white text-[14px] font-medium"
        >
          Print again
        </button>
      </div>

      <div className="card-sheet">
        {/* Front */}
        <div className="card-face card-front">
          <div className="card-header">
            <span className="card-org">{a?.vendor_profiles?.org_name ?? "PASSMARK"}</span>
            <span className="card-tag">ACCREDITED</span>
          </div>
          <div className="card-body">
            <div className="card-photo">
              {a?.photo_url ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={a.photo_url} alt="" />
              ) : (
                <div className="card-no-photo">No photo</div>
              )}
            </div>
            <div className="card-info">
              <p className="card-name">
                {a?.first_name} {a?.last_name}
              </p>
              <p className="card-designation">{a?.designation || ""}</p>
              <div className="card-chips">
                {zones.map((z, i) => (
                  <span key={i} className="card-chip">{z}</span>
                ))}
              </div>
            </div>
          </div>
          <div className="card-footer">
            {cred.qr_data_url && (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img src={cred.qr_data_url} alt="QR" className="card-qr" />
            )}
            <div className="card-meta">
              <p>Credential</p>
              <p className="card-serial">
                {cred.serial_number ?? cred.id.split("-")[0].toUpperCase()}
              </p>
            </div>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .card-sheet {
          display: flex;
          justify-content: center;
        }
        .card-face {
          width: 85mm;
          height: 54mm;
          background: #ffffff;
          border: 0.3mm solid #d6d8e0;
          border-radius: 3mm;
          padding: 3mm;
          color: #0f172a;
          font-family: var(--font-jakarta), system-ui, sans-serif;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.08);
        }
        .card-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 2.2mm;
          font-weight: 700;
          letter-spacing: 0.5px;
          text-transform: uppercase;
          color: #1b4fd8;
        }
        .card-tag {
          background: #1b4fd8;
          color: white;
          padding: 0.4mm 1.2mm;
          border-radius: 1mm;
          font-size: 1.8mm;
          letter-spacing: 0.8px;
        }
        .card-body {
          display: flex;
          gap: 2.5mm;
        }
        .card-photo {
          width: 18mm;
          height: 22mm;
          background: #eef0f6;
          border-radius: 1.5mm;
          overflow: hidden;
        }
        .card-photo img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .card-no-photo {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 2mm;
          color: #94a3b8;
        }
        .card-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 0.8mm;
        }
        .card-name {
          font-size: 4mm;
          font-weight: 700;
          line-height: 1.05;
        }
        .card-designation {
          font-size: 2.6mm;
          color: #475569;
        }
        .card-chips {
          display: flex;
          flex-wrap: wrap;
          gap: 0.8mm;
          margin-top: 0.8mm;
        }
        .card-chip {
          font-size: 1.8mm;
          padding: 0.4mm 1.2mm;
          background: #eef0f6;
          color: #0f172a;
          border-radius: 0.8mm;
          font-weight: 600;
        }
        .card-footer {
          display: flex;
          align-items: flex-end;
          justify-content: space-between;
        }
        .card-qr {
          width: 14mm;
          height: 14mm;
        }
        .card-meta {
          text-align: right;
          font-size: 2mm;
          color: #475569;
        }
        .card-serial {
          font-size: 2.4mm;
          font-weight: 700;
          color: #0f172a;
          font-family: ui-monospace, "SFMono-Regular", monospace;
        }
        @media print {
          @page {
            size: 85mm 54mm;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #ffffff !important;
          }
          body * { visibility: hidden !important; }
          .card-sheet, .card-sheet * { visibility: visible !important; }
          .card-sheet {
            position: fixed;
            top: 0;
            left: 0;
            width: 85mm;
            height: 54mm;
            margin: 0;
          }
          .card-face {
            box-shadow: none !important;
            border-radius: 0 !important;
            border: none !important;
            width: 85mm !important;
            height: 54mm !important;
          }
        }
      `}</style>
    </div>
  )
}
