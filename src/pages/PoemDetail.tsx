import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Heart, Send, Trash2, ChevronUp, ChevronDown, MessageSquare, Check, Rocket, TrendingUp, Clock, ChevronDown as ChevronDownIcon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

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

type Comment = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  parent_comment_id: string | null;
  profiles: {
    display_name: string | null;
  } | null;
  replies?: Comment[];
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
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"best" | "top" | "new">("best");
  const [sortOpen, setSortOpen] = useState(false);
  const [otherPoems, setOtherPoems] = useState<PublishedPoem[]>([]);

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

  const fetchOtherPoems = async (userId: string) => {
    try {
      const { data: poemsData, error } = await supabase
        .from("published_poems")
        .select("id, content, poem_type, original_topic, created_at, user_id")
        .eq("user_id", userId)
        .neq("id", id)
        .order("created_at", { ascending: false })
        .limit(3);

      if (error) throw error;

      if (poemsData) {
        // Fetch profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("display_name, points, avatar_url")
          .eq("id", userId)
          .single();

        // Get like counts for all poems
        const poemIds = poemsData.map(p => p.id);
        const { data: likesData } = await supabase
          .from("poem_likes")
          .select("poem_id")
          .in("poem_id", poemIds);

        // Count likes per poem
        const likeCounts = likesData?.reduce((acc, like) => {
          acc[like.poem_id] = (acc[like.poem_id] || 0) + 1;
          return acc;
        }, {} as Record<string, number>) || {};

        const poemsWithData = poemsData.map(poem => ({
          ...poem,
          profiles: profileData,
          like_count: likeCounts[poem.id] || 0,
        }));

        setOtherPoems(poemsWithData);
      }
    } catch (error) {
      console.error("Error fetching other poems:", error);
    }
  };

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
        .select("display_name, points, avatar_url")
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

      // Fetch other poems by this author
      fetchOtherPoems(poemData.user_id);
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
        .select("id, content, created_at, user_id, parent_comment_id")
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

        // Organize comments into parent-child structure
        const parentComments = commentsWithProfiles.filter(c => !c.parent_comment_id);
        const childComments = commentsWithProfiles.filter(c => c.parent_comment_id);

        const commentsTree = parentComments.map(parent => ({
          ...parent,
          replies: childComments.filter(child => child.parent_comment_id === parent.id)
            .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
        }));

        setComments(commentsTree);
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
          parent_comment_id: replyingTo,
        });

      if (error) throw error;

      setNewComment("");
      setReplyingTo(null);
      fetchComments();
      toast({
        title: replyingTo ? "Reply posted" : "Comment posted",
        description: replyingTo ? "Your reply has been added" : "Your comment has been added",
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
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20 overflow-y-auto">
      <div className="container mx-auto px-4 pt-2 pb-4 md:py-8 max-w-7xl">
        {/* Mobile Sticky Header */}
        <div className="md:hidden sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b pb-4 mb-4 -mx-4 px-4 pt-2">
          <p className="text-sm text-muted-foreground mb-2">
            {new Date(poem.created_at).toLocaleDateString()}
          </p>
          {poem.original_topic && (
            <p className="text-base text-foreground/80 mb-2">
              {poem.original_topic}
            </p>
          )}
          <p className="text-base text-foreground/80 font-semibold mb-3">
            {poem.poem_type}
          </p>
          
          <div className="flex items-center gap-2 mb-4">
            <Heart className="h-5 w-5 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              {poem.like_count}
            </span>
          </div>
          
          {poem.profiles && (
            <div 
              className="flex items-center gap-3 p-3 bg-card rounded-lg border cursor-pointer hover:bg-accent transition-colors"
              onClick={() => navigate(`/profile/${poem.user_id}`)}
            >
              <Avatar className="h-12 w-12">
                <AvatarFallback>
                  {poem.profiles.display_name?.[0]?.toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-sm font-semibold text-foreground">
                  {poem.profiles.display_name || "Anonymous"}
                </span>
                <span className="text-xs text-muted-foreground">
                  {poem.profiles.points} points
                </span>
              </div>
            </div>
          )}

          {/* Other poems by this author - Mobile */}
          {otherPoems.length > 0 && (
            <div className="mt-16 pt-6 space-y-3 border-t border-border">
              <h3 className="text-sm font-semibold text-foreground">More by this author</h3>
              {otherPoems.map((otherPoem) => (
                <Card
                  key={otherPoem.id}
                  className="cursor-pointer hover:bg-accent transition-colors border"
                  onClick={() => navigate(`/poem/${otherPoem.id}`)}
                >
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-start justify-between">
                      <span className="text-xs text-muted-foreground">
                        {new Date(otherPoem.created_at).toLocaleDateString()}
                      </span>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{otherPoem.like_count}</span>
                        <Heart className="h-3 w-3 text-muted-foreground" />
                      </div>
                    </div>
                    <div>
                      {otherPoem.original_topic && (
                        <p className="text-xs text-foreground/80 mb-1">
                          {otherPoem.original_topic}
                        </p>
                      )}
                      <p className="text-xs text-foreground/80 font-semibold">
                        {otherPoem.poem_type}
                      </p>
                    </div>
                    <div className="border-l-2 border-border pl-2">
                      <p className="text-xs text-foreground/70 line-clamp-3 font-serif">
                        {otherPoem.content}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 pt-1">
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {otherPoem.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-xs text-muted-foreground">
                        {otherPoem.profiles?.display_name || "Anonymous"} • {otherPoem.profiles?.points || 0} pts
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>


        {/* Desktop Layout - Side by Side */}
        <div className="hidden md:flex gap-16 mb-8 items-start">
          {/* Left: Header Info */}
          <div className="w-80 flex-shrink-0">
            <div className="space-y-4 pt-6">
              <p className="text-sm text-muted-foreground">
                {new Date(poem.created_at).toLocaleDateString()}
              </p>
              {poem.original_topic && (
                <p className="text-base text-foreground/80">
                  {poem.original_topic}
                </p>
              )}
              <p className="text-base text-foreground/80 font-semibold">
                {poem.poem_type}
              </p>
              
              <div className="flex items-center gap-2 pt-2">
                <Heart className="h-5 w-5 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {poem.like_count}
                </span>
              </div>
              
              {poem.profiles && (
                <div 
                  className="flex items-center gap-3 mt-4 p-3 bg-card rounded-lg border cursor-pointer hover:bg-accent transition-colors"
                  onClick={() => navigate(`/profile/${poem.user_id}`)}
                >
                  <Avatar className="h-12 w-12">
                    <AvatarFallback>
                      {poem.profiles.display_name?.[0]?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-sm font-semibold text-foreground">
                      {poem.profiles.display_name || "Anonymous"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {poem.profiles.points} points
                    </span>
                  </div>
                </div>
              )}

              {/* Other poems by this author */}
              {otherPoems.length > 0 && (
                <div className="mt-24 pt-8 space-y-3 border-t border-border">
                  <h3 className="text-sm font-semibold text-foreground">More by this author</h3>
                  {otherPoems.map((otherPoem) => (
                    <Card
                      key={otherPoem.id}
                      className="cursor-pointer hover:bg-accent transition-colors border"
                      onClick={() => navigate(`/poem/${otherPoem.id}`)}
                    >
                      <CardContent className="p-3 space-y-2">
                        <div className="flex items-start justify-between">
                          <span className="text-xs text-muted-foreground">
                            {new Date(otherPoem.created_at).toLocaleDateString()}
                          </span>
                          <div className="flex items-center gap-1">
                            <span className="text-xs text-muted-foreground">{otherPoem.like_count}</span>
                            <Heart className="h-3 w-3 text-muted-foreground" />
                          </div>
                        </div>
                        <div>
                          {otherPoem.original_topic && (
                            <p className="text-xs text-foreground/80 mb-1">
                              {otherPoem.original_topic}
                            </p>
                          )}
                          <p className="text-xs text-foreground/80 font-semibold">
                            {otherPoem.poem_type}
                          </p>
                        </div>
                        <div className="border-l-2 border-border pl-2">
                          <p className="text-xs text-foreground/70 line-clamp-3 font-serif">
                            {otherPoem.content}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-1">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {otherPoem.profiles?.display_name?.[0]?.toUpperCase() || "U"}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">
                            {otherPoem.profiles?.display_name || "Anonymous"} • {otherPoem.profiles?.points || 0} pts
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Poem Content */}
          <div className="flex-1">
            <Card className="border-2 shadow-lg relative">
              <div className="absolute top-4 right-4 z-10">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleLike}
                  className="h-9 w-9"
                >
                  <Heart
                    className={`h-5 w-5 ${poem.user_liked ? 'fill-current text-red-500' : ''}`}
                  />
                </Button>
              </div>
              <CardContent className="pt-6">
                <div className="text-base whitespace-pre-wrap font-serif text-foreground/90 leading-relaxed">
                  {poem.content}
                </div>
              </CardContent>
            </Card>

            {/* Comments Section - Desktop */}
            <div className="space-y-6 mt-8">
              {user && (
                <Card className="border p-4">
                  <div className="flex items-start gap-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>
                        {user?.email?.[0]?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-3">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder={replyingTo ? "Write a reply..." : "What are your thoughts?"}
                        className="min-h-[80px] resize-none"
                      />
                      <div className="flex justify-end gap-2">
                        {replyingTo && (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => setReplyingTo(null)}
                          >
                            Cancel
                          </Button>
                        )}
                        <Button onClick={handleSubmitComment} disabled={isSubmitting || !newComment.trim()}>
                          {replyingTo ? "Reply" : "Comment"}
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              )}

              <div className="pt-2 flex items-center gap-4">
                <span className="text-sm text-muted-foreground font-medium">
                  {comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)} {comments.length === 1 ? "Comment" : "Comments"}
                </span>
                
                <div className="relative">
                  <Button
                    variant="outline"
                    onClick={() => setSortOpen(!sortOpen)}
                  >
                    {sortBy === "best" && <Rocket className="w-4 h-4 mr-2" />}
                    {sortBy === "top" && <TrendingUp className="w-4 h-4 mr-2" />}
                    {sortBy === "new" && <Clock className="w-4 h-4 mr-2" />}
                    Sort by: {sortBy === "best" ? "Best" : sortBy === "top" ? "Top" : "New"}
                    <ChevronDownIcon className="w-4 h-4 ml-1" />
                  </Button>
                  
                  {sortOpen && (
                    <div className="absolute left-0 top-full mt-2 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50">
                      {[
                        { value: "best" as const, label: "Best", icon: Rocket },
                        { value: "top" as const, label: "Top", icon: TrendingUp },
                        { value: "new" as const, label: "New", icon: Clock }
                      ].map((option) => (
                        <div
                          key={option.value}
                          onClick={() => {
                            setSortBy(option.value);
                            setSortOpen(false);
                          }}
                          className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                        >
                          <option.icon className="w-5 h-5 mr-3" />
                          <span className="flex-1">{option.label}</span>
                          {sortBy === option.value && <Check className="w-4 h-4 text-primary" />}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <ScrollArea className="max-h-[400px] bg-card rounded-lg border">
                <div className="space-y-2 py-4">
                  {comments.length === 0 ? (
                    <div className="py-8 text-center">
                      <p className="text-muted-foreground">
                        No comments yet. Be the first to share your thoughts!
                      </p>
                    </div>
                  ) : (
                    comments.map((comment) => (
                      <div key={comment.id} className="border-b last:border-b-0 px-4">
                        <CommentItem
                          comment={comment}
                          user={user}
                          onReply={setReplyingTo}
                          onDelete={handleDeleteComment}
                          onRefresh={fetchComments}
                          poemId={id!}
                          depth={0}
                        />
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>
          </div>
        </div>

        {/* Mobile: Poem Card Only */}
        <div className="md:hidden mb-8">
          <Card className="border-2 shadow-lg relative">
            <div className="absolute top-4 right-4 z-10">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleLike}
                className="h-9 w-9"
              >
                <Heart
                  className={`h-5 w-5 ${poem.user_liked ? 'fill-current text-red-500' : ''}`}
                />
              </Button>
            </div>
            <CardContent className="pt-6">
              <div className="text-base whitespace-pre-wrap font-serif text-foreground/90 leading-relaxed">
                {poem.content}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comments Section - Mobile full width */}
        <div className="md:hidden space-y-6">
          {user && (
            <Card className="border p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback>
                    {user?.email?.[0]?.toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-3">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder={replyingTo ? "Write a reply..." : "What are your thoughts?"}
                    className="min-h-[80px] resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    {replyingTo && (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => setReplyingTo(null)}
                      >
                        Cancel
                      </Button>
                    )}
                    <Button onClick={handleSubmitComment} disabled={isSubmitting || !newComment.trim()}>
                      {replyingTo ? "Reply" : "Comment"}
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="pt-2 flex items-center gap-4">
            <span className="text-sm text-muted-foreground font-medium">
              {comments.reduce((total, comment) => total + 1 + (comment.replies?.length || 0), 0)} {comments.length === 1 ? "Comment" : "Comments"}
            </span>
            
            <div className="relative">
              <Button
                variant="outline"
                onClick={() => setSortOpen(!sortOpen)}
              >
                {sortBy === "best" && <Rocket className="w-4 h-4 mr-2" />}
                {sortBy === "top" && <TrendingUp className="w-4 h-4 mr-2" />}
                {sortBy === "new" && <Clock className="w-4 h-4 mr-2" />}
                Sort by: {sortBy === "best" ? "Best" : sortBy === "top" ? "Top" : "New"}
                <ChevronDownIcon className="w-4 h-4 ml-1" />
              </Button>
              
              {sortOpen && (
                <div className="absolute left-0 top-full mt-2 w-48 rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50">
                  {[
                    { value: "best" as const, label: "Best", icon: Rocket },
                    { value: "top" as const, label: "Top", icon: TrendingUp },
                    { value: "new" as const, label: "New", icon: Clock }
                  ].map((option) => (
                    <div
                      key={option.value}
                      onClick={() => {
                        setSortBy(option.value);
                        setSortOpen(false);
                      }}
                      className="relative flex cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors hover:bg-accent hover:text-accent-foreground"
                    >
                      <option.icon className="w-5 h-5 mr-3" />
                      <span className="flex-1">{option.label}</span>
                      {sortBy === option.value && <Check className="w-4 h-4 text-primary" />}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <ScrollArea className="max-h-[400px] bg-card rounded-lg border">
            <div className="space-y-2 py-4">
              {comments.length === 0 ? (
                <div className="py-8 text-center">
                  <p className="text-muted-foreground">
                    No comments yet. Be the first to share your thoughts!
                  </p>
                </div>
              ) : (
                comments.map((comment) => (
                  <div key={comment.id} className="border-b last:border-b-0 px-4">
                    <CommentItem
                      comment={comment}
                      user={user}
                      onReply={setReplyingTo}
                      onDelete={handleDeleteComment}
                      onRefresh={fetchComments}
                      poemId={id!}
                      depth={0}
                    />
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};

type CommentItemProps = {
  comment: Comment;
  user: any;
  onReply: (id: string) => void;
  onDelete: (id: string) => void;
  onRefresh: () => void;
  poemId: string;
  depth?: number;
};

const CommentItem = ({ comment, user, onReply, onDelete, onRefresh, poemId, depth = 0 }: CommentItemProps) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [votes, setVotes] = useState(0);
  const [voteState, setVoteState] = useState<"up" | "down" | null>(null);

  const handleVote = (type: "up" | "down") => {
    if (voteState === type) {
      setVotes(0);
      setVoteState(null);
    } else if (voteState === null) {
      setVotes(type === "up" ? 1 : -1);
      setVoteState(type);
    } else {
      setVotes(type === "up" ? 2 : -2);
      setVoteState(type);
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !user) return;

    try {
      const { error } = await supabase
        .from("poem_comments")
        .insert({
          poem_id: poemId,
          user_id: user.id,
          content: replyText.trim(),
          parent_comment_id: comment.id,
        });

      if (error) throw error;

      setReplyText("");
      setShowReply(false);
      onRefresh();
    } catch (error: any) {
      console.error("Error posting reply:", error);
    }
  };

  const getTimeAgo = (date: string) => {
    const now = new Date();
    const commentDate = new Date(date);
    const diffMs = now.getTime() - commentDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return `${diffDays}d ago`;
  };

  const authorName = comment.profiles?.display_name || "Anonymous";
  const avatarSeed = authorName.replace(/\s+/g, '');

  return (
    <div className="py-2">
      <div className="flex gap-2">
        <div className="flex flex-col items-center gap-1 pt-1">
          <button
            onClick={() => handleVote("up")}
            className={`p-1 rounded hover:bg-upvote/10 transition-colors ${
              voteState === "up" ? "text-upvote" : "text-muted-foreground"
            }`}
            aria-label="Upvote"
          >
            <ChevronUp className="w-5 h-5" />
          </button>
          <span
            className={`text-xs font-bold min-w-[24px] text-center ${
              voteState === "up"
                ? "text-upvote"
                : voteState === "down"
                ? "text-downvote"
                : "text-foreground"
            }`}
          >
            {votes}
          </span>
          <button
            onClick={() => handleVote("down")}
            className={`p-1 rounded hover:bg-downvote/10 transition-colors ${
              voteState === "down" ? "text-downvote" : "text-muted-foreground"
            }`}
            aria-label="Downvote"
          >
            <ChevronDown className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className="relative flex h-6 w-6 shrink-0 overflow-hidden rounded-full">
              <img
                src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${avatarSeed}`}
                alt={authorName}
                className="aspect-square h-full w-full"
              />
            </div>
            <span className="font-medium text-sm">{authorName}</span>
            <span className="text-xs text-muted-foreground">•</span>
            <span className="text-xs text-muted-foreground">{getTimeAgo(comment.created_at)}</span>
            {comment.replies && comment.replies.length > 0 && (
              <>
                <span className="text-xs text-muted-foreground">•</span>
                <button
                  onClick={() => setIsCollapsed(!isCollapsed)}
                  className="text-xs text-primary hover:underline"
                >
                  [{isCollapsed ? "+" : "−"}]
                </button>
              </>
            )}
          </div>

          {!isCollapsed && (
            <>
              <p className="text-sm mb-2 whitespace-pre-wrap break-words">{comment.content}</p>
              
              <div className="flex items-center gap-3 mb-2">
                {user && (
                  <button
                    onClick={() => setShowReply(!showReply)}
                    className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <MessageSquare className="w-3 h-3" />
                    Reply
                  </button>
                )}
                {user?.id === comment.user_id && (
                  <button
                    onClick={() => onDelete(comment.id)}
                    className="flex items-center gap-1 text-xs text-destructive hover:text-destructive/80 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    Delete
                  </button>
                )}
              </div>

              {showReply && (
                <div className="mb-3 p-3 bg-comment-hover rounded-lg">
                  <Textarea
                    value={replyText}
                    onChange={(e) => setReplyText(e.target.value)}
                    placeholder="Write a reply..."
                    className="min-h-[80px] resize-none mb-2"
                  />
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowReply(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      onClick={handleReply}
                      disabled={!replyText.trim()}
                    >
                      Reply
                    </Button>
                  </div>
                </div>
              )}

              {comment.replies && comment.replies.length > 0 && depth < 8 && (
                <div className="mt-2 space-y-2 border-l-2 border-border pl-4">
                  {comment.replies.map((reply) => (
                    <CommentItem
                      key={reply.id}
                      comment={reply}
                      user={user}
                      onReply={onReply}
                      onDelete={onDelete}
                      onRefresh={onRefresh}
                      poemId={poemId}
                      depth={depth + 1}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PoemDetail;