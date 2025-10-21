import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Shuffle, Save, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import GallerySidebar from "@/components/GallerySidebar";

const randomTopics = [
  "Taylor Swift's 'All Too Well'",
  "Robert Frost's 'The Road Not Taken'",
  "Beyoncé's 'Halo'",
  "The Beatles' 'Here Comes the Sun'",
  "Maya Angelou's 'Still I Rise'",
  "Ed Sheeran's 'Perfect'",
  "Shakespeare's 'Shall I Compare Thee to a Summer's Day'",
  "Adele's 'Someone Like You'",
  "The Titanic movie",
  "Emily Dickinson's 'Hope is the thing with feathers'",
  "Coldplay's 'Fix You'",
  "The Lord of the Rings trilogy",
  "Billie Eilish's 'What Was I Made For'",
  "Walt Whitman's 'O Captain! My Captain!'",
  "Harry Potter's magical world",
  "Olivia Rodrigo's 'drivers license'",
  "Star Wars and the Force",
  "Edgar Allan Poe's 'The Raven'",
  "The Lion King's 'Circle of Life'",
  "Bob Dylan's 'Blowin' in the Wind'",
  "Avatar's Pandora",
  "Langston Hughes' 'Dreams'",
  "Queen's 'Bohemian Rhapsody'",
  "The Great Gatsby",
  "SZA's 'Kill Bill'",
  "Pride and Prejudice",
  "Drake's 'One Dance'",
  "The Notebook",
  "Leonard Cohen's 'Hallelujah'",
  "Stranger Things"
];


type PoemType = {
  name: string;
  lines: string;
  description: string;
  structure: string;
  example: string;
};

const poemTypes: Record<string, PoemType> = {
  sonnet: {
    name: "Sonnet",
    lines: "14 lines",
    description: "A classic poetic form usually exploring themes of love, beauty, or reflection. The sonnet has endured for centuries as one of poetry's most elegant structures.",
    structure: "Shakespearean: ABAB CDCD EFEF GG or Petrarchan: ABBA ABBA CDE CDE",
    example: '"Shall I compare thee to a summer\'s day?\nThou art more lovely and more temperate..."',
  },
  haiku: {
    name: "Haiku",
    lines: "3 lines (5-7-5 syllables)",
    description: "A Japanese form capturing a single moment in time, often centered on nature, seasons, or a fleeting observation with profound simplicity.",
    structure: "First line: 5 syllables, Second line: 7 syllables, Third line: 5 syllables",
    example: '"An old silent pond...\nA frog jumps into the pond—\nSplash! Silence again."',
  },
  limerick: {
    name: "Limerick",
    lines: "5 lines",
    description: "A humorous and often nonsensical verse form known for its bouncy rhythm and witty wordplay. Perfect for lighthearted entertainment.",
    structure: "AABBA rhyme scheme with a distinctive bouncing meter",
    example: '"There once was a man from Nantucket...\nWho kept all his cash in a bucket..."',
  },
  villanelle: {
    name: "Villanelle",
    lines: "19 lines",
    description: "A complex form featuring repeating lines that create a haunting, musical quality. The repetition builds emotional intensity throughout the poem.",
    structure: "Two rhymes with repeating lines (A1bA2 abA1 abA2 abA1 abA2 abA1A2)",
    example: '"Do not go gentle into that good night,\nOld age should burn and rave at close of day..."',
  },
  ode: {
    name: "Ode",
    lines: "Variable length",
    description: "A lyrical poem of praise and celebration, often addressing its subject with elevated language and deep admiration. Odes honor people, places, things, or ideas.",
    structure: "Formal structure with stanzas, often using elevated diction and imagery",
    example: '"Ode to a Nightingale" or "Ode on a Grecian Urn"',
  },
  ballad: {
    name: "Ballad",
    lines: "Variable length (usually quatrains)",
    description: "A narrative poem telling a story, often dramatic or romantic, passed down through oral tradition. Ballads combine storytelling with musical rhythm.",
    structure: "Usually quatrains with ABCB or ABAB rhyme scheme and strong rhythm",
    example: '"The Rime of the Ancient Mariner" - a tale of a sailor\'s curse',
  },
  epic: {
    name: "Epic",
    lines: "Extensive length",
    description: "A grand, sweeping narrative poem chronicling the adventures of a hero on an extraordinary journey. Epics explore themes of courage, fate, and the human condition.",
    structure: "Extended narrative with elevated style, often featuring a hero's journey",
    example: '"The Odyssey" by Homer - Odysseus\'s ten-year journey home',
  },
};

