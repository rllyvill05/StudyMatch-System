import { useState, useEffect } from 'react'
import { Loader2, Save, CheckCircle } from 'lucide-react'
import api from '../../api/axiosInstance'

export default function AdminSettingsPage() {
  const [configs,  setConfigs]  = useState({})
  const [loading,  setLoading]  = useState(true)
  const [saving,   setSaving]   = useState(null)
  const [msg,      setMsg]      = useState('')

  useEffect(() => {
    const load = async () => {
      try {
        const res = await api.get('/admin/system-config')
        // Flatten grouped configs into a key→value map
        const grouped = res?.data?.configs || {}
        const flat = {}
        Object.values(grouped).forEach(group => {
          if (Array.isArray(group)) {
            group.forEach(item => { flat[item.key] = item.value })
          }
        })
        setConfigs(flat)
      } catch {}
      finally { setLoading(false) }
    }
    load()
  }, [])

  const toggle = async (key) => {
    const current = configs[key] === 'true' || configs[key] === true
    const newVal  = current ? 'false' : 'true'
    setSaving(key)
    try {
      await api.put(`/admin/system-config/${key}`, { value: newVal })
      setConfigs(p => ({ ...p, [key]: newVal }))
      setMsg('Setting saved.')
    } catch { setMsg('Failed to save.') }
    finally { setSaving(null); setTimeout(() => setMsg(''), 3000) }
  }

  const isOn = (key) => configs[key] === 'true' || configs[key] === true

  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
      <Loader2 size={28} color="#7C3AED" style={{ animation: 'spin 1s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  const TOGGLES = [
    {
      key:   'maintenance_mode',
      title: 'Maintenance Mode',
      desc:  'Temporarily disable the platform for maintenance.',
      onLabel: 'Enabled', offLabel: 'Disabled',
      onColor: '#EF4444', offColor: '#22C55E',
    },
    {
      key:   'allow_registration',
      title: 'User Registrations',
      desc:  'Allow or disable new student/tutor registrations.',
      onLabel: 'Open', offLabel: 'Closed',
      onColor: '#22C55E', offColor: '#EF4444',
    },
    {
      key:   'email_notifications',
      title: 'Email Notifications',
      desc:  'Send email notifications to users.',
      onLabel: 'Enabled', offLabel: 'Disabled',
      onColor: '#22C55E', offColor: '#6B7280',
    },
    {
      key:   'auto_match_enabled',
      title: 'Auto Matching',
      desc:  'Enable automatic tutor-student matching.',
      onLabel: 'Enabled', offLabel: 'Disabled',
      onColor: '#22C55E', offColor: '#6B7280',
    },
  ]

  return (
    <div style={{ fontFamily: "'DM Sans', sans-serif" }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Platform Settings</h1>
      <p style={{ fontSize: 13.5, color: '#6B7280', marginBottom: 28 }}>Configure system-wide settings. Changes take effect immediately.</p>

      {msg && (
        <div style={{ marginBottom: 20, padding: '10px 16px', background: '#F0FDF4', border: '1px solid #BBF7D0', borderRadius: 10, fontSize: 13.5, color: '#10B981', display: 'flex', alignItems: 'center', gap: 7 }}>
          <CheckCircle size={14} /> {msg}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {TOGGLES.map(({ key, title, desc, onLabel, offLabel, onColor, offColor }) => {
          const on = isOn(key)
          return (
            <div key={key} style={{ background: '#fff', borderRadius: 16, border: '1px solid #E5E7EB', padding: '22px 26px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 17, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{title}</h2>
                  <p style={{ color: '#6B7280', fontSize: 13.5 }}>{desc}</p>
                </div>
                <button
                  onClick={() => toggle(key)}
                  disabled={saving === key}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    background: on ? onColor : offColor,
                    color: '#fff', border: 'none', borderRadius: 11,
                    padding: '11px 22px', cursor: saving === key ? 'not-allowed' : 'pointer',
                    fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
                    opacity: saving === key ? 0.7 : 1, minWidth: 110,
                  }}
                >
                  {saving === key
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving</>
                    : (on ? onLabel : offLabel)
                  }
                </button>
              </div>
            </div>
          )
        })}

        {/* Danger Zone */}
        <div style={{ background: '#fff', borderRadius: 16, border: '1px solid #FECACA', padding: '22px 26px' }}>
          <h2 style={{ fontSize: 17, fontWeight: 700, color: '#DC2626', marginBottom: 6 }}>Danger Zone</h2>
          <p style={{ color: '#6B7280', fontSize: 13.5, marginBottom: 18 }}>
            Critical actions that affect the entire platform.
          </p>
          <button style={{
            background: '#DC2626', color: '#fff', border: 'none', borderRadius: 11,
            padding: '11px 22px', cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit',
          }}>
            Clear System Cache
          </button>
        </div>
      </div>
    </div>
  )
}
