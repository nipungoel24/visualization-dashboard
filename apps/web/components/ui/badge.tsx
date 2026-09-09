import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center justify-center gap-1 rounded-sm px-1.5 py-0.5 font-mono text-micro font-medium whitespace-nowrap tabular-nums",
  {
    variants: {
      variant: {
        muted: "bg-surface-muted text-foreground-muted",
        primary: "bg-primary text-primary-foreground",
        highlight: "bg-highlight text-foreground",
        outline: "border border-border text-foreground-muted",
      },
    },
    defaultVariants: {
      variant: "muted",
    },
  },
);

function Badge({
  className,
  variant,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants>) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
