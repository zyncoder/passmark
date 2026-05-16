"use client"

import { AccreditationForm } from "@/components/AccreditationForm"
import { Button } from "@/components/ui/button"
import { Printer } from "lucide-react"
import { use } from "react"

export default function ViewFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  return (
    <div className="pb-32">
      <div className="max-w-3xl mx-auto flex justify-end mb-4 px-4 sm:px-0 print:hidden mt-4">
        <Button variant="secondary" onClick={() => window.print()}>
          <Printer className="w-4 h-4 mr-2" />
          Print Application
        </Button>
      </div>
      <div className="print:m-0 print:p-0">
        <AccreditationForm applicationId={id} isReadOnly={true} />
      </div>
    </div>
  )
}
