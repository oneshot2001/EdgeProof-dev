import { Users, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Team Management</h1>
        <p className="text-muted-foreground">
          Manage your team members and permissions
        </p>
      </div>

      <Card>
        <CardContent className="flex flex-col items-center gap-4 py-12">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
            <Lock className="h-8 w-8 text-muted-foreground" />
          </div>
          <h2 className="text-lg font-semibold">Enterprise Feature</h2>
          <p className="max-w-md text-center text-muted-foreground">
            Team management is available on the Enterprise plan. Invite up to 25
            team members, assign roles, and share verification records.
          </p>
          <Button>Upgrade to Enterprise</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Team Members Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 opacity-50">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="font-medium">Sarah Chen</p>
                <p className="text-sm text-muted-foreground">
                  demo@edgeproof.com
                </p>
              </div>
              <span className="text-sm text-muted-foreground">Owner</span>
            </div>
            <p className="text-center text-sm text-muted-foreground">
              Add team members with the Enterprise plan
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
