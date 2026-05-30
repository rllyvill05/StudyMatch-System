export const getTheme = () =>
  localStorage.getItem('user_theme') ?? 'light'

export const saveTheme = (theme) =>
  localStorage.setItem('user_theme', theme)

const prefersDark = () =>
  window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false

export const applyTheme = (theme) => {
  const root = document.documentElement
  const isDark =
    theme === 'dark' || (theme === 'system' && prefersDark())
  if (isDark) {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
}

export const initTheme = () => {
  const theme = getTheme()
  applyTheme(theme)

  // Re-apply when system preference changes (only relevant for 'system' mode)
  window.matchMedia('(prefers-color-scheme: dark)')
    .addEventListener('change', () => {
      if (getTheme() === 'system') applyTheme('system')
    })

  return theme
}