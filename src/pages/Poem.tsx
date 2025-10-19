import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Sparkles, Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";

type PoemType = {
  name: string;
  lines: string;
  description: string;
  structure: string;
  example: string;
};

const popularPoems = [
  {
    title: "The Road Not Taken",
    author: "Robert Frost",
    excerpt: "Two roads diverged in a yellow wood,\nAnd sorry I could not travel both...",
    type: "Modern Classic"
  },
  {
    title: "Still I Rise",
    author: "Maya Angelou",
    excerpt: "You may write me down in history\nWith your bitter, twisted lies...",
    type: "Empowerment"
  },
  {
    title: "If—",
    author: "Rudyard Kipling",
    excerpt: "If you can keep your head when all about you\nAre losing theirs and blaming it on you...",
    type: "Inspirational"
  },
  {
    title: "Imagine",
    author: "John Lennon",
    excerpt: "Imagine there's no heaven\nIt's easy if you try...",
    type: "Song Lyrics"
  },
  {
    title: "Hallelujah",
    author: "Leonard Cohen",
    excerpt: "Well I heard there was a secret chord\nThat David played and it pleased the Lord...",
    type: "Song Lyrics"
  },
  {
    title: "Do Not Go Gentle",
    author: "Dylan Thomas",
    excerpt: "Do not go gentle into that good night,\nOld age should burn and rave at close of day...",
    type: "Villanelle"
  }
];

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

