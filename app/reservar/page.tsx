import { redirect } from "next/navigation";

// La página de reservas ahora vive en /negocio/[slug]
export default function ReservarPage() {
  redirect("/registro-negocio");
}
