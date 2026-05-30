import { useState, useEffect } from 'react'
import api from '../../api/axiosInstance'
import { Loader2, Search } from 'lucide-react'

export default function UsersPage() {
  const [users,   setUsers]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [role,    setRole]    = useState('')
  const [actionLoading, setActionLoading] = useState(null)

  const load = async () => {
    setLoading(true)
    try {
      const params = {}
      if (search) params.search = search
      if (role)   params.role   = role
      const res = await api.get('/admin/users', { params })
      setUsers(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    load()
  }

  const handleSuspend = async (user) => {
    setActionLoading(user.id)
    try {
      const isSuspended = !!user.suspended_at
      if (isSuspended) {
        await api.post(`/admin/users/${user.id}/unsuspend`)
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended_at: null } : u))
      } else {
        await api.post(`/admin/users/${user.id}/suspend`)
        setUsers(prev => prev.map(u => u.id === user.id ? { ...u, suspended_at: new Date().toISOString() } : u))
      }
    } catch {}
    finally { setActionLoading(null) }
  }

  const getStatus = (user) => {
    if (user.suspended_at) return 'suspended'
    return 'active'
  }

  const STATUS_STYLE = {
    active:    { bg: '#dcfce7', text: '#166534' },
    suspended: { bg: '#fee2e2', text: '#991b1b' },
    pending:   { bg: '#fef3c7', text: '#92400e' },
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 32, fontWeight: 700, color: '#111827', marginBottom: 24 }}>User Management</h1>

      {/* Search / Filter */}
      <form onSubmit={handleSearch} style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <div style={{ position: 'relative', flex: 1 }}>
          <Search size={15} color="#9CA3AF" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
          <input
            type="text" value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by name or email..."
            style={{ width: '100%', padding: '10px 14px 10px 36px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit' }}
          />
        </div>
        <select value={role} onChange={e => setRole(e.target.value)}
          style={{ padding: '10px 14px', border: '1px solid #E5E7EB', borderRadius: 10, fontSize: 14, color: '#374151', outline: 'none', fontFamily: 'inherit', background: 'white' }}>
          <option value="">All Roles</option>
          <option value="student">Students</option>
          <option value="tutor">Tutors</option>
        </select>
        <button type="submit" style={{ padding: '10px 20px', background: '#7C3AED', color: 'white', border: 'none', borderRadius: 10, fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
          Search
        </button>
      </form>

      <div style={{ background: '#ffffff', borderRadius: 20, border: '1px solid #e5e7eb', overflow: 'hidden' }}>
        {/* Table Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '18px 24px', background: '#f9fafb', fontWeight: 600, color: '#374151', fontSize: 14 }}>
          <div>Name</div>
          <div>Email</div>
          <div>Role</div>
          <div>Status</div>
          <div>Actions</div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
            <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : users.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#9CA3AF', fontSize: 14 }}>No users found.</div>
        ) : users.map(user => {
          const status = getStatus(user)
          const ss = STATUS_STYLE[status] || STATUS_STYLE.active
          const isSuspended = !!user.suspended_at
          const isLoading = actionLoading === user.id

          return (
            <div key={user.id} style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 1fr 1fr 1fr', padding: '16px 24px', borderTop: '1px solid #f3f4f6', alignItems: 'center' }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#111827' }}>{user.name}</div>
              <div style={{ fontSize: 13.5, color: '#6B7280' }}>{user.email}</div>
              <div style={{ fontSize: 13.5, textTransform: 'capitalize', color: '#374151' }}>{user.role}</div>
              <div>
                <span style={{ padding: '5px 12px', borderRadius: 999, fontSize: 12.5, fontWeight: 600, background: ss.bg, color: ss.text, textTransform: 'capitalize' }}>
                  {status}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                {user.role !== 'admin' && user.role !== 'super_admin' ? (
                  <button
                    onClick={() => handleSuspend(user)}
                    disabled={isLoading}
                    style={{
                      background: isSuspended ? '#f0fdf4' : '#fee2e2',
                      color:      isSuspended ? '#166534' : '#dc2626',
                      border: 'none', borderRadius: 10, padding: '7px 13px',
                      cursor: isLoading ? 'not-allowed' : 'pointer', fontWeight: 600,
                      fontFamily: 'inherit', fontSize: 12.5, opacity: isLoading ? 0.6 : 1,
                    }}
                  >
                    {isLoading ? '...' : isSuspended ? 'Unsuspend' : 'Suspend'}
                  </button>
                ) : (
                  <span style={{ fontSize: 12, color: '#9CA3AF', fontStyle: 'italic' }}>Protected</span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
