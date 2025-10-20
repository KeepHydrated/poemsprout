import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";
import { Edit, UserIcon, Settings as SettingsIcon, FileText, Trash2, Send } from "lucide-react";

interface SavedPoem {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const Settings = () => {
  const [user, setUser] = useState<User | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [points, setPoints] = useState(0);
  const [uploading, setUploading] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [drafts, setDrafts] = useState<SavedPoem[]>([]);
  const [loadingDrafts, setLoadingDrafts] = useState(true);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
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
      loadDrafts(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadProfile(session.user.id);
      loadDrafts(session.user.id);
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

  const loadDrafts = async (userId: string) => {
    setLoadingDrafts(true);
    
    const { data: draftsData, error } = await supabase
      .from('saved_poems')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && draftsData) {
      setDrafts(draftsData);
    }
    
    setLoadingDrafts(false);
  };

  const sortedDrafts = [...drafts].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
      case "oldest":
        return new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime();
      default:
        return 0;
    }
  });

  const handleDeleteDraft = async (draftId: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;

    const { error } = await supabase
      .from('saved_poems')
      .delete()
      .eq('id', draftId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete draft",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Draft deleted successfully",
      });
      setDrafts(drafts.filter(d => d.id !== draftId));
    }
  };

  const handlePublishDraft = async (draft: SavedPoem) => {
    if (!user) return;

    const { error } = await supabase
      .from('published_poems')
      .insert({
        content: draft.content,
        poem_type: draft.poem_type,
        original_topic: draft.original_topic,
        user_id: user.id,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to publish poem",
        variant: "destructive",
      });
    } else {
      // Delete from drafts after publishing
      await supabase.from('saved_poems').delete().eq('id', draft.id);
      
      toast({
        title: "Success",
        description: "Poem published successfully",
      });
      setDrafts(drafts.filter(d => d.id !== draft.id));
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
              <TabsTrigger value="drafts" className="w-full justify-start text-base py-3 px-4">
                <FileText className="mr-2 h-4 w-4" />
                Drafts
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

              {/* Drafts Tab */}
              <TabsContent value="drafts" className="mt-0 space-y-6">
            <div className="bg-card border rounded-2xl p-8 md:p-12">
              {!loadingDrafts && drafts.length > 0 && (
                <div className="mb-6 flex items-center justify-between">
                  <h2 className="text-2xl font-semibold text-foreground">Your Drafts</h2>
                  <Select value={sortBy} onValueChange={(value: "newest" | "oldest") => setSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {loadingDrafts ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">Loading your drafts...</p>
                </div>
              ) : drafts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground mb-4">You don't have any saved drafts</p>
                  <Button onClick={() => navigate("/")}>
                    Create Your First Poem
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {sortedDrafts.map((draft) => (
                    <Card key={draft.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="font-semibold text-lg text-foreground mb-1">
                              {draft.poem_type}
                            </h3>
                            <p className="text-sm text-muted-foreground">
                              {draft.original_topic}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handlePublishDraft(draft)}
                              className="text-primary hover:text-primary"
                              title="Publish poem"
                            >
                              <Send className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteDraft(draft.id)}
                              className="text-destructive hover:text-destructive"
                              title="Delete draft"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        
                        <div className="bg-muted/30 rounded-lg p-4">
                          <p className="whitespace-pre-wrap font-serif text-foreground">
                            {draft.content}
                          </p>
                        </div>
                        
                        <p className="text-xs text-muted-foreground mt-3">
                          Last updated {new Date(draft.updated_at).toLocaleDateString()}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
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
