import { useState, useEffect } from 'react'
import { getPotentialPartners } from '../../api/partners'
import { getMatchRequests, sendMatchRequest } from '../../api/matchRequests'
import { getSubjects } from '../../api/subjects'
import {
  Search, SlidersHorizontal, Star,
  Clock, BookOpen, ChevronDown, UserPlus,
  Loader2, RefreshCw, X,
} from 'lucide-react'

/* ─── helpers ──────────────────────────────────────────────────── */

function Avatar({ name = '', color = '#7C3AED', size = 52 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: color + '22', border: `2.5px solid ${color}44`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.3, color, flexShrink: 0,
      fontFamily: 'inherit',
    }}>
      {initials}
    </div>
  )
}

const AVATAR_COLORS = ['#7C3AED','#10B981','#6366F1','#F59E0B','#EC4899','#EF4444']
const getColor = i => AVATAR_COLORS[i % AVATAR_COLORS.length]

function Stars({ rating = 0 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={12} color="#F59E0B" fill={i <= Math.round(rating) ? '#F59E0B' : 'none'} />
      ))}
    </div>
  )
}

/* ─── tutor card ───────────────────────────────────────────────── */

function TutorCard({ tutor, index, onRequest, requested, requesting }) {
  const color    = getColor(index)
  const name     = tutor.fullName || tutor.user?.name || tutor.name || 'Unknown'
  const dept     = tutor.specialization || tutor.position || tutor.department || tutor.user?.department || ''
  const rating   = parseFloat(tutor.average_rating || tutor.rating || 0)
  const reviews  = tutor.ratingCount || tutor.reviews_count || tutor.total_reviews || 0
  const subjects = tutor.strong_subjects
    ? tutor.strong_subjects.map(s => s.subject?.name || '').filter(Boolean)
    : (tutor.subjects || [])
  const availSlots   = Array.isArray(tutor.availability) ? tutor.availability.filter(s => s.is_active) : []
  const availability = availSlots.length > 0
    ? availSlots.map(s => s.day_of_week?.slice(0, 3)).join(', ')
    : ''
  const bio = tutor.bio || tutor.about || tutor.user?.bio || ''
  const tutorId = String(tutor.id || tutor.user?.id || tutor.user_id || '')

  return (
    <div style={{
      background: 'white', border: '1px solid #F0F0F4',
      borderRadius: 16, padding: '20px 22px',
      display: 'flex', alignItems: 'center', gap: 18,
      transition: 'box-shadow .18s', fontFamily: "'DM Sans', sans-serif",
    }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 18px rgba(124,58,237,.08)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
    >
      <Avatar name={name} color={color} size={56} />

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 3 }}>{name}</div>
        {dept && <div style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 6 }}>{dept}</div>}

        {rating > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
            <Stars rating={rating} />
            <span style={{ fontSize: 12.5, fontWeight: 700, color: '#1E1B4B' }}>{rating.toFixed(1)}</span>
            {reviews > 0 && <span style={{ fontSize: 12, color: '#9CA3AF' }}>({reviews} reviews)</span>}
          </div>
        )}

        {subjects.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
            {subjects.slice(0, 4).map((s, i) => (
              <span key={i} style={{
                padding: '3px 10px', borderRadius: 20,
                background: '#F3F0FF', color: '#7C3AED',
                fontSize: 12, fontWeight: 600, border: '1px solid #DDD6FE',
              }}>
                {typeof s === 'object' ? (s.name || s.subject) : s}
              </span>
            ))}
            {subjects.length > 4 && (
              <span style={{ padding: '3px 10px', borderRadius: 20, background: '#F9FAFB', color: '#9CA3AF', fontSize: 12, fontWeight: 600, border: '1px solid #E5E7EB' }}>
                +{subjects.length - 4} more
              </span>
            )}
          </div>
        )}

        {bio && (
          <div style={{ fontSize: 13, color: '#6B7280', lineHeight: 1.5,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 420 }}>
            {bio}
          </div>
        )}
      </div>

      <div style={{ flexShrink: 0, textAlign: 'right', display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
        {availability && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, color: '#6B7280' }}>
            <Clock size={12} color="#7C3AED" /> {availability}
          </div>
        )}
        <button
          onClick={() => onRequest(tutorId)}
          disabled={requested || requesting}
          style={{
            display: 'flex', alignItems: 'center', gap: 6, padding: '9px 18px',
            background: requested ? '#F3F0FF' : '#7C3AED',
            color: requested ? '#7C3AED' : 'white',
            border: requested ? '1.5px solid #DDD6FE' : 'none',
            borderRadius: 9, fontSize: 13, fontWeight: 700,
            cursor: (requested || requesting) ? 'default' : 'pointer',
            fontFamily: 'inherit', transition: 'all .15s', opacity: requesting ? 0.7 : 1,
          }}
        >
          {requesting ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <UserPlus size={14} />}
          {requested ? 'Requested' : requesting ? 'Sending…' : 'Send Request'}
        </button>
      </div>
    </div>
  )
}

