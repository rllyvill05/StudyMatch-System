import { useState, useEffect } from 'react'
import { useRef } from 'react'
import { getProfile, updateProfile, uploadAvatar, addTutorSubject, removeTutorSubject } from '../../api/profile'
import { getSubjects } from '../../api/subjects'
import { getUser, saveAuth, getToken } from '../../store/authStore'
import {
  Camera, Pencil, Star, BadgeCheck,
  GraduationCap, Briefcase, FileText, Globe,
  Calendar, BookOpen, Users, Plus, X, ChevronDown,
  Trophy, CheckCircle, Eye, Loader2, Save,
} from 'lucide-react'

// Parse JSON bio stored during registration
function parseTutorBio(bio) {
  if (!bio) return null
  try { return JSON.parse(bio) } catch { return null }
}

// Extract readable personal bio (not the JSON registration blob)
function getPersonalBio(bio) {
  const parsed = parseTutorBio(bio)
  if (parsed) return parsed.personal_bio || ''
  return bio || ''
}

const ABOUT_KEYS = [
  { icon: GraduationCap, label: 'Department / Faculty', bioKey: 'department',   tutorKey: null,            color: '#7C3AED', bg: '#F3F0FF' },
  { icon: Briefcase,     label: 'Position',             bioKey: null,            tutorKey: 'position',      color: '#10B981', bg: '#F0FDF4' },
  { icon: FileText,      label: 'Educational Attainment',bioKey: 'education',    tutorKey: 'credentials',   color: '#6366F1', bg: '#EEF2FF' },
  { icon: Globe,         label: 'Years of Experience',  bioKey: 'experience',    tutorKey: null,            color: '#F59E0B', bg: '#FFFBEB' },
]

function getAchievements(tutor) {
  return [
    {
      icon: Trophy, label: 'Top Tutor', sub: '10+ sessions',
      earned: (tutor?.total_sessions || 0) >= 10,
      color: '#F59E0B', bg: '#FFFBEB',
    },
    {
      icon: CheckCircle, label: 'Verified', sub: 'Identity verified',
      earned: tutor?.verification_status === 'approved',
      color: '#10B981', bg: '#F0FDF4',
    },
    {
      icon: Star, label: 'Highly Rated', sub: '4.5+ average',
      earned: parseFloat(tutor?.average_rating || 0) >= 4.5,
      color: '#7C3AED', bg: '#F3F0FF',
    },
  ]
}

function Stars({ rating = 0, size = 14 }) {
  return (
    <div style={{ display: 'flex', gap: 2 }}>
      {[1,2,3,4,5].map(i => (
        <Star key={i} size={size} color="#F59E0B" fill={i <= Math.round(rating) ? '#F59E0B' : 'none'} />
      ))}
    </div>
  )
}

const PROFILE_TABS = ['Profile', 'Subjects & Expertise', 'Availability', 'Preferences', 'Account']

