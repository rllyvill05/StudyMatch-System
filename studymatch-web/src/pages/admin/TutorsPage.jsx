import { useState, useEffect } from 'react'
import { Loader2, CheckCircle, XCircle, GraduationCap, Users } from 'lucide-react'
import api from '../../api/axiosInstance'

export default function TutorsPage() {
  const [tab,          setTab]          = useState('pending')
  const [pending,      setPending]      = useState([])
  const [all,          setAll]          = useState([])
  const [loading,      setLoading]      = useState(true)
  const [actionId,     setActionId]     = useState(null)
  const [msg,          setMsg]          = useState('')

  const load = async () => {
    setLoading(true)
    try {
      const [pendingRes, allRes] = await Promise.allSettled([
        api.get('/admin/tutors/pending'),
        api.get('/admin/users', { params: { role: 'tutor' } }),
      ])
      if (pendingRes.status === 'fulfilled') {
        const d = pendingRes.value?.data?.tutors || []
        setPending(Array.isArray(d) ? d : [])
      }
      if (allRes.status === 'fulfilled') {
        const d = allRes.value?.data?.data || []
        setAll(Array.isArray(d) ? d : [])
      }
    } catch {}
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const approve = async (tutorId) => {
    setActionId(`approve-${tutorId}`)
    try {
      await api.post(`/admin/tutors/${tutorId}/approve`)
      setMsg('Tutor approved.')
      load()
    } catch { setMsg('Action failed.') }
    finally { setActionId(null); setTimeout(() => setMsg(''), 3000) }
  }

  const reject = async (tutorId) => {
    setActionId(`reject-${tutorId}`)
    try {
      await api.post(`/admin/tutors/${tutorId}/reject`)
      setMsg('Tutor rejected.')
      load()
    } catch { setMsg('Action failed.') }
    finally { setActionId(null); setTimeout(() => setMsg(''), 3000) }
  }

  const STATUS_BADGE = {
    approved: { bg: '#DCFCE7', color: '#166534' },
    pending:  { bg: '#FEF3C7', color: '#92400E' },
    rejected: { bg: '#FEE2E2', color: '#DC2626' },
  }

  const badge = (status) => {
    const s = STATUS_BADGE[status] || STATUS_BADGE.pending
    return (
      <span style={{ padding: '4px 10px', borderRadius: 999, fontSize: 12, fontWeight: 700, background: s.bg, color: s.color }}>
        {status || 'pending'}
      </span>
    )
  }

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 24 }}>Tutor Management</h1>

      {msg && (
        <div style={{ marginBottom: 16, padding: '10px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 13.5, color: '#10B981' }}>
          {msg}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#F3F4F6', borderRadius: 12, padding: 4, width: 'fit-content' }}>
        {[
          { key: 'pending', label: `Pending (${pending.length})`, icon: GraduationCap },
          { key: 'all',     label: `All Tutors (${all.length})`,  icon: Users         },
        ].map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '8px 18px', borderRadius: 9, border: 'none',
            background: tab === key ? 'white' : 'transparent',
            color: tab === key ? '#7C3AED' : '#6B7280',
            fontWeight: 700, fontSize: 13.5, cursor: 'pointer',
            boxShadow: tab === key ? '0 1px 4px rgba(0,0,0,.08)' : 'none',
            fontFamily: 'inherit', transition: 'all .15s',
          }}>
            <Icon size={15} /> {label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '48px 0' }}>
          <Loader2 size={26} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      ) : (
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: tab === 'pending' ? '2fr 2fr 2fr 1.5fr' : '2fr 2fr 2fr 1fr',
            padding: '14px 24px', background: '#F9FAFB',
            fontWeight: 700, fontSize: 13, color: '#374151',
          }}>
            <div>Name</div>
            <div>Email</div>
            <div>Specialization</div>
            {tab === 'pending' ? <div>Actions</div> : <div>Status</div>}
          </div>

          {/* Pending tab */}
          {tab === 'pending' && (
            pending.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>
                No pending verifications
              </div>
            ) : pending.map((tutor) => {
              const name  = tutor.user?.name  || 'Unknown'
              const email = tutor.user?.email || '—'
              const spec  = tutor.specialization || '—'
              const aId   = `approve-${tutor.id}`
              const rId   = `reject-${tutor.id}`
              return (
                <div key={tutor.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1.5fr',
                  padding: '16px 24px', borderTop: '1px solid #F3F4F6', alignItems: 'center',
                }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{name}</div>
                  <div style={{ color: '#6B7280', fontSize: 13.5 }}>{email}</div>
                  <div style={{ color: '#6B7280', fontSize: 13.5 }}>{spec}</div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => approve(tutor.id)}
                      disabled={!!actionId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '7px 14px', background: actionId === aId ? '#F3F4F6' : '#DCFCE7',
                        color: '#166534', border: 'none', borderRadius: 9,
                        fontSize: 13, fontWeight: 700, cursor: actionId ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {actionId === aId
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : <CheckCircle size={13} />}
                      Approve
                    </button>
                    <button
                      onClick={() => reject(tutor.id)}
                      disabled={!!actionId}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 5,
                        padding: '7px 14px', background: actionId === rId ? '#F3F4F6' : '#FEE2E2',
                        color: '#DC2626', border: 'none', borderRadius: 9,
                        fontSize: 13, fontWeight: 700, cursor: actionId ? 'not-allowed' : 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {actionId === rId
                        ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                        : <XCircle size={13} />}
                      Reject
                    </button>
                  </div>
                </div>
              )
            })
          )}

          {/* All tutors tab */}
          {tab === 'all' && (
            all.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#9CA3AF', fontSize: 14 }}>
                No tutors found
              </div>
            ) : all.map((user) => {
              const spec   = user.tutor?.specialization || '—'
              const status = user.tutor?.verification_status || 'pending'
              return (
                <div key={user.id} style={{
                  display: 'grid', gridTemplateColumns: '2fr 2fr 2fr 1fr',
                  padding: '16px 24px', borderTop: '1px solid #F3F4F6', alignItems: 'center',
                }}>
                  <div style={{ fontWeight: 600, color: '#111827' }}>{user.name}</div>
                  <div style={{ color: '#6B7280', fontSize: 13.5 }}>{user.email}</div>
                  <div style={{ color: '#6B7280', fontSize: 13.5 }}>{spec}</div>
                  <div>{badge(status)}</div>
                </div>
              )
            })
          )}
        </div>
      )}
    </div>
  )
}
