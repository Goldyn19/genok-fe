import * as React from "react"

import { cn } from "@/lib/utils"

type AlertProps = React.HTMLAttributes<HTMLDivElement> & {
  variant?: "info" | "warn" | "destructive"
}

export function Alert({ className, variant = "info", ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn(
        "rounded-lg border p-4",
        variant === "info" && "border-border bg-card",
        variant === "warn" && "border-amber-200 bg-amber-50",
        variant === "destructive" && "border-red-200 bg-red-50",
        className
      )}
      {...props}
    />
  )
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn("mb-1 text-sm font-semibold", className)} {...props} />
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={cn("text-sm text-muted-foreground", className)} {...props} />
}

