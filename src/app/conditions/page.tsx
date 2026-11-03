import { AppLayout } from '@/components/AppLayout';
import ConditionTile from '@/components/ConditionTile';
import { buildConditionTiles } from '@/lib/conditions';
import { DEFAULT_LOCATION } from '@/lib/location';
import { fetchCurrentConditions } from '@/lib/nws/current-conditions';

export const dynamic = 'force-dynamic';

export default async function ConditionsPage() {
  const conditions = await fetchCurrentConditions(
    DEFAULT_LOCATION.latitude,
    DEFAULT_LOCATION.longitude,
  );
  const tiles = buildConditionTiles(conditions);

  return (
    <AppLayout>
      <section aria-label="Current conditions" className="condition-page">
        <h1 className="condition-page-title">Current conditions</h1>
        <p className="condition-page-meta">
          {DEFAULT_LOCATION.label}
          {conditions.stationId ? ` · Station ${conditions.stationId}` : ''}
          {conditions.observedAt
            ? ` · Observed ${conditions.observedAt.toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
              })}`
            : ''}
        </p>
        <div className="condition-tile-grid">
          {tiles.map((tile) => (
            <ConditionTile key={tile.kind} {...tile} />
          ))}
        </div>
      </section>
    </AppLayout>
  );
}
