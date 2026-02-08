import { CheckCircle, XCircle, AlertTriangle, HelpCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { type VerificationStatus } from "@/types/database";

interface VerdictBadgeProps {
  status: VerificationStatus;
  size?: "sm" | "lg";
}

const config: Record<
  string,
  {
    icon: typeof CheckCircle;
    label: string;
    sublabel: string;
    bgColor: string;
    textColor: string;
    iconColor: string;
  }
> = {
  authentic: {
    icon: CheckCircle,
    label: "VERIFIED AUTHENTIC",
    sublabel: "This video has not been tampered with",
    bgColor: "bg-emerald-50 dark:bg-emerald-950/30",
    textColor: "text-emerald-800 dark:text-emerald-200",
    iconColor: "text-emerald-600",
  },
  tampered: {
    icon: XCircle,
    label: "TAMPERING DETECTED",
    sublabel: "This video has been modified after recording",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-800 dark:text-red-200",
    iconColor: "text-red-600",
  },
  unsigned: {
    icon: AlertTriangle,
    label: "UNSIGNED VIDEO",
    sublabel: "This video does not contain cryptographic signatures",
    bgColor: "bg-amber-50 dark:bg-amber-950/30",
    textColor: "text-amber-800 dark:text-amber-200",
    iconColor: "text-amber-600",
  },
  inconclusive: {
    icon: HelpCircle,
    label: "INCONCLUSIVE",
    sublabel: "Verification could not determine video authenticity",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    textColor: "text-gray-800 dark:text-gray-200",
    iconColor: "text-gray-500",
  },
  error: {
    icon: XCircle,
    label: "VERIFICATION ERROR",
    sublabel: "An error occurred during verification",
    bgColor: "bg-red-50 dark:bg-red-950/30",
    textColor: "text-red-800 dark:text-red-200",
    iconColor: "text-red-600",
  },
  processing: {
    icon: Loader2,
    label: "PROCESSING",
    sublabel: "Analyzing cryptographic signatures...",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-800 dark:text-blue-200",
    iconColor: "text-blue-600",
  },
  pending: {
    icon: Loader2,
    label: "PENDING",
    sublabel: "Waiting to begin verification",
    bgColor: "bg-gray-50 dark:bg-gray-900/30",
    textColor: "text-gray-800 dark:text-gray-200",
    iconColor: "text-gray-500",
  },
  uploading: {
    icon: Loader2,
    label: "UPLOADING",
    sublabel: "Uploading video file...",
    bgColor: "bg-blue-50 dark:bg-blue-950/30",
    textColor: "text-blue-800 dark:text-blue-200",
    iconColor: "text-blue-600",
  },
};

export function VerdictBadge({ status, size = "lg" }: VerdictBadgeProps) {
  const c = config[status] || config.inconclusive;
  const Icon = c.icon;
  const isAnimated = ["processing", "pending", "uploading"].includes(status);

  if (size === "sm") {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
          c.bgColor,
          c.textColor
        )}
      >
        <Icon className={cn("h-3.5 w-3.5", c.iconColor, isAnimated && "animate-spin")} />
        {c.label}
      </span>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col items-center gap-4 rounded-xl p-8",
        c.bgColor
      )}
    >
      <Icon
        className={cn(
          "h-20 w-20",
          c.iconColor,
          isAnimated && "animate-spin"
        )}
      />
      <div className="text-center">
        <h2 className={cn("text-2xl font-bold tracking-tight", c.textColor)}>
          {c.label}
        </h2>
        <p className={cn("mt-1 text-sm", c.textColor, "opacity-80")}>
          {c.sublabel}
        </p>
      </div>
    </div>
  );
}
