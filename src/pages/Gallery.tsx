import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { User, Heart, ChevronDown, X } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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
    avatar_url: string | null;
  } | null;
  like_count?: number;
  user_liked?: boolean;
};

const Gallery = () => {
  const [poems, setPoems] = useState<PublishedPoem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most-liked">("newest");
  const [filterType, setFilterType] = useState<string>("all");
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("search") || "";
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
  }, [user, sortBy]);

  const fetchPoems = async () => {
    try {
      let query = supabase
        .from("published_poems")
        .select(`
          id,
          content,
          poem_type,
          original_topic,
          created_at,
          user_id
        `);

      // Apply sorting based on sortBy state
      if (sortBy === "newest") {
        query = query.order("created_at", { ascending: false });
      } else if (sortBy === "oldest") {
        query = query.order("created_at", { ascending: true });
      }
      // For most-liked, we'll sort after fetching

      const { data, error } = await query;

      if (error) throw error;

      // Fetch profiles and likes separately
      if (data && data.length > 0) {
        const userIds = [...new Set(data.map(poem => poem.user_id))];
        const poemIds = data.map(poem => poem.id);

  const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name, points, avatar_url")
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

        // Sort by most liked if that option is selected
        if (sortBy === "most-liked") {
          poemsWithProfiles.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
        }

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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 md:overflow-auto overflow-hidden">
      <div className="container mx-auto px-4 py-4 md:py-16 max-w-6xl md:h-auto h-screen flex flex-col">
        <div className="md:static md:mb-0">
          {searchQuery && (
            <div className="mb-6 flex items-center gap-2">
              <p className="text-muted-foreground">
                Showing results for: <span className="font-semibold text-foreground">"{searchQuery}"</span>
              </p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 rounded-full"
                onClick={() => navigate("/search")}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}
          <header className="mb-6 md:mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <p className="text-lg text-muted-foreground hidden md:block">
              Explore poems shared by our community
            </p>
            <div className="flex items-center gap-3 w-full md:w-auto">
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-[140px] md:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="Sonnet">Sonnet</SelectItem>
                  <SelectItem value="Haiku">Haiku</SelectItem>
                  <SelectItem value="Limerick">Limerick</SelectItem>
                  <SelectItem value="Villanelle">Villanelle</SelectItem>
                  <SelectItem value="Ode">Ode</SelectItem>
                  <SelectItem value="Ballad">Ballad</SelectItem>
                  <SelectItem value="Epic">Epic</SelectItem>
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "most-liked") => setSortBy(value)}>
                <SelectTrigger className="w-[140px] md:w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="newest">Newest</SelectItem>
                  <SelectItem value="oldest">Oldest</SelectItem>
                  <SelectItem value="most-liked">Most Liked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </header>
        </div>

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
          <ScrollArea className="h-[600px]">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-4 pr-4">
              {poems
                .filter(poem => {
                  // Filter by type
                  const matchesType = filterType === "all" || poem.poem_type === filterType;
                  
                  // Filter by search query
                  const matchesSearch = !searchQuery || 
                    poem.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    poem.original_topic?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                    poem.poem_type.toLowerCase().includes(searchQuery.toLowerCase());
                  
                  return matchesType && matchesSearch;
                })
                .map((poem) => (
                <Card 
                  key={poem.id} 
                  className="border hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => navigate(`/poem/${poem.id}`)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between gap-2 mb-0">
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
                          onClick={(e) => {
                            e.stopPropagation();
                            handleLike(poem.id);
                          }}
                        >
                          <Heart
                            className={`h-4 w-4 ${poem.user_liked ? 'fill-current text-red-500' : ''}`}
                          />
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-foreground/80 mb-1">
                      {poem.original_topic && <>{poem.original_topic} • </>}
                      {poem.poem_type}
                    </p>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <blockquote className="border-l-4 border-primary pl-3 text-base whitespace-pre-wrap font-serif text-foreground/80 leading-relaxed mb-3">
                      {poem.content}
                    </blockquote>
                    <CardDescription 
                      className="flex items-center gap-1 text-xs cursor-pointer hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/profile/${poem.user_id}`);
                      }}
                    >
                      <Avatar className="h-4 w-4">
                        <AvatarImage src={poem.profiles?.avatar_url || undefined} alt={poem.profiles?.display_name || "User"} />
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
          </ScrollArea>
        )}
      </div>
    </div>
  );
};

export default Gallery;
