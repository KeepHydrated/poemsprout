import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, LogOut, User as UserIcon, Settings, Heart, Search } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Header = () => {
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
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

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/gallery?search=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-serif font-bold text-foreground hover:text-primary transition-colors shrink-0"
          >
            Poem Sprout
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

          <div className="flex items-center gap-2 shrink-0">
            {user ? (
              <div className="flex items-center gap-3">
                <Button
                  variant={isActive("/likes") ? "default" : "ghost"}
                  size="icon"
                  onClick={() => navigate("/likes")}
                >
                  <Heart className="h-4 w-4" />
                </Button>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
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
    </header>
  );
};

export default Header;
