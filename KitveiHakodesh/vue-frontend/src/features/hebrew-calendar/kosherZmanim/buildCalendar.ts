// Ported from KosherKotlin (LGPL-2.1), https://github.com/kdroidFilter/KosherKotlin commit 582e904,
// app/composeApp/src/commonMain/kotlin/app/domain/ZmanimRepository.kt (`calendarFor`).
import 'temporal-polyfill/global'
import { ClimateRefractionCalculator } from './calculators/climateRefractionCalculator'
import { type PlaceClimate, STANDARD_CLIMATE } from './calculators/horizonRefraction'
import { ComplexZmanimCalendar } from './calendars/complexZmanimCalendar'
import { GeoLocation } from './location/geoLocation'

export interface KosherZmanimOptions {
  /** Degrees, north positive. */
  lat: number
  /** Degrees, east positive. */
  lng: number
  /** Meters. */
  elevation: number
  /** IANA time zone id; it must be one KosherKotlin knows the raw offset of. */
  tzid: string
  /** The civil date, month 1-12. */
  date: { year: number, month: number, day: number }
  useElevation: boolean
  /** Minutes before sea-level sunset; 18 when left out. */
  candleLightingOffset?: number
  /** The place's monthly temperatures for the refraction; the standard 15 C when left out. */
  climate?: PlaceClimate
}

/** The calendar for a place and date, computed with the climate refraction calculator. */
export function buildComplexZmanimCalendar(options: KosherZmanimOptions): ComplexZmanimCalendar {
  const calendar = ComplexZmanimCalendar.forDate(
    new GeoLocation(options.lat, options.lng, options.elevation, options.tzid),
    Temporal.PlainDate.from(options.date, { overflow: 'reject' }),
    options.useElevation,
    options.candleLightingOffset ?? 18.0,
  )
  calendar.astronomicalCalculator = new ClimateRefractionCalculator(options.climate ?? STANDARD_CLIMATE)
  return calendar
}
