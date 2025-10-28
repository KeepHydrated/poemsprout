import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Heart, Trash2, Upload, Loader2, ChevronLeft, ChevronRight } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { User } from "@supabase/supabase-js";

interface PublishedPoem {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string;
  created_at: string;
  user_id: string;
}

interface SavedPoem {
  id: string;
  content: string;
  poem_type: string;
  original_topic: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

interface UserComment {
  id: string;
  content: string;
  created_at: string;
  poem_id: string;
  poem_content?: string;
  poem_type?: string;
}

const MyPoems = () => {
  const [user, setUser] = useState<User | null>(null);
  const [publishedPoems, setPublishedPoems] = useState<PublishedPoem[]>([]);
  const [savedPoems, setSavedPoems] = useState<SavedPoem[]>([]);
  const [userComments, setUserComments] = useState<UserComment[]>([]);
  const [likeCounts, setLikeCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<{ display_name: string | null; avatar_url: string | null; points: number } | null>(null);
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "most-liked">("newest");
  const [activeTab, setActiveTab] = useState<"published" | "saved" | "comments">("published");
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedDraft, setSelectedDraft] = useState<SavedPoem | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const poemsPerPage = 5;
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadPublishedPoems(session.user.id);
      loadSavedPoems(session.user.id);
      loadUserComments(session.user.id);
      loadProfile(session.user.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session?.user) {
        navigate("/auth");
        return;
      }
      setUser(session.user);
      loadPublishedPoems(session.user.id);
      loadSavedPoems(session.user.id);
      loadUserComments(session.user.id);
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

  const loadPublishedPoems = async (userId: string) => {
    setLoading(true);
    
    const { data: poemsData, error } = await supabase
      .from('published_poems')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && poemsData) {
      setPublishedPoems(poemsData);
      
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

  const loadSavedPoems = async (userId: string) => {
    const { data, error } = await supabase
      .from('saved_poems')
      .select('*')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (!error && data) {
      setSavedPoems(data);
    }
  };

  const loadUserComments = async (userId: string) => {
    const { data, error } = await supabase
      .from('poem_comments')
      .select('id, content, created_at, poem_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (!error && data) {
      // Fetch poem details for each comment
      const commentsWithPoems = await Promise.all(
        data.map(async (comment) => {
          const { data: poemData } = await supabase
            .from('published_poems')
            .select('content, poem_type')
            .eq('id', comment.poem_id)
            .single();

          return {
            ...comment,
            poem_content: poemData?.content,
            poem_type: poemData?.poem_type,
          };
        })
      );
      setUserComments(commentsWithPoems);
    }
  };

  const sortedPublishedPoems = [...publishedPoems].sort((a, b) => {
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

  const sortedSavedPoems = [...savedPoems].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Reset to page 1 when changing tabs or sort order
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, sortBy]);

  // Pagination logic
  const totalPublishedPages = Math.ceil(sortedPublishedPoems.length / poemsPerPage);
  const totalSavedPages = Math.ceil(sortedSavedPoems.length / poemsPerPage);
  const totalCommentsPages = Math.ceil(userComments.length / poemsPerPage);

  const startIndex = (currentPage - 1) * poemsPerPage;
  const endIndex = startIndex + poemsPerPage;

  const paginatedPublished = sortedPublishedPoems.slice(startIndex, endIndex);
  const paginatedSaved = sortedSavedPoems.slice(startIndex, endIndex);
  const paginatedComments = userComments.slice(startIndex, endIndex);

  const handleDeletePublished = async (poemId: string) => {
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
      setPublishedPoems(publishedPoems.filter(p => p.id !== poemId));
    }
  };

  const handleDeleteSaved = async (poemId: string) => {
    if (!confirm("Are you sure you want to delete this draft?")) return;

    const { error } = await supabase
      .from('saved_poems')
      .delete()
      .eq('id', poemId);

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
      setSavedPoems(savedPoems.filter(p => p.id !== poemId));
    }
  };

