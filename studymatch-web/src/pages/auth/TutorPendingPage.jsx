import { useNavigate } from 'react-router-dom'
import { clearAuth, getUser } from '../../store/authStore'
import { logout } from '../../api/auth'
import { Clock, CheckCircle, XCircle, LogOut, Mail, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { getProfile } from '../../api/profile'
import { saveAuth, getToken } from '../../store/authStore'

export default function TutorPendingPage() {
  const user   = getUser()
  const navigate = useNavigate()
  const status = user?.tutor?.verification_status ?? 'pending'
  const [checking, setChecking] = useState(false)

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearAuth()
    navigate('/login')
  }

  const handleCheckStatus = async () => {
    setChecking(true)
    try {
      const res     = await getProfile()
      const updated = res?.user || res || {}
      if (updated?.tutor?.verification_status === 'approved') {
        saveAuth(getToken(), updated)
        navigate('/tutor/dashboard')
      }
    } catch {}
    setChecking(false)
  }

  const isRejected = status === 'rejected'

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 50%, #F0F9FF 100%)',
      fontFamily: "'DM Sans', sans-serif", padding: 24,
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div style={{
        background: 'white', borderRadius: 24, padding: '48px 40px',
        maxWidth: 480, width: '100%', textAlign: 'center',
        boxShadow: '0 20px 60px rgba(124,58,237,0.12)',
        border: '1px solid rgba(221,214,254,0.5)',
      }}>

        {/* Icon */}
        <div style={{
          width: 80, height: 80, borderRadius: '50%', margin: '0 auto 24px',
          background: isRejected ? '#FEF2F2' : '#F3F0FF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {isRejected
            ? <XCircle size={38} color="#EF4444" />
            : <Clock size={38} color="#7C3AED" />}
        </div>

        {/* Title */}
        <h1 style={{ fontSize: 26, fontWeight: 800, color: '#1E1B4B', marginBottom: 8 }}>
          {isRejected ? 'Application Rejected' : 'Pending Admin Approval'}
        </h1>

        {/* Subtitle */}
        <p style={{ fontSize: 15, color: '#6B7280', lineHeight: 1.6, marginBottom: 32 }}>
          {isRejected
            ? 'Unfortunately, your tutor application was not approved. Please contact support for more information or register a new account.'
            : 'Your tutor account is currently under review. An admin will verify your credentials and approve your account shortly.'}
        </p>

        {/* Status card */}
        <div style={{
          background: isRejected ? '#FEF2F2' : '#F3F0FF',
          border: `1px solid ${isRejected ? '#FECACA' : '#DDD6FE'}`,
          borderRadius: 14, padding: '18px 20px', marginBottom: 28, textAlign: 'left',
        }}>
          {!isRejected && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <CheckCircle size={16} color="#7C3AED" />
                <span style={{ fontSize: 14, color: '#1E1B4B', fontWeight: 600 }}>Account created</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <CheckCircle size={16} color="#7C3AED" />
                <span style={{ fontSize: 14, color: '#1E1B4B', fontWeight: 600 }}>Email verified</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Clock size={16} color="#F59E0B" />
                <span style={{ fontSize: 14, color: '#F59E0B', fontWeight: 600 }}>Admin approval — pending</span>
              </div>
            </>
          )}
          {isRejected && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <XCircle size={16} color="#EF4444" />
              <span style={{ fontSize: 14, color: '#EF4444', fontWeight: 600 }}>Application rejected</span>
            </div>
          )}
        </div>

        {/* Contact */}
        {!isRejected && (
          <div style={{
            background: '#F8F9FB', borderRadius: 12, padding: '14px 16px',
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24,
            border: '1px solid #E8E8EF',
          }}>
            <Mail size={16} color="#7C3AED" />
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#1E1B4B' }}>Need help?</div>
              <div style={{ fontSize: 12, color: '#9CA3AF' }}>support@studymatch.app</div>
            </div>
          </div>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {!isRejected && (
            <button
              onClick={handleCheckStatus}
              disabled={checking}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                width: '100%', padding: '13px 20px',
                background: '#7C3AED', color: 'white', border: 'none',
                borderRadius: 12, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                opacity: checking ? 0.7 : 1,
              }}
            >
              <RefreshCw size={15} style={checking ? { animation: 'spin 1s linear infinite' } : {}} />
              {checking ? 'Checking...' : 'Check Approval Status'}
            </button>
          )}
          <button
            onClick={handleLogout}
            style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              width: '100%', padding: '13px 20px',
              background: 'white', color: '#374151',
              border: '1.5px solid #E5E7EB',
              borderRadius: 12, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            <LogOut size={15} />
            Sign Out
          </button>
        </div>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
