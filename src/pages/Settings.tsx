import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { Edit, UserIcon, Settings as SettingsIcon } from "lucide-react";

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
      <div className="container mx-auto px-4 py-12 max-w-7xl">
        
        <div className="flex gap-8">
          {/* Vertical Tabs Sidebar */}
          <Tabs defaultValue="profile" orientation="vertical" className="flex gap-8 w-full">
            <TabsList className="flex flex-col h-fit w-64 bg-card border rounded-lg p-2">
              <TabsTrigger value="profile" className="w-full justify-start text-base py-3 px-4">
                <UserIcon className="mr-2 h-4 w-4" />
                Profile Info
              </TabsTrigger>
              <TabsTrigger value="account" className="w-full justify-start text-base py-3 px-4">
                <SettingsIcon className="mr-2 h-4 w-4" />
                Account Info
              </TabsTrigger>
            </TabsList>

            <div className="flex-1">
              {/* Profile Info Tab */}
              <TabsContent value="profile" className="mt-0 space-y-6">
            <div className="bg-card border rounded-2xl p-8 md:p-12">
              <div className="space-y-6">
                <div className="flex justify-between items-start">
                  <div>
                    <h2 className="text-3xl font-bold text-foreground mb-2">
                      Profile Picture
                    </h2>
                    <p className="text-muted-foreground text-lg">
                      Upload and manage your profile picture • <span className="font-semibold text-primary">{points} points</span>
                    </p>
                  </div>
                  {!isEditingProfile ? (
                    <Button
                      onClick={() => setIsEditingProfile(true)}
                      variant="outline"
                      size="lg"
                      className="h-14 px-8"
                    >
                      <Edit className="mr-2" />
                      Edit
                    </Button>
                  ) : (
                    <div className="flex gap-2">
                      <Button
                        onClick={() => setIsEditingProfile(false)}
                        variant="outline"
                        size="lg"
                        className="h-14 px-6"
                      >
                        Cancel
                      </Button>
                      <Button
                        onClick={handleSaveProfile}
                        size="lg"
                        className="h-14 px-6"
                      >
                        Save
                      </Button>
                    </div>
                  )}
                </div>

                <div className="flex flex-col items-start gap-4">
                  <div className="relative">
                    <Avatar className="h-32 w-32">
                      <AvatarImage src={avatarUrl} alt={displayName || user?.email || "User"} />
                      <AvatarFallback className="bg-primary/10 text-4xl">
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
                          <Edit className="h-8 w-8 text-white" />
                        </button>
                      </>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG or GIF (max 5MB)
                  </p>
                </div>

                <div className="space-y-3">
                  <Label className="text-lg font-semibold">Username</Label>
                  <Input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your username"
                    className="h-14 text-lg"
                    disabled={!isEditingProfile}
                  />
                  </div>
                </div>
              </div>
              </TabsContent>

              {/* Account Info Tab */}
              <TabsContent value="account" className="mt-0 space-y-6">
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
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default Settings;
