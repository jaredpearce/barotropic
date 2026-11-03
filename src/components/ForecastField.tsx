import type { ForecastFieldKey, ForecastSourceValues } from "@/lib/forecast-workspace/db";

interface ForecastFieldProps {
  field: ForecastFieldKey;
  value: string;
  officialValue?: string;
  modelValue?: string;
  onChange: (value: string) => void;
}

const fieldLabels: Record<ForecastFieldKey, string> = {
  high: "High",
  low: "Low",
  pop: "Probability of precipitation",
  wind: "Wind",
  sky: "Sky",
  hazards: "Hazards",
};

const numericFields: ForecastFieldKey[] = ["high", "low", "pop"];

export default function ForecastField({
  field,
  value,
  officialValue,
  modelValue,
  onChange,
}: ForecastFieldProps) {
  const label = fieldLabels[field];

  return (
    <div className="grid gap-3 border-b border-sky-100 py-4 last:border-b-0 sm:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]">
      <label className="flex flex-col gap-1 text-sm font-semibold text-sky-900">
        {label}
        <input
          aria-label={label}
          type={numericFields.includes(field) ? "number" : "text"}
          min={field === "pop" ? 0 : undefined}
          max={field === "pop" ? 100 : undefined}
          step={numericFields.includes(field) ? "any" : undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="w-full rounded-lg border border-sky-200 px-3 py-2 font-normal focus:border-sky-600 focus:outline-none"
        />
      </label>
      <SourceValue label={`${label} official`} value={officialValue} />
      <SourceValue label={`${label} model`} value={modelValue} />
    </div>
  );
}

function SourceValue({
  label,
  value,
}: {
  label: string;
  value: ForecastSourceValues[keyof ForecastSourceValues];
}) {
  return (
    <div className="flex flex-col gap-1 text-sm text-gray-600">
      <span className="font-semibold">{label}</span>
      <span role="status" aria-label={label} className="rounded-lg bg-sky-50 px-3 py-2">
        {value || "Unavailable"}
      </span>
    </div>
  );
}
