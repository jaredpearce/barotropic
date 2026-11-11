'use client';

import { AxisBottom, AxisLeft } from '@visx/axis';
import { curveMonotoneX } from '@visx/curve';
import { GridRows } from '@visx/grid';
import { Group } from '@visx/group';
import { ParentSize } from '@visx/responsive';
import { scaleLinear, scaleTime } from '@visx/scale';
import { Line, LinePath } from '@visx/shape';
import { hasChartData, splitSegments, type ChartSeries } from '@/lib/charts/series';
import SeriesLegend from './SeriesLegend';

export interface SeriesChartProps {
  series: ChartSeries[];
  height?: number;
  /** Pass in tests to avoid ResizeObserver; otherwise measured with ParentSize. */
  width?: number;
  unitLabel: string;
  formatValue: (value: number) => string;
  ariaLabel: string;
  emptyMessage?: string;
  yDomain?: [number, number];
  showZeroLine?: boolean;
  /** Compare passes the location zone; Track Record may omit it. */
  timeZone?: string;
  formatRunTime?: (value: string) => string;
  formatRetrievedAt?: (value: string) => string;
}

const MARGIN = { top: 16, right: 16, bottom: 30, left: 52 };
const DEFAULT_HEIGHT = 260;
const HOUR_MS = 3_600_000;
const AXIS_COLOR = 'rgba(148, 163, 184, 0.5)';
const LABEL_COLOR = '#94a3b8';

function paddedDomain(values: number[], showZeroLine: boolean): [number, number] {
  if (values.length === 0) return [0, 1];

  let min = Math.min(...values);
  let max = Math.max(...values);
  if (showZeroLine) {
    min = Math.min(min, 0);
    max = Math.max(max, 0);
  }
  if (min === max) {
    min -= 1;
    max += 1;
  }

  const padding = (max - min) * 0.1;
  return [min - padding, max + padding];
}

interface FrameProps extends SeriesChartProps {
  width: number;
  height: number;
}

function ChartFrame({
  series,
  width,
  height,
  unitLabel,
  formatValue,
  ariaLabel,
  yDomain,
  showZeroLine,
  timeZone,
  formatRunTime,
  formatRetrievedAt,
}: FrameProps) {
  const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
  const innerHeight = Math.max(0, height - MARGIN.top - MARGIN.bottom);

  const allPoints = series.flatMap((item) => item.points);
  const timestamps = allPoints.map((point) => point.timestamp);
  const values = allPoints
    .map((point) => point.value)
    .filter((value): value is number => value !== null);

  const minTime = Math.min(...timestamps);
  const maxTime = Math.max(...timestamps);

  const xScale = scaleTime({
    domain: [new Date(minTime - HOUR_MS), new Date(maxTime + HOUR_MS)],
    range: [0, innerWidth],
  });
  const yScale = scaleLinear({
    domain: yDomain ?? paddedDomain(values, Boolean(showZeroLine)),
    range: [innerHeight, 0],
  }).nice();

  const spanMs = maxTime - minTime;
  const tickFormatter = new Intl.DateTimeFormat(
    'en-US',
    spanMs > 2 * 24 * HOUR_MS
      ? { month: 'short', day: 'numeric', timeZone }
      : { hour: 'numeric', minute: '2-digit', hour12: false, timeZone },
  );

  return (
    <div className="series-chart">
      <svg aria-label={ariaLabel} height={height} role="img" width={width}>
        <Group left={MARGIN.left} top={MARGIN.top}>
          <GridRows
            numTicks={4}
            scale={yScale}
            stroke="rgba(148, 163, 184, 0.18)"
            width={innerWidth}
          />
          {showZeroLine && (
            <Line
              from={{ x: 0, y: yScale(0) }}
              stroke="rgba(148, 163, 184, 0.6)"
              strokeDasharray="4 3"
              strokeWidth={1}
              to={{ x: innerWidth, y: yScale(0) }}
            />
          )}
          <AxisBottom
            numTicks={Math.min(6, Math.max(2, Math.floor(innerWidth / 90)))}
            scale={xScale}
            stroke={AXIS_COLOR}
            tickFormat={(value) => tickFormatter.format(value as Date)}
            tickLabelProps={() => ({ fill: LABEL_COLOR, fontSize: 10, textAnchor: 'middle' })}
            tickStroke={AXIS_COLOR}
            top={innerHeight}
          />
          <AxisLeft
            numTicks={4}
            scale={yScale}
            stroke={AXIS_COLOR}
            tickFormat={(value) => formatValue(Number(value))}
            tickLabelProps={() => ({
              fill: LABEL_COLOR,
              fontSize: 10,
              textAnchor: 'end',
              dx: -4,
              dy: 3,
            })}
            tickStroke={AXIS_COLOR}
          />
          {series.map((item) =>
            splitSegments(item.points).map((segment, index) => (
              <LinePath
                curve={curveMonotoneX}
                data={segment}
                fill="none"
                key={`${item.id}-${index}`}
                stroke={item.color}
                strokeWidth={2}
                x={(point) => xScale(point.timestamp)}
                y={(point) => yScale(point.value as number)}
              />
            )),
          )}
        </Group>
      </svg>
      <p className="series-chart-unit">Units: {unitLabel}</p>
      <SeriesLegend
        formatRetrievedAt={formatRetrievedAt}
        formatRunTime={formatRunTime}
        series={series}
      />
      <details className="series-chart-data">
        <summary>View data table</summary>
        <table>
          <caption>{ariaLabel}</caption>
          <thead>
            <tr>
              <th scope="col">Series</th>
              <th scope="col">Time</th>
              <th scope="col">Value</th>
            </tr>
          </thead>
          <tbody>
            {series.flatMap((item) =>
              item.points.map((point, index) => (
                <tr key={`${item.id}-${point.timestamp}-${index}`}>
                  <th scope="row">{item.label}</th>
                  <td>
                    <time dateTime={new Date(point.timestamp).toISOString()}>
                      {tickFormatter.format(new Date(point.timestamp))}
                    </time>
                  </td>
                  <td>{point.value === null ? 'No data' : formatValue(point.value)}</td>
                </tr>
              )),
            )}
          </tbody>
        </table>
      </details>
    </div>
  );
}

/**
 * Multi-series line chart built on visx.
 *
 * Renders axes, an optional zero baseline, one line per contiguous non-null
 * segment, an accessible legend, and a `<details>` data table. When `width` is
 * omitted it measures its container with `ParentSize`.
 */
export default function SeriesChart(props: SeriesChartProps) {
  const { series, width, height = DEFAULT_HEIGHT, emptyMessage } = props;

  if (!hasChartData(series)) {
    return (
      <div className="series-chart">
        <p className="series-chart-empty" role="status">
          {emptyMessage ?? 'No data to display.'}
        </p>
        <SeriesLegend
          formatRetrievedAt={props.formatRetrievedAt}
          formatRunTime={props.formatRunTime}
          series={series}
        />
      </div>
    );
  }

  if (typeof width === 'number') {
    return <ChartFrame {...props} height={height} width={width} />;
  }

  return (
    <div className="series-chart-responsive">
      <ParentSize>
        {({ width: measuredWidth }) =>
          measuredWidth > 0 ? <ChartFrame {...props} height={height} width={measuredWidth} /> : null
        }
      </ParentSize>
    </div>
  );
}
