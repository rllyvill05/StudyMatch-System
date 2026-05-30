import { useEffect, useState } from 'react'
import { BookOpen, Plus, Pencil, Trash2, X, Check, Loader2, Users } from 'lucide-react'
import { getSubjects, createSubject, updateSubject, deleteSubject } from '../api/subjects'

const EMPTY_FORM = { name: '', code: '', description: '' }

export default function SubjectsPage() {
  const [subjects,   setSubjects]   = useState([])
  const [loading,    setLoading]    = useState(true)
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState('')
  const [success,    setSuccess]    = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState(null)   // null = create, object = edit
  const [form,       setForm]       = useState(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState({})
  const [deleting,   setDeleting]   = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await getSubjects()
      setSubjects(res.data?.subjects ?? [])
    } catch {
      setError('Failed to load subjects.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
    setShowModal(true)
  }

  const openEdit = (subject) => {
    setEditing(subject)
    setForm({ name: subject.name, code: subject.code, description: subject.description ?? '' })
    setFormErrors({})
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditing(null)
    setForm(EMPTY_FORM)
    setFormErrors({})
  }

  const validate = () => {
    const errs = {}
    if (!form.name.trim())  errs.name = 'Name is required.'
    if (!form.code.trim())  errs.code = 'Code is required.'
    return errs
  }

  const handleSave = async () => {
    const errs = validate()
    if (Object.keys(errs).length) { setFormErrors(errs); return }

    setSaving(true)
    setFormErrors({})
    try {
      if (editing) {
        await updateSubject(editing.id, form)
        setSuccess('Subject updated.')
      } else {
        await createSubject(form)
        setSuccess('Subject created.')
      }
      closeModal()
      load()
      setTimeout(() => setSuccess(''), 3000)
    } catch (err) {
      const msg = err.response?.data?.message || (editing ? 'Failed to update.' : 'Failed to create.')
      const apiErrors = err.response?.data?.errors ?? {}
      setFormErrors(
        Object.keys(apiErrors).length
          ? Object.fromEntries(Object.entries(apiErrors).map(([k, v]) => [k, v[0]]))
          : { _global: msg }
      )
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (subject) => {
    if (!confirm(`Delete "${subject.name}"? This will also remove it from all tutor profiles.`)) return
    setDeleting(subject.id)
    try {
      await deleteSubject(subject.id)
      setSuccess('Subject deleted.')
      setSubjects(s => s.filter(x => x.id !== subject.id))
      setTimeout(() => setSuccess(''), 3000)
    } catch {
      setError('Failed to delete subject.')
    } finally {
      setDeleting(null)
    }
  }

  const expertiseLevelColor = (level) => {
    const map = {
      competent:  'bg-gray-100 text-gray-600',
      proficient: 'bg-blue-50 text-blue-600',
      expert:     'bg-indigo-50 text-indigo-600',
      master:     'bg-purple-50 text-purple-700',
    }
    return map[level] ?? 'bg-gray-100 text-gray-500'
  }

  return (
    <div className="space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Subjects</h1>
          <p className="text-gray-500 text-sm mt-1">Manage the subjects catalog available for tutors and students.</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <Plus size={15} /> Add Subject
        </button>
      </div>

      {/* Feedback */}
      {success && (
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-3">
          <Check size={14} /> {success}
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3">
          {error}
          <button onClick={() => setError('')} className="ml-3 text-red-400 hover:text-red-600 font-medium">Dismiss</button>
        </div>
      )}

      {/* Stats bar */}
      {!loading && (
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Total Subjects', value: subjects.length, color: 'text-indigo-600' },
            { label: 'Covered by Tutors', value: subjects.filter(s => (s.tutor_count ?? 0) > 0).length, color: 'text-emerald-600' },
            { label: 'Avg Tutors / Subject', value: subjects.length ? (subjects.reduce((a, s) => a + (s.tutor_count ?? 0), 0) / subjects.length).toFixed(1) : '0', color: 'text-blue-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-5 py-4">
              <div className={`text-2xl font-bold ${color}`}>{value}</div>
              <div className="text-xs text-gray-400 mt-1">{label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Subject</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Code</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Description</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Tutors</th>
              <th className="text-left px-5 py-3 text-gray-500 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">Loading subjects...</td>
              </tr>
            ) : subjects.length === 0 ? (
              <tr>
                <td colSpan={5} className="text-center py-10 text-gray-400">
                  No subjects found. Add one to get started.
                </td>
              </tr>
            ) : (
              subjects.map(subject => (
                <tr key={subject.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={13} className="text-indigo-500" />
                      </div>
                      <span className="font-semibold text-gray-800">{subject.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="font-mono text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-md">{subject.code}</span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 max-w-xs truncate">
                    {subject.description || <span className="text-gray-300 italic">—</span>}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5 text-gray-500">
                      <Users size={13} />
                      <span className="font-medium">{subject.tutor_count ?? 0}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <button
                      onClick={() => openEdit(subject)}
                      className="text-indigo-500 hover:text-indigo-700 mr-3 transition-colors"
                      title="Edit"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(subject)}
                      disabled={deleting === subject.id}
                      className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                      title="Delete"
                    >
                      {deleting === subject.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">

            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-800">
                {editing ? 'Edit Subject' : 'Add Subject'}
              </h2>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {formErrors._global && (
              <div className="mb-4 bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-3 py-2">
                {formErrors._global}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subject Name *</label>
                <input
                  type="text"
                  value={form.name}
                  onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                  placeholder="e.g. Mathematics"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 ${formErrors.name ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                />
                {formErrors.name && <p className="text-red-500 text-xs mt-1">{formErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Subject Code *</label>
                <input
                  type="text"
                  value={form.code}
                  onChange={e => setForm(p => ({ ...p, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. MATH101"
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-indigo-400 ${formErrors.code ? 'border-red-300 bg-red-50' : 'border-gray-200 bg-gray-50'}`}
                />
                {formErrors.code && <p className="text-red-500 text-xs mt-1">{formErrors.code}</p>}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1.5">Description <span className="font-normal text-gray-400">(optional)</span></label>
                <textarea
                  value={form.description}
                  onChange={e => setForm(p => ({ ...p, description: e.target.value }))}
                  rows={3}
                  placeholder="Brief description of this subject..."
                  className="w-full border border-gray-200 bg-gray-50 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {saving ? 'Saving...' : (editing ? 'Save Changes' : 'Create Subject')}
              </button>
              <button
                onClick={closeModal}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-600 text-sm font-medium py-2.5 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
