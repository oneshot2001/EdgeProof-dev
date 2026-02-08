import { Camera, Shield, Cpu } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface DeviceInfoProps {
  serial: string | null;
  model: string | null;
  firmware: string | null;
  certChainValid: boolean | null;
  certIntermediate: string | null;
  certRoot: string | null;
  attestationValid: boolean | null;
}

export function DeviceInfo({
  serial,
  model,
  firmware,
  certChainValid,
  certIntermediate,
  certRoot,
  attestationValid,
}: DeviceInfoProps) {
  if (!serial && !model) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Camera className="h-4 w-4" />
            Device Origin
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No device information available — video is unsigned.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Camera className="h-4 w-4" />
          Device Origin
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-muted-foreground">Serial Number</p>
            <p className="font-mono font-medium">{serial}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Model</p>
            <p className="font-medium">{model}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Firmware</p>
            <p className="font-medium">{firmware || "N/A"}</p>
          </div>
          <div>
            <p className="text-muted-foreground">Hardware Attestation</p>
            <Badge variant={attestationValid ? "default" : "destructive"}>
              <Cpu className="mr-1 h-3 w-3" />
              {attestationValid ? "TPM Verified" : "Not Verified"}
            </Badge>
          </div>
        </div>

        <div className="border-t pt-4">
          <div className="flex items-center gap-2 text-sm">
            <Shield className="h-4 w-4" />
            <span className="font-medium">Certificate Chain</span>
            <Badge
              variant={certChainValid ? "default" : "destructive"}
              className="ml-auto"
            >
              {certChainValid ? "Valid" : "Invalid"}
            </Badge>
          </div>
          {certIntermediate && (
            <p className="mt-2 text-xs text-muted-foreground">
              {certIntermediate} &rarr; {certRoot}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
