import { useState, useEffect, useRef, useCallback } from 'react'
import { getMyComplaints, submitComplaint } from '../../api/complaints'
import api from '../../api/axiosInstance'
import { Flag, Send, CheckCircle, Loader2, AlertTriangle, Search, X, User } from 'lucide-react'

const CATEGORIES = ['Harassment', 'Spam', 'Inappropriate Content', 'Academic Misconduct', 'Cheating', 'Other']

function formatDate(ts) {
  if (!ts) return ''
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

const STATUS_MAP = {
  pending:   { label: 'Pending',   color: '#F59E0B', bg: '#FFFBEB' },
  open:      { label: 'Open',      color: '#EF4444', bg: '#FEF2F2' },
  reviewed:  { label: 'Reviewed',  color: '#6366F1', bg: '#EEF2FF' },
  resolved:  { label: 'Resolved',  color: '#10B981', bg: '#F0FDF4' },
  dismissed: { label: 'Dismissed', color: '#6B7280', bg: '#F9FAFB' },
}

/* ─── User Search Picker ─────────────────────────────────────── */

function UserPicker({ value, onChange }) {
  const [query,       setQuery]       = useState('')
  const [results,     setResults]     = useState([])
  const [searching,   setSearching]   = useState(false)
  const [open,        setOpen]        = useState(false)
  const [selected,    setSelected]    = useState(null)
  const ref  = useRef(null)
  const debounceRef = useRef(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const search = useCallback(async (q) => {
    if (q.length < 2) { setResults([]); setOpen(false); return }
    setSearching(true)
    try {
      const res = await api.get('/users/search', { params: { q } })
      setResults(res.data?.users || [])
      setOpen(true)
    } catch {
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  const handleInput = (e) => {
    const q = e.target.value
    setQuery(q)
    setSelected(null)
    onChange(null)
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => search(q), 300)
  }

  const handleSelect = (user) => {
    setSelected(user)
    setQuery(user.name)
    setOpen(false)
    setResults([])
    onChange(user.id)
  }

  const handleClear = () => {
    setSelected(null)
    setQuery('')
    onChange(null)
    setResults([])
    setOpen(false)
  }

  const initials = (name) =>
    (name || '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  const roleColor = (role) => {
    if (role === 'tutor')   return { bg: '#ECFDF5', text: '#059669' }
    if (role === 'student') return { bg: '#EEF2FF', text: '#4F46E5' }
    return { bg: '#F3F4F6', text: '#6B7280' }
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8,
        border: `1.5px solid ${selected ? '#7C3AED' : '#E5E7EB'}`,
        borderRadius: 10, padding: '0 12px',
        background: selected ? '#FAFAFF' : 'white',
        transition: 'border-color .15s',
      }}>
        {selected ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, padding: '8px 0' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%',
              background: '#EDE9FE', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: 11, color: '#7C3AED',
              flexShrink: 0,
            }}>
              {initials(selected.name)}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1E1B4B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {selected.name}
              </div>
              <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>
                {selected.email} · <span style={{ textTransform: 'capitalize' }}>{selected.role}</span>
              </div>
            </div>
          </div>
        ) : (
          <>
            <Search size={15} color="#9CA3AF" style={{ flexShrink: 0 }} />
            <input
              type="text"
              value={query}
              onChange={handleInput}
              onFocus={() => query.length >= 2 && setOpen(true)}
              placeholder="Search by name or email..."
              style={{
                flex: 1, border: 'none', outline: 'none',
                fontSize: 14, color: '#374151',
                fontFamily: 'DM Sans, sans-serif',
                padding: '10px 0', background: 'transparent',
              }}
            />
          </>
        )}
        {(selected || query) && (
          <button onClick={handleClear} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 2, display: 'flex', flexShrink: 0 }}>
            <X size={14} color="#9CA3AF" />
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0,
          background: 'white', border: '1px solid #E5E7EB', borderRadius: 12,
          boxShadow: '0 8px 28px rgba(0,0,0,.10)', zIndex: 100, overflow: 'hidden',
          animation: 'cpIn .12s ease',
        }}>
          {searching ? (
            <div style={{ padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 8, color: '#9CA3AF', fontSize: 13 }}>
              <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Searching...
            </div>
          ) : results.length === 0 ? (
            <div style={{ padding: '14px 16px', color: '#9CA3AF', fontSize: 13, textAlign: 'center' }}>
              No users found for "{query}"
            </div>
          ) : results.map(user => {
            const rc = roleColor(user.role)
            return (
              <div
                key={user.id}
                onClick={() => handleSelect(user)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px', cursor: 'pointer',
                  borderBottom: '1px solid #F8F9FB', transition: 'background .12s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#F8F9FB'}
                onMouseLeave={e => e.currentTarget.style.background = 'white'}
              >
                <div style={{
                  width: 36, height: 36, borderRadius: '50%',
                  background: '#EDE9FE',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 700, fontSize: 13, color: '#7C3AED', flexShrink: 0,
                }}>
                  {initials(user.name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13.5, color: '#1E1B4B', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {user.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 1 }}>{user.email}</div>
                </div>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                  background: rc.bg, color: rc.text, textTransform: 'capitalize', flexShrink: 0,
                }}>
                  {user.role}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────── */

export default function ComplaintsPage() {
  const [complaints, setComplaints] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState(false)

  const [form, setForm] = useState({
    reported_user_id: null, category: 'Harassment', description: '',
  })

  const fetchComplaints = async () => {
    setLoading(true)
    try {
      const res  = await getMyComplaints()
      const data = res?.complaints || res?.data || res || []
      setComplaints(Array.isArray(data) ? data : [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { fetchComplaints() }, [])

  const handleSubmit = async () => {
    if (!form.description.trim()) { setError('Please describe the issue.'); return }
    setError('')
    setSubmitting(true)
    try {
      await submitComplaint(form.reported_user_id, form.category, form.description)
      setSuccess(true)
      setForm({ reported_user_id: null, category: 'Harassment', description: '' })
      fetchComplaints()
      setTimeout(() => setSuccess(false), 4000)
    } catch {
      setError('Failed to submit complaint. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .cp-wrap * { box-sizing: border-box; }
        .cp-wrap { font-family: 'DM Sans', sans-serif; color: #1E1B4B; display: flex; flex-direction: column; gap: 20px; max-width: 720px; }
        .cp-input { width: 100%; padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; color: #374151; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color .15s; }
        .cp-input:focus { border-color: #7C3AED; }
        .cp-label { font-size: 12.5px; font-weight: 600; color: #6B7280; display: block; margin-bottom: 6px; }
        @keyframes spin  { to { transform: rotate(360deg); } }
        @keyframes cpIn  { from { opacity:0; transform:translateY(-4px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      <div className="cp-wrap">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Complaints</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Report issues or inappropriate behavior.</p>
        </div>

        {/* Warning banner */}
        <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <AlertTriangle size={18} color="#F59E0B" style={{ flexShrink: 0, marginTop: 1 }} />
          <div style={{ fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
            Please only submit complaints for genuine issues. False reports may result in account action. All complaints are reviewed by our moderation team.
          </div>
        </div>

        {/* Submit form */}
        <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '22px 24px' }}>
          <div style={{ fontWeight: 700, fontSize: 16, marginBottom: 18 }}>Submit a Complaint</div>

          {error   && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, fontSize: 13.5, color: '#EF4444', marginBottom: 14 }}>{error}</div>}
          {success && (
            <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, fontSize: 13.5, color: '#10B981', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 7 }}>
              <CheckCircle size={15} /> Complaint submitted. Our team will review it shortly.
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* User search picker */}
            <div>
              <label className="cp-label">
                Reported User <span style={{ fontWeight: 400, color: '#9CA3AF' }}>(optional)</span>
              </label>
              <UserPicker
                value={form.reported_user_id}
                onChange={(id) => setForm(p => ({ ...p, reported_user_id: id }))}
              />
              <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 5 }}>
                Search by name or email. Leave blank for general platform complaints.
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="cp-label">Category</label>
              <select className="cp-input" value={form.category} onChange={e => setForm(p => ({ ...p, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Description */}
            <div>
              <label className="cp-label">Description</label>
              <textarea className="cp-input" rows={5}
                value={form.description}
                onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                placeholder="Describe the issue in detail. Include relevant dates, times, and any evidence..."
                style={{ resize: 'vertical' }}
              />
            </div>

            <button onClick={handleSubmit} disabled={submitting} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '12px', background: '#EF4444', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: submitting ? 0.7 : 1,
            }}
              onMouseEnter={e => { if (!submitting) e.currentTarget.style.background = '#DC2626' }}
              onMouseLeave={e => { if (!submitting) e.currentTarget.style.background = '#EF4444' }}
            >
              {submitting ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Flag size={15} />}
              {submitting ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </div>

        {/* My complaints */}
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 14 }}>My Complaints</div>

          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}>
              <Loader2 size={24} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : complaints.length === 0 ? (
            <div style={{ background: '#F8F9FB', border: '1px dashed #DDD6FE', borderRadius: 14, padding: '32px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
              No complaints submitted yet.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {complaints.map((c, i) => {
                const s = STATUS_MAP[c.status?.toLowerCase()] || STATUS_MAP.open
                return (
                  <div key={c.id || i} style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 14, padding: '16px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 32, height: 32, borderRadius: 8, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Flag size={14} color="#EF4444" />
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E1B4B' }}>{c.subject || c.category || 'Complaint'}</div>
                          <div style={{ fontSize: 12, color: '#9CA3AF' }}>{formatDate(c.created_at)}</div>
                        </div>
                      </div>
                      <span style={{ fontSize: 12, fontWeight: 700, color: s.color, background: s.bg, borderRadius: 20, padding: '3px 10px' }}>
                        {s.label}
                      </span>
                    </div>
                    <p style={{ fontSize: 13.5, color: '#374151', lineHeight: 1.6, margin: 0 }}>{c.description}</p>
                    {c.resolution_notes && (
                      <div style={{ marginTop: 10, padding: '10px 14px', background: '#F8F9FB', borderRadius: 8, fontSize: 13, color: '#6B7280' }}>
                        <span style={{ fontWeight: 600, color: '#374151' }}>Admin response: </span>
                        {c.resolution_notes}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </>
  )
}
