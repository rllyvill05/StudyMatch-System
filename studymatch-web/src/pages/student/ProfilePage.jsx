import { useState, useEffect, useRef } from 'react'
import { getProfile, updateProfile, updateProfileStep3, uploadAvatar } from '../../api/profile'
import { getSubjects } from '../../api/subjects'
import { getUser, saveAuth, getToken } from '../../store/authStore'
import {
  DISCOVERY_SUBJECTS,
  DISCOVERY_AVAILABILITY_DAYS,
  DISCOVERY_AVAILABILITY_TIMES,
  DISCOVERY_LEARNING_GOALS,
  DISCOVERY_SESSION_FORMATS,
  normalizeGoalValue,
  normalizeDayValue,
  normalizeTimeValue,
  normalizeSessionFormat,
  formatAvailabilityLabel,
} from '../../constants/studentDiscovery'
import {
  Camera, Pencil, Mail, Phone, Calendar, GraduationCap,
  BookOpen, CheckCircle, Loader2, Save, X, Target, Clock, MapPin,
} from 'lucide-react'

function Avatar({ name = '', size = 90 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)',
      border: '3px solid #DDD6FE',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.3, color: '#7C3AED',
    }}>
      {initials}
    </div>
  )
}

const TABS = ['Profile', 'Edit Profile', 'Preferences']

