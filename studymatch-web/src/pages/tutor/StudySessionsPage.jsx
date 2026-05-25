import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  getSessions, acceptSession, declineSession, cancelSession,
  rescheduleSession, completeSession,
} from '../../api/sessions'
import {
  SessionCard, SessionDetailsModal, RescheduleModal, InteractiveCalendar,
} from '../../components/sessions/SessionShared'
import {
  isUpcomingTabSession, isCompletedTabSession, isCancelledTabSession,
  isSessionToday, effectiveStatus, sessionsOnDate,
} from '../../utils/sessionUtils'
import {
  Calendar, Clock, Users, Star, Loader2, ChevronLeft, ChevronRight, Search,
} from 'lucide-react'

export default function TutorStudySessionsPage() {
  const today = new Date()
  const [activeTab, setActiveTab] = useState('Upcoming')
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  const [detailSession, setDetailSession] = useState(null)
  const [rescheduleTarget, setRescheduleTarget] = useState(null)
  const [rescheduleSaving, setRescheduleSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [todayOnly, setTodayOnly] = useState(false)
  const [calDate, setCalDate] = useState({ year: today.getFullYear(), month: today.getMonth(), day: today.getDate() })

  useEffect(() => {
    getSessions()
      .then(data => setSessions(Array.isArray(data?.data) ? data.data : []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [])

  const now = useMemo(() => new Date(), [sessions])

  const upcoming = useMemo(() => sessions.filter(s => isUpcomingTabSession(s, now)), [sessions, now])

  const filtered = useMemo(() => {
    let list = sessions
    if (activeTab === 'Upcoming') list = upcoming
    else if (activeTab === 'Completed') list = sessions.filter(s => isCompletedTabSession(s))
    else if (activeTab === 'Cancelled') list = sessions.filter(s => isCancelledTabSession(s))

    if (statusFilter) list = list.filter(s => effectiveStatus(s, now) === statusFilter || s.status === statusFilter)
    if (todayOnly) list = list.filter(s => isSessionToday(s, now))
    if (search.trim()) {
      const q = search.toLowerCase()
      list = list.filter(s =>
        (s.student?.user?.name || '').toLowerCase().includes(q) ||
        (s.subject?.name || '').toLowerCase().includes(q) ||
        (s.notes || '').toLowerCase().includes(q)
      )
    }
    if (calDate.day) {
      const onDay = sessionsOnDate(sessions, calDate.year, calDate.month, calDate.day)
      const ids = new Set(onDay.map(s => s.id))
      list = list.filter(s => ids.has(s.id))
    }
    return list
  }, [sessions, activeTab, upcoming, statusFilter, todayOnly, search, calDate, now])

  const todaySessions = useMemo(() => upcoming.filter(s => isSessionToday(s, now)), [upcoming, now])
  const weekEnd = useMemo(() => { const d = new Date(today); d.setDate(d.getDate() + 7); return d }, [])
  const thisWeekSessions = useMemo(() => upcoming.filter(s => {
    if (!s.scheduled_at) return false
    const d = new Date(s.scheduled_at)
    return d >= now && d < weekEnd
  }), [upcoming, now, weekEnd])

  const totalHours = Math.round(thisWeekSessions.reduce((s, x) => s + (x.duration_minutes || 60), 0) / 60 * 10) / 10
  const uniqueStudents = new Set(thisWeekSessions.map(s => s.student_id)).size
  const totalEarnings = thisWeekSessions.reduce((sum, s) => sum + parseFloat(s.tutor?.hourly_rate || 0) * ((s.duration_minutes || 60) / 60), 0)

  const handleAccept = async (id) => {
    try {
      const res = await acceptSession(id)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...(res.session || {}), status: 'scheduled' } : s))
    } catch {}
  }

  const handleDecline = async (id) => {
    if (!window.confirm('Decline this session request?')) return
    try {
      await declineSession(id)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, status: 'cancelled' } : s))
    } catch {}
  }

  const handleComplete = async (id) => {
    try {
      const res = await completeSession(id)
      setSessions(prev => prev.map(s => s.id === id ? { ...s, ...(res.session || {}), status: 'completed' } : s))
    } catch {}
  }

  const handleReschedule = async (data) => {
    if (!rescheduleTarget) return
    setRescheduleSaving(true)
    try {
      const res = await rescheduleSession(rescheduleTarget.id, data)
      setSessions(prev => prev.map(s => s.id === rescheduleTarget.id ? { ...s, ...(res.session || {}), ...data } : s))
      setRescheduleTarget(null)
    } catch {} finally { setRescheduleSaving(false) }
  }

  const prevMonth = () => setCalDate(p => p.month === 0 ? { year: p.year - 1, month: 11, day: 1 } : { ...p, month: p.month - 1, day: 1 })
  const nextMonth = () => setCalDate(p => p.month === 11 ? { year: p.year + 1, month: 0, day: 1 } : { ...p, month: p.month + 1, day: 1 })

  const TABS = ['Upcoming', 'Completed', 'Cancelled', 'All Sessions']

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .tss-wrap { font-family: 'DM Sans', sans-serif; color: #1E1B4B; display: flex; gap: 24px; align-items: flex-start; }
        .tss-main { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 14px; max-width: 720px; }
        .tss-right { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 14px; }
        .tss-tab { padding: 10px 2px; font-size: 14px; font-weight: 600; color: #9CA3AF; cursor: pointer; border: none; border-bottom: 2.5px solid transparent; background: none; font-family: inherit; }
        .tss-tab.active { color: #7C3AED; border-bottom-color: #7C3AED; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      {detailSession && (
        <SessionDetailsModal session={detailSession} role="tutor" messageBase="/tutor/messages" onClose={() => setDetailSession(null)} />
      )}
      {rescheduleTarget && (
        <RescheduleModal session={rescheduleTarget} saving={rescheduleSaving}
          onClose={() => setRescheduleTarget(null)} onSave={handleReschedule} />
      )}

      <div className="tss-wrap">
        <div className="tss-main">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, margin: '0 0 4px' }}>Study Sessions</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF', margin: 0 }}>Manage your upcoming tutoring sessions and session history.</p>
          </div>

          <div style={{ borderBottom: '1px solid #F0F0F4', display: 'flex', gap: 16, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t} type="button" className={`tss-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 160px' }}>
              <Search size={14} color="#9CA3AF" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }} />
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search student, subject..."
                style={{ width: '100%', padding: '9px 12px 9px 32px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }} />
            </div>
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
              style={{ padding: 9, border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13, fontFamily: 'inherit' }}>
              <option value="">All statuses</option>
              <option value="pending">Pending</option>
              <option value="scheduled">Confirmed</option>
              <option value="ongoing">Ongoing</option>
              <option value="rescheduled">Rescheduled</option>
            </select>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#6B7280' }}>
              <input type="checkbox" checked={todayOnly} onChange={e => setTodayOnly(e.target.checked)} /> Today
            </label>
          </div>

          <div style={{ fontWeight: 700, fontSize: 15 }}>
            {activeTab} Sessions{activeTab === 'Upcoming' ? ` (${upcoming.length})` : ''}
            {calDate.day && (
              <button type="button" onClick={() => setCalDate(p => ({ ...p, day: null }))}
                style={{ marginLeft: 10, fontSize: 12, color: '#7C3AED', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
                Clear date filter ×
              </button>
            )}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} /></div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#FAFAFF', border: '1px dashed #DDD6FE', borderRadius: 14, padding: 40, textAlign: 'center' }}>
              <Calendar size={32} color="#DDD6FE" style={{ margin: '0 auto 12px' }} />
              <div style={{ fontWeight: 700, marginBottom: 8 }}>No sessions found</div>
              <div style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>Students will book sessions once you are matched.</div>
              <Link to="/tutor/find-students" style={{ padding: '9px 20px', background: '#7C3AED', color: 'white', borderRadius: 9, fontWeight: 700, textDecoration: 'none', fontSize: 13 }}>Find Students</Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map(s => (
                <SessionCard key={s.id} session={s} role="tutor"
                  onOpenDetails={setDetailSession}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onComplete={handleComplete}
                  onReschedule={setRescheduleTarget}
                  onCancel={async (id) => {
                    if (!window.confirm('Cancel this session?')) return
                    await cancelSession(id)
                    setSessions(prev => prev.map(x => x.id === id ? { ...x, status: 'cancelled' } : x))
                  }}
                />
              ))}
            </div>
          )}
        </div>

        <div className="tss-right">
          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: 18 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Calendar</span>
              <div style={{ display: 'flex', gap: 4 }}>
                <button type="button" onClick={prevMonth} style={{ border: '1px solid #E5E7EB', background: 'white', borderRadius: 6, padding: 4, cursor: 'pointer' }}><ChevronLeft size={12} /></button>
                <button type="button" onClick={nextMonth} style={{ border: '1px solid #E5E7EB', background: 'white', borderRadius: 6, padding: 4, cursor: 'pointer' }}><ChevronRight size={12} /></button>
              </div>
            </div>
            <InteractiveCalendar sessions={sessions} selectedDate={calDate} onSelectDate={setCalDate} />
          </div>

          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>Today&apos;s Sessions</div>
            {todaySessions.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>No sessions today</div>
            ) : (
              todaySessions.map(s => (
                <button key={s.id} type="button" onClick={() => setDetailSession(s)} style={{
                  width: '100%', textAlign: 'left', padding: '10px 12px', background: '#F8F9FB', border: 'none',
                  borderRadius: 10, marginBottom: 8, cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>{s.subject?.name || 'Study Session'}</div>
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>{s.student?.user?.name} · {new Date(s.scheduled_at).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</div>
                </button>
              ))
            )}
          </div>

          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: 18 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 12 }}>This Week</div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { icon: Calendar, color: '#7C3AED', bg: '#F3F0FF', value: thisWeekSessions.length, label: 'Sessions' },
                { icon: Users, color: '#6366F1', bg: '#EEF2FF', value: uniqueStudents, label: 'Students' },
                { icon: Clock, color: '#F59E0B', bg: '#FFFBEB', value: `${totalHours}h`, label: 'Hours' },
                { icon: Star, color: '#10B981', bg: '#F0FDF4', value: totalEarnings > 0 ? `₱${Math.round(totalEarnings)}` : '—', label: 'Est. earnings' },
              ].map(({ icon: Icon, color, bg, value, label }) => (
                <div key={label} style={{ background: bg, borderRadius: 12, padding: 12, textAlign: 'center' }}>
                  <Icon size={16} color={color} style={{ margin: '0 auto 4px' }} />
                  <div style={{ fontSize: 18, fontWeight: 800 }}>{value}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>{label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
