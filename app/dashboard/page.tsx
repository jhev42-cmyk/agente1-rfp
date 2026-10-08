import { redirect } from 'next/navigation'

// El antiguo panel de cotizaciones fue reemplazado por el módulo de líneas.
export default function DashboardPage() {
  redirect('/lineas')
}
