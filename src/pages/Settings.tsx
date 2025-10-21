import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { Edit } from "lucide-react";

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [points, setPoints] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
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
      .select('display_name, avatar_url, points')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setDisplayName(data.display_name || "");
      setAvatarUrl(data.avatar_url || "");
      setPoints(data.points || 0);
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

  const handleSaveProfile = async () => {
    if (!user) return;

    const { error } = await supabase
      .from('profiles')
      .update({ display_name: displayName })
      .eq('id', user.id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      setIsEditingProfile(false);
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
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-card border rounded-xl p-4 md:p-6">
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-1">
                    Profile Picture
                  </h2>
                  <p className="text-muted-foreground text-sm">
                    Upload and manage your profile picture • <span className="font-semibold text-primary">{points} points</span>
                  </p>
                </div>
                {!isEditingProfile ? (
                  <Button
                    onClick={() => setIsEditingProfile(true)}
                    variant="outline"
                    size="sm"
                    className="h-9 px-4"
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                ) : (
                  <div className="flex gap-2">
                    <Button
                      onClick={() => setIsEditingProfile(false)}
                      variant="outline"
                      size="sm"
                      className="h-9 px-4"
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handleSaveProfile}
                      size="sm"
                      className="h-9 px-4"
                    >
                      Save
                    </Button>
                  </div>
                )}
              </div>

              <div className="flex flex-col items-start gap-3">
                <div className="relative">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={avatarUrl} alt={displayName || user?.email || "User"} />
                    <AvatarFallback className="bg-primary/10 text-3xl">
                      {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  {isEditingProfile && (
                    <>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleAvatarUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full cursor-pointer hover:bg-black/50 transition-colors"
                      >
                        <Edit className="h-6 w-6 text-white" />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-xs text-muted-foreground">
                  JPG, PNG or GIF (max 5MB)
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-semibold">Username</Label>
                <Input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Enter your username"
                  className="h-10"
                  disabled={!isEditingProfile}
                />
              </div>
            </div>
          </div>

          <div className="bg-card border rounded-xl p-4 md:p-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-sm font-semibold text-foreground mb-1">
                  Personal Information
                </h1>
                <p className="text-muted-foreground text-sm">
                  Update your personal details and contact information
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-sm font-semibold">
                    Email
                  </Label>
                  <Input 
                    id="email" 
                    type="email" 
                    value={user?.email || ""} 
                    disabled 
                    className="bg-muted h-10 text-muted-foreground"
                  />
                  <p className="text-muted-foreground text-xs">
                    Email cannot be changed
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-sm font-semibold">
                    Password
                  </Label>
                  <div className="flex items-center gap-3">
                    <Input 
                      id="password" 
                      type="password" 
                      value="............" 
                      disabled 
                      className="bg-muted flex-1 h-10"
                    />
                    <Button 
                      onClick={handleSendPasswordResetEmail} 
                      size="sm"
                      className="h-10 px-4"
                    >
                      Change Password
                    </Button>
                  </div>
                  <p className="text-muted-foreground text-xs">
                    Click to receive a password reset link via email
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
