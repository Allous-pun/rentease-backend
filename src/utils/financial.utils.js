// Centralized financial calculations
// All money values should be numbers, not strings

/**
 * Convert Decimal or any value to number safely
 */
export function toNumber(value) {
  return value ? Number(value) : 0
}

/**
 * Format number to ALWAYS 2 decimal places
 * Example: 62.5 → 62.50, 66.67 → 66.67
 */
export function toFixed(value, decimals = 2) {
  return Number(toNumber(value).toFixed(decimals))
}

/**
 * Format number to string with exactly 2 decimal places for display
 */
export function toFixedString(value, decimals = 2) {
  return toNumber(value).toFixed(decimals)
}

/**
 * Calculate balance = expected - paid
 */
export function calculateBalance(expected, paid) {
  return toFixed(toNumber(expected) - toNumber(paid))
}

/**
 * Calculate collection rate = (collected / expected) * 100
 * Always returns number with 2 decimal places
 */
export function calculateCollectionRate(collected, expected) {
  if (!expected || expected === 0) return 0
  return toFixed((toNumber(collected) / toNumber(expected)) * 100)
}

/**
 * Calculate occupancy rate = (occupied / total) * 100
 * Always returns number with 2 decimal places
 */
export function calculateOccupancyRate(occupied, total) {
  if (!total || total === 0) return 0
  return toFixed((toNumber(occupied) / toNumber(total)) * 100)
}

/**
 * Normalize date to UTC without timezone shift
 * Use 00:00:00 UTC for due dates
 */
export function normalizeDate(year, month, day) {
  // Create date at UTC midnight to avoid timezone shifts
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0))
}

/**
 * Format date for API response (YYYY-MM-DD)
 * Ensures consistent date format across all endpoints
 */
export function formatDate(date) {
  if (!date) return null
  const d = new Date(date)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`
}

/**
 * Calculate days overdue
 */
export function getDaysOverdue(dueDate) {
  const today = new Date()
  // Reset today to UTC midnight for fair comparison
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()))
  const dueUTC = new Date(dueDate)
  dueUTC.setUTCHours(0, 0, 0, 0)
  
  const diffTime = todayUTC - dueUTC
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return diffDays > 0 ? diffDays : 0
}

/**
 * Get aging bucket based on days overdue
 */
export function getAgingBucket(daysOverdue) {
  if (daysOverdue <= 0) return 'current'
  if (daysOverdue <= 30) return '0_30'
  if (daysOverdue <= 60) return '31_60'
  if (daysOverdue <= 90) return '61_90'
  return '90_plus'
}

/**
 * Format currency for display (2 decimal places)
 */
export function formatCurrency(amount) {
  return toFixed(amount)
}