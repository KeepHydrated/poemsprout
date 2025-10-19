import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, Shuffle, Save } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

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
  const [isPublishDialogOpen, setIsPublishDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [publishTitle, setPublishTitle] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingTitle, setIsGeneratingTitle] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
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

  const countSyllables = (word: string): number => {
    word = word.toLowerCase().trim().replace(/[^a-z]/g, '');
    if (word.length === 0) return 0;
    if (word.length <= 3) return 1;
    
    // Count vowel groups
    word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
    word = word.replace(/^y/, '');
    const syllables = word.match(/[aeiouy]{1,2}/g);
    return syllables ? syllables.length : 1;
  };

  const countLineSyllables = (line: string): number => {
    const words = line.trim().split(/\s+/).filter(w => w.length > 0);
    return words.reduce((total, word) => total + countSyllables(word), 0);
  };

  const getLastWord = (line: string): string => {
    const words = line.trim().replace(/[.,!?;:]$/, '').split(/\s+/);
    return words[words.length - 1]?.toLowerCase() || '';
  };

  const soundsSimilar = (word1: string, word2: string): boolean => {
    if (!word1 || !word2 || word1.length < 2 || word2.length < 2) return false;
    
    // Clean words
    const clean1 = word1.toLowerCase().replace(/[^a-z]/g, '');
    const clean2 = word2.toLowerCase().replace(/[^a-z]/g, '');
    
    if (clean1 === clean2) return true;
    
    // Check if last 2-3 characters match for rhyming
    const len = Math.min(3, Math.min(clean1.length, clean2.length));
    return clean1.slice(-len) === clean2.slice(-len);
  };

  const validatePoem = (poem: string, poemType: string): string | null => {
    if (!poem.trim()) return "Poem cannot be empty";
    
    const lines = poem.trim().split('\n').filter(line => line.trim());
    const lineCount = lines.length;
    
    switch (poemType) {
      case "sonnet":
        if (lineCount !== 14) {
          return `A sonnet must have exactly 14 lines. Current: ${lineCount} lines`;
        }
        // Check for Shakespearean (ABAB CDCD EFEF GG) or Petrarchan (ABBA ABBA CDE CDE) rhyme scheme
        const lastWords = lines.map(getLastWord);
        if (lastWords.length === 14) {
          // Check for Shakespearean pattern first (ABAB in first quatrain)
          const shakespearean = 
            soundsSimilar(lastWords[0], lastWords[2]) && 
            soundsSimilar(lastWords[1], lastWords[3]) &&
            soundsSimilar(lastWords[4], lastWords[6]) &&
            soundsSimilar(lastWords[5], lastWords[7]) &&
            soundsSimilar(lastWords[12], lastWords[13]);
          
          // Check for Petrarchan pattern (ABBA in first quatrain)
          const petrarchan = 
            soundsSimilar(lastWords[0], lastWords[3]) && 
            soundsSimilar(lastWords[1], lastWords[2]) &&
            soundsSimilar(lastWords[4], lastWords[7]) &&
            soundsSimilar(lastWords[5], lastWords[6]);
          
          if (!shakespearean && !petrarchan) {
            return "A sonnet must follow either Shakespearean (ABAB CDCD EFEF GG) or Petrarchan (ABBA ABBA...) rhyme scheme";
          }
        }
        break;
        
      case "haiku":
        if (lineCount !== 3) {
          return `A haiku must have exactly 3 lines. Current: ${lineCount} lines`;
        }
        // Check 5-7-5 syllable pattern with tolerance
        const syllableCounts = lines.map(line => countLineSyllables(line));
        if (Math.abs(syllableCounts[0] - 5) > 1) {
          return `First line should have ~5 syllables. Current: ${syllableCounts[0]} syllables`;
        }
        if (Math.abs(syllableCounts[1] - 7) > 1) {
          return `Second line should have ~7 syllables. Current: ${syllableCounts[1]} syllables`;
        }
        if (Math.abs(syllableCounts[2] - 5) > 1) {
          return `Third line should have ~5 syllables. Current: ${syllableCounts[2]} syllables`;
        }
        break;
        
      case "limerick":
        if (lineCount !== 5) {
          return `A limerick must have exactly 5 lines. Current: ${lineCount} lines`;
        }
        // Check AABBA rhyme scheme
        const limerickWords = lines.map(getLastWord);
        if (limerickWords.length === 5) {
          const rhymes = [
            soundsSimilar(limerickWords[0], limerickWords[1]),
            soundsSimilar(limerickWords[0], limerickWords[4]),
            soundsSimilar(limerickWords[2], limerickWords[3])
          ];
          if (!rhymes.every(r => r)) {
            return "A limerick should follow AABBA rhyme scheme";
          }
        }
        break;
        
      case "acrostic":
        if (submittedTopic) {
          const topic = submittedTopic.toLowerCase();
          const firstLetters = lines.map(line => line.trim()[0]?.toLowerCase() || '').join('');
          if (firstLetters !== topic.toLowerCase()) {
            return `An acrostic poem's first letters must spell "${submittedTopic}". Current: "${firstLetters.toUpperCase()}"`;
          }
        }
        break;
        
      case "ballad":
        if (lineCount < 8) {
          return `A ballad must have at least 8 lines (2 stanzas). Current: ${lineCount} lines`;
        }
        if (lineCount % 4 !== 0) {
          return `A ballad's lines should be in groups of 4. Current: ${lineCount} lines`;
        }
        break;
        
      case "villanelle":
        if (lineCount !== 19) {
          return `A villanelle must have exactly 19 lines. Current: ${lineCount} lines`;
        }
        break;
        
      case "free-verse":
      case "ode":
      case "epic":
        // No strict structural requirements
        break;
    }
    
    return null;
  };

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
    setValidationError(null);
    setIsGenerating(true);

    // Generate poems for all types
    const poemTypeKeys = Object.keys(poemTypes);
    
    for (const poemType of poemTypeKeys) {
      try {
        const { data, error } = await supabase.functions.invoke('generate-poem', {
          body: { 
            topic: poemTopic,
            poemType: poemType 
          }
        });

        if (error) throw error;

        if (data?.poem) {
          setGeneratedPoems(prev => ({ ...prev, [poemType]: data.poem }));
        }
      } catch (error: any) {
        console.error(`Error generating ${poemType}:`, error);
      }
    }

    setIsGenerating(false);
  };

  const handleRandomTopic = () => {
    const randomTopic = randomTopics[Math.floor(Math.random() * randomTopics.length)];
    setPoemTopic(randomTopic);
    toast({
      title: "Random topic selected! ✨",
      description: `Try writing about "${randomTopic}"`,
    });
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

    // Validate poem structure before publishing
    const validationError = validatePoem(currentGeneratedPoem, selectedPoem);
    if (validationError) {
      setValidationError(validationError);
      toast({
        title: "Invalid poem structure",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

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

    if (!saveTitle.trim()) {
      toast({
        title: "Title required",
        description: "Please enter a title for your poem.",
        variant: "destructive",
      });
      return;
    }

    const currentGeneratedPoem = generatedPoems[selectedPoem];
    if (!currentGeneratedPoem) return;

    // Validate poem structure before saving
    const validationError = validatePoem(currentGeneratedPoem, selectedPoem);
    if (validationError) {
      setValidationError(validationError);
      toast({
        title: "Invalid poem structure",
        description: validationError,
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    try {
      const { error } = await supabase.from("saved_poems").insert({
        user_id: session.user.id,
        title: saveTitle,
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
      setSaveTitle("");
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

  const generateTitle = async (forDialog: 'save' | 'publish') => {
    const currentGeneratedPoem = generatedPoems[selectedPoem];
    if (!currentGeneratedPoem) return;

    setIsGeneratingTitle(true);

    try {
      const { data, error } = await supabase.functions.invoke('generate-poem', {
        body: { 
          topic: `Generate a creative, poetic title (maximum 8 words) for this ${poemTypes[selectedPoem].name.toLowerCase()}: ${currentGeneratedPoem.substring(0, 200)}...`,
          poemType: 'haiku'
        }
      });

      if (error) throw error;

      if (data?.poem) {
        const title = data.poem.trim().replace(/^["']|["']$/g, '');
        if (forDialog === 'save') {
          setSaveTitle(title);
        } else {
          setPublishTitle(title);
        }
        toast({
          title: "Title generated! ✨",
          description: "Feel free to edit it if you'd like.",
        });
      }
    } catch (error: any) {
      console.error('Error generating title:', error);
      toast({
        title: "Failed to generate title",
        description: "Please try again or enter your own title.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingTitle(false);
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-16 max-w-4xl">

        <Card className="border-2 shadow-lg">
          <CardContent className="space-y-6 pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label htmlFor="topic-input" className="block text-sm font-medium text-foreground">
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

        <div className="mt-8">
          <div className="border-2 rounded-t-lg bg-card p-4">
            <label htmlFor="poem-type-select" className="block text-sm font-medium text-foreground mb-2">
              Select a poem type to learn more
            </label>
            <Select value={selectedPoem} onValueChange={(value) => {
              setSelectedPoem(value);
              setValidationError(null);
            }}>
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
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Textarea
                        key={selectedPoem}
                        value={currentGeneratedPoem}
                        onChange={(e) => {
                          const newValue = e.target.value;
                          setGeneratedPoems(prev => ({
                            ...prev,
                            [selectedPoem]: newValue
                          }));
                          // Clear any existing validation error when user is editing
                          if (validationError) setValidationError(null);
                        }}
                        className="bg-accent/10 border-2 border-accent min-h-[300px] text-foreground whitespace-pre-line leading-relaxed resize-y"
                        placeholder="Your generated poem will appear here..."
                      />
                      {validationError && (
                        <p className="text-destructive text-sm font-medium">{validationError}</p>
                      )}
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
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label htmlFor="save-title-input" className="block text-sm font-medium">
                                    Poem Title
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateTitle('save')}
                                    disabled={isGeneratingTitle}
                                    className="gap-2 h-8 text-xs"
                                  >
                                    {isGeneratingTitle ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3 w-3" />
                                        Generate Title
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <Input
                                  id="save-title-input"
                                  type="text"
                                  value={saveTitle}
                                  onChange={(e) => setSaveTitle(e.target.value)}
                                  placeholder="Enter a title..."
                                  className="border-2"
                                />
                              </div>
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
                                Give your poem a title and share it with the community.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label htmlFor="title-input" className="block text-sm font-medium">
                                    Poem Title
                                  </label>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => generateTitle('publish')}
                                    disabled={isGeneratingTitle}
                                    className="gap-2 h-8 text-xs"
                                  >
                                    {isGeneratingTitle ? (
                                      <>
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                        Generating...
                                      </>
                                    ) : (
                                      <>
                                        <Sparkles className="h-3 w-3" />
                                        Generate Title
                                      </>
                                    )}
                                  </Button>
                                </div>
                                <Input
                                  id="title-input"
                                  type="text"
                                  value={publishTitle}
                                  onChange={(e) => setPublishTitle(e.target.value)}
                                  placeholder="Enter a title..."
                                  className="border-2"
                                />
                              </div>
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
    </div>
  );
};

export default Index;
