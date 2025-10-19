import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Upload, TrendingUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

const popularPoems = [
  {
    title: "The Road Not Taken",
    author: "Robert Frost",
    excerpt: "Two roads diverged in a yellow wood,\nAnd sorry I could not travel both...",
    type: "Modern Classic",
    poemType: "ballad"
  },
  {
    title: "Still I Rise",
    author: "Maya Angelou",
    excerpt: "You may write me down in history\nWith your bitter, twisted lies...",
    type: "Empowerment",
    poemType: "ode"
  },
  {
    title: "If—",
    author: "Rudyard Kipling",
    excerpt: "If you can keep your head when all about you\nAre losing theirs and blaming it on you...",
    type: "Inspirational",
    poemType: "ode"
  },
  {
    title: "Imagine",
    author: "John Lennon",
    excerpt: "Imagine there's no heaven\nIt's easy if you try...",
    type: "Song Lyrics",
    poemType: "ballad"
  },
  {
    title: "Hallelujah",
    author: "Leonard Cohen",
    excerpt: "Well I heard there was a secret chord\nThat David played and it pleased the Lord...",
    type: "Song Lyrics",
    poemType: "ballad"
  },
  {
    title: "Do Not Go Gentle",
    author: "Dylan Thomas",
    excerpt: "Do not go gentle into that good night,\nOld age should burn and rave at close of day...",
    type: "Villanelle",
    poemType: "villanelle"
  }
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
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [selectedPopularPoem, setSelectedPopularPoem] = useState<number | null>(null);
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


  const currentPoem = poemTypes[selectedPoem];
  const currentGeneratedPoem = generatedPoems[selectedPoem] || "";

  const generatePoemForType = async (poemType: string, topic: string) => {
    if (generatedPoems[poemType]) {
      return;
    }

    setIsGenerating(true);

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
        toast({
          title: "Poem generated! ✨",
          description: `Created a ${poemTypes[poemType].name.toLowerCase()} about "${topic}"`,
        });
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
      setIsGenerating(false);
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

    setSubmittedTopic(poemTopic);
    setGeneratedPoems({});
    await generatePoemForType(selectedPoem, poemTopic);
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

    if (!publishTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your poem.",
        variant: "destructive",
      });
      return;
    }

    const currentGeneratedPoem = generatedPoems[selectedPoem];
    if (!currentGeneratedPoem) return;

    setIsPublishing(true);

    try {
      const { error } = await supabase.from("published_poems").insert({
        user_id: session.user.id,
        title: publishTitle,
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
      setPublishTitle("");
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

  const handlePopularPoemSelect = (index: number) => {
    setSelectedPopularPoem(index);
    const selectedPoemData = popularPoems[index];
    setSelectedPoem(selectedPoemData.poemType);
    const topic = `${selectedPoemData.title} by ${selectedPoemData.author}`;
    setSubmittedTopic(topic);
    setGeneratedPoems({});
    generatePoemForType(selectedPoemData.poemType, topic);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">

        <Tabs defaultValue="write" className="w-full">
          <TabsList className="grid w-full grid-cols-2 rounded-b-none border-b-0">
            <TabsTrigger value="write" className="gap-2">
              <Sparkles className="h-4 w-4" />
              Write Your Own Poem
            </TabsTrigger>
            <TabsTrigger value="view" className="gap-2">
              <TrendingUp className="h-4 w-4" />
              View Popular Poems
            </TabsTrigger>
          </TabsList>

          <TabsContent value="write" className="mt-0">
            <Card className="border-2 shadow-lg rounded-t-none border-t-0">
              <CardContent className="space-y-6 pt-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="topic-input" className="block text-sm font-medium text-foreground mb-2">
                      What would you like to write a poem about?
                    </label>
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
                    disabled={isGenerating}
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
          </TabsContent>

          <TabsContent value="view" className="mt-0">
            <div className="max-w-4xl mx-auto">
              <Card className="border-2 shadow-lg rounded-t-none border-t-0">
                <CardContent className="pt-6">
                  <Carousel className="w-full">
                    <CarouselContent>
                      {popularPoems.map((poem, index) => (
                        <CarouselItem key={index} className="md:basis-1/2">
                          <Card 
                            className={`border-2 h-full hover:shadow-lg transition-all cursor-pointer ${
                              selectedPopularPoem === index ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
                            }`}
                            onClick={() => handlePopularPoemSelect(index)}
                          >
                            <CardHeader className="pb-3">
                              <CardTitle className="text-2xl font-serif leading-tight mb-2">
                                {poem.title}
                              </CardTitle>
                              <CardDescription className="text-base mb-3">
                                {poem.author}
                              </CardDescription>
                              <div className="inline-block">
                                <span className="text-sm px-3 py-1 rounded-full bg-primary/10 text-primary font-medium">
                                  {poem.type}
                                </span>
                              </div>
                            </CardHeader>
                            <CardContent>
                              <blockquote className="text-base text-foreground/70 italic leading-relaxed border-l-4 border-accent pl-4 whitespace-pre-line">
                                {poem.excerpt}
                              </blockquote>
                            </CardContent>
                          </Card>
                        </CarouselItem>
                      ))}
                    </CarouselContent>
                    <CarouselPrevious className="hidden md:flex" />
                    <CarouselNext className="hidden md:flex" />
                  </Carousel>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

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
                <h3 className="font-semibold text-lg text-foreground mb-2">Example</h3>
                {currentGeneratedPoem ? (
                  <div className="bg-accent/10 p-6 rounded-lg border-2 border-accent">
                    <p className="text-foreground whitespace-pre-line leading-relaxed">
                      {currentGeneratedPoem}
                    </p>
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
    </div>
  );
};

export default Index;