const Index = () => {
  const [selectedPoem, setSelectedPoem] = useState<string>("sonnet");
  const [poemTopic, setPoemTopic] = useState<string>("");
  const [submittedTopic, setSubmittedTopic] = useState<string>("");
  const [generatedPoems, setGeneratedPoems] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [recentTopics, setRecentTopics] = useState<string[]>(() => {
    const saved = localStorage.getItem('recentTopics');
    return saved ? JSON.parse(saved) : [];
  });
  const [user, setUser] = useState<any>(null);
  const navigate = useNavigate();
  const { toast } = useToast();
  const currentGenerationId = useRef<number>(0);
  const abortControllerRef = useRef<AbortController | null>(null);

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
    localStorage.setItem('recentTopics', JSON.stringify(recentTopics));
  }, [recentTopics]);


  const currentPoem = poemTypes[selectedPoem];
  const currentGeneratedPoem = generatedPoems[selectedPoem] || "";

  const generatePoemForType = async (poemType: string, topic: string, isRegenerate = false) => {
    if (generatedPoems[poemType] && !isRegenerate) {
      return;
    }

    if (isRegenerate) {
      setIsRegenerating(true);
    } else {
      setIsGenerating(true);
    }

    try {
      const { data, error } = await supabase.functions.invoke('generate-poem', {
        body: { 
          topic: topic,
          poemType: poemType 
        }
      });

      if (error) throw error;

      if (data?.poem) {
        setGeneratedPoems(prev => ({ ...prev, [poemType]: data.poem }));
      } else {
        throw new Error('No poem generated');
      }
    } catch (error: any) {
      console.error('Error generating poem:', error);
      toast({
        title: "Generation failed",
        description: error.message || "Failed to generate poem. Please try again.",
        variant: "destructive",
      });
    } finally {
      if (isRegenerate) {
        setIsRegenerating(false);
      } else {
        setIsGenerating(false);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!poemTopic.trim()) {
      toast({
        title: "Topic required",
        description: "Please enter what you'd like to write a poem about.",
        variant: "destructive",
      });
      return;
    }

    // Cancel any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // Create new AbortController for this generation
    abortControllerRef.current = new AbortController();
    const signal = abortControllerRef.current.signal;

    // Increment generation ID to mark previous generations as stale
    currentGenerationId.current += 1;
    const thisGenerationId = currentGenerationId.current;

    setSubmittedTopic(poemTopic);
    setGeneratedPoems({});
    setIsGenerating(true);

    // Generate poems for all types
    const poemTypeKeys = Object.keys(poemTypes);
    
    for (const poemType of poemTypeKeys) {
      // Check if this generation was cancelled
      if (signal.aborted) {
        break;
      }

      try {
        const { data, error } = await supabase.functions.invoke('generate-poem', {
          body: { 
            topic: poemTopic,
            poemType: poemType 
          }
        });

        // Check again after async call
        if (signal.aborted) {
          break;
        }

        if (error) throw error;

        // Only update if this is still the current generation
        if (thisGenerationId === currentGenerationId.current && data?.poem) {
          setGeneratedPoems(prev => ({ ...prev, [poemType]: data.poem }));
        }
      } catch (error: any) {
        // Don't show error if generation was cancelled
        if (signal.aborted) {
          break;
        }
        console.error(`Error generating ${poemType}:`, error);
      }
    }

    // Only set generating to false if this is still the current generation
    if (thisGenerationId === currentGenerationId.current) {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  const handleRandomTopic = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-poem', {
        body: { 
          generateTopic: true,
          recentTopics: recentTopics
        }
      });

      if (error) throw error;

      if (data?.topic) {
        setPoemTopic(data.topic);
        
        // Track this topic
        setRecentTopics(prev => {
          const updated = [data.topic, ...prev.slice(0, 14)]; // Keep last 15
          return updated;
        });
      }
    } catch (error) {
      console.error('Error generating random topic:', error);
      toast({
        title: "Error",
        description: "Failed to generate random topic. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handlePublish = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to publish poems.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }


    const currentGeneratedPoem = generatedPoems[selectedPoem];
    if (!currentGeneratedPoem) return;

    setIsPublishing(true);

    try {
      const { error } = await supabase.from("published_poems").insert({
        user_id: session.user.id,
        content: currentGeneratedPoem,
        poem_type: poemTypes[selectedPoem].name,
        original_topic: submittedTopic,
      });

      if (error) throw error;

      toast({
        title: "Published!",
        description: "Your poem has been shared with the community.",
      });

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

  const handleSave = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast({
        title: "Please log in",
        description: "You need to be logged in to save poems.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }


    const currentGeneratedPoem = generatedPoems[selectedPoem];
    if (!currentGeneratedPoem) return;

    setIsSaving(true);

    try {
      const { error } = await supabase.from("saved_poems").insert({
        user_id: session.user.id,
        content: currentGeneratedPoem,
        poem_type: poemTypes[selectedPoem].name,
        original_topic: submittedTopic,
      });

      if (error) throw error;

      toast({
        title: "Saved!",
        description: "Your poem has been saved to your collection.",
      });

      setIsSaveDialogOpen(false);
    } catch (error: any) {
      toast({
        title: "Save failed",
        description: error.message || "Failed to save poem. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };



  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-8 max-w-7xl mx-auto">
          {/* Main Content */}
          <div className="flex-1 max-w-3xl">

        <Card className="border-2 shadow-lg">
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="topic-input" className="hidden md:block text-sm font-medium text-foreground">
                    What would you like to write a poem about?
                  </label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRandomTopic}
                    className="gap-2"
                  >
                    <Shuffle className="h-4 w-4" />
                    Random Topic
                  </Button>
                </div>
                <Input
                  id="topic-input"
                  type="text"
                  value={poemTopic}
                  onChange={(e) => setPoemTopic(e.target.value)}
                  placeholder="Enter a topic, theme, or inspiration..."
                  className="border-2"
                />
              </div>

              <Button 
                type="submit" 
                size="lg" 
                className="w-full gap-2"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    Generate Poem
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-8">
          <div className="border-2 rounded-t-lg bg-card p-4">
            <label htmlFor="poem-type-select" className="block text-sm font-medium text-foreground mb-2">
              Select a poem type to learn more
            </label>
            <Select value={selectedPoem} onValueChange={setSelectedPoem}>
              <SelectTrigger 
                id="poem-type-select"
                className="w-full text-base h-12 border-2 bg-card hover:border-accent transition-all"
              >
                <SelectValue placeholder="Choose a poetry form" />
              </SelectTrigger>
              <SelectContent className="bg-popover border-2">
                <SelectItem value="sonnet" className="text-base cursor-pointer">Sonnet</SelectItem>
                <SelectItem value="haiku" className="text-base cursor-pointer">Haiku</SelectItem>
                <SelectItem value="limerick" className="text-base cursor-pointer">Limerick</SelectItem>
                <SelectItem value="villanelle" className="text-base cursor-pointer">Villanelle</SelectItem>
                <SelectItem value="ode" className="text-base cursor-pointer">Ode</SelectItem>
                <SelectItem value="ballad" className="text-base cursor-pointer">Ballad</SelectItem>
                <SelectItem value="epic" className="text-base cursor-pointer">Epic</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card className="border-2 shadow-lg rounded-t-none border-t-0">
            <CardHeader>
              <CardTitle className="text-3xl font-serif text-primary">
                {currentPoem.name}
              </CardTitle>
              <CardDescription className="text-base">
                {currentPoem.lines}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Description</h3>
                <p className="text-foreground/80 leading-relaxed">
                  {currentPoem.description}
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-lg text-foreground mb-2">Structure</h3>
                <div className="bg-muted/50 p-4 rounded-lg">
                  <code className="text-sm text-foreground/90">
                    {currentPoem.structure}
                  </code>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-lg text-foreground">Example</h3>
                  {submittedTopic && currentGeneratedPoem && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePoemForType(selectedPoem, submittedTopic, true)}
                      disabled={isRegenerating}
                      className="gap-2"
                    >
                      <RefreshCw className={`h-4 w-4 ${isRegenerating ? 'animate-spin' : ''}`} />
                      Regenerate
                    </Button>
                  )}
                </div>
                {currentGeneratedPoem ? (
                  <div className="space-y-4">
                    <div className="bg-accent/10 p-6 rounded-lg border-2 border-accent">
                      <p className="text-foreground whitespace-pre-line leading-relaxed">
                        {currentGeneratedPoem}
                      </p>
                    </div>
                    {user && (
                      <div className="flex gap-2">
                        <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
                          <DialogTrigger asChild>
                            <Button variant="outline" className="flex-1 gap-2">
                              <Save className="h-4 w-4" />
                              Save
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Save Your Poem</DialogTitle>
                              <DialogDescription>
                                Save this poem to your private collection.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <Button
                                onClick={handleSave} 
                                disabled={isSaving}
                                className="w-full"
                              >
                                {isSaving ? (
                                  <>
                                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                    Saving...
                                  </>
                                ) : (
                                  "Save"
                                )}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="flex-1 gap-2">
                              <Sparkles className="h-4 w-4" />
                              Publish
                            </Button>
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
                                onClick={handlePublish} 
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
                      </div>
                    )}
                  </div>
                ) : (
                  <blockquote className="border-l-4 border-accent pl-4 py-2 text-foreground/70 italic">
                    {currentPoem.example}
                  </blockquote>
                )}
              </div>
            </CardContent>
          </Card>
          </div>
          </div>

          {/* Gallery Sidebar */}
          <div className="hidden lg:block w-96 shrink-0">
            <div className="sticky top-24 max-h-[calc(100vh-8rem)]">
              <GallerySidebar />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
