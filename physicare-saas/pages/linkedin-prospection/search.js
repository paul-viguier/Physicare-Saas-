// PHYSICARE® — Page de recherche de prospects
// Critères ICP (poste, taille, secteur, pays) → résultats + actions création.
import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../lib/supabase'
import { createLead, upsertCompany } from '../../lib/leadsApi'
import { computeLeadScore, inferPersonaFromTitle, inferSeniority } from '../../lib/leadScoring'
import LeadCard from '../../components/LeadCard'

const SECTORS = [
  'Retail','Insurance','Banking','Industry','Healthcare',
  'Transport','Construction','Technology','Services','Other',
]
const COUNTRIES = ['FR','BE','CH','LU']
const TITLES = [
  'DRH','Chief People Officer','Directeur Ressources Humaines',
  'Responsable QVCT','Chief Happiness Officer','Responsable Bien-être',
  'Responsable Formation','L&D Manager','Médecin du travail','Responsable HSE',
]

export default function ProspectSearch() {
  const [session, setSession] = useState(null)
  const [form, setForm] = useState({
    title: '',
    industry: '',
    countryMin: 'FR',
    sizeMin: 250,
    sizeMax: 10000,
  })
  const [results, setResults] = useState([])
  const [running, setRunning] = useState(false)
  const [savedIds, setSavedIds] = useState(new Set())
  const [error, setError] = useState(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
  }, [])

  async function runSearch(e) {
    e.preventDefault()
    setError(null)
    setRunning(true)
    try {
      const res = await fetch('/api/prospects/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error((await res.json()).error || 'Recherche échouée')
      const data = await res.json()
      setResults(data.results || [])
    } catch (e) {
      setError(e.message)
    } finally {
      setRunning(false)
    }
  }

  async function saveLead(candidate) {
    try {
      const company = await upsertCompany({
        linkedin_company_id: candidate.company.linkedin_company_id,
        name: candidate.company.name,
        industry: candidate.company.industry,
        employee_count: candidate.company.employee_count,
        country: candidate.company.country,
        website: candidate.company.website,
      })
      const persona = inferPersonaFromTitle(candidate.job_title)
      const lead = {
        company_id: company.id,
        linkedin_profile_url: candidate.linkedin_profile_url,
        full_name: candidate.full_name,
        first_name: candidate.first_name,
        last_name: candidate.last_name,
        job_title: candidate.job_title,
        persona_type: persona,
        seniority_level: inferSeniority(candidate.job_title),
        email_status: 'PENDING',
      }
      await createLead(lead, company, [])
      setSavedIds(prev => new Set(prev).add(candidate.id))
    } catch (e) {
      setError(e.message)
    }
  }

  const previews = useMemo(() => results.map(c => {
    const persona = inferPersonaFromTitle(c.job_title)
    const { score } = computeLeadScore(
      { persona_type: persona, email_status: 'PENDING' },
      c.company,
      [],
    )
    return { ...c, persona_type: persona, lead_score: score }
  }), [results])

  if (!session) {
    return <Centered>Veuillez vous <a href="/linkedin-prospection" style={{ color: '#7C3AED' }}>connecter</a>.</Centered>
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 1280, margin: '0 auto' }}>
        <header style={{ marginBottom: 20 }}>
          <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
          <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Recherche de prospects</h1>
          <p style={{ color: '#6B7280', fontSize: 14 }}>Définissez vos critères ICP, PHYSICARE® calcule le LSP en temps réel.</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 20 }}>
          <form onSubmit={runSearch} style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 18, height: 'fit-content' }}>
            <Field label="Intitulé de poste">
              <input list="titles" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })}
                placeholder="ex. DRH, Chief Happiness Officer" style={input} />
              <datalist id="titles">{TITLES.map(t => <option key={t} value={t} />)}</datalist>
            </Field>
            <Field label="Secteur">
              <select value={form.industry} onChange={e => setForm({ ...form, industry: e.target.value })} style={input}>
                <option value="">Tous secteurs</option>
                {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </Field>
            <Field label="Pays">
              <select value={form.countryMin} onChange={e => setForm({ ...form, countryMin: e.target.value })} style={input}>
                {COUNTRIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label={`Effectif : ${form.sizeMin}–${form.sizeMax}`}>
              <input type="number" min={50} step={50} value={form.sizeMin}
                onChange={e => setForm({ ...form, sizeMin: Number(e.target.value) })} style={input} />
              <input type="number" min={form.sizeMin} step={500} value={form.sizeMax}
                onChange={e => setForm({ ...form, sizeMax: Number(e.target.value) })} style={{ ...input, marginTop: 6 }} />
            </Field>
            <button type="submit" disabled={running} style={primaryBtn}>
              {running ? 'Recherche…' : '🔎 Lancer la recherche'}
            </button>
            {error && <div style={{ color: '#DC2626', fontSize: 13, marginTop: 10 }}>{error}</div>}
            <div style={{ marginTop: 12, fontSize: 11, color: '#6B7280' }}>
              ⚠️ Données issues d'APIs partenaires conformes RGPD (Dropcontact / Apollo). Aucun scraping LinkedIn direct.
            </div>
          </form>

          <div>
            <div style={{ marginBottom: 10, color: '#6B7280', fontSize: 13 }}>
              {previews.length} résultats — triés par LSP décroissant
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              {previews
                .sort((a, b) => b.lead_score - a.lead_score)
                .map(p => (
                <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 10, alignItems: 'center' }}>
                  <LeadCard lead={p} company={p.company} />
                  <button
                    onClick={() => saveLead(p)}
                    disabled={savedIds.has(p.id)}
                    style={{
                      ...primaryBtn,
                      background: savedIds.has(p.id) ? '#9CA3AF' : '#58CC02',
                      width: 130,
                    }}>
                    {savedIds.has(p.id) ? '✓ Ajouté' : '＋ Ajouter'}
                  </button>
                </div>
              ))}
              {previews.length === 0 && !running && (
                <div style={{ background: '#F5F3FF', border: '1px dashed #C4B5FD', borderRadius: 14, padding: 30, textAlign: 'center', color: '#6B7280' }}>
                  Lancez une recherche pour voir les candidats.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }) {
  return (
    <label style={{ display: 'block', marginBottom: 14 }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#374151', marginBottom: 6 }}>{label}</div>
      {children}
    </label>
  )
}
function Centered({ children }) {
  return <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', color: '#6B7280' }}>{children}</div>
}

const input = { width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #D1D5DB', fontSize: 14 }
const primaryBtn = { padding: '12px 14px', background: '#7C3AED', color: '#fff', fontWeight: 900, border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, width: '100%' }
