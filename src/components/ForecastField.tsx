import type { ForecastFieldKey } from '@/lib/forecast-workspace/db';
import { forecastFieldByKey, type ForecastFieldDefinition } from '@/lib/forecast-workspace/fields';

interface ForecastFieldProps {
  field: ForecastFieldKey;
  value: string;
  officialValue?: string;
  modelValue?: string;
  onChange: (value: string) => void;
}

const inputClassName =
  'w-full rounded-lg border border-sky-200 px-3 py-2 font-normal focus:border-sky-600 focus:outline-none';

export default function ForecastField({
  field,
  value,
  officialValue,
  modelValue,
  onChange,
}: ForecastFieldProps) {
  const definition = forecastFieldByKey[field];
  const { label, kind } = definition;
  const descriptionId = `${field}-description`;

  return (
    <div className="grid gap-3 border-b border-sky-100 py-4 last:border-b-0 sm:grid-cols-[minmax(10rem,1fr)_minmax(10rem,1fr)_minmax(10rem,1fr)]">
      <label className="flex flex-col gap-1 text-sm font-semibold text-sky-900">
        <span className="flex items-baseline gap-2">
          {label}
          {definition.unit ? (
            <span className="text-xs font-normal text-gray-500">{definition.unit}</span>
          ) : null}
        </span>
        <FieldInput
          definition={definition}
          descriptionId={
            kind === 'number' && definition.min !== undefined ? descriptionId : undefined
          }
          onChange={onChange}
          value={value}
        />
        {kind === 'number' && definition.min !== undefined ? (
          <span className="text-xs font-normal text-gray-500" id={descriptionId}>
            Range {definition.min}–{definition.max}
            {definition.unit ?? ''}
          </span>
        ) : null}
      </label>
      <SourceValue label={`${label} official`} value={officialValue} />
      <SourceValue label={`${label} model`} value={modelValue} />
    </div>
  );
}

function FieldInput({
  definition,
  descriptionId,
  onChange,
  value,
}: {
  definition: ForecastFieldDefinition;
  descriptionId?: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const shared = {
    'aria-label': definition.label,
    'aria-describedby': descriptionId,
    className: inputClassName,
    id: definition.key,
    name: definition.key,
    placeholder: definition.placeholder,
    value,
  };

  if (definition.kind === 'select') {
    return (
      <select {...shared} onChange={(event) => onChange(event.target.value)}>
        <option value="">Select sky</option>
        {definition.options?.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    );
  }

  if (definition.kind === 'textarea') {
    return <textarea {...shared} onChange={(event) => onChange(event.target.value)} rows={2} />;
  }

  return (
    <input
      {...shared}
      max={definition.max}
      min={definition.min}
      onChange={(event) => onChange(event.target.value)}
      step={definition.step}
      type={definition.kind === 'number' ? 'number' : 'text'}
    />
  );
}

function SourceValue({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex flex-col gap-1 text-sm text-gray-600">
      <span className="font-semibold">{label}</span>
      <span aria-label={label} className="rounded-lg bg-sky-50 px-3 py-2" role="status">
        {value || 'Unavailable'}
      </span>
    </div>
  );
}
