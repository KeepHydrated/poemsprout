import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Heart, Globe, Trash2 } from "lucide-react";
import type { User } from "@supabase/supabase-js";

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
  const [publishedPoems, setPublishedPoems] = useState<PublishedPoem[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loadingPoems, setLoadingPoems] = useState(false);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most-liked">("newest");
  const [filterType, setFilterType] = useState<string>("all");
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

  const loadPoems = async (targetUserId: string) => {
    setLoadingPoems(true);

    // Fetch published poems (visible to everyone)
    const { data: published } = await supabase
      .from("published_poems")
      .select("*")
      .eq("user_id", targetUserId)
      .order("created_at", { ascending: false });

    setPublishedPoems(published || []);

    // Load like counts for all poems
    const poemIds = (published || []).map(p => p.id);
    if (poemIds.length > 0) {
      const { data: likesData } = await supabase
        .from('poem_likes')
        .select('poem_id')
        .in('poem_id', poemIds);

      if (likesData) {
        const counts: Record<string, number> = {};
        likesData.forEach(like => {
          counts[like.poem_id] = (counts[like.poem_id] || 0) + 1;
        });
        setLikeCounts(counts);
      }
    }

    setLoadingPoems(false);
  };

  const filteredPoems = filterType === "all" 
    ? publishedPoems 
    : publishedPoems.filter(poem => poem.poem_type === filterType);

  const sortedPoems = [...filteredPoems].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "most-liked":
        return (likeCounts[b.id] || 0) - (likeCounts[a.id] || 0);
      default:
        return 0;
    }
  });

  const uniquePoemTypes = Array.from(new Set(publishedPoems.map(p => p.poem_type)));

  // Vertical auto-scroll effect
  useEffect(() => {
    if (sortedPoems.length === 0) return;
    
    const scrollContainer = document.getElementById('poems-container');
    if (!scrollContainer) return;

    const scrollStep = 1; // pixels per interval
    const scrollInterval = 50; // milliseconds

    const interval = setInterval(() => {
      if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight) {
        // Reset to top when reaching bottom
        scrollContainer.scrollTop = 0;
      } else {
        scrollContainer.scrollTop += scrollStep;
      }
    }, scrollInterval);

    return () => clearInterval(interval);
  }, [sortedPoems.length]);

  const handleDeletePublished = async (poemId: string) => {
    if (!confirm("Are you sure you want to delete this poem?")) return;

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
    return new Date(dateString).toLocaleDateString();
  };

  // If viewing own profile and not authenticated, redirect
  if (!userId && !user) {
    return null;
  }

  // Two-column layout matching MyProfile page
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex gap-8">
          {/* Sidebar */}
          <div className="w-64 flex-shrink-0">
            <Card className="sticky top-4">
              <CardContent className="p-6">
                <div className="flex flex-col items-center text-center space-y-4">
                  <Avatar className="h-24 w-24">
                    <AvatarFallback className="text-2xl">
                      {displayName?.[0]?.toUpperCase() || "A"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {displayName || "Anonymous"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {points} points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {!loadingPoems && publishedPoems.length > 0 && (
              <div className="mb-6 flex items-center justify-between">
                <h2 className="hidden lg:block text-2xl font-semibold text-foreground">Poems</h2>
                <div className="flex items-center gap-3">
                  <Select value={filterType} onValueChange={setFilterType}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="All Types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniquePoemTypes.map(type => (
                        <SelectItem key={type} value={type}>{type}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "most-liked") => setSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="newest">Newest First</SelectItem>
                      <SelectItem value="oldest">Oldest First</SelectItem>
                      <SelectItem value="most-liked">Most Liked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {loadingPoems ? (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground mt-4">Loading poems...</p>
              </div>
            ) : publishedPoems.length === 0 ? (
              <div className="text-center py-12">
                <Globe className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  {isOwnProfile ? "You haven't published any poems yet" : "No published poems yet"}
                </p>
                {isOwnProfile && (
                  <Button onClick={() => navigate("/")}>
                    Create Your First Poem
                  </Button>
                )}
              </div>
            ) : (
              <div 
                id="poems-container"
                className="space-y-6 max-h-[600px] overflow-y-auto scroll-smooth pr-2"
              >
                {sortedPoems.map((poem) => (
                  <Card 
                    key={poem.id} 
                    className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => navigate(`/poem/${poem.id}`)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-sm text-muted-foreground">
                          {formatDate(poem.created_at)}
                        </span>
                        <div className="flex items-center gap-2">
                          <Heart className="h-5 w-5 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            {likeCounts[poem.id] || 0}
                          </span>
                        </div>
                      </div>

                      <p className="text-sm text-foreground/80 mb-4">
                        {poem.original_topic} • {poem.poem_type}
                      </p>
                      
                      <blockquote className="border-l-2 border-accent pl-4">
                        <p className="whitespace-pre-wrap font-serif text-foreground leading-relaxed">
                          {poem.content}
                        </p>
                      </blockquote>

                      {isOwnProfile && (
                        <div className="mt-4 flex justify-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeletePublished(poem.id);
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
