import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Agente 1 — RFP Agent',
  description: 'Herramienta de cotización técnica para ES Metals',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  )
}
