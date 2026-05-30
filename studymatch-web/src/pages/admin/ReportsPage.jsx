import { useState, useEffect } from 'react'
import { Loader2 } from 'lucide-react'
import api from '../../api/axiosInstance'

const STATUS_STYLE = {
  open:       { bg: '#FEF3C7', color: '#92400E', label: 'Pending'   },
  reviewing:  { bg: '#DBEAFE', color: '#1E40AF', label: 'Reviewing' },
  resolved:   { bg: '#DCFCE7', color: '#166534', label: 'Resolved'  },
  dismissed:  { bg: '#F3F4F6', color: '#6B7280', label: 'Dismissed' },
}

const PRIORITY_STYLE = {
  low:    { bg: '#F0FDF4', color: '#166534' },
  medium: { bg: '#FEF3C7', color: '#92400E' },
  high:   { bg: '#FEE2E2', color: '#DC2626' },
}

export default function ReportsPage() {
  const [complaints, setComplaints] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [filter,     setFilter]     = useState('')
  const [selected,   setSelected]   = useState(null)
  const [notes,      setNotes]      = useState('')
  const [updating,   setUpdating]   = useState(false)
  const [msg,        setMsg]        = useState('')
  const [suspending, setSuspending] = useState(false)

  const load = async (status = '') => {
    setLoading(true)
    try {
      const params = status ? { status } : {}
      const res = await api.get('/admin/complaints', { params })
      const raw = res?.data
      // handle both paginated ({data: [...]}) and flat array
      const list = Array.isArray(raw?.data) ? raw.data
        : Array.isArray(raw) ? raw
        : []
      setComplaints(list)
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleFilter = (val) => {
    setFilter(val)
    load(val)
  }

  const updateStatus = async (id, status) => {
    setUpdating(true)
    try {
      await api.put(`/admin/complaints/${id}`, {
        status,
        resolution_notes: notes,
      })
      setMsg(`Complaint marked as ${status}.`)
      setSelected(null)
      setNotes('')
      load(filter)
    } catch {
      setMsg('Update failed.')
    } finally {
      setUpdating(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const handleSuspend = async (userId) => {
    if (!userId) return
    if (!confirm('Suspend this user?')) return
    setSuspending(true)
    try {
      await api.post(`/admin/users/${userId}/suspend`)
      setMsg('User suspended.')
    } catch {
      setMsg('Failed to suspend user.')
    } finally {
      setSuspending(false)
      setTimeout(() => setMsg(''), 3000)
    }
  }

  const filters = [
    { label: 'All',        value: ''          },
    { label: 'Pending',    value: 'open'      },
    { label: 'Reviewing',  value: 'reviewing' },
    { label: 'Resolved',   value: 'resolved'  },
    { label: 'Dismissed',  value: 'dismissed' },
  ]

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>
        Reports Moderation
      </h1>
      <p style={{ fontSize: 13.5, color: '#9CA3AF', marginBottom: 24 }}>
        Review and act on user-submitted reports
      </p>

      {msg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 13.5, color: '#10B981' }}>
          {msg}
        </div>
      )}

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
        {filters.map(f => (
          <button
            key={f.value}
            onClick={() => handleFilter(f.value)}
            style={{
              padding: '7px 16px', borderRadius: 9, border: '1.5px solid',
              borderColor: filter === f.value ? '#7C3AED' : '#E5E7EB',
              background:  filter === f.value ? '#F3F0FF' : 'white',
              color:       filter === f.value ? '#7C3AED' : '#6B7280',
              fontWeight: 600, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
            }}
          >
            {f.label}
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
          No reports found
        </div>
      ) : (
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {/* Table header */}
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr 1.5fr', padding: '14px 24px', background: '#F9FAFB', fontWeight: 600, color: '#374151', fontSize: 13.5, borderBottom: '1px solid #E5E7EB' }}>
            <div>Reporter</div>
            <div>Reported User</div>
            <div>Reason</div>
            <div>Priority</div>
            <div>Status</div>
            <div>Actions</div>
          </div>

          {complaints.map((c) => {
            const ss = STATUS_STYLE[c.status]   || STATUS_STYLE.open
            const ps = PRIORITY_STYLE[c.priority] || PRIORITY_STYLE.medium
            const reporter = c.submitted_by?.name || c.submittedBy?.name || 'Unknown'
            const reported = c.reported_user?.name || c.reportedUser?.name || '—'

            return (
              <div key={c.id} style={{ borderTop: '1px solid #F3F4F6' }}>
                {/* Row */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr 1fr 1.5fr', padding: '16px 24px', alignItems: 'center' }}>
                  <div style={{ fontWeight: 600, color: '#111827', fontSize: 14 }}>{reporter}</div>
                  <div style={{ color: '#374151', fontSize: 14 }}>{reported}</div>
                  <div style={{ color: '#374151', fontSize: 14 }}>{c.subject}</div>
                  <div>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: ps.bg, color: ps.color }}>
                      {c.priority}
                    </span>
                  </div>
                  <div>
                    <span style={{ padding: '3px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: ss.bg, color: ss.color }}>
                      {ss.label}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => { setSelected(selected === c.id ? null : c.id); setNotes(c.resolution_notes || '') }}
                      style={{ background: '#F3F0FF', color: '#7C3AED', border: 'none', borderRadius: 9, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}
                    >
                      Review
                    </button>
                    <button
                      onClick={() => handleSuspend(c.reported_user_id)}
                      disabled={suspending || !c.reported_user_id}
                      style={{ background: '#FEE2E2', color: '#DC2626', border: 'none', borderRadius: 9, padding: '7px 14px', cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit', opacity: !c.reported_user_id ? 0.4 : 1 }}
                    >
                      Suspend
                    </button>
                  </div>
                </div>

                {/* Expanded review panel */}
                {selected === c.id && (
                  <div style={{ margin: '0 24px 20px', padding: '16px', background: '#F9FAFB', borderRadius: 12, border: '1px solid #E5E7EB' }}>
                    <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.7, marginBottom: 14 }}>
                      <strong>Description:</strong> {c.description}
                    </p>
                    {c.resolution_notes && (
                      <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 14 }}>
                        <strong>Previous notes:</strong> {c.resolution_notes}
                      </p>
                    )}
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={e => setNotes(e.target.value)}
                      placeholder="Add resolution notes..."
                      style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #E5E7EB', borderRadius: 9, fontSize: 13.5, outline: 'none', resize: 'vertical', fontFamily: 'inherit', color: '#374151', marginBottom: 12 }}
                    />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {['reviewing', 'resolved', 'dismissed'].filter(s => s !== c.status).map(s => {
                        const st = STATUS_STYLE[s]
                        return (
                          <button
                            key={s}
                            onClick={() => updateStatus(c.id, s)}
                            disabled={updating}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: st.bg, color: st.color, border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: updating ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}
                          >
                            {updating && <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />}
                            Mark {st.label}
                          </button>
                        )
                      })}
                      <button
                        onClick={() => setSelected(null)}
                        style={{ padding: '8px 16px', background: 'white', border: '1px solid #E5E7EB', color: '#6B7280', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                      >
                        Close
                      </button>
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