  const handlePublishDraft = async () => {
    if (!user || !selectedDraft) return;

    setIsPublishing(true);

    try {
      // Insert into published_poems
      const { error: publishError } = await supabase
        .from('published_poems')
        .insert({
          user_id: user.id,
          content: selectedDraft.content,
          poem_type: selectedDraft.poem_type,
          original_topic: selectedDraft.original_topic,
        });

      if (publishError) throw publishError;

      // Delete from saved_poems
      const { error: deleteError } = await supabase
        .from('saved_poems')
        .delete()
        .eq('id', selectedDraft.id);

      if (deleteError) {
        toast({
          title: "Warning",
          description: "Poem published but failed to remove from drafts",
          variant: "destructive",
        });
        setIsPublishing(false);
        return;
      }

      toast({
        title: "Published!",
        description: "Your poem has been shared with the community.",
      });

      // Refresh both lists
      loadPublishedPoems(user.id);
      setSavedPoems(savedPoems.filter(p => p.id !== selectedDraft.id));
      
      setIsPublishDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Publishing failed",
        description: error.message || "Failed to publish poem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsPublishing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12 max-w-6xl">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Sidebar */}
          <div className="w-full md:w-64 flex-shrink-0">
            <Card>
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
            <Button 
              variant="outline" 
              className="w-full mt-4"
              onClick={() => navigate(`/profile/${user?.id}`)}
            >
              View Live Profile
            </Button>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "published" | "saved" | "comments")} className="w-full">
              <div className="flex justify-center md:justify-start mb-6">
                <TabsList>
                  <TabsTrigger value="published">Published</TabsTrigger>
                  <TabsTrigger value="saved">Saved Drafts</TabsTrigger>
                  <TabsTrigger value="comments">Comments</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="published">
                {!loading && publishedPoems.length > 0 && (
                  <div className="mb-6 flex items-center justify-end">
                    <Select value={sortBy} onValueChange={(value: "newest" | "oldest" | "most-liked") => setSortBy(value)}>
                      <SelectTrigger className="w-[180px]">
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

                {loading ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground">Loading your poems...</p>
                  </div>
                ) : publishedPoems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">You haven't published any poems yet</p>
                    <Button onClick={() => navigate("/")}>
                      Create Your First Poem
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {paginatedPublished.map((poem) => (
                        <Card 
                          key={poem.id} 
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => navigate(`/poem/${poem.id}`)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <p className="text-sm text-foreground/80">
                                {poem.original_topic} • {poem.poem_type}
                              </p>
                              <div className="flex items-center gap-3">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeletePublished(poem.id);
                                  }}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                                <div className="flex items-center gap-1 text-muted-foreground">
                                  <Heart className="h-5 w-5" />
                                  <span className="text-sm">{likeCounts[poem.id] || 0}</span>
                                </div>
                              </div>
                            </div>
                            
                            <blockquote className="border-l-4 border-primary pl-4">
                              <p className="whitespace-pre-wrap font-serif text-foreground leading-relaxed">
                                {poem.content}
                              </p>
                            </blockquote>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalPublishedPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground px-4">
                          Page {currentPage} of {totalPublishedPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalPublishedPages, p + 1))}
                          disabled={currentPage === totalPublishedPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="saved">
                {savedPoems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">You don't have any saved drafts</p>
                    <Button onClick={() => navigate("/")}>
                      Create a Poem
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {paginatedSaved.map((poem) => (
                        <Card key={poem.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <p className="text-sm text-foreground/80">
                                {poem.original_topic} • {poem.poem_type}
                              </p>
                              <div className="flex items-center gap-2">
                                <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
                                  <DialogTrigger asChild>
                                    <button
                                      onClick={() => setSelectedDraft(poem)}
                                      className="text-muted-foreground hover:text-primary transition-colors"
                                      title="Publish poem"
                                    >
                                      <Upload className="h-4 w-4" />
                                    </button>
                                  </DialogTrigger>
                                  <DialogContent>
                                    <DialogHeader>
                                      <DialogTitle>Publish Your Poem</DialogTitle>
                                      <DialogDescription>
                                        Share your poem with the community.
                                      </DialogDescription>
                                    </DialogHeader>
                                    <div className="space-y-4 pt-4">
                                      <Button
                                        onClick={handlePublishDraft}
                                        disabled={isPublishing}
                                        className="w-full"
                                      >
                                        {isPublishing ? (
                                          <>
                                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                            Publishing...
                                          </>
                                        ) : (
                                          "Publish"
                                        )}
                                      </Button>
                                    </div>
                                  </DialogContent>
                                </Dialog>
                                <button
                                  onClick={() => handleDeleteSaved(poem.id)}
                                  className="text-muted-foreground hover:text-destructive transition-colors"
                                  title="Delete draft"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                            
                            <blockquote className="border-l-4 border-primary pl-4">
                              <p className="whitespace-pre-wrap font-serif text-foreground leading-relaxed">
                                {poem.content}
                              </p>
                            </blockquote>
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalSavedPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground px-4">
                          Page {currentPage} of {totalSavedPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalSavedPages, p + 1))}
                          disabled={currentPage === totalSavedPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="comments">
                {userComments.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-muted-foreground mb-4">You haven't left any comments yet</p>
                    <Button onClick={() => navigate("/search")}>
                      Browse Poems
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="space-y-6">
                      {paginatedComments.map((comment) => (
                        <Card 
                          key={comment.id} 
                          className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer"
                          onClick={() => navigate(`/poem/${comment.poem_id}`)}
                        >
                          <CardContent className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <p className="text-xs text-muted-foreground">
                                {new Date(comment.created_at).toLocaleDateString()} • {comment.poem_type || "Poem"}
                              </p>
                            </div>
                            
                            <div className="mb-4">
                              <p className="text-sm font-medium text-foreground mb-2">Your comment:</p>
                              <p className="text-foreground bg-muted/50 p-3 rounded-md">
                                {comment.content}
                              </p>
                            </div>

                            {comment.poem_content && (
                              <div className="border-l-4 border-primary pl-4">
                                <p className="text-xs text-muted-foreground mb-2">On poem:</p>
                                <p className="whitespace-pre-wrap font-serif text-sm text-muted-foreground line-clamp-3">
                                  {comment.poem_content}
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>

                    {/* Pagination */}
                    {totalCommentsPages > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-8">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                          disabled={currentPage === 1}
                        >
                          <ChevronLeft className="h-4 w-4 mr-1" />
                          Previous
                        </Button>
                        <span className="text-sm text-muted-foreground px-4">
                          Page {currentPage} of {totalCommentsPages}
                        </span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCurrentPage(p => Math.min(totalCommentsPages, p + 1))}
                          disabled={currentPage === totalCommentsPages}
                        >
                          Next
                          <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MyPoems;
