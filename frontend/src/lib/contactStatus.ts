export type ContactStatus = "hot" | "warm" | "cold" | "allGood";

export const CONTACT_STATUS_OPTIONS = [
  {
    value: "hot",
    label: "Hot",
    color: "bg-red-100 text-red-800 border-red-200",
  },
  {
    value: "warm",
    label: "Warm",
    color: "bg-orange-100 text-orange-800 border-orange-200",
  },
  {
    value: "cold",
    label: "Cold",
    color: "bg-blue-100 text-blue-800 border-blue-200",
  },
  {
    value: "allGood",
    label: "All Good",
    color: "bg-green-100 text-green-800 border-green-200",
  },
] as const;
