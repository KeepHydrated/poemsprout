import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { Edit } from "lucide-react";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const loadProfile = async (userId: string) => {
    const { data, error } = await supabase
      .from('profiles')
      .select('display_name, avatar_url')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || "");
    }
  };

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      
      if (!event.target.files || event.target.files.length === 0) {
        return;
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const filePath = `${user?.id}/${Math.random()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', user?.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({
        title: "Success",
        description: "Profile picture updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

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
            {/* Profile Picture Section */}
            <div className="space-y-6 pb-8 border-b">
              <div>
                <h2 className="text-3xl font-bold text-foreground mb-2">
                  Profile Picture
                </h2>
                <p className="text-muted-foreground text-lg">
                  Upload and manage your profile picture
                </p>
              </div>

              <div className="flex flex-col items-start gap-4">
                <Avatar className="h-32 w-32">
                  <AvatarImage src={avatarUrl} alt={displayName || user?.email || "User"} />
                  <AvatarFallback className="bg-primary/10 text-4xl">
                    {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm text-muted-foreground">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>

              <div className="space-y-3">
                <Label className="text-lg font-semibold">Username</Label>
                <div className="space-y-4">
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your username"
                    className="h-14 text-lg"
                  />
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleAvatarUpload}
                    accept="image/*"
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="lg"
                    className="w-full h-14"
                    disabled={uploading}
                  >
                    <Edit className="mr-2" />
                    {uploading ? "Uploading..." : "Edit"}
                  </Button>
                </div>
              </div>
            </div>

            {/* Personal Information Section */}
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
