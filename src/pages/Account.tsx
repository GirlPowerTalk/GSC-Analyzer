
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserCog, Check, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import GscSettings from "@/components/GscSettings";
import { Alert, AlertDescription } from "@/components/ui/alert";

const Account = () => {
  const { user } = useAuth();

  if (!user) {
    return <div className="p-8 text-center">Please sign in to access account settings</div>;
  }

  return (
    <div className="p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold text-brand-800 mb-6 flex items-center">
          <UserCog className="mr-3" /> Account Settings
        </h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Google Search Console Connection</CardTitle>
              <CardDescription>
                Configure service account credentials for programmatic access to Google Search Console
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GscSettings />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Account;