/* ─── main page ────────────────────────────────────────────────── */

export default function FindTutorsPage() {
  const [tutors,     setTutors]     = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [search,     setSearch]     = useState('')
  const [subject,    setSubject]    = useState('')
  const [style,      setStyle]      = useState('')
  const [subjects,   setSubjects]   = useState([])  // from admin /subjects
  const [requested,  setRequested]  = useState({})
  const [requesting, setRequesting] = useState({})

  // Load admin-defined subjects once
  useEffect(() => {
    getSubjects()
      .then(res => {
        const list = Array.isArray(res) ? res : (res?.data || [])
        setSubjects(list)
      })
      .catch(() => {})
  }, [])

  const fetchTutors = async (filters = {}) => {
    setLoading(true); setError('')
    try {
      const res  = await getPotentialPartners(filters)
      const list = res?.data?.data || res?.data || res || []
      setTutors(Array.isArray(list) ? list : [])
    } catch {
      setError('Failed to load tutors. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchTutors() }, [])

  useEffect(() => {
    getMatchRequests()
      .then(res => {
        const matched = res?.data?.data || res?.data || []
        const ids = {}
        ;(Array.isArray(matched) ? matched : []).forEach(u => {
          if (u.id) ids[String(u.id)] = true
        })
        setRequested(ids)
      })
      .catch(() => {})
  }, [])

  const handleFilter = () => {
    fetchTutors({ subject, studyStyle: style })
  }

  const handleClear = () => {
    setSubject(''); setStyle('')
    fetchTutors()
  }

  const handleRequest = async tutorId => {
    if (requested[tutorId] || requesting[tutorId]) return
    setRequesting(p => ({ ...p, [tutorId]: true }))
    try {
      await sendMatchRequest(tutorId)
      setRequested(p => ({ ...p, [tutorId]: true }))
    } catch {
      // silently fail
    } finally {
      setRequesting(p => ({ ...p, [tutorId]: false }))
    }
  }

  // Client-side search filter (on top of API results)
  const filtered = tutors.filter(t => {
    if (!search) return true
    const q    = search.toLowerCase()
    const name = (t.fullName || t.user?.name || t.name || '').toLowerCase()
    const spec = (t.specialization || t.position || t.department || '').toLowerCase()
    const subs = (t.strong_subjects || [])
      .map(s => (s.subject?.name || s.name || '').toLowerCase())
      .filter(Boolean)
    return name.includes(q) || spec.includes(q) || subs.some(s => s.includes(q))
  })

  const STYLES = ['Visual', 'Auditory', 'Reading/Writing', 'Kinesthetic', 'Group', 'Solo']

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ft-wrap * { box-sizing: border-box; }
        .ft-wrap { font-family: 'DM Sans', sans-serif; color: #1E1B4B; display: flex; gap: 24px; align-items: flex-start; }
        .ft-main { flex: 1; display: flex; flex-direction: column; gap: 16px; min-width: 0; }
        .ft-sidebar { width: 260px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
        .ft-select {
          width: 100%; padding: 9px 30px 9px 12px; border: 1.5px solid #E5E7EB;
          border-radius: 10px; font-size: 13.5px; color: #374151;
          outline: none; font-family: 'DM Sans', sans-serif;
          background: white; cursor: pointer; transition: border-color .15s; appearance: none;
        }
        .ft-select:focus { border-color: #7C3AED; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ft-wrap">
        {/* ── Main content ── */}
        <div className="ft-main">

          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Find Tutors</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Discover and connect with qualified tutors.</p>
          </div>

          {/* Search bar */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: 'white', border: '1.5px solid #E5E7EB',
            borderRadius: 12, padding: '10px 16px',
          }}>
            <Search size={16} color="#9CA3AF" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, subject, or specialization…"
              style={{ flex: 1, border: 'none', outline: 'none', fontSize: 14, fontFamily: 'inherit', color: '#374151' }}
            />
            {search && (
              <button onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex' }}>
                <X size={14} />
              </button>
            )}
          </div>

          {/* Active subject chip */}
          {subject && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, color: '#6B7280' }}>Filtering by:</span>
              <span style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                padding: '4px 12px', borderRadius: 20,
                background: '#F3F0FF', border: '1px solid #DDD6FE', color: '#7C3AED',
                fontSize: 13, fontWeight: 600,
              }}>
                {subject}
                <button onClick={handleClear}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#7C3AED', display: 'flex', padding: 0 }}>
                  <X size={12} />
                </button>
              </span>
            </div>
          )}

          {!loading && (
            <div style={{ fontSize: 13.5, color: '#6B7280', fontWeight: 500 }}>
              {filtered.length} tutor{filtered.length !== 1 ? 's' : ''} found
            </div>
          )}

          {loading && (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0', color: '#9CA3AF' }}>
              <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          )}

          {error && !loading && (
            <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 12, padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <span style={{ fontSize: 13.5, color: '#EF4444', flex: 1 }}>{error}</span>
              <button onClick={() => fetchTutors()} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 12px', background: 'white', border: '1px solid #FECACA', borderRadius: 8, color: '#EF4444', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <RefreshCw size={13} /> Retry
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div style={{ background: '#F8F9FB', border: '1px dashed #DDD6FE', borderRadius: 14, padding: '48px 20px', textAlign: 'center' }}>
              <BookOpen size={32} color="#DDD6FE" style={{ margin: '0 auto 12px', display: 'block' }} />
              <div style={{ fontWeight: 700, fontSize: 15, color: '#374151', marginBottom: 6 }}>
                {subject ? `No tutors found for "${subject}"` : 'No tutors found'}
              </div>
              <div style={{ fontSize: 13, color: '#9CA3AF' }}>
                {subject ? 'Try a different subject or clear the filter.' : 'Try adjusting your filters or search terms.'}
              </div>
              {subject && (
                <button onClick={handleClear} style={{ marginTop: 12, padding: '8px 18px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                  Clear Filter
                </button>
              )}
            </div>
          )}

          {!loading && !error && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((tutor, i) => (
                <TutorCard
                  key={tutor.id || tutor.user_id || i}
                  tutor={tutor} index={i}
                  onRequest={handleRequest}
                  requested={!!requested[String(tutor.id || tutor.user?.id || tutor.user_id || '')]}
                  requesting={!!requesting[String(tutor.id || tutor.user?.id || tutor.user_id || '')]}
                />
              ))}
            </div>
          )}
        </div>

        {/* ── Sidebar filters ── */}
        <div className="ft-sidebar">
          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <SlidersHorizontal size={16} color="#7C3AED" />
              <span style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B' }}>Filters</span>
            </div>

            {/* Subject filter — fetched from admin subjects */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                Subject
              </label>
              <div style={{ position: 'relative' }}>
                <select className="ft-select" value={subject} onChange={e => setSubject(e.target.value)}>
                  <option value="">All Subjects</option>
                  {subjects.map(s => (
                    <option key={s.id} value={s.name}>{s.name}</option>
                  ))}
                </select>
                <ChevronDown size={13} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            {/* Study Style */}
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>
                Study Style
              </label>
              <div style={{ position: 'relative' }}>
                <select className="ft-select" value={style} onChange={e => setStyle(e.target.value)}>
                  <option value="">All Styles</option>
                  {STYLES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <ChevronDown size={13} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
              </div>
            </div>

            <button onClick={handleFilter} style={{
              width: '100%', padding: '11px', background: '#7C3AED',
              color: 'white', border: 'none', borderRadius: 10,
              fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
            }}
              onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
              onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
            >
              Apply Filters
            </button>

            {(subject || style) && (
              <button onClick={handleClear} style={{
                width: '100%', padding: '9px', marginTop: 8,
                background: 'white', color: '#6B7280',
                border: '1px solid #E5E7EB', borderRadius: 10,
                fontSize: 13.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
              }}>
                Clear Filters
              </button>
            )}
          </div>

          {/* Subject chips — quick-pick from admin subjects */}
          {subjects.length > 0 && (
            <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '16px 18px' }}>
              <div style={{ fontWeight: 700, fontSize: 14, color: '#1E1B4B', marginBottom: 12 }}>
                Quick Subject Pick
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
                {subjects.map(s => (
                  <button key={s.id} onClick={() => { setSubject(s.name); fetchTutors({ subject: s.name }) }}
                    style={{
                      padding: '5px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                      cursor: 'pointer', fontFamily: 'inherit', transition: 'all .15s',
                      border: subject === s.name ? '1.5px solid #7C3AED' : '1.5px solid #E5E7EB',
                      background: subject === s.name ? '#F3F0FF' : '#F9FAFB',
                      color: subject === s.name ? '#7C3AED' : '#374151',
                    }}>
                    {s.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quick Stats */}
          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 14 }}>Quick Stats</div>
            {[
              { label: 'Total Tutors',   value: tutors.length,                   color: '#7C3AED' },
              { label: 'Requests Sent',  value: Object.keys(requested).length,   color: '#10B981' },
              { label: 'Subjects',       value: subjects.length,                  color: '#6366F1' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8F9FB' }}>
                <span style={{ fontSize: 13.5, color: '#6B7280' }}>{label}</span>
                <span style={{ fontSize: 15, fontWeight: 800, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
