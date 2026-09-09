import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/**
 * shadcn-compatible Button, customized to Design.md tokens.
 * Press feedback (`active:scale-[0.97]`) follows Emil Kowalski guidance;
 * transitions name exact properties with the shared ease-out curve.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-md text-sm font-medium whitespace-nowrap transition-[background-color,color,transform] duration-150 ease-out outline-none select-none active:scale-[0.97] disabled:pointer-events-none disabled:opacity-60 [&_svg]:pointer-events-none [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        secondary: "bg-surface-muted text-foreground hover:bg-border",
        outline:
          "border border-border bg-surface text-foreground hover:bg-surface-muted",
        ghost: "text-foreground hover:bg-surface-muted",
        quiet:
          "h-auto rounded-sm px-1 py-0.5 text-small text-foreground-muted underline-offset-4 hover:text-foreground hover:underline",
        danger: "text-danger hover:bg-surface-muted",
      },
      size: {
        default: "h-8 px-3.5 text-small",
        sm: "h-7 px-2.5 text-small",
        icon: "h-8 w-8",
        "icon-sm": "h-7 w-7",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

function Button({
  className,
  variant,
  size,
  asChild = false,
  ...props
}: React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
  }) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
