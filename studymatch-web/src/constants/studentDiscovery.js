/** Shared with tutor dashboard "Find Students Who Need Your Help" filters */

export const DISCOVERY_SUBJECTS = [
  'Calculus',
  'Physics',
  'Statistics',
  'Linear Algebra',
  'Computer Science',
]

export const TUTOR_SUBJECT_FILTERS = ['All Subjects', ...DISCOVERY_SUBJECTS]

export const DISCOVERY_AVAILABILITY_DAYS = [
  'Weekdays',
  'Weekends',
]

export const DISCOVERY_AVAILABILITY_TIMES = [
  'Mornings',
  'Evenings',
]

export const TUTOR_AVAILABILITY_FILTERS = [
  'Availability',
  ...DISCOVERY_AVAILABILITY_DAYS,
  ...DISCOVERY_AVAILABILITY_TIMES,
]

export const DISCOVERY_LEARNING_GOALS = [
  'Exam Prep',
  'Concept Understanding',
  'Skill Building',
  'Project Help',
]

export const TUTOR_GOAL_FILTERS = ['Learning Goals', ...DISCOVERY_LEARNING_GOALS]

export const DISCOVERY_SESSION_FORMATS = [
  'Online',
  'Face-to-face',
  'Online or In-person',
]

/** Map legacy / free-text values into dropdown options */
export function normalizeGoalValue(value) {
  const v = String(value ?? '').toLowerCase()
  if (!v) return ''
  if (v.includes('exam') || v.includes('final') || v.includes('midterm')) return 'Exam Prep'
  if (v.includes('concept') || v.includes('understand')) return 'Concept Understanding'
  if (v.includes('skill') || v.includes('habit')) return 'Skill Building'
  if (v.includes('project') || v.includes('assignment')) return 'Project Help'
  for (const g of DISCOVERY_LEARNING_GOALS) {
    if (v === g.toLowerCase()) return g
  }
  return ''
}

export function normalizeDayValue(value) {
  const v = String(value ?? '').toLowerCase()
  if (!v) return ''
  if (v.includes('weekend') || v.includes('sat') || v.includes('sun')) return 'Weekends'
  if (v.includes('weekday') || v.includes('mon') || v.includes('tue') || v.includes('wed')) return 'Weekdays'
  for (const d of DISCOVERY_AVAILABILITY_DAYS) {
    if (v === d.toLowerCase()) return d
  }
  return ''
}

export function normalizeTimeValue(value) {
  const v = String(value ?? '').toLowerCase()
  if (!v) return ''
  if (v.includes('evening') || v.includes('night') || v.includes('6pm')) return 'Evenings'
  if (v.includes('morning') || v.includes('6am')) return 'Mornings'
  for (const t of DISCOVERY_AVAILABILITY_TIMES) {
    if (v === t.toLowerCase()) return t
  }
  return ''
}

export function normalizeSessionFormat(value) {
  const v = String(value ?? '').toLowerCase()
  if (!v) return ''
  if (v.includes('face') || v.includes('person') || v.includes('in-person')) return 'Face-to-face'
  if (v.includes('online') && !v.includes('or')) return 'Online'
  if (v.includes('both') || v.includes('or')) return 'Online or In-person'
  for (const f of DISCOVERY_SESSION_FORMATS) {
    if (v === f.toLowerCase()) return f
  }
  return ''
}

export function formatAvailabilityLabel(preferredDays, preferredTime) {
  return [preferredDays, preferredTime].filter(Boolean).join(' · ')
}