export default function StudentProfilePage() {
  const authUser  = getUser()
  const avatarRef = useRef(null)
  const [profile,         setProfile]         = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError,     setAvatarError]     = useState(false)
  const [error,           setError]           = useState('')
  const [success,         setSuccess]         = useState('')
  const [activeTab,       setActiveTab]       = useState('Profile')

  const [allSubjects, setAllSubjects] = useState([])
  const [form, setForm] = useState({
    name: '', bio: '', phone: '',
    program: '', year_level: '',
    study_style: '', study_goals: '',
    preferred_days: '', preferred_time: '',
    subjects_needed: [],
  })

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const res  = await getProfile()
        const data = res?.user || res || {}
        setProfile(data)
        const sub = data.student || {}
        const weakNames = (sub.weak_subjects || sub.weakSubjects || [])
          .map(ws => ws.subject?.name)
          .filter(Boolean)
        const matchedSubjects = weakNames.filter(n =>
          DISCOVERY_SUBJECTS.some(d => d.toLowerCase() === n.toLowerCase() || n.toLowerCase().includes(d.toLowerCase())),
        )
        setForm({
          name:           data.name             || authUser?.name || '',
          bio:            sub.bio               || data.bio       || '',
          phone:          data.phone            || '',
          program:        sub.program           || '',
          year_level:     sub.year_level        || '',
          study_style:    normalizeSessionFormat(sub.study_style || data.study_style),
          study_goals:    normalizeGoalValue(sub.study_goals || data.study_goals),
          preferred_days: normalizeDayValue(sub.preferred_days || data.preferred_days),
          preferred_time: normalizeTimeValue(sub.preferred_time || data.preferred_time),
          subjects_needed: matchedSubjects.length ? matchedSubjects : weakNames.slice(0, 4),
        })
        try {
          const catalog = await getSubjects()
          setAllSubjects(Array.isArray(catalog) ? catalog : catalog?.data || [])
        } catch {
          setAllSubjects([])
        }
      } catch {
        setError('Failed to load profile.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const handleSave = async (options = {}) => {
    const { stayOnTab = false, payload = form } = options
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const res = await updateProfile(payload)
      const updated = res?.user || res || {}
      setProfile(p => ({ ...p, ...updated, student: { ...p?.student, ...updated?.student } }))
      if (payload.name) {
        saveAuth(getToken(), { ...authUser, name: payload.name })
      }
      setForm(p => ({
        ...p,
        study_style:    updated.study_style    ?? p.study_style,
        study_goals:    updated.study_goals    ?? p.study_goals,
        preferred_days: updated.preferred_days ?? p.preferred_days,
        preferred_time: updated.preferred_time ?? p.preferred_time,
        name:           updated.name           ?? p.name,
        phone:          updated.phone          ?? p.phone,
        program:        updated.student?.program ?? p.program,
        year_level:     updated.student?.year_level ?? p.year_level,
        bio:            updated.student?.bio ?? updated.bio ?? p.bio,
      }))
      setSuccess(stayOnTab ? 'Preferences saved successfully!' : 'Profile updated successfully!')
      if (!stayOnTab) setActiveTab('Profile')
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError(stayOnTab ? 'Failed to save preferences. Please try again.' : 'Failed to update profile. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadingAvatar(true)
    try {
      const res = await uploadAvatar(file)
      const newAvatar = res?.avatar_url
      if (newAvatar) {
        setProfile(p => ({ ...p, avatar_url: newAvatar }))
        setAvatarError(false)
        saveAuth(getToken(), { ...authUser, avatar: newAvatar })
      }
      setSuccess('Avatar updated!')
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Failed to upload avatar.') }
    finally { setUploadingAvatar(false) }
  }

  const toggleSubject = (subject) => {
    setForm(p => ({
      ...p,
      subjects_needed: p.subjects_needed.includes(subject)
        ? p.subjects_needed.filter(s => s !== subject)
        : [...p.subjects_needed, subject],
    }))
  }

  const handleSavePreferences = async () => {
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const payload = {
        study_style:    form.study_style,
        preferred_days: form.preferred_days,
        preferred_time: form.preferred_time,
        study_goals:    form.study_goals,
      }
      const res = await updateProfile(payload)
      const updated = res?.user || res || {}

      if (form.subjects_needed.length > 0 && allSubjects.length > 0) {
        const subjects = form.subjects_needed
          .map(name => {
            const match = allSubjects.find(
              s => (s.name || '').toLowerCase() === name.toLowerCase()
                || (s.name || '').toLowerCase().includes(name.toLowerCase()),
            )
            return match ? { subject_id: match.id, difficulty_level: 'moderate' } : null
          })
          .filter(Boolean)
        if (subjects.length > 0) {
          await updateProfileStep3({ subjects })
        }
      }

      setProfile(p => ({ ...p, ...updated, student: { ...p?.student, ...updated?.student } }))
      setForm(p => ({
        ...p,
        study_style:    normalizeSessionFormat(updated.study_style ?? payload.study_style),
        study_goals:    normalizeGoalValue(updated.study_goals ?? payload.study_goals),
        preferred_days: normalizeDayValue(updated.preferred_days ?? payload.preferred_days),
        preferred_time: normalizeTimeValue(updated.preferred_time ?? payload.preferred_time),
      }))
      setSuccess('Preferences saved! Tutors can now match you more accurately.')
      setTimeout(() => setSuccess(''), 4000)
    } catch {
      setError('Failed to save preferences. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const name     = profile?.name                            || authUser?.name || 'Student'
  const email    = profile?.email                           || authUser?.email || ''
  const phone    = profile?.phone                           || ''
  const program  = profile?.student?.program                || ''
  const year     = profile?.student?.year_level             || ''
  const bio      = profile?.student?.bio                    || profile?.bio || ''
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    : ''

  const prefGoal = form.study_goals || normalizeGoalValue(profile?.study_goals || profile?.student?.study_goals)
  const prefDays = form.preferred_days || normalizeDayValue(profile?.preferred_days || profile?.student?.preferred_days)
  const prefTime = form.preferred_time || normalizeTimeValue(profile?.preferred_time || profile?.student?.preferred_time)
  const prefFormat = form.study_style || normalizeSessionFormat(profile?.study_style || profile?.student?.study_style)
  const prefAvail = formatAvailabilityLabel(prefDays, prefTime)

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .pp-wrap * { box-sizing: border-box; }
        .pp-wrap { font-family: 'DM Sans', sans-serif; color: #1E1B4B; display: flex; gap: 24px; align-items: flex-start; }
        .pp-main { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
        .pp-right { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
        .pp-tab { padding: 9px 2px; font-size: 14px; font-weight: 600; color: #9CA3AF; cursor: pointer; border: none; border-bottom: 2.5px solid transparent; background: none; font-family: 'DM Sans', sans-serif; transition: color .15s; }
        .pp-tab.active { color: #7C3AED; border-bottom-color: #7C3AED; }
        .pp-tab:hover { color: #7C3AED; }
        .pp-input { width: 100%; padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; color: #111827; background: #fff; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color .15s; }
        .pp-input::placeholder { color: #6B7280; opacity: 1; }
        .pp-input:focus { border-color: #7C3AED; }
        .pp-label { font-size: 12.5px; font-weight: 600; color: #6B7280; display: block; margin-bottom: 6px; }
        .info-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F8F9FB; }
        .info-row:last-child { border-bottom: none; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="pp-wrap">
        <div className="pp-main">

          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>My Profile</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Manage your profile and study preferences.</p>
          </div>

          <div style={{ display: 'flex', gap: 24, borderBottom: '1px solid #F0F0F4' }}>
            {TABS.map(t => (
              <button key={t} className={`pp-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>
                {t}
              </button>
            ))}
          </div>

          {error   && <div style={{ padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13.5, color: '#EF4444' }}>{error}</div>}
          {success && <div style={{ padding: '10px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 13.5, color: '#10B981', display: 'flex', alignItems: 'center', gap: 7 }}><CheckCircle size={15} /> {success}</div>}

          {/* ── Profile Tab ── */}
          {activeTab === 'Profile' && (
            <>
              <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '24px 28px' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 24, marginBottom: 24 }}>
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <input ref={avatarRef} type="file" accept="image/*" onChange={handleAvatarChange} style={{ display: 'none' }} />
                    {profile?.avatar_url && !avatarError ? (
                      <img
                        src={profile.avatar_url}
                        alt={name}
                        onError={() => setAvatarError(true)}
                        style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid #DDD6FE' }}
                      />
                    ) : (
                      <Avatar name={name} size={90} />
                    )}
                    <button onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar} style={{
                      position: 'absolute', bottom: 2, right: 2,
                      width: 28, height: 28, borderRadius: '50%',
                      background: '#7C3AED', border: '2px solid white',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                    }}>
                      {uploadingAvatar ? <Loader2 size={12} color="white" style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={13} color="white" />}
                    </button>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                      <span style={{ fontWeight: 800, fontSize: 22, color: '#1E1B4B' }}>{name}</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED', background: '#F3F0FF', border: '1px solid #DDD6FE', borderRadius: 20, padding: '3px 10px' }}>
                        Student
                      </span>
                    </div>
                    {email && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#6B7280', marginBottom: 4 }}>
                        <Mail size={13} color="#9CA3AF" /> {email}
                      </div>
                    )}
                    {phone && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13.5, color: '#6B7280', marginBottom: 4 }}>
                        <Phone size={13} color="#9CA3AF" /> {phone}
                      </div>
                    )}
                    {memberSince && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#9CA3AF' }}>
                        <Calendar size={13} color="#9CA3AF" /> Member since {memberSince}
                      </div>
                    )}
                  </div>
                  <button onClick={() => setActiveTab('Edit Profile')} style={{
                    display: 'flex', alignItems: 'center', gap: 6,
                    padding: '8px 16px', background: 'white', border: '1.5px solid #E5E7EB',
                    borderRadius: 9, color: '#374151', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    <Pencil size={13} /> Edit
                  </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderTop: '1px solid #F0F0F4', paddingTop: 20 }}>
                  {[
                    { label: 'Subjects Needed',  value: (profile?.student?.weak_subjects || profile?.student?.weakSubjects || []).length, color: '#7C3AED' },
                    { label: 'Program',           value: program || '—',  color: '#10B981' },
                    { label: 'Year Level',        value: year    || '—',  color: '#6366F1' },
                  ].map(({ label, value, color }, i) => (
                    <div key={label} style={{ textAlign: 'center', borderRight: i < 2 ? '1px solid #F0F0F4' : 'none', padding: '0 16px' }}>
                      <div style={{ fontSize: 22, fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 4 }}>{label}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <GraduationCap size={15} color="#7C3AED" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>Education</span>
                  </div>
                  {[
                    { label: 'Program',    value: program || '—' },
                    { label: 'Year Level', value: year    || '—' },
                  ].map(({ label, value }) => (
                    <div key={label} className="info-row">
                      <div>
                        <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{value}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '20px 22px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 8, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <BookOpen size={15} color="#10B981" />
                    </div>
                    <span style={{ fontWeight: 700, fontSize: 15 }}>About Me</span>
                  </div>
                  <div style={{ fontSize: 14, color: bio ? '#1E1B4B' : '#9CA3AF', lineHeight: 1.6 }}>
                    {bio || 'No bio set yet.'}
                  </div>
                </div>
              </div>

              <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <span style={{ fontWeight: 700, fontSize: 15 }}>How Tutors Find You</span>
                  <button type="button" onClick={() => setActiveTab('Preferences')} style={{
                    background: 'none', border: 'none', color: '#7C3AED', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  }}>Edit preferences</button>
                </div>
                <p style={{ fontSize: 12.5, color: '#9CA3AF', marginBottom: 12 }}>
                  Same fields tutors use in Find Students Who Need Your Help.
                </p>
                {[
                  { label: 'Subjects', value: form.subjects_needed?.length ? form.subjects_needed.join(', ') : '—' },
                  { label: 'Learning goal', value: prefGoal || '—' },
                  { label: 'Availability', value: prefAvail || '—' },
                  { label: 'Session format', value: prefFormat || '—' },
                ].map(({ label, value }) => (
                  <div key={label} className="info-row">
                    <div>
                      <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 3 }}>{label}</div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: '#1E1B4B' }}>{value}</div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* ── Edit Profile Tab ── */}
          {activeTab === 'Edit Profile' && (
            <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '24px 28px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                {[
                  { key: 'name',       label: 'Full Name'    },
                  { key: 'phone',      label: 'Phone Number' },
                  { key: 'program',    label: 'Program'      },
                  { key: 'year_level', label: 'Year Level'   },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label className="pp-label">{label}</label>
                    <input
                      className="pp-input"
                      value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))}
                      placeholder={label}
                    />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label className="pp-label">Bio</label>
                  <textarea
                    className="pp-input" rows={4}
                    value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))}
                    placeholder="Tell us about yourself..."
                    style={{ resize: 'vertical' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => handleSave()} disabled={saving} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 22px', background: '#7C3AED', color: 'white',
                  border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                  cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                  opacity: saving ? 0.7 : 1,
                }}>
                  {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
                <button onClick={() => setActiveTab('Profile')} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '11px 22px', background: 'white', color: '#374151',
                  border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, fontWeight: 600,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <X size={15} /> Cancel
                </button>
              </div>
            </div>
          )}

          {/* ── Preferences Tab ── */}
          {activeTab === 'Preferences' && (
            <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 8 }}>Study Preferences</div>
              <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 20, lineHeight: 1.5 }}>
                Use the same options tutors search with on <strong style={{ color: '#7C3AED' }}>Find Students Who Need Your Help</strong> — subjects, availability, goals, and session format.
              </p>

              <label className="pp-label">Subjects I need help with</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 20 }}>
                {DISCOVERY_SUBJECTS.map(subject => {
                  const selected = form.subjects_needed.includes(subject)
                  return (
                    <button key={subject} type="button" onClick={() => toggleSubject(subject)} style={{
                      padding: '8px 14px', borderRadius: 20, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                      border: selected ? '1.5px solid #7C3AED' : '1.5px solid #E5E7EB',
                      background: selected ? '#F3F0FF' : 'white',
                      color: selected ? '#7C3AED' : '#374151',
                    }}>
                      {subject}
                    </button>
                  )
                })}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                <div>
                  <label className="pp-label"><Target size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Learning goal</label>
                  <select className="pp-input" value={form.study_goals} onChange={e => setForm(p => ({ ...p, study_goals: e.target.value }))}>
                    <option value="">Select a goal...</option>
                    {DISCOVERY_LEARNING_GOALS.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
                <div>
                  <label className="pp-label"><MapPin size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Session format</label>
                  <select className="pp-input" value={form.study_style} onChange={e => setForm(p => ({ ...p, study_style: e.target.value }))}>
                    <option value="">Select format...</option>
                    {DISCOVERY_SESSION_FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="pp-label"><Calendar size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Preferred days</label>
                  <select className="pp-input" value={form.preferred_days} onChange={e => setForm(p => ({ ...p, preferred_days: e.target.value }))}>
                    <option value="">Select days...</option>
                    {DISCOVERY_AVAILABILITY_DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className="pp-label"><Clock size={12} style={{ verticalAlign: -2, marginRight: 4 }} />Preferred time</label>
                  <select className="pp-input" value={form.preferred_time} onChange={e => setForm(p => ({ ...p, preferred_time: e.target.value }))}>
                    <option value="">Select time...</option>
                    {DISCOVERY_AVAILABILITY_TIMES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>

              <button onClick={handleSavePreferences} disabled={saving} style={{
                marginTop: 20, display: 'flex', alignItems: 'center', gap: 6,
                padding: '11px 22px', background: '#7C3AED', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              }}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}
        </div>

        {/* ── Right panel ── */}
        <div className="pp-right">
          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 14 }}>Account Info</div>
            {[
              { icon: Mail,          label: 'Email',   value: email   || '—' },
              { icon: Phone,         label: 'Phone',   value: phone   || '—' },
              { icon: GraduationCap, label: 'Program', value: program || '—' },
              { icon: Calendar,      label: 'Year',    value: year    || '—' },
            ].map(({ icon: Icon, label, value }) => (
              <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F8F9FB' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Icon size={14} color="#7C3AED" />
                </div>
                <div>
                  <div style={{ fontSize: 11.5, color: '#9CA3AF', fontWeight: 600 }}>{label}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: '#1E1B4B' }}>{value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
