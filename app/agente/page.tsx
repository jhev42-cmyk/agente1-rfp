import { redirect } from 'next/navigation'

export default function AgentePage() {
  // Redirige al archivo HTML estático en public
  redirect('/agente.html')
}
