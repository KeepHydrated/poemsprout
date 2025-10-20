import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { LogIn, LogOut, BookOpen, Heart, Settings, FileText, File } from "lucide-react";
import type { User } from "@supabase/supabase-js";

const Header = () => {
  const [user, setUser] = useState<User | null>(null);
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

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate("/")}
            className="text-2xl font-serif font-bold text-foreground hover:text-primary transition-colors"
          >
            Poetry Forms
          </button>

          <div className="flex items-center gap-2">
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
                      onClick={() => navigate("/settings")}
                    >
                      <Settings className="mr-2 h-4 w-4" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5"
                      onClick={() => navigate("/my-poems")}
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      <span>My Poems</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5"
                      onClick={() => navigate("/drafts")}
                    >
                      <File className="mr-2 h-4 w-4" />
                      <span>Drafts</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem
                      className="cursor-pointer py-2.5"
                      onClick={() => navigate("/gallery")}
                    >
                      <BookOpen className="mr-2 h-4 w-4" />
                      <span>All Poems</span>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem 
                      className="cursor-pointer py-2.5"
                      onClick={() => navigate("/likes")}
                    >
                      <Heart className="mr-2 h-4 w-4" />
                      <span>Liked Poems</span>
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
    </header>
  );
};

export default Header;
