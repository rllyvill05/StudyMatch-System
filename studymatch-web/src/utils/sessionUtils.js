export const JOIN_WINDOW_MINUTES = 15

export const STATUS_STYLES = {
  pending:     { bg: '#FEF9C3', text: '#A16207', border: '#FDE047', label: 'Pending' },
  scheduled:   { bg: '#DCFCE7', text: '#15803D', border: '#86EFAC', label: 'Confirmed' },
  ongoing:     { bg: '#DBEAFE', text: '#1D4ED8', border: '#93C5FD', label: 'Ongoing' },
  completed:   { bg: '#F3F4F6', text: '#4B5563', border: '#E5E7EB', label: 'Completed' },
  cancelled:   { bg: '#FEE2E2', text: '#B91C1C', border: '#FECACA', label: 'Cancelled' },
  rescheduled: { bg: '#EDE9FE', text: '#6D28D9', border: '#C4B5FD', label: 'Rescheduled' },
}

export function formatSessionDate(dt) {
  if (!dt) return '—'
  return new Date(dt).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit',
  })
}

export function sessionTypeLabel(type) {
  if (type === 'in_person' || type === 'face_to_face') return 'Face-to-face'
  return 'Online'
}

export function effectiveStatus(session, now = new Date()) {
  const status = session.status
  if (['completed', 'cancelled', 'rescheduled', 'pending'].includes(status)) return status
  if (!session.scheduled_at) return status
  const start = new Date(session.scheduled_at)
  const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60000)
  if (['scheduled', 'ongoing'].includes(status) && now >= start && now <= end) return 'ongoing'
  return status
}

export function getJoinState(session, now = new Date()) {
  const status = effectiveStatus(session, now)
  if (!session.session_link) {
    return { canJoin: false, message: 'Meeting link not set yet' }
  }
  if (!['pending', 'scheduled', 'ongoing'].includes(status)) {
    return { canJoin: false, message: 'Session is not active' }
  }
  if (!session.scheduled_at) {
    return { canJoin: false, message: 'No scheduled time' }
  }

  const start = new Date(session.scheduled_at)
  const end = new Date(start.getTime() + (session.duration_minutes || 60) * 60000)
  const windowStart = new Date(start.getTime() - JOIN_WINDOW_MINUTES * 60000)

  if (now < windowStart) {
    const mins = Math.ceil((windowStart - now) / 60000)
    return { canJoin: false, message: `Session starts in ${mins} min${mins !== 1 ? 's' : ''}` }
  }
  if (now > end) {
    return { canJoin: false, message: 'Session has ended' }
  }
  return { canJoin: true, message: 'Join now' }
}

export function isPastSession(session, now = new Date()) {
  const status = effectiveStatus(session, now)
  if (['completed', 'cancelled'].includes(status)) return true
  if (!session.scheduled_at) return false
  const end = new Date(new Date(session.scheduled_at).getTime() + (session.duration_minutes || 60) * 60000)
  return now > end && status !== 'ongoing'
}

export function isUpcomingSession(session, now = new Date()) {
  return !isPastSession(session, now)
}

/** Sessions shown under the Completed tab */
export function isCompletedTabSession(session) {
  return session.status === 'completed'
}

/** Sessions shown under the Cancelled tab */
export function isCancelledTabSession(session) {
  return session.status === 'cancelled'
}

/** Sessions shown under the Upcoming tab */
export function isUpcomingTabSession(session, now = new Date()) {
  if (session.status === 'completed' || session.status === 'cancelled') return false
  return isUpcomingSession(session, now)
}

export function isSessionToday(session, now = new Date()) {
  if (!session.scheduled_at || !isUpcomingSession(session, now)) return false
  return new Date(session.scheduled_at).toDateString() === now.toDateString()
}

export function sessionsOnDate(sessions, year, month, day) {
  return sessions.filter(s => {
    if (!s.scheduled_at) return false
    const d = new Date(s.scheduled_at)
    return d.getFullYear() === year && d.getMonth() === month && d.getDate() === day
  })
}
