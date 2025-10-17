import { Badge } from "./Badge";
import {
  type ContactStatus,
  CONTACT_STATUS_OPTIONS,
} from "../../lib/contactStatus";

interface ContactStatusBadgeProps {
  status: ContactStatus;
  size?: "sm" | "md";
}

export function ContactStatusBadge({
  status,
  size = "sm",
}: ContactStatusBadgeProps) {
  const statusConfig = CONTACT_STATUS_OPTIONS.find(
    (option) => option.value === status
  );

  if (!statusConfig) {
    return null;
  }

  return (
    <Badge
      variant="outline"
      className={`${statusConfig.color} ${
        size === "sm" ? "text-xs" : "text-sm"
      }`}
    >
      {statusConfig.label}
    </Badge>
  );
}

interface ContactStatusSelectProps {
  value: ContactStatus;
  onChange: (status: ContactStatus) => void;
  className?: string;
}

export function ContactStatusSelect({
  value,
  onChange,
  className = "",
}: ContactStatusSelectProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as ContactStatus)}
      className={`rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 ${className}`}
    >
      {CONTACT_STATUS_OPTIONS.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}
