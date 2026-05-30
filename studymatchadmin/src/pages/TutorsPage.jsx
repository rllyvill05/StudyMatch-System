import { useEffect, useState } from 'react'
import { BookOpen, Users, FileText, GraduationCap, X, Loader2 } from 'lucide-react'
import { getPendingTutors, approveTutor, rejectTutor } from '../api/user'
import { getAllTutors, getSubjects, assignSubject, updateTutorSubject, removeTutorSubject } from '../api/subjects'

// ── Badges ────────────────────────────────────────────────────────────────────

const VerificationBadge = ({ status }) => {
  const styles = {
    pending:  'bg-amber-100 text-amber-700',
    approved: 'bg-emerald-100 text-emerald-700',
    rejected: 'bg-red-100 text-red-600',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[status] ?? 'bg-gray-100 text-gray-600'}`}>
      {status}
    </span>
  )
}

const TutorTypeBadge = ({ type }) => {
  const styles = {
    professor:     'bg-indigo-50 text-indigo-600',
    instructor:    'bg-blue-50 text-blue-600',
    student_tutor: 'bg-emerald-50 text-emerald-600',
  }
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${styles[type] ?? 'bg-gray-50 text-gray-500'}`}>
      {(type ?? '').replace('_', ' ')}
    </span>
  )
}

