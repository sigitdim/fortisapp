"use client";
import React from "react";

type Props = {
  value: number | string;
  onChange: (num: number) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

function onlyDigits(s: string) {
  return s.replace(/[^\d]/g, "");
}

export default function CurrencyInput({ value, onChange, placeholder, className, disabled }: Props) {
  const [raw, setRaw] = React.useState(String(value ?? ""));

  React.useEffect(() => setRaw(String(value ?? "")), [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = onlyDigits(e.target.value);
    setRaw(digits);
    onChange(Number(digits || 0));
  };

  const display = raw ? "Rp " + Number(raw).toLocaleString("id-ID") : "";

  return (
    <input
      value={display}
      onChange={handleChange}
      inputMode="numeric"
      placeholder={placeholder || "Biaya per periode"}
      className={className || "w-full rounded-md border px-3 py-2"}
      disabled={disabled}
    />
  );
}
