import { AccreditationForm } from "@/components/AccreditationForm"

export default async function EditFormPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <AccreditationForm applicationId={id} />
}
