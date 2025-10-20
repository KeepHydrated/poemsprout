import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, ArrowLeft, Send, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
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

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    display_name: string | null;
  } | null;
};

const PoemDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [poem, setPoem] = useState<PublishedPoem | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [user, setUser] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    if (id) {
      fetchPoem();
      fetchComments();
    }
  }, [id, user]);

  const fetchPoem = async () => {
    if (!id) return;

    try {
      const { data: poemData, error: poemError } = await supabase
        .from("published_poems")
        .select("id, content, poem_type, original_topic, created_at, user_id")
        .eq("id", id)
        .single();

      if (poemError) throw poemError;

      // Fetch profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("display_name, points")
        .eq("id", poemData.user_id)
        .single();

      // Get like count
      const { data: likesData } = await supabase
        .from("poem_likes")
        .select("id")
        .eq("poem_id", id);

      // Get user's like if logged in
      let userLiked = false;
      if (user) {
        const { data } = await supabase
          .from("poem_likes")
          .select("id")
          .eq("poem_id", id)
          .eq("user_id", user.id)
          .single();
        userLiked = !!data;
      }

      setPoem({
        ...poemData,
        profiles: profileData,
        like_count: likesData?.length || 0,
        user_liked: userLiked,
      });
    } catch (error) {
      console.error("Error fetching poem:", error);
      toast({
        title: "Error",
        description: "Failed to load poem",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchComments = async () => {
    if (!id) return;

    try {
      const { data: commentsData, error } = await supabase
        .from("poem_comments")
        .select("id, content, created_at, user_id")
        .eq("poem_id", id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (commentsData && commentsData.length > 0) {
        const userIds = [...new Set(commentsData.map(c => c.user_id))];
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, display_name")
          .in("id", userIds);

        const profilesMap = new Map(
          profilesData?.map(profile => [profile.id, profile]) || []
        );

        const commentsWithProfiles = commentsData.map(comment => ({
          ...comment,
          profiles: profilesMap.get(comment.user_id) || null,
        }));

        setComments(commentsWithProfiles);
      }
    } catch (error) {
      console.error("Error fetching comments:", error);
    }
  };

  const handleLike = async () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to like poems",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!poem) return;

    if (poem.user_liked) {
      const { error } = await supabase
        .from("poem_likes")
        .delete()
        .eq("poem_id", id)
        .eq("user_id", user.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to unlike poem",
          variant: "destructive",
        });
      } else {
        fetchPoem();
      }
    } else {
      const { error } = await supabase
        .from("poem_likes")
        .insert({ poem_id: id, user_id: user.id });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to like poem",
          variant: "destructive",
        });
      } else {
        fetchPoem();
      }
    }
  };

  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to comment",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    if (!newComment.trim()) {
      toast({
        title: "Comment required",
        description: "Please enter a comment",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from("poem_comments")
        .insert({
          poem_id: id,
          user_id: user.id,
          content: newComment.trim(),
        });

      if (error) throw error;

      setNewComment("");
      fetchComments();
      toast({
        title: "Comment posted",
        description: "Your comment has been added",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to post comment",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    try {
      const { error } = await supabase
        .from("poem_comments")
        .delete()
        .eq("id", commentId)
        .eq("user_id", user?.id);

      if (error) throw error;

      fetchComments();
      toast({
        title: "Comment deleted",
        description: "Your comment has been removed",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete comment",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <p className="text-center text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!poem) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
        <div className="container mx-auto px-4 py-16 max-w-4xl">
          <p className="text-center text-muted-foreground">Poem not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-6"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <Card className="border-2 shadow-lg mb-8">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-sm text-muted-foreground">
                {new Date(poem.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {poem.like_count} {poem.like_count === 1 ? 'like' : 'likes'}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLike}
                >
                  <Heart
                    className={`h-5 w-5 ${poem.user_liked ? 'fill-current text-red-500' : ''}`}
                  />
                </Button>
              </div>
            </div>
            <p className="text-sm text-foreground/80 mb-2">
              {poem.original_topic && <span>{poem.original_topic} • </span>}
              {poem.poem_type}
            </p>
          </CardHeader>
          <CardContent>
            <blockquote className="border-l-4 border-accent pl-4 text-base whitespace-pre-wrap font-serif text-foreground/90 leading-relaxed mb-4">
              {poem.content}
            </blockquote>
            <CardDescription className="flex items-center gap-2 text-sm">
              <Avatar className="h-6 w-6">
                <AvatarFallback className="text-xs">
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

        <div className="space-y-6">
          <h2 className="text-2xl font-semibold text-foreground">
            Comments ({comments.length})
          </h2>

          {user && (
            <form onSubmit={handleSubmitComment} className="space-y-3">
              <Textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder="Share your thoughts..."
                className="min-h-[100px]"
              />
              <Button type="submit" disabled={isSubmitting}>
                <Send className="mr-2 h-4 w-4" />
                Post Comment
              </Button>
            </form>
          )}

          <div className="space-y-4">
            {comments.length === 0 ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                </CardContent>
              </Card>
            ) : (
              comments.map((comment) => (
                <Card key={comment.id}>
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-xs">
                            {comment.profiles?.display_name?.[0]?.toUpperCase() || "A"}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm font-medium">
                          {comment.profiles?.display_name || "Anonymous"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {new Date(comment.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {user?.id === comment.user_id && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => handleDeleteComment(comment.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                    <p className="text-sm text-foreground/90">{comment.content}</p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PoemDetail;