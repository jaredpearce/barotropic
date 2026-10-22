import { CONDITION_TILE_LABELS } from '@/lib/conditions/tiles';
import type { ConditionTileKind, ConditionTileTone } from '@/lib/conditions/tiles';

interface ConditionTileProps {
  /** Metric the tile represents. Determines the default label. */
  kind: ConditionTileKind;
  /** Visible label. Defaults to the label registered for `kind`. */
  label?: string;
  /** Primary reading, already formatted for display. */
  value: string;
  /** Secondary detail line, e.g. a gust, humidity, or pressure tendency. */
  meta?: string;
  /** Semantic emphasis applied to the detail line. */
  tone?: ConditionTileTone;
  /** `card` renders a bordered tile, `bare` renders a borderless inline tile. */
  variant?: 'card' | 'bare';
  /** Additional classes for the tile wrapper. */
  className?: string;
}

/**
 * Renders a single current-conditions metric (temperature, feels-like, wind,
 * pressure, dewpoint) as a label / value / detail triple.
 *
 * The component is intentionally presentational: it owns layout and semantics
 * only, while unit conversion and formatting live in `@/lib/conditions`.
 */
export function ConditionTile({
  kind,
  label,
  value,
  meta,
  tone = 'default',
  variant = 'card',
  className,
}: ConditionTileProps) {
  const classes = ['condition-tile'];
  if (variant === 'bare') classes.push('condition-tile--bare');
  if (className) classes.push(className);

  const metaClasses = ['condition-tile-meta'];
  if (tone !== 'default') metaClasses.push(tone);

  return (
    <div className={classes.join(' ')} data-kind={kind}>
      <p className="condition-tile-label">{label ?? CONDITION_TILE_LABELS[kind]}</p>
      <p className="condition-tile-value">{value}</p>
      {meta ? <p className={metaClasses.join(' ')}>{meta}</p> : null}
    </div>
  );
}

export default ConditionTile;
