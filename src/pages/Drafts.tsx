import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface SavedPoem {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

const Drafts = () => {
  const [user, setUser] = useState<User | null>(null);
  const [drafts, setDrafts] = useState<SavedPoem[]>([]);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; points: number } | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest">("newest");
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadDrafts(session.user.id);
      loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadDrafts(session.user.id);
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

  const loadDrafts = async (userId: string) => {
    setLoading(true);
    
    const { data: draftsData, error } = await supabase
      .from('saved_poems')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && draftsData) {
      setDrafts(draftsData);
    }
    
    setLoading(false);
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

  const handleDelete = async (draftId: string) => {
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

  const handlePublish = async (draft: SavedPoem) => {
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
            {!loading && drafts.length > 0 && (
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-semibold text-foreground">Drafts</h2>
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

            {loading ? (
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
                            onClick={() => handlePublish(draft)}
                            className="text-primary hover:text-primary"
                            title="Publish poem"
                          >
                            <Send className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(draft.id)}
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
        </div>
      </div>
    </div>
  );
};

export default Drafts;
