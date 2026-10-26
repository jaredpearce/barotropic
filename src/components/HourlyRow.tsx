export type HourlyCondition = 'clear' | 'partly-cloudy' | 'cloudy' | 'rain' | 'storm' | 'snow' | 'fog';

interface HourlyRowProps {
  timeLabel: string;
  temperature: string;
  precipitation: string;
  wind: string;
  condition?: HourlyCondition;
  isNight?: boolean;
}

function getHourlyIcon(condition: HourlyCondition, isNight: boolean): string {
  switch (condition) {
    case 'clear':
      return isNight ? '☾' : '☀';
    case 'partly-cloudy':
      return isNight ? '☁' : '⛅';
    case 'cloudy':
      return '☁';
    case 'rain':
      return '🌧';
    case 'storm':
      return '⛈';
    case 'snow':
      return '❄';
    case 'fog':
      return '🌫';
    default:
      return isNight ? '☾' : '☀';
  }
}

export function HourlyRow({
  timeLabel,
  temperature,
  precipitation,
  wind,
  condition = 'clear',
  isNight = false,
}: HourlyRowProps) {
  const icon = getHourlyIcon(condition, isNight);

  return (
    <div
      aria-label={`${timeLabel} forecast ${temperature} ${condition}`}
      className="app-forecast-row"
      role="listitem"
    >
      <span className="app-forecast-time">{timeLabel}</span>
      <span aria-label={isNight ? 'Night conditions' : 'Day conditions'} className="app-forecast-icon" role="img">
        {icon}
      </span>
      <span>{temperature}</span>
      <span className="app-forecast-precip">{precipitation}</span>
      <span className="app-forecast-wind">{wind}</span>
    </div>
  );
}

export default HourlyRow;
