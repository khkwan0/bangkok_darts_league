import {DateTime} from 'luxon'

export const BANGKOK_ZONE = 'Asia/Bangkok'

const PROPOSED_DATE_FORMAT = 'dd LLL yyyy hh:mm a'

/** Parse ISO or JS Date in Bangkok zone. */
export function toBangkok(isoOrDate: string | Date): DateTime {
  if (isoOrDate instanceof Date) {
    return DateTime.fromJSDate(isoOrDate, {zone: BANGKOK_ZONE})
  }
  return DateTime.fromISO(isoOrDate, {zone: BANGKOK_ZONE}).setZone(BANGKOK_ZONE)
}

export function nowInBangkok(): DateTime {
  return DateTime.now().setZone(BANGKOK_ZONE)
}

/** JS Date for pickers (instant preserved, labels use Bangkok when formatted). */
export function isoToPickerDate(iso: string): Date {
  const dt = DateTime.fromISO(iso, {zone: BANGKOK_ZONE})
  if (!dt.isValid) return bangkokDefaultProposeTimeForPicker()
  return bangkokDateTimeToPickerDate(dt)
}

/**
 * Build a JS Date whose local wall-clock matches Bangkok (for native pickers).
 * The picker displays device-local components; this keeps them aligned with ICT.
 */
export function bangkokDateTimeToPickerDate(dt: DateTime): Date {
  return new Date(dt.year, dt.month - 1, dt.day, dt.hour, dt.minute, dt.second)
}

/** Default picker value: current time in Bangkok (30-minute steps optional via caller). */
export function bangkokNowForPicker(): Date {
  return bangkokDateTimeToPickerDate(nowInBangkok())
}

const DEFAULT_PROPOSE_HOUR = 19
const DEFAULT_PROPOSE_MINUTE = 30

/** Default propose time: 7:30 PM Bangkok today, or tomorrow if already past. */
export function bangkokDefaultProposeTimeForPicker(): Date {
  const now = nowInBangkok()
  let proposed = now.set({
    hour: DEFAULT_PROPOSE_HOUR,
    minute: DEFAULT_PROPOSE_MINUTE,
    second: 0,
    millisecond: 0,
  })
  if (proposed <= now) {
    proposed = proposed.plus({days: 1})
  }
  return bangkokDateTimeToPickerDate(proposed)
}

/**
 * Treat picker wall-clock (year/month/day/hour/minute) as Asia/Bangkok and return ISO.
 */
export function pickerWallClockToBangkokIso(date: Date): string {
  const bangkok = DateTime.fromObject(
    {
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      day: date.getDate(),
      hour: date.getHours(),
      minute: date.getMinutes(),
      second: date.getSeconds(),
    },
    {zone: BANGKOK_ZONE},
  )
  return bangkok.toISO() ?? date.toISOString()
}

/** ISO string for API from picker selection, anchored to Bangkok wall clock. */
export function pickerDateToIso(date: Date): string {
  return pickerWallClockToBangkokIso(date)
}

export function formatBangkok(
  isoOrDate: string | Date,
  format: string = PROPOSED_DATE_FORMAT,
): string {
  const dt = toBangkok(isoOrDate)
  return dt.isValid ? dt.toFormat(format) : String(isoOrDate)
}

export function formatBangkokDateHuge(iso: string): string {
  const dt = DateTime.fromISO(iso, {zone: BANGKOK_ZONE}).setZone(BANGKOK_ZONE)
  return dt.isValid ? dt.toLocaleString(DateTime.DATE_HUGE) : iso
}

export function formatBangkokDateTime(iso: string): string {
  return formatBangkok(iso, PROPOSED_DATE_FORMAT)
}

/** Long weekday date, e.g. "Wednesday, 21 May 2026". */
export function formatBangkokWeekdayDate(iso: string): string {
  return formatBangkok(iso, 'cccc, d MMMM yyyy')
}

/** Medium date, e.g. "May 21, 2026". */
export function formatBangkokDateMed(iso: string): string {
  const dt = DateTime.fromISO(iso, {zone: BANGKOK_ZONE}).setZone(BANGKOK_ZONE)
  return dt.isValid ? dt.toLocaleString(DateTime.DATE_MED) : iso
}

/** Minimum selectable date for pickers (start of today in Bangkok). */
export function bangkokMinimumPickerDate(): Date {
  return bangkokDateTimeToPickerDate(nowInBangkok().startOf('day'))
}

/** Format unix millis in Bangkok (e.g. match history log). */
export function formatBangkokFromMillis(
  timestamp: number,
  format: string = DateTime.DATETIME_MED,
): string {
  if (!timestamp) return 'unknown'
  const dt = DateTime.fromMillis(timestamp).setZone(BANGKOK_ZONE)
  return dt.isValid ? dt.toLocaleString(format) : 'unknown'
}

/** Current instant as ISO string (Bangkok). */
export function bangkokNowIso(): string {
  return nowInBangkok().toISO() ?? new Date().toISOString()
}

/** Start of calendar day in Bangkok (for grouping/comparisons). */
export function bangkokDayStart(iso: string): DateTime {
  return toBangkok(iso).startOf('day')
}

export function minutesBetweenIso(iso1: string, iso2: string): number {
  return Math.abs(toBangkok(iso2).diff(toBangkok(iso1), 'minutes').minutes)
}

/** Inbox thread preview: time today, "Yesterday", or "May 21". */
export function formatRelativeMessageListDate(
  iso: string,
  yesterdayLabel: string,
): string {
  const date = toBangkok(iso)
  const now = nowInBangkok()
  if (date.hasSame(now, 'day')) return date.toFormat('h:mm a')
  if (date.hasSame(now.minus({days: 1}), 'day')) return yesterdayLabel
  return date.toFormat('LLL d')
}

/** Chat date separator: Today / Yesterday / month day. */
export function formatMessageDateSeparator(iso: string): string {
  const dateObj = toBangkok(iso)
  const now = nowInBangkok()
  if (dateObj.hasSame(now, 'day')) return 'Today'
  if (dateObj.hasSame(now.minus({days: 1}), 'day')) return 'Yesterday'
  if (dateObj.hasSame(now, 'year')) return dateObj.toFormat('MMMM d')
  return dateObj.toFormat('MMMM d, yyyy')
}

/** Chat bubble timestamp under messages. */
export function formatMessageTimestamp(iso: string): string {
  const date = toBangkok(iso)
  const now = nowInBangkok()
  if (date.hasSame(now, 'day')) return date.toFormat('h:mm a')
  if (date.hasSame(now, 'year')) return date.toFormat('MMM d, h:mm a')
  return date.toFormat('MMM d, yyyy, h:mm a')
}

export function formatMessageCardDate(iso: string): string {
  return formatBangkok(iso, 'LLL d, yyyy')
}

export function formatMessageCardTime(iso: string): string {
  return formatBangkok(iso, 'h:mm a')
}
