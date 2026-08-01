import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

// Soft semantic pills — tinted backgrounds, no heavy borders.
const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border border-transparent px-2.5 py-[5px] text-xs font-medium leading-none whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-surface-2 text-muted-foreground",
        primary: "bg-primary-tint text-primary-strong",
        success: "bg-success-tint text-success",
        danger: "bg-danger-tint text-danger",
        warning: "bg-warning-tint text-warning",
        violet: "bg-violet/10 text-violet",
        outline: "border-border-strong bg-transparent text-muted-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <span className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
