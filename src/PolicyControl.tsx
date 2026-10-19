import type { KeyboardEvent } from "react";

type PolicyControlProps = {
  id: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  range: string;
  note: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

function PolicyControl({
  id,
  label,
  unit,
  min,
  max,
  range,
  note,
  value,
  disabled,
  onChange,
  onKeyDown,
}: PolicyControlProps) {
  return (
    <div className="policy-control">
      <label htmlFor={id}>{label} <span>({unit})</span></label>
      <div className="input-row">
        <input
          id={id}
          type="number"
          min={min}
          max={max}
          step="any"
          value={value}
          onChange={(event) => onChange(event.currentTarget.value)}
          onKeyDown={onKeyDown}
          disabled={disabled}
        />
        <span className="input-range">{range}</span>
        <span className="policy-note">{note}</span>
      </div>
    </div>
  );
}

export default PolicyControl;
