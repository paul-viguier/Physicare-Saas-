// PHYSICARE® — <LeadCard /> avec scoring visuel LSP
import { classifyLead } from '../lib/leadScoring'

const PERSONA_LABEL = {
  DECIDEUR: 'Décideur',
  SPONSOR_QVCT: 'Sponsor QVCT',
  ACHETEUR_FORMATION: 'Acheteur formation',
  PRESCRIPTEUR_SANTE: 'Prescripteur santé',
  SPONSOR_CLEVEL: 'Sponsor C-level',
}

const STATUS_LABEL = {
  NEW: 'Nouveau',
  CONTACTED: 'Contacté',
  REPLIED: 'A répondu',
  MEETING_BOOKED: 'RDV planifié',
  OPPORTUNITY: 'Opportunité',
  CUSTOMER: 'Client',
  LOST: 'Perdu',
  DNC: 'Do not contact',
}

export default function LeadCard({ lead, company, onClick }) {
  const score = Number(lead.lead_score) || 0
  const tier = classifyLead(score)

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        textAlign: 'left',
        width: '100%',
        background: '#fff',
        border: '1px solid #E5E7EB',
        borderLeft: `6px solid ${tier.color}`,
        borderRadius: 14,
        padding: '16px 18px',
        cursor: 'pointer',
        boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
        transition: 'transform .12s ease, box-shadow .12s ease',
      }}
      onMouseEnter={(e) => { e.currentTarget.style.boxShadow = '0 6px 16px rgba(124,58,237,.12)' }}
      onMouseLeave={(e) => { e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.04)' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ minWidth: 0, flex: 1 }}>
          <div style={{ fontWeight: 900, fontSize: 16, color: '#111827', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {lead.full_name}
          </div>
          <div style={{ fontSize: 13, color: '#6B7280', marginTop: 2 }}>
            {lead.job_title || '—'}
          </div>
          {company?.name && (
            <div style={{ fontSize: 13, color: '#374151', marginTop: 6, fontWeight: 700 }}>
              {company.name}
              {company.employee_count ? ` · ${company.employee_count.toLocaleString('fr-FR')} salariés` : ''}
              {company.industry ? ` · ${company.industry}` : ''}
            </div>
          )}
        </div>

        <div style={{
          background: tier.bg,
          color: tier.color,
          borderRadius: 10,
          padding: '8px 10px',
          minWidth: 70,
          textAlign: 'center',
          fontWeight: 900,
        }}>
          <div style={{ fontSize: 11, opacity: .85 }}>{tier.emoji} LSP</div>
          <div style={{ fontSize: 22, lineHeight: 1 }}>{score}</div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
        {lead.persona_type && (
          <Tag color="#7C3AED" bg="#EDE9FE">{PERSONA_LABEL[lead.persona_type] || lead.persona_type}</Tag>
        )}
        {lead.status && (
          <Tag color="#111827" bg="#F3F4F6">{STATUS_LABEL[lead.status] || lead.status}</Tag>
        )}
        {lead.recent_job_change && <Tag color="#1CB0F6" bg="#EFF6FF">⏱ Nouveau poste</Tag>}
        {lead.email_status === 'VERIFIED' && <Tag color="#058C42" bg="#EAF8DC">✓ Email vérifié</Tag>}
        {lead.email_status === 'INVALID' && <Tag color="#DC2626" bg="#FEF2F2">⚠ Email invalide</Tag>}
        {lead.unsubscribed_at && <Tag color="#6B7280" bg="#F3F4F6">🚫 Désabonné</Tag>}
      </div>

      <div style={{ marginTop: 10, fontSize: 12, color: '#6B7280' }}>{tier.cta}</div>
    </button>
  )
}

function Tag({ children, color, bg }) {
  return (
    <span style={{
      background: bg,
      color,
      fontSize: 11,
      fontWeight: 800,
      padding: '4px 8px',
      borderRadius: 999,
    }}>{children}</span>
  )
}
