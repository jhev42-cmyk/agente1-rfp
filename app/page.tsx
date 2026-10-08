import { redirect } from 'next/navigation'

// El middleware ya exige sesión para llegar aquí.
export default function Home() {
  redirect('/lineas')
}
