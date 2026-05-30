import { useState, useEffect } from 'react'
import { Loader2, Search, Trash2, Download, FileText, Image, File } from 'lucide-react'
import api from '../../api/axiosInstance'

function formatSize(bytes) {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function FileIcon({ mime }) {
  if (!mime) return <File size={15} color="#9CA3AF" />
  if (mime.startsWith('image/')) return <Image size={15} color="#7C3AED" />
  if (mime.includes('pdf'))       return <FileText size={15} color="#EF4444" />
  return <FileText size={15} color="#6B7280" />
}

function formatDate(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default function ResourcesPage() {
  const [resources, setResources] = useState([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [msg,       setMsg]       = useState({ text: '', ok: true })
  const [deleting,  setDeleting]  = useState(null)
  const [meta,      setMeta]      = useState(null)
  const [page,      setPage]      = useState(1)

  const load = async (p = page, q = search) => {
    setLoading(true)
    try {
      const res = await api.get('/admin/resources', { params: { page: p, search: q || undefined, per_page: 20 } })
      setResources(Array.isArray(res.data?.data) ? res.data.data : [])
      setMeta(res.data)
    } catch {
      setMsg({ text: 'Failed to load resources.', ok: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [page])

  const handleSearch = (e) => {
    e.preventDefault()
    setPage(1)
    load(1, search)
  }

  const handleDelete = async (id, title) => {
    if (!confirm(`Delete "${title}"? This cannot be undone.`)) return
    setDeleting(id)
    try {
      await api.delete(`/admin/resources/${id}`)
      setMsg({ text: `"${title}" deleted.`, ok: true })
      load(page, search)
    } catch {
      setMsg({ text: 'Failed to delete resource.', ok: false })
    } finally {
      setDeleting(null)
      setTimeout(() => setMsg({ text: '', ok: true }), 3000)
    }
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 800, color: '#111827', marginBottom: 6 }}>Resources Management</h1>
      <p style={{ fontSize: 13.5, color: '#9CA3AF', marginBottom: 24 }}>
        All platform library files uploaded by tutors and students
      </p>

      {msg.text && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: msg.ok ? '#F0FDF4' : '#FEF2F2', border: `1px solid ${msg.ok ? '#BBF7D0' : '#FECACA'}`, borderRadius: 10, fontSize: 13.5, color: msg.ok ? '#10B981' : '#EF4444' }}>
          {msg.text}
        </div>
      )}

      {/* Search */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or uploader..."
            style={{ width: '100%', padding: '9px 12px 9px 34px', border: '1.5px solid #E5E7EB', borderRadius: 10, fontSize: 13.5, outline: 'none', fontFamily: 'inherit', color: '#374151' }}
          />
        </div>
        <button type="submit" style={{ padding: '9px 20px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, fontSize: 13.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Search
        </button>
      </form>

      {meta && (
        <p style={{ fontSize: 13, color: '#9CA3AF', marginBottom: 16 }}>{meta.total ?? resources.length} total resources</p>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={26} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : resources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#9CA3AF', background: 'white', borderRadius: 16, border: '1px solid #E5E7EB' }}>
          No resources found
        </div>
      ) : (
        <>
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1fr 1fr 1fr', padding: '13px 24px', background: '#F9FAFB', fontWeight: 600, color: '#374151', fontSize: 13.5, borderBottom: '1px solid #E5E7EB' }}>
              <div>Title</div>
              <div>Uploader</div>
              <div>Subject</div>
              <div>Size</div>
              <div>Downloads</div>
              <div>Actions</div>
            </div>

            {resources.map((r) => (
              <div key={r.id} style={{ display: 'grid', gridTemplateColumns: '3fr 2fr 1.5fr 1fr 1fr 1fr', padding: '14px 24px', alignItems: 'center', borderTop: '1px solid #F3F4F6' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <FileIcon mime={r.file_type} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{r.title}</div>
                    <div style={{ fontSize: 11.5, color: '#9CA3AF', marginTop: 1 }}>{formatDate(r.created_at)}</div>
                  </div>
                </div>

                <div style={{ fontSize: 14, color: '#374151' }}>
                  {r.uploader?.name || '—'}
                  <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>{r.uploader?.role || ''}</div>
                </div>

                <div style={{ fontSize: 13.5, color: '#6B7280' }}>{r.subject?.name || '—'}</div>
                <div style={{ fontSize: 13.5, color: '#6B7280' }}>{formatSize(r.file_size)}</div>
                <div style={{ fontSize: 13.5, color: '#6B7280' }}>{r.download_count ?? 0}</div>

                <div style={{ display: 'flex', gap: 8 }}>
                  <a
                    href={`http://127.0.0.1:8000/storage/${r.file_path}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: '#F3F0FF', borderRadius: 8, color: '#7C3AED', textDecoration: 'none' }}
                  >
                    <Download size={15} />
                  </a>
                  <button
                    onClick={() => handleDelete(r.id, r.title)}
                    disabled={deleting === r.id}
                    title="Delete"
                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, background: '#FEE2E2', border: 'none', borderRadius: 8, color: '#DC2626', cursor: 'pointer' }}
                  >
                    {deleting === r.id ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={15} />}
                  </button>
                </div>
              </div>
            ))}
          </div>

          {meta && meta.last_page > 1 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
              <span style={{ fontSize: 13, color: '#9CA3AF' }}>Page {meta.current_page} of {meta.last_page}</span>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={meta.current_page === 1}
                  style={{ padding: '7px 16px', border: '1px solid #E5E7EB', borderRadius: 9, background: 'white', color: '#374151', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', opacity: meta.current_page === 1 ? 0.4 : 1 }}>
                  Previous
                </button>
                <button onClick={() => setPage(p => Math.min(meta.last_page, p + 1))} disabled={meta.current_page === meta.last_page}
                  style={{ padding: '7px 16px', border: '1px solid #E5E7EB', borderRadius: 9, background: 'white', color: '#374151', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', opacity: meta.current_page === meta.last_page ? 0.4 : 1 }}>
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
