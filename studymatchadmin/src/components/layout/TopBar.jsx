import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, Settings, LogOut, ChevronDown } from 'lucide-react'
import { getUser, clearAuth } from '../../store/authStore'
import { logout } from '../../api/auth'
import { getNotifications, markAllRead as apiMarkAllRead, markRead as apiMarkRead } from '../../api/notifications'

export default function TopBar() {
  const user     = getUser()
  const navigate = useNavigate()

  const [notifOpen,   setNotifOpen]   = useState(false)
  const [profileOpen, setProfileOpen] = useState(false)
  const [notifs,      setNotifs]      = useState([])
  const [loading,     setLoading]     = useState(false)

  const notifRef   = useRef(null)
  const profileRef = useRef(null)

  const unreadCount = notifs.filter(n => !n.is_read).length

  const fetchNotifs = async () => {
    setLoading(true)
    try {
      const res = await getNotifications({ per_page: 10 })
      setNotifs(Array.isArray(res.data?.data) ? res.data.data : [])
    } catch {
      // silently fail — bell just shows no notifications
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifs()
    const interval = setInterval(fetchNotifs, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current   && !notifRef.current.contains(e.target))   setNotifOpen(false)
      if (profileRef.current && !profileRef.current.contains(e.target)) setProfileOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleMarkAllRead = async () => {
    try {
      await apiMarkAllRead()
      setNotifs(prev => prev.map(n => ({ ...n, is_read: true })))
    } catch {}
  }

  const handleMarkRead = async (id) => {
    try {
      await apiMarkRead(id)
      setNotifs(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
    } catch {}
  }

  const handleLogout = async () => {
    try { await logout() } catch {}
    clearAuth()
    navigate('/login')
  }

  const timeAgo = (dateStr) => {
    const diff = (Date.now() - new Date(dateStr)) / 1000
    if (diff < 60)   return 'just now'
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
    return `${Math.floor(diff / 86400)}d ago`
  }

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        .tb-bar * { box-sizing: border-box; }
        .tb-bar {
          height: 60px; background: white;
          border-bottom: 1px solid #E5E7EB;
          display: flex; align-items: center;
          padding: 0 24px; justify-content: flex-end;
          gap: 14px; font-family: 'DM Sans', sans-serif;
          position: sticky; top: 0; z-index: 30; flex-shrink: 0;
        }
        .tb-bell {
          position: relative; width: 38px; height: 38px;
          border-radius: 10px; border: 1px solid #E5E7EB;
          background: white; display: flex; align-items: center;
          justify-content: center; cursor: pointer;
          transition: background .15s;
        }
        .tb-bell:hover { background: #F3F0FF; border-color: #DDD6FE; }
        .tb-badge {
          position: absolute; top: -5px; right: -5px;
          min-width: 18px; height: 18px; border-radius: 10px;
          background: #7C3AED; color: white; font-size: 10px;
          font-weight: 800; display: flex; align-items: center;
          justify-content: center; padding: 0 4px;
          border: 2px solid white; font-family: 'DM Sans', sans-serif;
        }
        .tb-notif-drop {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 320px; background: white;
          border: 1px solid #E5E7EB; border-radius: 16px;
          box-shadow: 0 12px 40px rgba(0,0,0,.12); z-index: 200;
          overflow: hidden; animation: tbIn .15s ease;
        }
        .tb-notif-drop::before {
          content: ''; position: absolute; top: -7px; right: 14px;
          width: 14px; height: 14px; background: white;
          border-left: 1px solid #E5E7EB; border-top: 1px solid #E5E7EB;
          transform: rotate(45deg); border-radius: 2px;
        }
        .tb-profile-drop {
          position: absolute; top: calc(100% + 10px); right: 0;
          width: 190px; background: white;
          border: 1px solid #E5E7EB; border-radius: 14px;
          box-shadow: 0 8px 28px rgba(0,0,0,.10); z-index: 200;
          overflow: hidden; animation: tbIn .15s ease;
        }
        @keyframes tbIn {
          from { opacity: 0; transform: translateY(-6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .tb-notif-row {
          display: flex; align-items: flex-start; gap: 10px;
          padding: 12px 16px; cursor: pointer;
          border-bottom: 1px solid #F8F9FB;
          transition: background .12s;
        }
        .tb-notif-row:last-child { border-bottom: none; }
        .tb-notif-row:hover { background: #F8F9FB; }
        .tb-notif-row.unread { background: #FAFAFF; }
        .tb-profile-row {
          display: flex; align-items: center; gap: 10px;
          padding: 11px 16px; cursor: pointer;
          font-size: 13.5px; font-weight: 600; color: #374151;
          transition: background .12s; text-decoration: none;
          border-bottom: 1px solid #F8F9FB; border: none;
          background: none; width: 100%; text-align: left;
          font-family: 'DM Sans', sans-serif;
        }
        .tb-profile-row:last-child { border-bottom: none; }
        .tb-profile-row:hover { background: #F8F9FB; }
      `}</style>

      <header className="tb-bar">

        {/* Notification bell */}
        <div style={{ position: 'relative' }} ref={notifRef}>
          <button
            className="tb-bell"
            onClick={() => { setNotifOpen(o => !o); setProfileOpen(false) }}
          >
            <Bell size={17} color={notifOpen ? '#7C3AED' : '#6B7280'} />
            {unreadCount > 0 && (
              <span className="tb-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </button>

          {notifOpen && (
            <div className="tb-notif-drop">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px 10px' }}>
                <span style={{ fontWeight: 800, fontSize: 15, color: '#1E1B4B' }}>Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    style={{ background: 'none', border: 'none', color: '#7C3AED', fontSize: 12.5, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    Mark all read
                  </button>
                )}
              </div>
              <div style={{ maxHeight: 300, overflowY: 'auto' }}>
                {loading ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                    Loading...
                  </div>
                ) : notifs.length === 0 ? (
                  <div style={{ padding: '20px 16px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                    No notifications
                  </div>
                ) : (
                  notifs.map(n => (
                    <div
                      key={n.id}
                      className={`tb-notif-row${!n.is_read ? ' unread' : ''}`}
                      onClick={() => !n.is_read && handleMarkRead(n.id)}
                    >
                      <div style={{
                        width: 8, height: 8, borderRadius: '50%', marginTop: 5, flexShrink: 0,
                        background: !n.is_read ? '#7C3AED' : 'transparent',
                      }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: !n.is_read ? 700 : 500, color: '#1E1B4B', lineHeight: 1.4 }}>
                          {n.title}
                        </div>
                        <div style={{ fontSize: 11.5, color: '#6B7280', marginTop: 2, lineHeight: 1.3 }}>
                          {n.message}
                        </div>
                        <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 3 }}>
                          {timeAgo(n.created_at)}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div
                style={{ padding: '10px 16px', borderTop: '1px solid #F3F4F6', textAlign: 'center', cursor: 'pointer' }}
                onClick={() => { setNotifOpen(false); navigate('/notifications') }}
              >
                <span style={{ fontSize: 12.5, color: '#7C3AED', fontWeight: 600 }}>
                  View all notifications
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Admin profile */}
        <div style={{ position: 'relative' }} ref={profileRef}>
          <div
            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', padding: '4px 8px', borderRadius: 10, transition: 'background .15s' }}
            onClick={() => { setProfileOpen(o => !o); setNotifOpen(false) }}
            onMouseEnter={e => e.currentTarget.style.background = '#F8F9FB'}
            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
          >
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontWeight: 700, fontSize: 13.5, color: '#1E1B4B', lineHeight: 1.2 }}>
                {user?.name || 'Admin'}
              </div>
              <div style={{ fontSize: 11.5, color: '#9CA3AF' }}>
                {user?.role === 'super_admin' ? 'Super Administrator' : user?.role ?? 'admin'}
              </div>
            </div>
            <div style={{
              width: 38, height: 38, borderRadius: '50%',
              background: '#7C3AED', display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontWeight: 700, fontSize: 14,
              color: 'white', flexShrink: 0,
            }}>
              {user?.name?.charAt(0).toUpperCase() || 'A'}
            </div>
            <ChevronDown size={14} color="#9CA3AF"
              style={{ transform: profileOpen ? 'rotate(180deg)' : 'none', transition: 'transform .2s' }} />
          </div>

          {profileOpen && (
            <div className="tb-profile-drop">
              <button
                className="tb-profile-row"
                onClick={() => { setProfileOpen(false); navigate('/profile') }}
                style={{ color: '#374151' }}
              >
                <Settings size={15} color="#6B7280" /> Settings
              </button>
              <button
                className="tb-profile-row"
                onClick={handleLogout}
                style={{ color: '#EF4444' }}
              >
                <LogOut size={15} color="#EF4444" /> Log Out
              </button>
            </div>
          )}
        </div>

      </header>
    </>
  )
}
