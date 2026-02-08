import { FileCheck, ShieldCheck, AlertTriangle, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StatsCardsProps {
  totalVerifications: number;
  authenticCount: number;
  tamperedCount: number;
  pendingCount: number;
}

export function StatsCards({
  totalVerifications,
  authenticCount,
  tamperedCount,
  pendingCount,
}: StatsCardsProps) {
  const stats = [
    {
      title: "Total Verifications",
      value: totalVerifications,
      icon: FileCheck,
      description: "All time",
    },
    {
      title: "Authenticated",
      value: authenticCount,
      icon: ShieldCheck,
      description: "Verified authentic",
      className: "text-emerald-600",
    },
    {
      title: "Tampered",
      value: tamperedCount,
      icon: AlertTriangle,
      description: "Tampering detected",
      className: "text-red-600",
    },
    {
      title: "In Progress",
      value: pendingCount,
      icon: Clock,
      description: "Currently processing",
      className: "text-blue-600",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {stat.title}
            </CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.className || "text-muted-foreground"}`} />
          </CardHeader>
          <CardContent>
            <p className={`text-2xl font-bold ${stat.className || ""}`}>
              {stat.value}
            </p>
            <p className="text-xs text-muted-foreground">{stat.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
