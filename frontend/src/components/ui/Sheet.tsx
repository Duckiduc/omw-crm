import * as React from "react";
import { cn } from "../../lib/utils";

interface SheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  children: React.ReactNode;
}

function Sheet({ children }: SheetProps) {
  return <>{children}</>;
}

interface SheetContentProps extends React.HTMLAttributes<HTMLDivElement> {
  side?: "left" | "right" | "top" | "bottom";
  children: React.ReactNode;
}

function SheetContent({
  className,
  side = "right",
  children,
  ...props
}: SheetContentProps) {
  return (
    <div
      className={cn(
        "fixed z-50 gap-4 bg-background p-6 shadow-lg transition ease-in-out",
        side === "top" && "inset-x-0 top-0 border-b",
        side === "bottom" && "inset-x-0 bottom-0 border-t",
        side === "left" && "inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm",
        side === "right" &&
          "inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function SheetHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col space-y-2 text-center sm:text-left",
        className
      )}
      {...props}
    />
  );
}

function SheetTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h2
      className={cn("text-lg font-semibold text-foreground", className)}
      {...props}
    />
  );
}

function SheetDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
  );
}

export { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle };
