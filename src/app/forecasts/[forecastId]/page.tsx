import ForecastEditor from '@/components/ForecastEditor';

export default function ForecastPage({ params }: { params: { forecastId: string } }) {
  return <ForecastEditor forecastId={params.forecastId} />;
}
