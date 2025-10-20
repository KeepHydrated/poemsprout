import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User as UserIcon, Trash2, BookMarked, Globe } from "lucide-react";
import type { User } from "@supabase/supabase-js";

interface SavedPoem {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string | null;
  created_at: string;
}

interface PublishedPoem {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string | null;
  created_at: string;
}

const Profile = () => {
  const { userId } = useParams();
  const [user, setUser] = useState<User | null>(null);
  const [profileUserId, setProfileUserId] = useState<string | null>(null);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [points, setPoints] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedPoems, setSavedPoems] = useState<SavedPoem[]>([]);
  const [publishedPoems, setPublishedPoems] = useState<PublishedPoem[]>([]);
  const [loadingPoems, setLoadingPoems] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      // If viewing another user's profile (userId in URL)
      if (userId) {
        setProfileUserId(userId);
        setIsOwnProfile(session?.user?.id === userId);
        
        // Fetch the profile data for this user
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, points")
          .eq("id", userId)
          .maybeSingle();

        if (profile) {
          setDisplayName(profile.display_name || "Anonymous");
          setPoints(profile.points || 0);
        }

        setLoading(false);
        loadPoems(userId);
        if (session?.user) {
          setUser(session.user);
        }
      } else {
        // Viewing own profile (no userId in URL)
        if (!session?.user) {
          navigate("/auth");
          return;
        }

        setUser(session.user);
        setProfileUserId(session.user.id);
        setIsOwnProfile(true);

        // Fetch profile data
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name, points")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          setDisplayName(profile.display_name || "");
          setPoints(profile.points || 0);
        }

        setLoading(false);
        
        // Load poems
        loadPoems(session.user.id);
      }
    };

    loadProfile();
  }, [navigate, userId]);

  const loadPoems = async (userId: string) => {
    setLoadingPoems(true);
    
    // Only fetch saved poems if viewing own profile
    if (isOwnProfile) {
      const { data: saved } = await supabase
        .from("saved_poems")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      setSavedPoems(saved || []);
    }

    // Fetch published poems (visible to everyone)
    const { data: published } = await supabase
      .from("published_poems")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setPublishedPoems(published || []);
    setLoadingPoems(false);
  };

  const handleDeleteSaved = async (poemId: string) => {
    const { error } = await supabase
      .from("saved_poems")
      .delete()
      .eq("id", poemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete poem",
        variant: "destructive",
      });
    } else {
      setSavedPoems(savedPoems.filter(p => p.id !== poemId));
      toast({
        title: "Success",
        description: "Poem deleted successfully",
      });
    }
  };

  const handleDeletePublished = async (poemId: string) => {
    const { error } = await supabase
      .from("published_poems")
      .delete()
      .eq("id", poemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete poem",
        variant: "destructive",
      });
    } else {
      setPublishedPoems(publishedPoems.filter(p => p.id !== poemId));
      toast({
        title: "Success",
        description: "Poem deleted successfully",
      });
    }
  };

  const handleSave = async () => {
    if (!user) return;

    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .upsert({
        id: user.id,
        display_name: displayName,
        updated_at: new Date().toISOString(),
      });

    setSaving(false);

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
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8 flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const poemTypeLabels: Record<string, string> = {
    sonnet: "Sonnet",
    haiku: "Haiku",
    limerick: "Limerick",
    villanelle: "Villanelle",
    ode: "Ode",
    ballad: "Ballad",
    epic: "Epic"
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl font-serif">
              {isOwnProfile ? "My Profile" : `${displayName}'s Profile`}
            </CardTitle>
            <CardDescription>
              {isOwnProfile ? "Manage your account information" : "View user profile"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">
                  {displayName?.[0]?.toUpperCase() || "A"}
                </AvatarFallback>
              </Avatar>
              <div>
                <h3 className="font-semibold text-lg">{displayName || "Anonymous"}</h3>
                <p className="text-sm text-muted-foreground">{points} points</p>
              </div>
            </div>

            {isOwnProfile && user && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user.email || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your display name"
                  />
                </div>

                <Button onClick={handleSave} disabled={saving} className="w-full">
                  {saving ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-serif">
            {isOwnProfile ? "My Poems" : "Published Poems"}
          </CardTitle>
          <CardDescription>
            {isOwnProfile 
              ? "View and manage your saved and published poems" 
              : `Poems published by ${displayName}`
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isOwnProfile ? (
            <Tabs defaultValue="saved" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="saved" className="gap-2">
                  <BookMarked className="h-4 w-4" />
                  Saved ({savedPoems.length})
                </TabsTrigger>
                <TabsTrigger value="published" className="gap-2">
                  <Globe className="h-4 w-4" />
                  Published ({publishedPoems.length})
                </TabsTrigger>
              </TabsList>

            <TabsContent value="saved" className="mt-6">
              {loadingPoems ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : savedPoems.length === 0 ? (
                <div className="text-center py-12">
                  <BookMarked className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No saved poems yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/poem")}
                  >
                    Generate Your First Poem
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {savedPoems.map((poem) => (
                    <Card key={poem.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardDescription className="mt-1">
                              {poemTypeLabels[poem.poem_type] || poem.poem_type} • Saved on {formatDate(poem.created_at)}
                              {poem.original_topic && ` • Topic: ${poem.original_topic}`}
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteSaved(poem.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap font-serif text-foreground/90">
                          {poem.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="published" className="mt-6">
              {loadingPoems ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : publishedPoems.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No published poems yet</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => navigate("/poem")}
                  >
                    Generate and Publish a Poem
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {publishedPoems.map((poem) => (
                    <Card key={poem.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            
                            <CardDescription className="mt-1">
                              {poemTypeLabels[poem.poem_type] || poem.poem_type} • Published on {formatDate(poem.created_at)}
                              {poem.original_topic && ` • Topic: ${poem.original_topic}`}
                            </CardDescription>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeletePublished(poem.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap font-serif text-foreground/90">
                          {poem.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
          ) : (
            // Public view - only show published poems
            <div className="mt-6">
              {loadingPoems ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : publishedPoems.length === 0 ? (
                <div className="text-center py-12">
                  <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">No published poems yet</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {publishedPoems.map((poem) => (
                    <Card key={poem.id}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <CardDescription className="mt-1">
                              {poemTypeLabels[poem.poem_type] || poem.poem_type} • Published on {formatDate(poem.created_at)}
                              {poem.original_topic && ` • Topic: ${poem.original_topic}`}
                            </CardDescription>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-wrap font-serif text-foreground/90">
                          {poem.content}
                        </p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Profile;
