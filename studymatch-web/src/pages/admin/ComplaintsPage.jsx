import { useState, useEffect } from 'react'
import { Loader2, ChevronDown } from 'lucide-react'
import api from '../../api/axiosInstance'

const STATUS_OPTS = ['open', 'reviewing', 'resolved', 'dismissed']

const STATUS_STYLE = {
  open:       { bg: '#FEE2E2', color: '#DC2626' },
  reviewing:  { bg: '#FEF3C7', color: '#92400E' },
  resolved:   { bg: '#DCFCE7', color: '#166534' },
  dismissed:  { bg: '#F3F4F6', color: '#6B7280' },
}

const PRIORITY_STYLE = {
  low:    { bg: '#F0FDF4', color: '#166534' },
  medium: { bg: '#FEF3C7', color: '#92400E' },
  high:   { bg: '#FEE2E2', color: '#DC2626' },
}

export default function AdminComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('')
  const [updating,   setUpdating]   = useState(null)
  const [expanded,   setExpanded]   = useState(null)
  const [notes,      setNotes]      = useState({})
  const [msg,        setMsg]        = useState('')

  const load = async (status = '') => {
    setLoading(true)
    try {
      const params = status ? { status } : {}
      const res = await api.get('/admin/complaints', { params })
      const d = res?.data?.data || []
      setComplaints(Array.isArray(d) ? d : [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleFilter = (val) => {
    setFilter(val)
    load(val)
  }

  const updateStatus = async (id, status) => {
    setUpdating(id)
    try {
      await api.put(`/admin/complaints/${id}`, { status, resolution_notes: notes[id] || '' })
      setMsg('Complaint updated.')
      load(filter)
    } catch { setMsg('Update failed.') }
    finally { setUpdating(null); setTimeout(() => setMsg(''), 3000) }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 }}>Complaints</h1>

      {msg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 13.5, color: '#10B981' }}>
          {msg}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[{ label: 'All', value: '' }, ...STATUS_OPTS.map(s => ({ label: s.charAt(0).toUpperCase() + s.slice(1), value: s }))].map(({ label, value }) => (
          <button key={value} onClick={() => handleFilter(value)} style={{
            padding: '7px 16px', borderRadius: 9, border: '1px solid',
            borderColor: filter === value ? '#7C3AED' : '#E5E7EB',
            background: filter === value ? '#F3F0FF' : 'white',
            color: filter === value ? '#7C3AED' : '#6B7280',
            fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
          }}>
            {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={26} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : complaints.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF', background: 'white', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          No complaints found
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {complaints.map((c) => {
            const ss = STATUS_STYLE[c.status]  || STATUS_STYLE.open
            const ps = PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.medium
            const submitter = c.submitted_by?.name || c.submittedBy?.name || 'Unknown'
            const date = c.created_at
              ? new Date(c.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
              : ''
            const isOpen = expanded === c.id

            return (
              <div key={c.id} style={{ background: 'white', border: '1px solid #E5E7EB', borderRadius: 16, overflow: 'hidden' }}>
                {/* Row */}
                <div
                  onClick={() => setExpanded(isOpen ? null : c.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '18px 24px', cursor: 'pointer' }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#111827', marginBottom: 4 }}>{c.subject}</div>
                    <div style={{ fontSize: 13, color: '#6B7280' }}>
                      By <strong>{submitter}</strong>{date && ` · ${date}`}
                    </div>
                  </div>

                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                    <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: ps.bg, color: ps.color }}>
                      {c.priority}
                    </span>
                    <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: ss.bg, color: ss.color }}>
                      {c.status}
                    </span>
                    <ChevronDown size={16} color="#9CA3AF" style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
                  </div>
                </div>

                {/* Expanded */}
                {isOpen && (
                  <div style={{ padding: '0 24px 20px', borderTop: '1px solid #F3F4F6' }}>
                    <p style={{ fontSize: 14, color: '#374151', lineHeight: 1.6, marginTop: 16, marginBottom: 16 }}>
                      {c.description}
                    </p>

                    <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <label style={{ fontSize: 12, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                          Resolution Notes
                        </label>
                        <textarea
                          rows={3}
                          value={notes[c.id] || c.resolution_notes || ''}
                          onChange={e => setNotes(p => ({ ...p, [c.id]: e.target.value }))}
                          placeholder="Add resolution notes..."
                          style={{
                            width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB',
                            borderRadius: 9, fontSize: 13.5, outline: 'none', resize: 'vertical',
                            fontFamily: 'inherit', color: '#374151',
                          }}
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 22 }}>
                        {STATUS_OPTS.filter(s => s !== c.status).map(s => {
                          const st = STATUS_STYLE[s]
                          return (
                            <button
                              key={s}
                              onClick={() => updateStatus(c.id, s)}
                              disabled={updating === c.id}
                              style={{
                                display: 'flex', alignItems: 'center', gap: 6,
                                padding: '8px 16px', background: st.bg, color: st.color,
                                border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700,
                                cursor: updating === c.id ? 'not-allowed' : 'pointer',
                                fontFamily: 'inherit', opacity: updating === c.id ? 0.6 : 1,
                              }}
                            >
                              {updating === c.id && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                              Mark {s.charAt(0).toUpperCase() + s.slice(1)}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