const ExpertiseBadge = ({ level }) => {
  const styles = {
    competent:  'bg-gray-100 text-gray-600',
    proficient: 'bg-blue-50 text-blue-600',
    expert:     'bg-indigo-50 text-indigo-600',
    master:     'bg-purple-50 text-purple-700',
  }
  return (
    <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium capitalize ${styles[level] ?? 'bg-gray-100 text-gray-500'}`}>
      {level}
    </span>
  )
}

// ── Helper: parse bio JSON stored during registration ─────────────────────────

function parseBio(bio) {
  if (!bio) return null
  try { return JSON.parse(bio) } catch { return null }
}

// ── Info row ──────────────────────────────────────────────────────────────────

const InfoRow = ({ label, value }) => (
  <div className="flex justify-between py-2 border-b border-gray-50 text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="font-medium text-gray-700 text-right max-w-[60%]">{value || '—'}</span>
  </div>
)

// ── Subject assignment panel ──────────────────────────────────────────────────

function SubjectPanel({ tutor }) {
  const [assigned,    setAssigned]    = useState([])
  const [allSubjects, setAllSubjects] = useState([])
  const [loading,     setLoading]     = useState(true)
  const [adding,      setAdding]      = useState(false)
  const [showAdd,     setShowAdd]     = useState(false)
  const [addForm,     setAddForm]     = useState({ subject_id: '', expertise_level: 'competent', years_teaching: 0 })
  const [removing,    setRemoving]    = useState(null)
  const [editingId,   setEditingId]   = useState(null)
  const [editForm,    setEditForm]    = useState({})
  const [updating,    setUpdating]    = useState(false)
  const [msg,         setMsg]         = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [subRes, catRes] = await Promise.all([
        import('../api/subjects').then(m => m.getTutorSubjects(tutor.id)),
        getSubjects(),
      ])
      setAssigned(subRes.data?.subjects ?? [])
      setAllSubjects(catRes.data?.subjects ?? [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [tutor.id])

  const assignedIds = new Set(assigned.map(s => s.subject_id))
  const unassigned  = allSubjects.filter(s => !assignedIds.has(s.id))

  const flash = (m) => { setMsg(m); setTimeout(() => setMsg(''), 2500) }

  const handleAdd = async () => {
    if (!addForm.subject_id) return
    setAdding(true)
    try {
      await assignSubject(tutor.id, { subject_id: parseInt(addForm.subject_id), expertise_level: addForm.expertise_level, years_teaching: parseInt(addForm.years_teaching) || 0 })
      flash('Subject assigned.')
      setShowAdd(false)
      setAddForm({ subject_id: '', expertise_level: 'competent', years_teaching: 0 })
      load()
    } catch (e) { flash(e.response?.data?.message || 'Failed.') }
    finally { setAdding(false) }
  }

  const handleUpdate = async (ts) => {
    setUpdating(true)
    try {
      await updateTutorSubject(tutor.id, ts.subject_id, editForm)
      flash('Updated.')
      setEditingId(null)
      load()
    } catch { flash('Failed to update.') }
    finally { setUpdating(false) }
  }

  const handleRemove = async (ts) => {
    if (!confirm(`Remove ${ts.subject?.name}?`)) return
    setRemoving(ts.id)
    try {
      await removeTutorSubject(tutor.id, ts.subject_id)
      flash('Removed.')
      setAssigned(a => a.filter(x => x.id !== ts.id))
    } catch { flash('Failed.') }
    finally { setRemoving(null) }
  }

  if (loading) return <div className="flex justify-center py-6"><Loader2 size={18} className="animate-spin text-indigo-400" /></div>

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-xs text-gray-400 font-semibold uppercase tracking-wide">Assigned Subjects</p>
        {unassigned.length > 0 && (
          <button onClick={() => setShowAdd(v => !v)} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">
            + Assign Subject
          </button>
        )}
      </div>

      {msg && <div className="mb-2 text-xs text-emerald-600 font-medium">{msg}</div>}

      {showAdd && (
        <div className="mb-3 bg-indigo-50 border border-indigo-100 rounded-xl p-3 space-y-2">
          <select value={addForm.subject_id} onChange={e => setAddForm(p => ({ ...p, subject_id: e.target.value }))}
            className="w-full border border-gray-200 bg-white rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
            <option value="">Select a subject...</option>
            {unassigned.map(s => <option key={s.id} value={s.id}>{s.name} ({s.code})</option>)}
          </select>
          <div className="flex gap-2">
            <select value={addForm.expertise_level} onChange={e => setAddForm(p => ({ ...p, expertise_level: e.target.value }))}
              className="flex-1 border border-gray-200 bg-white rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400">
              {['competent','proficient','expert','master'].map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
            </select>
            <input type="number" min={0} max={50} value={addForm.years_teaching}
              onChange={e => setAddForm(p => ({ ...p, years_teaching: e.target.value }))}
              placeholder="Yrs" className="w-16 border border-gray-200 bg-white rounded-lg px-2.5 py-2 text-sm text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} disabled={adding || !addForm.subject_id}
              className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium py-2 rounded-lg">
              {adding ? 'Assigning...' : 'Assign'}
            </button>
            <button onClick={() => setShowAdd(false)} className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-xs font-medium py-2 rounded-lg">
              Cancel
            </button>
          </div>
        </div>
      )}

      {assigned.length === 0 ? (
        <div className="text-center py-5 bg-gray-50 rounded-xl">
          <BookOpen size={22} className="text-gray-300 mx-auto mb-1.5" />
          <p className="text-xs text-gray-400">No subjects assigned yet.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {assigned.map(ts => (
            <div key={ts.id} className="bg-gray-50 rounded-xl px-3 py-2.5">
              {editingId === ts.id ? (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-gray-800">{ts.subject?.name}</p>
                  <div className="flex gap-2">
                    <select value={editForm.expertise_level} onChange={e => setEditForm(p => ({ ...p, expertise_level: e.target.value }))}
                      className="flex-1 border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-indigo-400">
                      {['competent','proficient','expert','master'].map(l => <option key={l} value={l} className="capitalize">{l}</option>)}
                    </select>
                    <input type="number" min={0} max={50} value={editForm.years_teaching}
                      onChange={e => setEditForm(p => ({ ...p, years_teaching: e.target.value }))}
                      className="w-14 border border-gray-200 bg-white rounded-lg px-2 py-1.5 text-xs text-center focus:outline-none focus:ring-1 focus:ring-indigo-400" />
                  </div>
                  <div className="flex gap-1.5">
                    <button onClick={() => handleUpdate(ts)} disabled={updating}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium py-1.5 rounded-lg">
                      {updating ? '...' : 'Save'}
                    </button>
                    <button onClick={() => setEditingId(null)}
                      className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-600 text-xs font-medium py-1.5 rounded-lg">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-800 truncate">{ts.subject?.name}</p>
                      <ExpertiseBadge level={ts.expertise_level} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {ts.years_teaching ?? 0} yr{ts.years_teaching !== 1 ? 's' : ''} teaching
                      {ts.is_primary_expertise ? ' · Primary' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => { setEditingId(ts.id); setEditForm({ expertise_level: ts.expertise_level, years_teaching: ts.years_teaching ?? 0 }) }}
                      className="text-xs text-indigo-500 hover:text-indigo-700 font-medium">Edit</button>
                    <button onClick={() => handleRemove(ts)} disabled={removing === ts.id}
                      className="text-red-400 hover:text-red-600 disabled:opacity-40 text-xs font-medium">
                      {removing === ts.id ? '...' : 'Remove'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Review Modal ──────────────────────────────────────────────────────────────

function ReviewModal({ tutor, processing, rejectMsg, setRejectMsg, onApprove, onReject, onClose }) {
  const [tab, setTab] = useState('academic')
  const bio = parseBio(tutor.bio)

  const tabs = [
    { key: 'academic',   label: 'Academic Info',   icon: GraduationCap },
    { key: 'documents',  label: 'Documents',        icon: FileText       },
    { key: 'tutoring',   label: 'Tutoring Details', icon: BookOpen       },
    { key: 'subjects',   label: 'Subjects',         icon: Users          },
  ]

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col">

        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-lg">
              {(tutor.user?.name ?? '?').charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="font-bold text-gray-800">{tutor.user?.name ?? '—'}</p>
              <p className="text-xs text-gray-400">{tutor.user?.email ?? '—'}</p>
            </div>
            <VerificationBadge status={tutor.verification_status ?? 'pending'} />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 px-6 pt-3 border-b border-gray-100 bg-white">
          {tabs.map(t => {
            const Icon = t.icon
            return (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 transition-colors ${
                  tab === t.key ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'
                }`}>
                <Icon size={13} /> {t.label}
              </button>
            )
          })}
        </div>

        {/* Tab content */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">

          {/* ── Academic Info ── */}
          {tab === 'academic' && (
            <div className="space-y-1">
              <InfoRow label="Department / Faculty"        value={bio?.department      ?? tutor.specialization} />
              <InfoRow label="Position"                    value={tutor.position} />
              <InfoRow label="Tutor Type"                  value={tutor.tutor_type?.replace('_', ' ')} />
              <InfoRow label="Employee ID"                 value={tutor.employee_id} />
              <InfoRow label="Years of Experience"         value={bio?.experience} />
              <InfoRow label="Educational Attainment"      value={bio?.education       ?? tutor.credentials} />
              <InfoRow label="Teaching License No."        value={bio?.teaching_license ?? tutor.specialization?.includes('Lic:') ? tutor.specialization : null} />

              <InfoRow label="Dean's List"                 value={tutor.is_deans_list ? 'Yes' : 'No'} />
              {tutor.gpa && <InfoRow label="GPA" value={tutor.gpa} />}
              <InfoRow label="Applied"                     value={tutor.created_at ? new Date(tutor.created_at).toLocaleDateString() : null} />

              {/* Subjects handled during registration */}
              {bio?.subjects?.length > 0 && (
                <div className="pt-2">
                  <p className="text-xs text-gray-400 font-semibold mb-2">Subjects Handled (Self-reported)</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bio.subjects.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Bio / credentials as text if not JSON */}
              {!bio && tutor.bio && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 font-semibold mb-1.5">Bio</p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 leading-relaxed">{tutor.bio}</div>
                </div>
              )}
              {tutor.credentials && !bio && (
                <div className="mt-3">
                  <p className="text-xs text-gray-400 font-semibold mb-1.5">Credentials</p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700 leading-relaxed">{tutor.credentials}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Documents ── */}
          {tab === 'documents' && (
            <div className="space-y-3">
              {tutor.verification_documents && Object.keys(tutor.verification_documents).length > 0 ? (
                Object.entries(tutor.verification_documents).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <FileText size={16} className="text-indigo-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-800 capitalize">{key.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-gray-400 truncate">{typeof val === 'string' ? val : 'Uploaded'}</p>
                    </div>
                    <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">Uploaded</span>
                  </div>
                ))
              ) : (
                <div className="text-center py-10">
                  <FileText size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400 font-medium">No documents uploaded</p>
                  <p className="text-xs text-gray-300 mt-1">The tutor has not submitted verification documents yet.</p>
                </div>
              )}

              {/* Specialization / bio */}
              {tutor.specialization && (
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-1.5">Specialization Notes</p>
                  <div className="bg-gray-50 rounded-lg px-3 py-2 text-sm text-gray-700">{tutor.specialization}</div>
                </div>
              )}
            </div>
          )}

          {/* ── Tutoring Details ── */}
          {tab === 'tutoring' && (
            <div className="space-y-1">
              <InfoRow label="Teaching Style"   value={bio?.teaching_style} />
              <InfoRow label="Teaching Mode"    value={bio?.teaching_mode} />
              <InfoRow label="Consultation Days" value={bio?.days?.join(', ')} />
              <InfoRow label="Hours"
                value={bio?.from_time && bio?.to_time ? `${bio.from_time} – ${bio.to_time}` : null} />

              {bio?.grade_levels?.length > 0 && (
                <div className="pt-3">
                  <p className="text-xs text-gray-400 font-semibold mb-2">Grade Levels Taught</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bio.grade_levels.map(g => (
                      <span key={g} className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-full text-xs font-medium">{g}</span>
                    ))}
                  </div>
                </div>
              )}

              {bio?.subjects?.length > 0 && (
                <div className="pt-3">
                  <p className="text-xs text-gray-400 font-semibold mb-2">Subjects</p>
                  <div className="flex flex-wrap gap-1.5">
                    {bio.subjects.map(s => (
                      <span key={s} className="px-2.5 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-medium">{s}</span>
                    ))}
                  </div>
                </div>
              )}

              {/* Fallback if no bio JSON */}
              {!bio && (
                <div className="text-center py-10">
                  <BookOpen size={32} className="text-gray-300 mx-auto mb-3" />
                  <p className="text-sm text-gray-400">No tutoring details on file.</p>
                  <p className="text-xs text-gray-300 mt-1">This tutor registered before the detailed form was available.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Subjects (admin assignment) ── */}
          {tab === 'subjects' && (
            <div className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
              <SubjectPanel tutor={tutor} />
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="border-t border-gray-100 px-6 py-4 bg-white rounded-b-2xl space-y-3">
          {tutor.verification_status === 'pending' && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1.5">
                Rejection Reason <span className="text-gray-400 font-normal">(optional)</span>
              </p>
              <textarea value={rejectMsg} onChange={e => setRejectMsg(e.target.value)} rows={2}
                placeholder="Provide a reason for rejection..."
                className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400 resize-none" />
            </div>
          )}
          <div className="flex gap-2">
            {tutor.verification_status !== 'approved' && (
              <button onClick={onApprove} disabled={processing}
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors">
                {processing ? 'Processing...' : '✓ Approve Tutor'}
              </button>
            )}
            {tutor.verification_status !== 'rejected' && (
              <button onClick={onReject} disabled={processing}
                className="flex-1 bg-red-50 border border-red-200 text-red-600 text-sm font-medium py-2.5 rounded-lg hover:bg-red-100 disabled:opacity-50 transition-colors">
                {processing ? 'Processing...' : '✕ Reject'}
              </button>
            )}
            <button onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-600 text-sm font-medium py-2.5 rounded-lg hover:bg-gray-200 transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function TutorsPage() {
  const [activeTab,   setActiveTab]   = useState('pending')
  const [tutors,      setTutors]      = useState([])
  const [allTutors,   setAllTutors]   = useState([])
  const [loading,     setLoading]     = useState(true)
  const [allLoading,  setAllLoading]  = useState(true)
  const [error,       setError]       = useState('')
  const [selected,    setSelected]    = useState(null)
  const [actionMsg,   setActionMsg]   = useState('')
  const [rejectMsg,   setRejectMsg]   = useState('')
  const [processing,  setProcessing]  = useState(false)
  const [search,      setSearch]      = useState('')

  const fetchPending = async () => {
    setLoading(true); setError('')
    try {
      const res = await getPendingTutors()
      setTutors(Array.isArray(res.data?.tutors) ? res.data.tutors : [])
    } catch { setError('Failed to load pending tutors.') }
    finally { setLoading(false) }
  }

  const fetchAll = async () => {
    setAllLoading(true)
    try {
      const res = await getAllTutors()
      setAllTutors(Array.isArray(res.data?.tutors) ? res.data.tutors : [])
    } catch {} finally { setAllLoading(false) }
  }

  useEffect(() => { fetchPending(); fetchAll() }, [])

  const handleApprove = async (id) => {
    if (!confirm('Approve this tutor? They will gain full access to the platform.')) return
    setProcessing(true)
    try {
      await approveTutor(id)
      setActionMsg('Tutor approved — they can now log in and access the platform.')
      setSelected(null)
      fetchPending(); fetchAll()
    } catch { setActionMsg('Failed to approve tutor.') }
    finally { setProcessing(false) }
  }

  const handleReject = async (id) => {
    setProcessing(true)
    try {
      await rejectTutor(id, { reason: rejectMsg || 'Application rejected by admin.' })
      setActionMsg('Tutor application rejected.')
      setSelected(null); setRejectMsg('')
      fetchPending(); fetchAll()
    } catch { setActionMsg('Failed to reject tutor.') }
    finally { setProcessing(false) }
  }

  const formatDate = d => d ? new Date(d).toLocaleDateString() : '—'

  const filteredAll = allTutors.filter(t => {
    const q = search.toLowerCase()
    return !q || (t.user?.name ?? '').toLowerCase().includes(q) || (t.user?.email ?? '').toLowerCase().includes(q)
  })

  return (
    <div className="space-y-5">

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tutors</h1>
        <p className="text-gray-500 text-sm mt-1">Review applications and manage tutor subject assignments.</p>
      </div>

      {actionMsg && (
        <div className="bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          {actionMsg}
          <button onClick={() => setActionMsg('')} className="ml-3 text-green-500 hover:text-green-700 font-medium">Dismiss</button>
        </div>
      )}
      {error && <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">{error}</div>}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-100">
        {[
          { key: 'pending', label: `Pending Applications${tutors.length ? ` (${tutors.length})` : ''}` },
          { key: 'all',     label: `All Tutors${allTutors.length ? ` (${allTutors.length})` : ''}` },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab.key ? 'text-indigo-600 border-indigo-600' : 'text-gray-400 border-transparent hover:text-gray-600'
            }`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Pending tab ── */}
      {activeTab === 'pending' && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Type</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Position</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Applied</th>
                <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">Loading...</td></tr>
              ) : tutors.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-10 text-gray-400">No pending applications.</td></tr>
              ) : (
                tutors.map(tutor => (
                  <tr key={tutor.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-xs font-bold">
                          {(tutor.user?.name ?? '?').charAt(0).toUpperCase()}
                        </div>
                        <span className="font-medium text-gray-800">{tutor.user?.name ?? '—'}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500">{tutor.user?.email ?? '—'}</td>
                    <td className="px-5 py-3"><TutorTypeBadge type={tutor.tutor_type} /></td>
                    <td className="px-5 py-3 text-gray-600">{tutor.position ?? '—'}</td>
                    <td className="px-5 py-3"><VerificationBadge status={tutor.verification_status ?? 'pending'} /></td>
                    <td className="px-5 py-3 text-gray-400 text-xs">{formatDate(tutor.created_at)}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => { setSelected(tutor); setRejectMsg('') }}
                        className="text-indigo-600 hover:text-indigo-800 font-medium mr-3">Review</button>
                      <button onClick={() => handleApprove(tutor.id)} disabled={processing}
                        className="text-emerald-600 hover:text-emerald-800 font-medium mr-3 disabled:opacity-40">Approve</button>
                      <button onClick={() => { setSelected(tutor); setRejectMsg('') }}
                        className="text-red-500 hover:text-red-700 font-medium">Reject</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── All Tutors tab ── */}
      {activeTab === 'all' && (
        <>
          <input type="text" placeholder="Search tutors by name or email..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full border border-gray-200 bg-white rounded-lg px-3.5 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400" />
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Name</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Email</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Type</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Status</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Subjects</th>
                  <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allLoading ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">Loading...</td></tr>
                ) : filteredAll.length === 0 ? (
                  <tr><td colSpan={6} className="text-center py-10 text-gray-400">No tutors found.</td></tr>
                ) : (
                  filteredAll.map(tutor => (
                    <tr key={tutor.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 text-xs font-bold">
                            {(tutor.user?.name ?? '?').charAt(0).toUpperCase()}
                          </div>
                          <span className="font-medium text-gray-800">{tutor.user?.name ?? '—'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-gray-500">{tutor.user?.email ?? '—'}</td>
                      <td className="px-5 py-3"><TutorTypeBadge type={tutor.tutor_type} /></td>
                      <td className="px-5 py-3"><VerificationBadge status={tutor.verification_status} /></td>
                      <td className="px-5 py-3 text-gray-500">
                        {(tutor.strong_subjects ?? []).length} subject{(tutor.strong_subjects ?? []).length !== 1 ? 's' : ''}
                      </td>
                      <td className="px-5 py-3">
                        <button onClick={() => { setSelected(tutor); setRejectMsg('') }}
                          className="text-indigo-600 hover:text-indigo-800 font-medium">Manage</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* ── Review Modal ── */}
      {selected && (
        <ReviewModal
          tutor={selected}
          processing={processing}
          rejectMsg={rejectMsg}
          setRejectMsg={setRejectMsg}
          onApprove={() => handleApprove(selected.id)}
          onReject={() => handleReject(selected.id)}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  )
}
