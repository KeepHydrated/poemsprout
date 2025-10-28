import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, LogOut, User as UserIcon, Settings, Heart, Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Clear search when navigating away from gallery
  useEffect(() => {
    if (!location.pathname.startsWith("/gallery")) {
      setSearchQuery("");
    }
  }, [location.pathname]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/gallery?search=${encodeURIComponent(searchQuery.trim())}`);
      setIsSearchOpen(false);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4 md:justify-start w-full relative">
          <div className="md:hidden w-10"></div>
          
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-serif font-bold text-foreground hover:text-primary transition-colors shrink-0 md:relative md:left-auto md:translate-x-0 absolute left-1/2 -translate-x-1/2"
          >
            <span className="md:hidden">P</span>
            <span className="hidden md:inline">Poem Sprout</span>
          </button>

          {/* Search Bar */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md mx-2 hidden md:block">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search poems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </form>

          <div className="flex items-center gap-2 shrink-0 ml-auto md:ml-0">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Mobile Search Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsSearchOpen(true)}
                  className="md:hidden"
                >
                  <Search className="h-4 w-4" />
                </Button>
                
                <Button
                  variant={isActive("/likes") ? "default" : "ghost"}
                  size="icon"
                  onClick={() => navigate("/likes")}
                  className="hidden md:flex"
                >
                  <Heart className="h-4 w-4" />
                </Button>
                
                {/* Desktop Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild className="hidden md:flex">
                    <Avatar className="h-10 w-10 cursor-pointer ring-2 ring-transparent hover:ring-primary/20 transition-all">
                      <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || "User"} />
                      <AvatarFallback className="bg-primary/10">
                        {user.email?.[0].toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                  </DropdownMenuTrigger>
                  
                  <DropdownMenuContent align="end" className="w-64 bg-background border-2">
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex items-center gap-3 py-2">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || "User"} />
                          <AvatarFallback className="bg-primary/10">
                            {user.email?.[0].toUpperCase() || "U"}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col space-y-1">
                          <p className="text-sm font-medium leading-none">
                            {user.user_metadata?.display_name || "User"}
                          </p>
                          <p className="text-xs leading-none text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5"
                      onClick={() => navigate("/my-profile")}
                    >
                      <UserIcon className="mr-2 h-4 w-4" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="cursor-pointer py-2.5"
                      onClick={() => navigate("/settings")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuSeparator />
                    
                    <DropdownMenuItem 
                      className="cursor-pointer py-2.5 text-destructive focus:text-destructive"
                      onClick={handleSignOut}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Mobile Avatar Button */}
                <Avatar 
                  className="h-10 w-10 cursor-pointer md:hidden"
                  onClick={() => setIsProfileOpen(true)}
                >
                  <AvatarImage src={user.user_metadata?.avatar_url} alt={user.email || "User"} />
                  <AvatarFallback className="bg-primary/10">
                    {user.email?.[0].toUpperCase() || "U"}
                  </AvatarFallback>
                </Avatar>
              </div>
            ) : (
              <Button
                variant="default"
                size="sm"
                onClick={() => navigate("/auth")}
              >
                <LogIn className="mr-2 h-4 w-4" />
                Sign In
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>

      {/* Mobile Search Dialog */}
      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Search Poems</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search poems..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                autoFocus
              />
            </div>
            <Button type="submit" className="w-full">
              Search
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      {/* Mobile Profile Sheet */}
      <Sheet open={isProfileOpen} onOpenChange={setIsProfileOpen}>
        <SheetContent side="right" className="w-80">
          <SheetHeader className="text-left mb-6">
            <div className="flex items-center gap-3">
              <Avatar className="h-16 w-16">
                <AvatarImage src={user?.user_metadata?.avatar_url} alt={user?.email || "User"} />
                <AvatarFallback className="bg-primary/10 text-lg">
                  {user?.email?.[0].toUpperCase() || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <SheetTitle className="text-lg">
                  {user?.user_metadata?.display_name || "User"}
                </SheetTitle>
                <p className="text-sm text-muted-foreground">
                  {user?.email}
                </p>
              </div>
            </div>
          </SheetHeader>
          
          <div className="space-y-2">
            <Button
              variant="ghost"
              className="w-full justify-start text-base py-6"
              onClick={() => {
                navigate("/likes");
                setIsProfileOpen(false);
              }}
            >
              <Heart className="mr-3 h-5 w-5" />
              Likes
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-base py-6"
              onClick={() => {
                navigate("/my-profile");
                setIsProfileOpen(false);
              }}
            >
              <UserIcon className="mr-3 h-5 w-5" />
              Profile
            </Button>
            
            <Button
              variant="ghost"
              className="w-full justify-start text-base py-6"
              onClick={() => {
                navigate("/settings");
                setIsProfileOpen(false);
              }}
            >
              <Settings className="mr-3 h-5 w-5" />
              Settings
            </Button>
            
            <div className="pt-4 border-t">
              <Button
                variant="ghost"
                className="w-full justify-start text-base py-6 text-destructive hover:text-destructive hover:bg-destructive/10"
                onClick={() => {
                  handleSignOut();
                  setIsProfileOpen(false);
                }}
              >
                <LogOut className="mr-3 h-5 w-5" />
                Sign Out
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </header>
  );
};

export default Header;
