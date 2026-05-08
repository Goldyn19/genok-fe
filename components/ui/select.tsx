import * as React from "react"

import { cn } from "@/lib/utils"

export type SelectOption = {
  value: string
  label: string
}

type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> & {
  value: string
  onChange: (value: string) => void
  options: SelectOption[]
}

export function Select({ className, value, onChange, options, ...props }: SelectProps) {
  return (
    <select
      className={cn(
        "h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        className
      )}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      {...props}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  )
}

