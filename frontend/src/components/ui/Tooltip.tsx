import * as React from "react";
import { cn } from "../../lib/utils";

interface TooltipProps {
  children: React.ReactNode;
}

function TooltipProvider({ children }: TooltipProps) {
  return <>{children}</>;
}

function Tooltip({ children }: TooltipProps) {
  return <>{children}</>;
}

function TooltipTrigger({ children }: TooltipProps) {
  return <>{children}</>;
}

interface TooltipContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "top" | "right" | "bottom" | "left";
  align?: "start" | "center" | "end";
  hidden?: boolean;
}

function TooltipContent({
  className,
  side = "top",
  align = "center",
  hidden = false,
  children,
  ...props
}: TooltipContentProps) {
  if (hidden) return null;

  return (
    <div
      className={cn(
        "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
