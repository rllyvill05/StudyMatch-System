import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { getSessions, createSession, cancelSession } from '../../api/sessions'
import { getMatchRequests } from '../../api/matchRequests'
import {
  Search, Calendar, Clock, Users,
  Plus, X, Loader2, CheckCircle, AlertCircle,
  Video, BookOpen, ChevronDown,
} from 'lucide-react'

/* ─── helpers ─────────────────────────────────────────── */

const STATUS_COLORS = {
  scheduled:  { bg: '#EEF2FF', text: '#6366F1' },
  completed:  { bg: '#F0FDF4', text: '#10B981' },
  cancelled:  { bg: '#FEF2F2', text: '#EF4444' },
}

function formatDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

function SessionCard({ session, onCancel }) {
  const statusStyle = STATUS_COLORS[session.status] || STATUS_COLORS.scheduled
  const tutorName = session.tutor?.user?.name || 'Tutor'
  const subject   = session.subject?.name || session.notes || 'Study Session'

  return (
    <div style={{
      background: 'white', border: '1px solid #F0F0F4', borderRadius: 14,
      padding: '18px 20px', display: 'flex', gap: 16, alignItems: 'flex-start',
    }}>
      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <BookOpen size={20} color="#7C3AED" />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
          <span style={{ fontWeight: 700, fontSize: 14.5, color: '#1E1B4B' }}>{subject}</span>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: statusStyle.bg, color: statusStyle.text, textTransform: 'capitalize',
          }}>{session.status}</span>
        </div>
        <div style={{ fontSize: 13, color: '#6B7280', marginBottom: 6 }}>with {tutorName}</div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#9CA3AF' }}>
            <Calendar size={13} /> {formatDate(session.scheduled_at)}
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#9CA3AF' }}>
            <Clock size={13} /> {session.duration_minutes || 60} min
          </span>
          {session.session_link && (
            <a href={session.session_link} target="_blank" rel="noopener noreferrer"
              style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#7C3AED', fontWeight: 600, textDecoration: 'none' }}>
              <Video size={13} /> Join
            </a>
          )}
        </div>
        {session.notes && <div style={{ marginTop: 8, fontSize: 12.5, color: '#9CA3AF', fontStyle: 'italic' }}>{session.notes}</div>}
      </div>
      {session.status === 'scheduled' && (
        <button onClick={() => onCancel(session.id)} style={{
          padding: '6px 12px', background: 'white', color: '#EF4444',
          border: '1px solid #FECACA', borderRadius: 8, fontSize: 12, fontWeight: 600,
          cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
        }}>Cancel</button>
      )}
    </div>
  )
}

/* ─── create session modal ────────────────────────────── */

