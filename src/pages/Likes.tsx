import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart, Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most-liked">("newest");
  const [filterType, setFilterType] = useState<string>("all");
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

  // Filter and sort poems
  const uniquePoemTypes = Array.from(new Set(likedPoems.map(p => p.poem_type)));
  
  const filteredPoems = filterType === "all" 
    ? likedPoems 
    : likedPoems.filter(poem => poem.poem_type === filterType);

  const sortedPoems = [...filteredPoems].sort((a, b) => {
    switch (sortBy) {
      case "newest":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "oldest":
        return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      case "most-liked":
        return (b.like_count || 0) - (a.like_count || 0);
      default:
        return 0;
    }
  });

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-6 md:py-16 max-w-4xl">
        <header className="mb-6 md:mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <p className="text-lg text-muted-foreground hidden md:block">
            All the poems you've hearted
          </p>
          {likedPoems.length > 0 && (
            <div className="flex items-center gap-3">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] md:w-[180px]">
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
                <SelectTrigger className="w-[140px] md:w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="most-liked">Most Liked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </header>

        {likedPoems.length === 0 ? (
          <Card className="border-2">
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                You haven't liked any poems yet. Visit the gallery to start liking poems!
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {sortedPoems.map((poem) => (
              <Card 
                key={poem.id} 
                className="border hover:shadow-lg transition-shadow cursor-pointer"
                onClick={() => navigate(`/poem/${poem.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className="text-xs text-muted-foreground">
                      {new Date(poem.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-1">
                      {poem.like_count > 0 && (
                        <span className="text-xs text-muted-foreground">
                          {poem.like_count}
                        </span>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleUnlike(poem.like_id);
                        }}
                      >
                        <Heart className="h-4 w-4 fill-current text-red-500" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-xs text-foreground/80 mb-1">
                    {poem.original_topic && <span>{poem.original_topic} • </span>}
                    {poem.poem_type}
                  </p>
                </CardHeader>
                <CardContent className="pt-0">
                  <blockquote className="border-l-2 border-accent pl-3 text-sm whitespace-pre-wrap font-serif text-foreground/80 leading-relaxed mb-3 max-h-[400px] overflow-y-auto md:max-h-none md:overflow-visible">
                    {poem.content}
                  </blockquote>
                  <CardDescription className="flex items-center gap-1 text-xs">
                    <button
                      onClick={() => navigate(`/profile/${poem.user_id}`)}
                      className="flex items-center gap-1 hover:text-foreground transition-colors cursor-pointer"
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarFallback className="text-[8px]">
                          {poem.profiles?.display_name?.[0]?.toUpperCase() || "A"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {poem.profiles?.display_name || "Anonymous"}
                      </span>
                    </button>
                    <span className="text-muted-foreground">• {poem.profiles?.points || 0} pts</span>
                  </CardDescription>
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
