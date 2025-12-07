export function formatDuration(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

export function relativeDate(timestamp: number) {
  const formatter = new Intl.RelativeTimeFormat('en', { numeric: 'auto' })
  const now = Date.now()
  const diffMinutes = Math.round((timestamp - now) / 60000)
  if (Math.abs(diffMinutes) < 60) {
    return formatter.format(diffMinutes, 'minute')
  }
  const diffHours = Math.round(diffMinutes / 60)
  if (Math.abs(diffHours) < 24) {
    return formatter.format(diffHours, 'hour')
  }
  const diffDays = Math.round(diffHours / 24)
  return formatter.format(diffDays, 'day')
}
