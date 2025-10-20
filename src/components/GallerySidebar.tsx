import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Heart, ExternalLink } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type PublishedPoem = {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string | null;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
    points: number;
  } | null;
  like_count?: number;
  user_liked?: boolean;
};

const GallerySidebar = () => {
  const [poems, setPoems] = useState<PublishedPoem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    fetchPoems();
  }, [user]);

  const fetchPoems = async () => {
    try {
      const { data, error } = await supabase
        .from("published_poems")
        .select(`
          id,
          content,
          poem_type,
          original_topic,
          created_at,
          user_id
        `)
        .order("created_at", { ascending: false })
        .limit(10);

      if (error) throw error;

      // Fetch profiles and likes separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(poem => poem.user_id))];
        const poemIds = data.map(poem => poem.id);

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, points")
          .in("id", userIds);

        // Get like counts
        const { data: likesData } = await supabase
          .from("poem_likes")
          .select("poem_id")
          .in("poem_id", poemIds);

        // Get user's likes if logged in
        let userLikesData = null;
        if (user) {
          const { data } = await supabase
            .from("poem_likes")
            .select("poem_id")
            .eq("user_id", user.id)
            .in("poem_id", poemIds);
          userLikesData = data;
        }

        const profilesMap = new Map(
          profilesData?.map(profile => [profile.id, profile]) || []
        );

        const likesCountMap = new Map();
        likesData?.forEach(like => {
          likesCountMap.set(like.poem_id, (likesCountMap.get(like.poem_id) || 0) + 1);
        });

        const userLikesSet = new Set(userLikesData?.map(like => like.poem_id) || []);

        const poemsWithProfiles = data.map(poem => ({
          ...poem,
          profiles: profilesMap.get(poem.user_id) || null,
          like_count: likesCountMap.get(poem.id) || 0,
          user_liked: userLikesSet.has(poem.id),
        }));

        setPoems(poemsWithProfiles);
      } else {
        setPoems([]);
      }
    } catch (error) {
      console.error("Error fetching poems:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLike = async (poemId: string) => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like poems",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const poem = poems.find(p => p.id === poemId);
    if (!poem) return;

    if (poem.user_liked) {
      // Unlike
      const { error } = await supabase
        .from("poem_likes")
        .delete()
        .eq("poem_id", poemId)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to unlike poem",
          variant: "destructive",
        });
      } else {
        fetchPoems();
      }
    } else {
      // Like
      const { error } = await supabase
        .from("poem_likes")
        .insert({ poem_id: poemId, user_id: user.id });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to like poem",
          variant: "destructive",
        });
      } else {
        fetchPoems();
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between mb-4 px-1">
        <h2 className="text-2xl font-serif font-bold">Community Poems</h2>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate("/gallery")}
        >
          <ExternalLink className="h-4 w-4 mr-1" />
          View All
        </Button>
      </div>

      <ScrollArea className="flex-1 pr-4">
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Loading poems...</p>
          </div>
        ) : poems.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-8 text-center">
              <p className="text-muted-foreground text-sm">
                No poems published yet. Be the first!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {poems.map((poem) => (
              <Card key={poem.id} className="border hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-1 mb-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(poem.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      {poem.like_count! > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {poem.like_count}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleLike(poem.id)}
                      >
                        <Heart
                          className={`h-4 w-4 ${poem.user_liked ? 'fill-current text-red-500' : ''}`}
                        />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/80 mb-1">
                    {poem.original_topic && <span>{poem.original_topic} • </span>}
                    {poem.poem_type}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <blockquote className="border-l-2 border-accent pl-3 text-sm whitespace-pre-wrap font-serif text-foreground/80 leading-relaxed line-clamp-6 mb-3">
                    {poem.content}
                  </blockquote>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <Avatar className="h-4 w-4">
                      <AvatarFallback className="text-[8px]">
                        {poem.profiles?.display_name?.[0]?.toUpperCase() || "A"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="truncate">
                      {poem.profiles?.display_name || "Anonymous"}
                    </span>
                    <span className="text-muted-foreground">• {poem.profiles?.points || 0} pts</span>
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default GallerySidebar;
