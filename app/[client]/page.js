import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import ClientApp from '@/components/ClientApp'

// Page dynamique : /optical-center → app Physicare pour ce client
export default async function ClientPage({ params }) {
  const { client } = params

  // Vérifier que ce client existe en base
  const { data, error } = await supabase
    .from('clients')
    .select('*')
    .eq('slug', client)
    .eq('actif', true)
    .single()

  if (error || !data) {
    notFound()
  }

  return <ClientApp client={data} />
}

// Générer les métadonnées dynamiques par client
export async function generateMetadata({ params }) {
  const { data } = await supabase
    .from('clients')
    .select('nom')
    .eq('slug', params.client)
    .single()

  return {
    title: `PHYSICARE® × ${data?.nom || 'Formation'} — Santé Comportementale`,
  }
}
