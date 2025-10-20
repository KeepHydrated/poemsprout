import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleSendPasswordResetEmail = async () => {
    if (!user?.email) return;

    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/settings`,
    });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send password reset email",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Email Sent",
        description: "Check your email for a password reset link",
      });
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        <div className="bg-card border rounded-2xl p-8 md:p-12">
          <div className="space-y-8">
            <div>
              <h1 className="text-4xl font-bold text-foreground mb-2">
                Personal Information
              </h1>
              <p className="text-muted-foreground text-lg">
                Update your personal details and contact information
              </p>
            </div>

            <div className="space-y-6">
              <div className="space-y-3">
                <Label htmlFor="email" className="text-lg font-semibold">
                  Email
                </Label>
                <Input 
                  id="email" 
                  type="email" 
                  value={user?.email || ""} 
                  disabled 
                  className="bg-muted text-lg h-14 text-muted-foreground"
                />
                <p className="text-muted-foreground text-sm">
                  Email cannot be changed
                </p>
              </div>

              <div className="space-y-3">
                <Label htmlFor="password" className="text-lg font-semibold">
                  Password
                </Label>
                <div className="flex items-center gap-4">
                  <Input 
                    id="password" 
                    type="password" 
                    value="............" 
                    disabled 
                    className="bg-muted flex-1 h-14"
                  />
                  <Button 
                    onClick={handleSendPasswordResetEmail} 
                    size="lg"
                    className="h-14 px-8"
                  >
                    Change Password
                  </Button>
                </div>
                <p className="text-muted-foreground text-sm">
                  Click to receive a password reset link via email
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