const Poem = () => {
  const [selectedPoem, setSelectedPoem] = useState<string>("sonnet");
  const [poemTopic, setPoemTopic] = useState<string>("");
  const [submittedTopic, setSubmittedTopic] = useState<string>("");
  const [generatedPoems, setGeneratedPoems] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedPopularPoem, setSelectedPopularPoem] = useState<number | null>(null);
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const navigate = useNavigate();

  const currentPoem = poemTypes[selectedPoem];
  const currentGeneratedPoem = generatedPoems[selectedPoem] || "";

  const generatePoemForType = async (poemType: string, topic: string) => {
    if (generatedPoems[poemType]) {
      // Already generated, just switch to it
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
    } catch (error) {
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

  const handlePoemTypeChange = (newType: string) => {
    setSelectedPoem(newType);
    if (submittedTopic && !generatedPoems[newType]) {
      generatePoemForType(newType, submittedTopic);
    }
  };

  const handlePopularPoemSelect = (index: number) => {
    setSelectedPopularPoem(index);
    const selectedPoemData = popularPoems[index];
    const topic = `${selectedPoemData.title} by ${selectedPoemData.author}`;
    setSubmittedTopic(topic);
    setGeneratedPoems({});
    generatePoemForType(selectedPoem, topic);
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">
        <header className="text-center mb-12">
          <h1 className="text-5xl md:text-6xl font-serif font-bold text-foreground mb-4 tracking-tight">
            A Guide to Poetry Forms
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Explore the beautiful structures and traditions of poetic expression
          </p>
        </header>

        <div className="mb-12">
          <h2 className="text-2xl font-serif font-semibold text-foreground mb-6 text-center">
            Popular Poems & Songs
          </h2>
          <Carousel className="w-full max-w-3xl mx-auto">
            <CarouselContent>
              {popularPoems.map((poem, index) => (
                <CarouselItem key={index} className="md:basis-1/2 lg:basis-1/3">
                  <Card 
                    className={`border-2 h-full hover:shadow-lg transition-all cursor-pointer ${
                      selectedPopularPoem === index ? 'border-primary ring-2 ring-primary/20 shadow-lg' : ''
                    }`}
                    onClick={() => handlePopularPoemSelect(index)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <CardTitle className="text-lg font-serif leading-tight">
                          {poem.title}
                        </CardTitle>
                      </div>
                      <CardDescription className="text-sm">
                        {poem.author}
                      </CardDescription>
                      <div className="inline-block">
                        <span className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary font-medium">
                          {poem.type}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <blockquote className="text-sm text-foreground/70 italic leading-relaxed border-l-2 border-accent pl-3">
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
        </div>

        <div className="mb-8">
            <label htmlFor="poem-select" className="block text-sm font-medium text-foreground mb-3">
              Select a poem type to learn more
            </label>
            <Select value={selectedPoem} onValueChange={handlePoemTypeChange}>
            <SelectTrigger 
              id="poem-select"
              className="w-full text-lg h-14 border-2 bg-card hover:border-accent transition-all"
            >
              <SelectValue placeholder="Choose a poetry form" />
            </SelectTrigger>
            <SelectContent className="bg-popover border-2">
              <SelectItem value="sonnet" className="text-lg cursor-pointer">Sonnet</SelectItem>
              <SelectItem value="haiku" className="text-lg cursor-pointer">Haiku</SelectItem>
              <SelectItem value="limerick" className="text-lg cursor-pointer">Limerick</SelectItem>
              <SelectItem value="villanelle" className="text-lg cursor-pointer">Villanelle</SelectItem>
              <SelectItem value="ode" className="text-lg cursor-pointer">Ode</SelectItem>
              <SelectItem value="ballad" className="text-lg cursor-pointer">Ballad</SelectItem>
              <SelectItem value="epic" className="text-lg cursor-pointer">Epic</SelectItem>
            </SelectContent>
          </Select>
          </div>

        <Card className="border-2 shadow-lg transition-all duration-500 animate-in fade-in-50 slide-in-from-bottom-4">
          <CardHeader className="pb-4">
            <CardTitle className="text-3xl font-serif text-primary">{currentPoem.name}</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              {currentPoem.lines}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg text-foreground mb-2">Description</h3>
              <p className="text-foreground/90 leading-relaxed">{currentPoem.description}</p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-foreground mb-2">Structure</h3>
              <p className="text-foreground/90 leading-relaxed font-mono text-sm bg-muted/50 p-3 rounded-md">
                {currentPoem.structure}
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg text-foreground mb-2">
                {currentGeneratedPoem ? "Generated Poem" : submittedTopic ? "Your Topic" : "Example"}
              </h3>
              <blockquote className="border-l-4 border-accent pl-4 py-2 text-foreground/80 leading-relaxed">
                {currentGeneratedPoem ? (
                  <div className="whitespace-pre-wrap font-serif text-base">
                    {currentGeneratedPoem}
                  </div>
                ) : submittedTopic ? (
                  <div className="flex items-center gap-2">
                    <span className="not-italic font-medium text-primary">
                      Topic: {submittedTopic}
                    </span>
                    {isGenerating && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                  </div>
                ) : (
                  <span className="italic">{currentPoem.example}</span>
                )}
              </blockquote>
            </div>
          </CardContent>
        </Card>

        {currentGeneratedPoem && (
          <div className="mt-6 flex justify-center">
            <Dialog open={isPublishDialogOpen} onOpenChange={setIsPublishDialogOpen}>
              <DialogTrigger asChild>
                <Button size="lg" className="gap-2">
                  <Upload className="h-5 w-5" />
                  Publish Poem
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Publish Your Poem</DialogTitle>
                  <DialogDescription>
                    Share your generated poem with the community
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div>
                    <label htmlFor="title" className="block text-sm font-medium mb-2">
                      Poem Title
                    </label>
                    <Input
                      id="title"
                      value={publishTitle}
                      onChange={(e) => setPublishTitle(e.target.value)}
                      placeholder="Give your poem a title..."
                      className="border-2"
                    />
                  </div>
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-2">Preview:</p>
                    <p className="font-serif text-sm whitespace-pre-wrap">
                      {currentGeneratedPoem.slice(0, 150)}...
                    </p>
                  </div>
                  <Button
                    onClick={handlePublish}
                    disabled={isPublishing}
                    className="w-full"
                  >
                    {isPublishing ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Publishing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Publish to Gallery
                      </>
                    )}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        <footer className="mt-16 text-center text-sm text-muted-foreground">
          <p>Discover the timeless art of poetry through its many forms</p>
        </footer>
      </div>
    </div>
  );
};

export default Poem;