export default function TutorProfilePage() {
  const authUser  = getUser()
  const avatarRef = useRef(null)
  const [profile,         setProfile]         = useState(null)
  const [loading,         setLoading]         = useState(true)
  const [saving,          setSaving]          = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarError,     setAvatarError]     = useState(false)
  const [activeTab,       setActiveTab]       = useState('Profile')
  const [success,         setSuccess]         = useState('')
  const [error,           setError]           = useState('')

  const [form, setForm] = useState({
    name: '', bio: '', phone: '',
    position: '', specialization: '', tutor_type: '', credentials: '',
    is_available: true,
  })
  const [bioData, setBioData] = useState(null)

  // Subject management
  const [allSubjects,      setAllSubjects]      = useState([])
  const [showSubjectModal, setShowSubjectModal] = useState(false)
  const [subjectPick,      setSubjectPick]      = useState('')
  const [expertisePick,    setExpertisePick]    = useState('proficient')
  const [addingSubject,    setAddingSubject]    = useState(false)
  const [removingId,       setRemovingId]       = useState(null)
  const [subjectMsg,       setSubjectMsg]       = useState('')

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const [res, subjectRes] = await Promise.all([getProfile(), getSubjects()])
        const data = res?.user || res || {}
        setProfile(data)
        const sub    = data.tutor || {}
        const parsed = parseTutorBio(sub.bio)
        setBioData(parsed)
        setForm({
          name:           data.name              || authUser?.name || '',
          bio:            parsed ? (parsed.personal_bio || '') : (sub.bio || data.bio || ''),
          phone:          data.phone             || '',
          position:       sub.position           || '',
          specialization: sub.specialization     || '',
          tutor_type:     sub.tutor_type         || '',
          credentials:    sub.credentials        || '',
          is_available:   sub.is_available       ?? true,
        })
        const subList = Array.isArray(subjectRes) ? subjectRes : (subjectRes?.data || [])
        setAllSubjects(subList)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const handleSave = async () => {
    setSaving(true); setError(''); setSuccess('')
    try {
      // If bio was originally JSON registration data, merge personal_bio into it
      const savedBio = bioData
        ? JSON.stringify({ ...bioData, personal_bio: form.bio })
        : form.bio
      await updateProfile({ ...form, bio: savedBio })
      setProfile(p => ({ ...p, name: form.name, phone: form.phone,
        tutor: { ...(p?.tutor || {}), bio: savedBio, position: form.position,
          specialization: form.specialization, tutor_type: form.tutor_type,
          credentials: form.credentials } }))
      if (bioData) setBioData(d => ({ ...d, personal_bio: form.bio }))
      saveAuth(getToken(), { ...authUser, name: form.name })
      setSuccess('Profile updated!')
      setActiveTab('Profile')
      setTimeout(() => setSuccess(''), 3000)
    } catch { setError('Failed to update profile.') }
    finally { setSaving(false) }
  }

  const handleAddSubject = async () => {
    if (!subjectPick) return
    setAddingSubject(true); setSubjectMsg('')
    try {
      const res = await addTutorSubject(Number(subjectPick), expertisePick)
      if (res?.success) {
        // Optimistically append new subject to profile state
        const newSub = res.subject
        setProfile(p => ({
          ...p,
          tutor: {
            ...(p?.tutor || {}),
            strong_subjects: [...(p?.tutor?.strong_subjects || []), newSub],
          },
        }))
        setSubjectMsg('Subject added successfully!')
        setSubjectPick(''); setExpertisePick('proficient')
        setTimeout(() => { setShowSubjectModal(false); setSubjectMsg('') }, 1000)
      }
    } catch {
      setSubjectMsg('Failed to add subject. Please try again.')
    } finally {
      setAddingSubject(false)
    }
  }

  const handleRemoveSubject = async (tutorSubjectId) => {
    setRemovingId(tutorSubjectId)
    try {
      await removeTutorSubject(tutorSubjectId)
      setProfile(p => ({
        ...p,
        tutor: {
          ...(p?.tutor || {}),
          strong_subjects: (p?.tutor?.strong_subjects || []).filter(s => s.id !== tutorSubjectId),
        },
      }))
    } catch {
      setError('Failed to remove subject.')
    } finally {
      setRemovingId(null)
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

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const name     = profile?.name                           || authUser?.name || 'Tutor'
  const email    = profile?.email                          || authUser?.email || ''
  const bio      = bioData ? (bioData.personal_bio || '') : (profile?.tutor?.bio || profile?.bio || '')
  const rating   = parseFloat(profile?.tutor?.average_rating || 0)
  const sessions = profile?.tutor?.total_sessions           || 0
  const subjects = profile?.tutor?.strong_subjects?.length  || 0
  const reviews  = profile?.tutor?.reviews                  || []
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .tp-wrap * { box-sizing: border-box; }
        .tp-wrap { font-family: 'DM Sans', sans-serif; color: #1E1B4B; display: flex; gap: 24px; align-items: flex-start; }
        .tp-main { flex: 1; display: flex; flex-direction: column; gap: 20px; min-width: 0; }
        .tp-right { width: 280px; flex-shrink: 0; display: flex; flex-direction: column; gap: 16px; }
        .tp-tab { padding: 9px 2px; font-size: 13.5px; font-weight: 600; color: #9CA3AF; cursor: pointer; border: none; border-bottom: 2.5px solid transparent; background: none; font-family: 'DM Sans', sans-serif; transition: color .15s; white-space: nowrap; }
        .tp-tab.active { color: #7C3AED; border-bottom-color: #7C3AED; }
        .tp-tab:hover { color: #7C3AED; }
        .about-row { display: flex; align-items: flex-start; gap: 12px; padding: 10px 0; border-bottom: 1px solid #F8F9FB; }
        .about-row:last-child { border-bottom: none; }
        .tp-input { width: 100%; padding: 10px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; color: #374151; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color .15s; }
        .tp-input:focus { border-color: #7C3AED; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="tp-wrap">
        <div className="tp-main">
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>My Profile</h1>
            <p style={{ fontSize: 13, color: '#9CA3AF' }}>Manage your profile, subjects, availability, and tutoring preferences.</p>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', borderBottom: '1px solid #F0F0F4' }}>
            <div style={{ display: 'flex', gap: 24, flex: 1, overflowX: 'auto' }}>
              {PROFILE_TABS.map(t => <button key={t} className={`tp-tab${activeTab === t ? ' active' : ''}`} onClick={() => setActiveTab(t)}>{t}</button>)}
            </div>
            <div style={{ display: 'flex', gap: 10, flexShrink: 0, paddingBottom: 2 }}>
              <button style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', border: '1px solid #E5E7EB', borderRadius: 9, background: 'white', color: '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                <Eye size={14} color="#7C3AED" /> Preview
              </button>
              <button onClick={() => setActiveTab('Account')} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 16px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={e => e.currentTarget.style.background = '#6D28D9'}
                onMouseLeave={e => e.currentTarget.style.background = '#7C3AED'}
              >
                <Pencil size={13} /> Edit Profile
              </button>
            </div>
          </div>

          {success && <div style={{ padding: '10px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 13.5, color: '#10B981', display: 'flex', alignItems: 'center', gap: 7 }}><CheckCircle size={14} /> {success}</div>}
          {error   && <div style={{ padding: '10px 16px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 10, fontSize: 13.5, color: '#EF4444' }}>{error}</div>}

          {/* Profile hero */}
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
                  <div style={{ width: 90, height: 90, borderRadius: '50%', background: 'linear-gradient(135deg, #EDE9FE, #DDD6FE)', border: '3px solid #DDD6FE', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 30, color: '#7C3AED' }}>
                    {initials}
                  </div>
                )}
                <button onClick={() => avatarRef.current?.click()} disabled={uploadingAvatar} style={{ position: 'absolute', bottom: 2, right: 2, width: 26, height: 26, borderRadius: '50%', background: '#7C3AED', border: '2px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                  {uploadingAvatar ? <Loader2 size={11} color="white" style={{ animation: 'spin 1s linear infinite' }} /> : <Camera size={12} color="white" />}
                </button>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 5 }}>
                  <span style={{ fontWeight: 800, fontSize: 22, color: '#1E1B4B' }}>{name}</span>
                  {profile?.tutor?.verification_status === 'approved' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, background: '#F3F0FF', border: '1px solid #DDD6FE', borderRadius: 20, padding: '3px 10px' }}>
                      <BadgeCheck size={13} color="#7C3AED" />
                      <span style={{ fontSize: 12, fontWeight: 700, color: '#7C3AED' }}>Verified Tutor</span>
                    </div>
                  )}
                </div>
                {email && <div style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 6 }}>{email}</div>}
                {rating > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                    <Stars rating={rating} />
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{rating.toFixed(1)}</span>
                    {reviews.length > 0 && <span style={{ fontSize: 12, color: '#9CA3AF' }}>({reviews.length} reviews)</span>}
                  </div>
                )}
                {bio && <div style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.6, fontStyle: 'italic', maxWidth: 400 }}>{bio}</div>}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', borderTop: '1px solid #F0F0F4', paddingTop: 20 }}>
              {[
                { icon: Star,     color: '#F59E0B', bg: '#FFFBEB', label: 'Student Rating',  value: rating > 0 ? rating.toFixed(1) : '—' },
                { icon: Calendar, color: '#7C3AED', bg: '#F3F0FF', label: 'Total Sessions',  value: sessions },
                { icon: BookOpen, color: '#6366F1', bg: '#EEF2FF', label: 'Subjects',        value: subjects  },
                { icon: Users,    color: '#10B981', bg: '#F0FDF4', label: 'Students Helped', value: profile?.tutor?.total_sessions || 0 },
              ].map(({ icon: Icon, color, bg, label, value }, i) => (
                <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: i === 0 ? '0 24px 0 0' : i === 3 ? '0 0 0 24px' : '0 24px', borderRight: i < 3 ? '1px solid #F0F0F4' : 'none' }}>
                  <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Icon size={18} color={color} />
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>{label}</div>
                    <div style={{ fontSize: 24, fontWeight: 800, color: '#1E1B4B', lineHeight: 1 }}>{value}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Profile tab — About Me + Reviews */}
          {activeTab === 'Profile' && (
            <>
              <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '20px 22px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <span style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B' }}>About Me</span>
                  <button onClick={() => setActiveTab('Account')} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'none', border: 'none', color: '#7C3AED', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                    <Pencil size={12} /> Edit
                  </button>
                </div>
                {ABOUT_KEYS.map(({ icon: Icon, label, bioKey, tutorKey, color, bg }) => {
                  const val = (bioKey && bioData?.[bioKey]) || (tutorKey && (profile?.tutor?.[tutorKey] || profile?.[tutorKey])) || null
                  return (
                    <div key={label} className="about-row">
                      <div style={{ width: 32, height: 32, borderRadius: 8, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <Icon size={14} color={color} />
                      </div>
                      <div>
                        <div style={{ fontSize: 11.5, color: '#9CA3AF', fontWeight: 600, marginBottom: 3 }}>{label}</div>
                        <div style={{ fontSize: 13.5, color: val ? '#374151' : '#D1D5DB', fontWeight: 500 }}>
                          {val || 'Not set'}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {/* Registration teaching details from bio JSON */}
                {bioData && (bioData.teaching_style || bioData.teaching_mode || bioData.days?.length || bioData.grade_levels?.length) && (
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid #F8F9FB' }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#9CA3AF', marginBottom: 10 }}>TEACHING DETAILS</div>
                    {[
                      { label: 'Teaching Mode',  value: bioData.teaching_mode },
                      { label: 'Teaching Style', value: bioData.teaching_style },
                      { label: 'Consultation',   value: bioData.days?.length ? `${bioData.days.join(', ')} · ${bioData.from_time} – ${bioData.to_time}` : null },
                      { label: 'Grade Levels',   value: bioData.grade_levels?.join(', ') },
                    ].filter(r => r.value).map(({ label, value }) => (
                      <div key={label} style={{ display: 'flex', gap: 12, padding: '7px 0', borderBottom: '1px solid #F8F9FB' }}>
                        <span style={{ fontSize: 12, color: '#9CA3AF', fontWeight: 600, width: 120, flexShrink: 0 }}>{label}</span>
                        <span style={{ fontSize: 13, color: '#374151', fontWeight: 500 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {reviews.length > 0 && (
                <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '20px 24px' }}>
                  <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 16 }}>Recent Reviews</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {reviews.slice(0, 3).map((r, i) => {
                      const reviewer = r.reviewer?.name || r.student?.user?.name || r.student?.name || r.user?.name || 'Student'
                      return (
                        <div key={i} style={{ background: '#F8F9FB', borderRadius: 12, padding: '14px 16px' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontWeight: 700, fontSize: 13.5, color: '#1E1B4B' }}>{reviewer}</span>
                            <Stars rating={r.rating || 5} size={12} />
                          </div>
                          {r.comment && <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.5, margin: 0 }}>{r.comment}</p>}
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </>
          )}

          {/* Subjects & Expertise tab */}
          {activeTab === 'Subjects & Expertise' && (
            <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <span style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B' }}>Subjects & Expertise</span>
                <button onClick={() => { setShowSubjectModal(true); setSubjectMsg('') }} style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '8px 16px', background: '#7C3AED', color: 'white',
                  border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'inherit',
                }}>
                  <Plus size={14} /> Add Subject
                </button>
              </div>

              {(profile?.tutor?.strong_subjects || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '36px 0', color: '#9CA3AF', fontSize: 14 }}>
                  <BookOpen size={32} color="#DDD6FE" style={{ margin: '0 auto 12px', display: 'block' }} />
                  <div style={{ fontWeight: 600, marginBottom: 6 }}>No subjects added yet</div>
                  <div style={{ fontSize: 13 }}>Click <strong>Add Subject</strong> to select from the admin-defined subject list.</div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
                  {(profile?.tutor?.strong_subjects || []).map((s, i, arr) => {
                    const subjectName = s.subject?.name || s.name || 'Unknown Subject'
                    const levelColors = {
                      competent: '#10B981', proficient: '#6366F1',
                      expert: '#F59E0B', master: '#7C3AED',
                    }
                    const lc = levelColors[s.expertise_level] || '#6366F1'
                    return (
                      <div key={s.id || i} style={{
                        display: 'flex', alignItems: 'center', gap: 14,
                        padding: '12px 0',
                        borderBottom: i < arr.length - 1 ? '1px solid #F8F9FB' : 'none',
                      }}>
                        <div style={{ width: 38, height: 38, borderRadius: 10, background: '#EEF2FF', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <BookOpen size={16} color="#6366F1" />
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 14, color: '#1E1B4B' }}>{subjectName}</div>
                          {s.expertise_level && (
                            <span style={{
                              display: 'inline-block', marginTop: 3,
                              padding: '2px 8px', borderRadius: 12, fontSize: 11.5, fontWeight: 700,
                              background: lc + '18', color: lc, border: `1px solid ${lc}33`,
                              textTransform: 'capitalize',
                            }}>
                              {s.expertise_level}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveSubject(s.id)}
                          disabled={removingId === s.id}
                          title="Remove subject"
                          style={{
                            width: 28, height: 28, borderRadius: '50%',
                            background: '#FEF2F2', border: '1px solid #FECACA', color: '#EF4444',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            cursor: removingId === s.id ? 'not-allowed' : 'pointer',
                            opacity: removingId === s.id ? 0.5 : 1, flexShrink: 0,
                          }}>
                          {removingId === s.id
                            ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} />
                            : <X size={12} />}
                        </button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Add Subject Modal */}
          {showSubjectModal && (
            <div style={{
              position: 'fixed', inset: 0, zIndex: 1000,
              background: 'rgba(0,0,0,0.4)', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }} onClick={e => { if (e.target === e.currentTarget) setShowSubjectModal(false) }}>
              <div style={{
                background: 'white', borderRadius: 18, padding: '28px 30px',
                width: 420, maxWidth: '92vw', boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
                fontFamily: "'DM Sans', sans-serif",
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 18, color: '#1E1B4B' }}>Add Subject</div>
                    <div style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 2 }}>
                      Select from admin-defined subjects
                    </div>
                  </div>
                  <button onClick={() => setShowSubjectModal(false)} style={{
                    width: 30, height: 30, borderRadius: '50%', background: '#F3F4F6',
                    border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <X size={14} color="#6B7280" />
                  </button>
                </div>

                {/* Subject dropdown */}
                <div style={{ marginBottom: 16 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Subject</label>
                  <div style={{ position: 'relative' }}>
                    <select
                      value={subjectPick}
                      onChange={e => setSubjectPick(e.target.value)}
                      style={{
                        width: '100%', padding: '10px 32px 10px 14px',
                        border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 14,
                        color: subjectPick ? '#374151' : '#9CA3AF', outline: 'none',
                        fontFamily: 'inherit', background: 'white', appearance: 'none', cursor: 'pointer',
                      }}>
                      <option value="">— Choose a subject —</option>
                      {allSubjects
                        .filter(s => !(profile?.tutor?.strong_subjects || []).some(ss => ss.subject?.id === s.id || ss.subject_id === s.id))
                        .map(s => <option key={s.id} value={s.id}>{s.name}{s.code ? ` (${s.code})` : ''}</option>)
                      }
                    </select>
                    <ChevronDown size={14} color="#9CA3AF" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  </div>
                </div>

                {/* Expertise level */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 8 }}>Expertise Level</label>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { val: 'competent',  label: 'Competent',  desc: 'Solid foundation', color: '#10B981' },
                      { val: 'proficient', label: 'Proficient', desc: 'Strong knowledge', color: '#6366F1' },
                      { val: 'expert',     label: 'Expert',     desc: 'Advanced mastery', color: '#F59E0B' },
                      { val: 'master',     label: 'Master',     desc: 'Top-level expert', color: '#7C3AED' },
                    ].map(({ val, label, desc, color }) => (
                      <div key={val}
                        onClick={() => setExpertisePick(val)}
                        style={{
                          padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                          border: expertisePick === val ? `2px solid ${color}` : '1.5px solid #E5E7EB',
                          background: expertisePick === val ? color + '0D' : '#FAFAFA',
                          transition: 'all .15s',
                        }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: expertisePick === val ? color : '#374151' }}>{label}</div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{desc}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {subjectMsg && (
                  <div style={{
                    marginBottom: 14, padding: '8px 12px', borderRadius: 8, fontSize: 13,
                    background: subjectMsg.includes('success') ? '#F0FDF4' : '#FEF2F2',
                    border: `1px solid ${subjectMsg.includes('success') ? '#BBF7D0' : '#FECACA'}`,
                    color: subjectMsg.includes('success') ? '#10B981' : '#EF4444',
                  }}>
                    {subjectMsg}
                  </div>
                )}

                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => setShowSubjectModal(false)} style={{
                    flex: 1, padding: '11px', background: 'white', color: '#374151',
                    border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}>
                    Cancel
                  </button>
                  <button onClick={handleAddSubject} disabled={!subjectPick || addingSubject} style={{
                    flex: 2, padding: '11px', background: subjectPick ? '#7C3AED' : '#D1D5DB',
                    color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                    cursor: subjectPick ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    opacity: addingSubject ? 0.7 : 1,
                  }}>
                    {addingSubject
                      ? <><Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> Adding…</>
                      : <><Plus size={15} /> Add Subject</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Availability tab */}
          {activeTab === 'Availability' && (
            <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '20px 22px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 16 }}>Availability Schedule</div>
              {(profile?.tutor?.availability || []).length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>
                  <Calendar size={32} color="#DDD6FE" style={{ margin: '0 auto 12px', display: 'block' }} />
                  No availability slots set yet.
                </div>
              ) : (profile?.tutor?.availability || []).map((slot, i, arr) => (
                <div key={slot.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '12px 0', borderBottom: i < arr.length - 1 ? '1px solid #F8F9FB' : 'none' }}>
                  <div style={{ width: 38, height: 38, borderRadius: 10, background: '#F0FDF4', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <Calendar size={16} color="#10B981" />
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14, color: '#1E1B4B', textTransform: 'capitalize' }}>{slot.day_of_week}</div>
                    <div style={{ fontSize: 12.5, color: '#9CA3AF', marginTop: 2 }}>{slot.start_time} – {slot.end_time}</div>
                  </div>
                  <span style={{
                    fontSize: 12, fontWeight: 700,
                    color: slot.is_active ? '#10B981' : '#9CA3AF',
                    background: slot.is_active ? '#F0FDF4' : '#F9FAFB',
                    border: `1px solid ${slot.is_active ? '#BBF7D0' : '#E5E7EB'}`,
                    borderRadius: 20, padding: '3px 12px',
                  }}>
                    {slot.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Preferences tab */}
          {activeTab === 'Preferences' && (
            <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 20 }}>Tutoring Preferences</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#1E1B4B', marginBottom: 3 }}>Available for Sessions</div>
                    <div style={{ fontSize: 12.5, color: '#9CA3AF' }}>Toggle off to temporarily pause new session requests.</div>
                  </div>
                  <div
                    onClick={() => setForm(p => ({ ...p, is_available: !p.is_available }))}
                    style={{
                      width: 44, height: 24, borderRadius: 12, flexShrink: 0,
                      background: form.is_available ? '#7C3AED' : '#D1D5DB',
                      position: 'relative', cursor: 'pointer', transition: 'background .2s',
                    }}
                  >
                    <div style={{
                      position: 'absolute', top: 3,
                      left: form.is_available ? 23 : 3,
                      width: 18, height: 18, borderRadius: '50%',
                      background: 'white', transition: 'left .2s',
                      boxShadow: '0 1px 3px rgba(0,0,0,.2)',
                    }} />
                  </div>
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} style={{
                marginTop: 24, display: 'flex', alignItems: 'center', gap: 6,
                padding: '11px 22px', background: '#7C3AED', color: 'white',
                border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
                cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                {saving ? 'Saving...' : 'Save Preferences'}
              </button>
            </div>
          )}

          {/* Account tab — Edit form */}
          {activeTab === 'Account' && (
            <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '24px 28px' }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 18 }}>Edit Profile</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                {[
                  { key: 'name',           label: 'Full Name'      },
                  { key: 'phone',          label: 'Phone'          },
                  { key: 'position',       label: 'Position'       },
                  { key: 'specialization', label: 'Specialization' },
                  { key: 'tutor_type',     label: 'Tutor Type'     },
                ].map(({ key, label }) => (
                  <div key={key}>
                    <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>{label}</label>
                    <input className="tp-input" value={form[key]} onChange={e => setForm(p => ({ ...p, [key]: e.target.value }))} placeholder={label} />
                  </div>
                ))}
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Credentials</label>
                  <input className="tp-input" value={form.credentials} onChange={e => setForm(p => ({ ...p, credentials: e.target.value }))} placeholder="e.g. PhD in Mathematics, 8 years experience" />
                </div>
                <div style={{ gridColumn: '1 / -1' }}>
                  <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Bio</label>
                  <textarea className="tp-input" rows={4} value={form.bio} onChange={e => setForm(p => ({ ...p, bio: e.target.value }))} placeholder="Tell students about yourself..." style={{ resize: 'vertical' }} />
                </div>
              </div>
              <button onClick={handleSave} disabled={saving} style={{ marginTop: 20, display: 'flex', alignItems: 'center', gap: 6, padding: '11px 22px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit', opacity: saving ? 0.7 : 1 }}>
                {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={15} />}
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="tp-right">
          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 16 }}>Achievements</div>
            <div style={{ display: 'flex', justifyContent: 'space-around' }}>
              {getAchievements(profile?.tutor).map(({ icon: Icon, color, bg, label, sub, earned }) => (
                <div key={label} style={{ textAlign: 'center' }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: earned ? bg : '#F3F4F6', border: `2px solid ${earned ? color + '33' : '#E5E7EB'}`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 8px', transition: 'all .2s' }}>
                    <Icon size={24} color={earned ? color : '#D1D5DB'} />
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: earned ? '#1E1B4B' : '#9CA3AF' }}>{label}</div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Quick info card */}
          <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '18px 20px' }}>
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B', marginBottom: 14 }}>Tutor Info</div>
            {[
              { label: 'Verification', value: profile?.tutor?.verification_status === 'approved' ? 'Approved' : profile?.tutor?.verification_status || 'Pending', color: profile?.tutor?.verification_status === 'approved' ? '#10B981' : '#F59E0B' },
              { label: 'Availability', value: profile?.tutor?.is_available ? 'Available' : 'Unavailable', color: profile?.tutor?.is_available ? '#10B981' : '#EF4444' },
              { label: 'Member Since', value: profile?.created_at ? new Date(profile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '—', color: '#374151' },
            ].map(({ label, value, color }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #F8F9FB' }}>
                <span style={{ fontSize: 12.5, color: '#9CA3AF', fontWeight: 600 }}>{label}</span>
                <span style={{ fontSize: 13, fontWeight: 700, color }}>{value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
