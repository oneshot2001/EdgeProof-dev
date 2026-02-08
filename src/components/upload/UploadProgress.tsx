"use client";

import { Shield, Upload, Cpu, CheckCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export type UploadStage = "uploading" | "processing" | "verifying" | "complete";

interface UploadProgressProps {
  stage: UploadStage;
  progress: number; // 0-100
  fileName: string;
}

const stages: {
  key: UploadStage;
  label: string;
  icon: typeof Upload;
}[] = [
  { key: "uploading", label: "Uploading", icon: Upload },
  { key: "processing", label: "Processing", icon: Cpu },
  { key: "verifying", label: "Verifying signatures", icon: Shield },
  { key: "complete", label: "Complete", icon: CheckCircle },
];

export function UploadProgress({ stage, progress, fileName }: UploadProgressProps) {
  const currentIndex = stages.findIndex((s) => s.key === stage);

  return (
    <div className="space-y-6 rounded-xl border bg-card p-8">
      <div className="text-center">
        <p className="text-sm text-muted-foreground">Analyzing</p>
        <p className="mt-1 font-medium">{fileName}</p>
      </div>

      <Progress value={progress} className="h-2" />

      <div className="flex justify-between">
        {stages.map((s, i) => {
          const isActive = i === currentIndex;
          const isDone = i < currentIndex;
          const Icon = s.icon;

          return (
            <div
              key={s.key}
              className={cn(
                "flex flex-col items-center gap-2 text-xs",
                isActive && "text-primary font-medium",
                isDone && "text-primary",
                !isActive && !isDone && "text-muted-foreground"
              )}
            >
              <div
                className={cn(
                  "flex h-10 w-10 items-center justify-center rounded-full border-2",
                  isActive && "border-primary bg-primary/10 animate-pulse",
                  isDone && "border-primary bg-primary text-primary-foreground",
                  !isActive && !isDone && "border-muted-foreground/30"
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              <span>{s.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
