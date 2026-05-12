// PHYSICARE® — Import CSV de leads
// Format attendu: full_name, job_title, company_name, employee_count, industry,
// linkedin_profile_url, email, country
import { useState } from 'react'
import { upsertCompany, createLead } from '../../lib/leadsApi'
import { inferPersonaFromTitle, inferSeniority } from '../../lib/leadScoring'

const REQUIRED = ['full_name', 'company_name']

export default function ImportCsv() {
  const [rows, setRows] = useState([])
  const [headers, setHeaders] = useState([])
  const [progress, setProgress] = useState(null)
  const [error, setError] = useState(null)

  function onFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const { headers, rows } = parseCSV(String(reader.result))
        const missing = REQUIRED.filter(c => !headers.includes(c))
        if (missing.length) throw new Error(`Colonnes manquantes : ${missing.join(', ')}`)
        setHeaders(headers)
        setRows(rows)
        setError(null)
      } catch (e) {
        setError(e.message)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  async function runImport() {
    setProgress({ done: 0, total: rows.length, failed: 0 })
    let done = 0, failed = 0
    for (const r of rows) {
      try {
        const company = await upsertCompany({
          name: r.company_name,
          industry: r.industry || null,
          employee_count: r.employee_count ? Number(r.employee_count) : null,
          country: r.country || 'FR',
          linkedin_company_id: r.company_linkedin_id || null,
          website: r.website || null,
        })
        const [first, ...rest] = (r.full_name || '').split(' ')
        const lead = {
          company_id: company.id,
          full_name: r.full_name,
          first_name: r.first_name || first || null,
          last_name: r.last_name || rest.join(' ') || null,
          job_title: r.job_title || null,
          linkedin_profile_url: r.linkedin_profile_url || null,
          email_verified: r.email || null,
          email_status: r.email ? 'PENDING' : 'PENDING',
          persona_type: inferPersonaFromTitle(r.job_title || ''),
          seniority_level: inferSeniority(r.job_title || ''),
        }
        await createLead(lead, company, [])
        done++
      } catch (e) {
        failed++
      }
      setProgress({ done: done + failed, total: rows.length, failed })
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB', padding: '32px 28px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>
        <a href="/linkedin-prospection" style={{ color: '#7C3AED', fontWeight: 800, fontSize: 13 }}>← Pipeline</a>
        <h1 style={{ fontWeight: 900, fontSize: 28, color: '#4C1D95', marginTop: 6 }}>Import CSV</h1>

        <div style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 16, padding: 20, marginTop: 20 }}>
          <p style={{ fontSize: 14, color: '#374151', marginBottom: 10 }}>
            Colonnes attendues (séparateur <code>;</code> ou <code>,</code>) :
          </p>
          <code style={{ display: 'block', background: '#F3F4F6', padding: 10, borderRadius: 8, fontSize: 12 }}>
            full_name; job_title; company_name; employee_count; industry; linkedin_profile_url; email; country
          </code>

          <input type="file" accept=".csv,text/csv" onChange={onFile}
            style={{ marginTop: 16, padding: 8, fontSize: 14 }} />

          {error && <div style={{ color: '#DC2626', marginTop: 12 }}>{error}</div>}

          {rows.length > 0 && (
            <>
              <div style={{ marginTop: 16, color: '#6B7280', fontSize: 13 }}>
                {rows.length} ligne(s) détectée(s). Aperçu :
              </div>
              <div style={{ overflowX: 'auto', marginTop: 8 }}>
                <table style={{ width: '100%', fontSize: 12, borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>{headers.map(h => <th key={h} style={cell}>{h}</th>)}</tr>
                  </thead>
                  <tbody>
                    {rows.slice(0, 5).map((r, i) => (
                      <tr key={i}>{headers.map(h => <td key={h} style={cell}>{r[h]}</td>)}</tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={runImport} disabled={progress && progress.done < progress.total}
                style={{ marginTop: 16, padding: '12px 16px', background: '#58CC02', color: '#fff', fontWeight: 900, border: 'none', borderRadius: 10, cursor: 'pointer' }}>
                Importer {rows.length} leads
              </button>
              {progress && (
                <div style={{ marginTop: 12, fontSize: 13 }}>
                  {progress.done}/{progress.total} traités · {progress.failed} échecs
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const cell = { padding: '6px 8px', border: '1px solid #E5E7EB', textAlign: 'left' }

// Petit parseur CSV: gère les guillemets, virgule OU point-virgule.
export function parseCSV(text) {
  const cleaned = text.replace(/^﻿/, '')
  const firstLine = cleaned.split(/\r?\n/, 1)[0]
  const sep = (firstLine.split(';').length > firstLine.split(',').length) ? ';' : ','
  const lines = cleaned.split(/\r?\n/).filter(l => l.trim().length > 0)
  const split = (line) => {
    const out = []
    let cur = ''
    let inQ = false
    for (let i = 0; i < line.length; i++) {
      const c = line[i]
      if (c === '"') {
        if (inQ && line[i + 1] === '"') { cur += '"'; i++ }
        else inQ = !inQ
      } else if (c === sep && !inQ) {
        out.push(cur); cur = ''
      } else cur += c
    }
    out.push(cur)
    return out.map(s => s.trim())
  }
  const headers = split(lines[0]).map(h => h.trim().toLowerCase().replace(/\s+/g, '_'))
  const rows = lines.slice(1).map(line => {
    const vals = split(line)
    return Object.fromEntries(headers.map((h, i) => [h, vals[i] ?? '']))
  })
  return { headers, rows }
}
