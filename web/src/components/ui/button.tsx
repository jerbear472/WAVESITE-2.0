import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-[10px] text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-px disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-[18px] [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Electric primary — cyan→blue gradient with a soft light-cast.
        primary:
          "bg-gradient-brand text-white glow-primary hover:brightness-[1.06]",
        secondary:
          "bg-card text-foreground border border-border-strong shadow-sm hover:border-faint",
        ghost: "text-muted-foreground hover:text-foreground hover:bg-muted",
        outline:
          "border border-border-strong text-foreground hover:border-primary/50 hover:text-primary-strong",
        accent:
          "bg-gradient-brand text-white glow-primary hover:brightness-[1.06]",
        danger:
          "bg-danger-tint text-danger border border-danger/30 hover:bg-danger/15",
      },
      size: {
        sm: "h-9 px-3.5 text-[13px]",
        md: "h-10 px-4",
        lg: "h-11 px-6 text-[15px]",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
Button.displayName = "Button";

export { Button, buttonVariants };
