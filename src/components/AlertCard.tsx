import {
  ALERT_MATCH_LABELS,
  type AlertCardData,
  type AlertGeometryKind,
} from '@/lib/alerts';

interface AlertCardProps {
  /** Display-ready alert produced by `buildAlertCards`. */
  alert: AlertCardData;
  /** Additional classes for the card wrapper. */
  className?: string;
}

function geometryLabel(kind: AlertGeometryKind, polygonCount: number) {
  if (kind === 'multi-polygon') {
    return `${polygonCount} polygons`;
  }

  return kind === 'polygon' ? 'Polygon' : 'Area';
}

/**
 * Renders a single active NWS alert.
 *
 * Severity comes from the CAP `severity` field and is exposed as
 * `data-severity` so cards and future map overlays share one styling source.
 * Polygon alerts render an SVG preview; area-based alerts are labeled rather
 * than given a fabricated polygon.
 */
export function AlertCard({ alert, className }: AlertCardProps) {
  const classes = ['alert-card'];
  if (className) classes.push(className);

  const hasPreview = alert.geometry.paths.length > 0;
  const previewLabel = `Polygon preview for ${alert.event}`;
  const timeRows = [
    alert.effectiveLabel ? { label: 'Effective', value: alert.effectiveLabel } : null,
    alert.expiresLabel ? { label: 'Expires', value: alert.expiresLabel } : null,
    alert.senderName ? { label: 'Source', value: alert.senderName } : null,
  ].filter((row): row is { label: string; value: string } => row !== null);

  return (
    <article
      aria-label={`${alert.event}, ${alert.severityLabel} severity`}
      className={classes.join(' ')}
      data-alert-id={alert.id}
      data-match={alert.match}
      data-severity={alert.severity}
    >
      <div className="alert-card-heading">
        <div className="alert-card-heading-copy">
          <p className="alert-card-event">{alert.event}</p>
          {alert.headline ? (
            <p className="alert-card-headline">{alert.headline}</p>
          ) : null}
          {alert.areaDescription ? (
            <p className="alert-card-area">{alert.areaDescription}</p>
          ) : null}
        </div>
        <span className="alert-card-severity">{alert.severityLabel}</span>
      </div>

      {hasPreview ? (
        <figure
          className="alert-card-preview"
          data-geometry-kind={alert.geometry.kind}
        >
          <svg
            aria-label={previewLabel}
            className="alert-card-preview-svg"
            preserveAspectRatio="xMidYMid meet"
            role="img"
            viewBox="0 0 120 72"
          >
            <title>{previewLabel}</title>
            {alert.geometry.paths.map((path, index) => (
              <path
                className={[
                  'alert-card-preview-shape',
                  path.containsPoint
                    ? 'alert-card-preview-shape--contained'
                    : 'alert-card-preview-shape--outside',
                ].join(' ')}
                d={path.d}
                data-contains-point={path.containsPoint ? 'true' : 'false'}
                fillRule="evenodd"
                key={`${alert.id}-polygon-${index}`}
              />
            ))}
          </svg>
          <figcaption className="alert-card-preview-caption">
            <span>{ALERT_MATCH_LABELS[alert.match]}</span>
            <span className="alert-card-preview-count">
              {geometryLabel(alert.geometry.kind, alert.geometry.polygonCount)}
            </span>
          </figcaption>
        </figure>
      ) : (
        <p className="alert-card-area-note">
          {alert.match === 'area'
            ? 'Area-based alert. NWS did not publish a polygon for this alert.'
            : 'Polygon details are unavailable for this alert.'}
        </p>
      )}

      {timeRows.length > 0 ? (
        <dl className="alert-card-meta">
          {timeRows.map((row) => (
            <div className="alert-card-meta-row" key={row.label}>
              <dt>{row.label}</dt>
              <dd>{row.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}

      {alert.instruction ? (
        <details className="alert-card-instructions">
          <summary>Safety instructions</summary>
          <p>{alert.instruction}</p>
        </details>
      ) : null}
    </article>
  );
}

export default AlertCard;
