import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-500/20 text-emerald-400",
        secondary: "border-transparent bg-white/10 text-dvn-text-secondary",
        destructive: "border-transparent bg-red-500/20 text-red-400",
        outline: "text-dvn-text-secondary border-dvn-border",
        observation: "border-transparent bg-emerald-500/10 text-emerald-400",
        general: "border-transparent bg-white/5 text-dvn-text-muted",
        reminder: "border-transparent bg-amber-500/10 text-amber-400",
        fyi: "border-transparent bg-cyan-500/10 text-cyan-400",
        emerald: "border-transparent bg-emerald-500/15 text-emerald-400",
        amber: "border-transparent bg-amber-500/15 text-amber-400",
        cyan: "border-transparent bg-cyan-500/15 text-cyan-400",
        purple: "border-transparent bg-purple-500/15 text-purple-400",
        blue: "border-transparent bg-blue-500/15 text-blue-400",
        orange: "border-transparent bg-orange-500/15 text-orange-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
