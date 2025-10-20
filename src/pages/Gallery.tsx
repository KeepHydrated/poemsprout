import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Heart } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

type PublishedPoem = {
  id: string;
  title: string;
  content: string;
  poem_type: string;
  original_topic: string | null;
  created_at: string;
  profiles: {
    display_name: string | null;
  } | null;
  like_count?: number;
  user_liked?: boolean;
};

const Gallery = () => {
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
          title,
          content,
          poem_type,
          original_topic,
          created_at,
          user_id
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch profiles and likes separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(poem => poem.user_id))];
        const poemIds = data.map(poem => poem.id);

        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name")
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <header className="mb-12">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-4 tracking-tight">
            Poetry Gallery
          </h1>
          <p className="text-lg text-muted-foreground">
            Explore poems shared by our community
          </p>
        </header>

        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Loading poems...</p>
          </div>
        ) : poems.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                No poems have been published yet. Be the first to share!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6">
            {poems.map((poem) => (
              <Card key={poem.id} className="border-2 hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-2xl font-serif mb-2">
                        {poem.title}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-2">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[10px]">
                            {poem.profiles?.display_name?.[0]?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <span>
                          {poem.profiles?.display_name || "Anonymous"}
                        </span>
                        <span className="mx-2">•</span>
                        <span>{poem.poem_type}</span>
                        <span className="mx-2">•</span>
                        <span>
                          {new Date(poem.created_at).toLocaleDateString()}
                        </span>
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {poem.like_count! > 0 && (
                        <span className="text-sm text-muted-foreground">
                          {poem.like_count}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleLike(poem.id)}
                      >
                        <Heart
                          className={`h-5 w-5 ${poem.user_liked ? 'fill-current text-red-500' : ''}`}
                        />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {poem.original_topic && (
                    <p className="text-sm text-muted-foreground mb-4 italic">
                      About: {poem.original_topic}
                    </p>
                  )}
                  <blockquote className="border-l-4 border-accent pl-4 whitespace-pre-wrap font-serif text-base text-foreground/90 leading-relaxed">
                    {poem.content}
                  </blockquote>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Gallery;
