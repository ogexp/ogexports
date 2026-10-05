import * as React from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const buttonVariants = cva(
  // Quietly assured controls with restrained movement and clear focus states.
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium tracking-normal transition-all duration-200 cursor-pointer select-none" +
  " focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" +
  " disabled:pointer-events-none disabled:opacity-50 disabled:cursor-not-allowed" +
  " [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Deep cultivated green
        default:
          "bg-primary text-primary-foreground shadow-sm " +
          "hover:bg-primary/92 hover:shadow-md active:translate-y-0",

        // Red destructive
        destructive:
          "bg-destructive text-destructive-foreground shadow-sm " +
          "hover:bg-destructive/90 active:bg-destructive/95",

        // Refined outline — shifts to emerald tint on hover
        outline:
          "border border-border bg-background " +
          "shadow-none " +
          "hover:bg-primary/5 hover:text-primary hover:border-primary/30 " +
          "active:bg-primary/8 transition-colors",

        // Secondary green
        secondary:
          "bg-secondary text-secondary-foreground shadow-sm " +
          "hover:bg-secondary/85 active:bg-secondary/90",

        // Ghost — minimal
        ghost:
          "hover:bg-muted hover:text-foreground active:bg-muted/80",

        // Link
        link:
          "text-primary underline-offset-4 hover:underline hover:text-primary/80",

        // Restrained harvest-brass accent
        accent:
          "bg-accent text-accent-foreground shadow-sm " +
          "hover:bg-accent/90 hover:shadow-md active:translate-y-0",
      },
      size: {
        default:   "h-10 px-5 py-2",
        sm:        "h-8 rounded-md px-4 text-xs",
        lg:        "h-12 rounded-xl px-8 text-[0.9375rem]",
        xl:        "h-14 rounded-xl px-10 text-base",
        icon:      "h-10 w-10",
        "icon-sm": "h-8 w-8 rounded-md",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"
    return (
      <Comp
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      />
    )
  }
)
Button.displayName = "Button"

export { Button, buttonVariants }
