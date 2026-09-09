import * as React from "react";

import { cn } from "@/lib/utils";

function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "h-8 w-full rounded-md border border-border bg-surface px-2.5 text-small text-foreground tabular-nums transition-[border-color] duration-150 ease-out outline-none placeholder:text-foreground-muted hover:border-border-strong focus:border-primary disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
