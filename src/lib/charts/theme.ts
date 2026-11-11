/**
 * Chart color palette.
 *
 * Colors are plain hex values so they work as SVG stroke/fill attributes and in
 * the HTML legend swatches. Sources map to the tokens used elsewhere in the app:
 * NWS amber, GFS emerald, HRRR rose, ECMWF violet.
 */

import type { GuidanceSourceId } from '@/lib/forecast-workspace/db';

export type ChartSourceId = 'user' | GuidanceSourceId | 'observed';

export const chartColors: Record<ChartSourceId, string> = {
  user: '#38bdf8', // sky-400
  NWS: '#fb923c', // amber-500
  GFS: '#34d399', // emerald-400
  HRRR: '#f43f5e', // rose-500
  ECMWF: '#a78bfa', // violet-400
  observed: '#e2e8f0', // slate-200
};

export function colorForSource(source: ChartSourceId): string {
  return chartColors[source];
}
