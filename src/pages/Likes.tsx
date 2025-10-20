import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type LikedPoem = {
  id: string;
  content: string;
  poem_type: string;
  created_at: string;
  original_topic: string | null;
  user_id: string;
  profiles: {
    display_name: string | null;
    points: number;
  } | null;
  like_id: string;
  like_count: number;
};

const Likes = () => {
  const [likedPoems, setLikedPoems] = useState<LikedPoem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      if (!session?.user) {
        navigate("/auth");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const fetchLikedPoems = async () => {
    if (!user) return;

    try {
      const { data: likes, error } = await supabase
        .from("poem_likes")
        .select(`
          id,
          poem_id
        `)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!likes || likes.length === 0) {
        setLikedPoems([]);
        setIsLoading(false);
        return;
      }

      // Fetch the actual poems
      const poemIds = likes.map(like => like.poem_id);
      const { data: poems, error: poemsError } = await supabase
        .from("published_poems")
        .select("id, content, poem_type, created_at, original_topic, user_id")
        .in("id", poemIds);

      if (poemsError) throw poemsError;

      // Fetch profiles
      const userIds = [...new Set(poems?.map(poem => poem.user_id) || [])];
      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, display_name, points")
        .in("id", userIds);

      const profilesMap = new Map(
        profilesData?.map(profile => [profile.id, profile]) || []
      );

      // Fetch like counts for each poem
      const { data: likeCounts } = await supabase
        .from("poem_likes")
        .select("poem_id")
        .in("poem_id", poemIds);

      const likeCountsMap = new Map<string, number>();
      likeCounts?.forEach(like => {
        likeCountsMap.set(like.poem_id, (likeCountsMap.get(like.poem_id) || 0) + 1);
      });

      // Combine the data
      const formattedPoems = poems?.map(poem => {
        const like = likes.find(l => l.poem_id === poem.id);
        return {
          ...poem,
          profiles: profilesMap.get(poem.user_id) || null,
          like_id: like?.id || "",
          like_count: likeCountsMap.get(poem.id) || 0,
        };
      }) || [];

      setLikedPoems(formattedPoems);
    } catch (error) {
      console.error("Error fetching liked poems:", error);
      toast({
        title: "Error",
        description: "Failed to load liked poems",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchLikedPoems();
    }
  }, [user]);

  const handleUnlike = async (likeId: string) => {
    const { error } = await supabase
      .from("poem_likes")
      .delete()
      .eq("id", likeId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to unlike poem",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Poem unliked",
      });
      fetchLikedPoems();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold mb-2">Your Liked Poems</h1>
        <p className="text-muted-foreground mb-8">
          All the poems you've hearted
        </p>

        {likedPoems.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Heart className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">
                You haven't liked any poems yet. Visit the gallery to start liking poems!
              </p>
              <Button onClick={() => navigate("/gallery")} className="mt-4">
                Go to Gallery
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {likedPoems.map((poem) => (
              <Card key={poem.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  {/* Header with date and like count */}
                  <div className="flex justify-between items-start mb-4">
                    <span className="text-muted-foreground text-sm">
                      {new Date(poem.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{poem.like_count}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 -mr-2"
                        onClick={() => handleUnlike(poem.like_id)}
                      >
                        <Heart className="h-5 w-5 fill-current text-red-500" />
                      </Button>
                    </div>
                  </div>

                  {/* Topic and type */}
                  <div className="mb-4">
                    <p className="text-foreground font-medium">
                      {poem.original_topic && <span>{poem.original_topic} • </span>}
                      {poem.poem_type}
                    </p>
                  </div>

                  {/* Poem content with left border */}
                  <div className="border-l-4 border-primary pl-4 mb-4">
                    <p className="whitespace-pre-wrap text-foreground/90 font-serif text-lg leading-relaxed">
                      {poem.content}
                    </p>
                  </div>

                  {/* Author info */}
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <button
                      onClick={() => navigate(`/profile/${poem.user_id}`)}
                      className="flex items-center gap-2 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs bg-muted">
                          {poem.profiles?.display_name?.[0]?.toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <span>{poem.profiles?.display_name || "Anonymous"}</span>
                    </button>
                    <span>•</span>
                    <span>{poem.profiles?.points || 0} pts</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Likes;
