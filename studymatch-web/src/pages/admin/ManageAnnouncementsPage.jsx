import { useState, useEffect } from 'react'
import { Megaphone, Plus, Trash2, Edit2, CheckCircle, Loader2, X } from 'lucide-react'
import { adminGetAnnouncements, adminCreateAnnouncement, adminUpdateAnnouncement, adminDeleteAnnouncement } from '../../api/announcements'

export default function ManageAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState([])
  const [loading,  setLoading]  = useState(true)
  const [title,    setTitle]    = useState('')
  const [content,  setContent]  = useState('')
  const [target,   setTarget]   = useState('all')
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')
  const [success,  setSuccess]  = useState('')
  const [editId,   setEditId]   = useState(null)

  useEffect(() => {
    adminGetAnnouncements()
      .then(data => setAnnouncements(Array.isArray(data?.data) ? data.data : []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const resetForm = () => { setTitle(''); setContent(''); setTarget('all'); setEditId(null) }

  const handleSubmit = async () => {
    if (!title.trim() || !content.trim()) { setError('Please fill in both fields.'); return }
    setSaving(true); setError('')
    try {
      if (editId) {
        const res = await adminUpdateAnnouncement(editId, { title, content, target, status: 'published' })
        const updated = res.announcement || res
        setAnnouncements(prev => prev.map(a => a.id === editId ? updated : a))
        setSuccess('Announcement updated!')
      } else {
        const res = await adminCreateAnnouncement({ title, content, target, status: 'published' })
        const created = res.announcement || res
        setAnnouncements(prev => [created, ...prev])
        setSuccess('Announcement published!')
      }
      resetForm()
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save announcement.')
    } finally {
      setSaving(false)
      setTimeout(() => setSuccess(''), 3000)
    }
  }

  const handleEdit = (a) => {
    setEditId(a.id); setTitle(a.title); setContent(a.content || ''); setTarget(a.target || 'all')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleDelete = async (id) => {
    try {
      await adminDeleteAnnouncement(id)
      setAnnouncements(prev => prev.filter(a => a.id !== id))
    } catch { setError('Failed to delete announcement.') }
  }

  const formatDate = (dt) => dt
    ? new Date(dt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    : ''

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .ann-wrap * { box-sizing: border-box; }
        .ann-wrap { font-family: 'DM Sans', sans-serif; color: #1E1B4B; display: flex; flex-direction: column; gap: 20px; }
        .ann-input { width: 100%; padding: 11px 14px; border: 1.5px solid #E5E7EB; border-radius: 10px; font-size: 14px; color: #374151; outline: none; font-family: 'DM Sans', sans-serif; transition: border-color .15s; }
        .ann-input:focus { border-color: #7C3AED; }
        .ann-textarea { resize: vertical; min-height: 100px; }
        .ann-card { background: white; border: 1px solid #F0F0F4; border-radius: 16px; padding: 20px 22px; transition: box-shadow .18s; }
        .ann-card:hover { box-shadow: 0 4px 18px rgba(124,58,237,.07); }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>

      <div className="ann-wrap">
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 4 }}>Announcements</h1>
          <p style={{ fontSize: 13, color: '#9CA3AF' }}>Create and manage platform-wide announcements.</p>
        </div>

        {/* Create / Edit form */}
        <div style={{ background: 'white', border: '1px solid #F0F0F4', borderRadius: 16, padding: '22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: '#F3F0FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Megaphone size={17} color="#7C3AED" />
              </div>
              <span style={{ fontWeight: 700, fontSize: 16, color: '#1E1B4B' }}>
                {editId ? 'Edit Announcement' : 'Create Announcement'}
              </span>
            </div>
            {editId && (
              <button onClick={resetForm} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}>
                <X size={18} color="#9CA3AF" />
              </button>
            )}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error   && <div style={{ padding: '10px 14px', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, fontSize: 13, color: '#EF4444' }}>{error}</div>}
            {success && <div style={{ padding: '10px 14px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 9, fontSize: 13, color: '#10B981', display: 'flex', alignItems: 'center', gap: 7 }}><CheckCircle size={14} /> {success}</div>}

            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Title</label>
              <input className="ann-input" type="text" placeholder="Announcement title..." value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Content</label>
              <textarea className="ann-input ann-textarea" placeholder="Write your announcement..." value={content} onChange={e => setContent(e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12.5, fontWeight: 600, color: '#6B7280', display: 'block', marginBottom: 6 }}>Target Audience</label>
              <select className="ann-input" value={target} onChange={e => setTarget(e.target.value)}>
                <option value="all">Everyone</option>
                <option value="students">Students only</option>
                <option value="tutors">Tutors only</option>
              </select>
            </div>
            <button onClick={handleSubmit} disabled={saving} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              padding: '12px', background: '#7C3AED', color: 'white',
              border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700,
              cursor: saving ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
              opacity: saving ? 0.7 : 1,
            }}
              onMouseEnter={e => { if (!saving) e.currentTarget.style.background = '#6D28D9' }}
              onMouseLeave={e => { if (!saving) e.currentTarget.style.background = '#7C3AED' }}
            >
              {saving ? <Loader2 size={15} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={16} />}
              {saving ? 'Saving...' : editId ? 'Update Announcement' : 'Publish Announcement'}
            </button>
          </div>
        </div>

        {/* List */}
        <div style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B' }}>
          {loading ? 'Loading...' : `Announcements (${announcements.length})`}
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
            <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
          </div>
        ) : announcements.length === 0 ? (
          <div style={{ background: '#F8F9FB', border: '1px dashed #DDD6FE', borderRadius: 16, padding: '40px 20px', textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>
            No announcements yet. Create your first one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {announcements.map(a => (
              <div key={a.id} className="ann-card">
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: 15, color: '#1E1B4B' }}>{a.title}</span>
                      <span style={{
                        fontSize: 11.5, fontWeight: 700, borderRadius: 20, padding: '2px 9px',
                        background: a.status === 'published' ? '#F0FDF4' : '#FFFBEB',
                        color:      a.status === 'published' ? '#10B981'  : '#F59E0B',
                        border:     a.status === 'published' ? '1px solid #BBF7D0' : '1px solid #FDE68A',
                        textTransform: 'capitalize',
                      }}>
                        {a.status || 'published'}
                      </span>
                      {a.target && a.target !== 'all' && (
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', background: '#F3F4F6', borderRadius: 20, padding: '2px 8px', textTransform: 'capitalize' }}>
                          {a.target} only
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 13.5, color: '#6B7280', lineHeight: 1.6, margin: 0 }}>{a.content}</p>
                    <div style={{ fontSize: 12, color: '#9CA3AF', marginTop: 8 }}>
                      {formatDate(a.published_at || a.created_at)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    <button onClick={() => handleEdit(a)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #E5E7EB', background: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Edit2 size={14} color="#6B7280" />
                    </button>
                    <button onClick={() => handleDelete(a.id)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #FECACA', background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                      <Trash2 size={14} color="#EF4444" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
