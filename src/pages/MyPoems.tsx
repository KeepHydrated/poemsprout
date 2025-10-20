import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Heart, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface Poem {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string;
  created_at: string;
  user_id: string;
}

const MyPoems = () => {
  const [user, setUser] = useState<User | null>(null);
  const [poems, setPoems] = useState<Poem[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; points: number } | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadMyPoems(session.user.id);
      loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadMyPoems(session.user.id);
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
      setProfile(data);
    }
  };

  const loadMyPoems = async (userId: string) => {
    setLoading(true);
    
    const { data: poemsData, error } = await supabase
      .from('published_poems')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && poemsData) {
      setPoems(poemsData);
      
      // Load like counts for all poems
      const poemIds = poemsData.map(p => p.id);
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
    }
    
    setLoading(false);
  };

  const handleDelete = async (poemId: string) => {
    if (!confirm("Are you sure you want to delete this poem?")) return;

    const { error } = await supabase
      .from('published_poems')
      .delete()
      .eq('id', poemId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete poem",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Poem deleted successfully",
      });
      setPoems(poems.filter(p => p.id !== poemId));
    }
  };

  if (!user) return null;

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
                    <AvatarImage src={profile?.avatar_url || undefined} />
                    <AvatarFallback className="text-2xl">
                      {profile?.display_name?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-lg">
                      {profile?.display_name || "Anonymous"}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {profile?.points || 0} points
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="mb-8">
              <h1 className="text-4xl font-serif font-bold text-foreground">
                My Poems
              </h1>
            </div>

            {loading ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground">Loading your poems...</p>
              </div>
            ) : poems.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">You haven't published any poems yet</p>
                <Button onClick={() => navigate("/")}>
                  Create Your First Poem
                </Button>
              </div>
            ) : (
              <div className="space-y-6">
                {poems.map((poem) => (
                  <Card key={poem.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <h3 className="font-semibold text-lg text-foreground mb-1">
                            {poem.poem_type}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {poem.original_topic}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Heart className="h-4 w-4" />
                            <span className="text-sm">{likeCounts[poem.id] || 0}</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(poem.id)}
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="bg-muted/30 rounded-lg p-4">
                        <p className="whitespace-pre-wrap font-serif text-foreground">
                          {poem.content}
                        </p>
                      </div>
                      
                      <p className="text-xs text-muted-foreground mt-3">
                        Published {new Date(poem.created_at).toLocaleDateString()}
                      </p>
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

export default MyPoems;