function CreateModal({ acceptedTutors, onClose, onCreated }) {
  const [form, setForm] = useState({
    tutor_id: '', scheduled_at: '', duration_minutes: '60',
    notes: '', session_link: '',
  })
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.tutor_id) { setError('Select a tutor.'); return }
    if (!form.scheduled_at) { setError('Pick a date and time.'); return }
    setSaving(true); setError('')
    try {
      const res = await createSession({
        tutor_id:         parseInt(form.tutor_id),
        scheduled_at:     new Date(form.scheduled_at).toISOString(),
        duration_minutes: parseInt(form.duration_minutes) || 60,
        notes:            form.notes || undefined,
        session_link:     form.session_link || undefined,
      })
      onCreated(res.session || res)
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to book session.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 18, padding: '28px 28px 24px', width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: '#1E1B4B' }}>Book a Session</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}><X size={20} color="#9CA3AF" /></button>
        </div>

        {error && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13.5, color: '#EF4444', marginBottom: 16 }}>{error}</div>}

        {acceptedTutors.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <div style={{ fontSize: 14, color: '#6B7280', marginBottom: 16 }}>You need an accepted tutor match first.</div>
            <Link to="/student/find-tutors" onClick={onClose} style={{ display: 'inline-block', padding: '10px 20px', background: '#7C3AED', color: 'white', borderRadius: 10, fontSize: 13.5, fontWeight: 700, textDecoration: 'none' }}>Find Tutors</Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Tutor</label>
              <select value={form.tutor_id} onChange={e => setForm(p => ({ ...p, tutor_id: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit' }}>
                <option value="">Select a tutor...</option>
                {acceptedTutors.map(t => (
                  <option key={t.tutor_id} value={t.tutor_id}>{t.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Date & Time</label>
              <input type="datetime-local" value={form.scheduled_at}
                onChange={e => setForm(p => ({ ...p, scheduled_at: e.target.value }))}
                min={new Date(Date.now() + 60000).toISOString().slice(0, 16)}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Duration (minutes)</label>
              <select value={form.duration_minutes} onChange={e => setForm(p => ({ ...p, duration_minutes: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit' }}>
                {[30, 45, 60, 90, 120].map(m => <option key={m} value={m}>{m} minutes</option>)}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Session Link (optional)</label>
              <input type="url" value={form.session_link} placeholder="https://meet.google.com/..."
                onChange={e => setForm(p => ({ ...p, session_link: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit' }} />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: 12.5, fontWeight: 600, color: '#6B7280', marginBottom: 6 }}>Notes (optional)</label>
              <textarea rows={2} value={form.notes} placeholder="What do you want to cover?"
                onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
                style={{ width: '100%', padding: '10px 14px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
            </div>

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button type="submit" disabled={saving} style={{
                flex: 1, padding: '12px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10,
                fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, opacity: saving ? 0.7 : 1,
              }}>
                {saving && <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} />}
                {saving ? 'Booking...' : 'Book Session'}
              </button>
              <button type="button" onClick={onClose} style={{
                padding: '12px 20px', background: 'white', color: '#374151',
                border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}>Cancel</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

/* ─── page ───────────────────────────────────────────── */

export default function StudySessionsPage() {
  const [sessions,       setSessions]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [activeTab,      setActiveTab]      = useState('upcoming')
  const [showModal,      setShowModal]      = useState(false)
  const [acceptedTutors, setAcceptedTutors] = useState([])
  const [toast,          setToast]          = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const data = await getSessions()
        const list = data?.data || []
        setSessions(Array.isArray(list) ? list : [])
      } catch {}

      try {
        const res     = await getMatchRequests()
        const sent    = res?.data?.sent || []
        const accepted = sent.filter(r => r.status === 'accepted').map(r => ({
          tutor_id: r.tutor_id,
          name:     r.tutor?.user?.name || `Tutor #${r.tutor_id}`,
        }))
        setAcceptedTutors(accepted)
      } catch {}

      setLoading(false)
    }
    load()
  }, [])

  const handleCancel = async (id) => {
    try {
      await cancelSession(id)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s))
      showToast('Session cancelled.')
    } catch { showToast('Failed to cancel.') }
  }

  const handleCreated = (session) => {
    setSessions(prev => [session, ...prev])
    setShowModal(false)
    showToast('Session booked successfully!')
  }

  const showToast = (msg) => {
    setToast(msg)
    setTimeout(() => setToast(''), 3000)
  }

  const now     = new Date()
  const upcoming = sessions.filter(s => s.status === 'scheduled' && new Date(s.scheduled_at) >= now)
  const past     = sessions.filter(s => s.status !== 'scheduled' || new Date(s.scheduled_at) < now)

  const displayed = activeTab === 'upcoming' ? upcoming : past

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ss-wrap * { box-sizing: border-box; }
        .ss-wrap { font-family: 'DM Sans', sans-serif; color: #1E1B4B; display: flex; flex-direction: column; gap: 20px; }
        .ss-tab { padding: 10px 4px; font-size: 14px; font-weight: 600; color: #9CA3AF; cursor: pointer; border-bottom: 2.5px solid transparent; background: none; border-top: none; border-left: none; border-right: none; font-family: 'DM Sans', sans-serif; transition: color .15s; }
        .ss-tab.active { color: #7C3AED; border-bottom-color: #7C3AED; }
        .ss-tab:hover { color: #7C3AED; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {showModal && (
        <CreateModal
          acceptedTutors={acceptedTutors}
          onClose={() => setShowModal(false)}
          onCreated={handleCreated}
        />
      )}

      {toast && (
        <div style={{
          position: 'fixed', bottom: 28, right: 28, zIndex: 2000,
          background: '#1E1B4B', color: 'white', padding: '12px 20px',
          borderRadius: 12, fontSize: 13.5, fontWeight: 600,
          boxShadow: '0 8px 24px rgba(0,0,0,.2)', display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <CheckCircle size={16} color="#10B981" /> {toast}
        </div>
      )}

      <div className="ss-wrap">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Study Sessions</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>View and manage your study sessions.</p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F0F0F4' }}>
          <div style={{ display: 'flex', gap: 4, flex: 1 }}>
            <button className={`ss-tab${activeTab === 'upcoming' ? ' active' : ''}`} onClick={() => setActiveTab('upcoming')}>
              Upcoming ({upcoming.length})
            </button>
            <button className={`ss-tab${activeTab === 'past' ? ' active' : ''}`} onClick={() => setActiveTab('past')} style={{ marginLeft: 16 }}>
              Past &amp; Cancelled ({past.length})
            </button>
          </div>
          <button
            onClick={() => setShowModal(true)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 18px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', marginBottom: 1 }}
            onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
            onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
          >
            <Plus size={15} /> Book Session
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48, color: '#9CA3AF' }}>
            <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : displayed.length === 0 ? (
          <div style={{ background: '#F8F9FB', border: '1px dashed #DDD6FE', borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
            <Calendar size={32} color="#DDD6FE" style={{ margin: '0 auto 12px' }} />
            <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>
              {activeTab === 'upcoming' ? 'No upcoming sessions' : 'No past sessions'}
            </div>
            <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>
              {activeTab === 'upcoming' ? 'Book your first session with a tutor.' : 'Completed sessions will appear here.'}
            </div>
            {activeTab === 'upcoming' && (
              <button onClick={() => setShowModal(true)} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 20px', background: '#7C3AED', color: 'white', borderRadius: 9, fontSize: 13, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                <Plus size={14} /> Book a Session
              </button>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {displayed.map(s => (
              <SessionCard key={s.id} session={s} onCancel={handleCancel} />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
