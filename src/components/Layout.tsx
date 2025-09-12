
import { Link, useLocation } from "react-router-dom";
import { FileSearch, Settings, UserCog, LogOut, Menu } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { useState, useEffect } from "react";

interface NavItemProps {
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  isActive: boolean;
}

const NavItem = ({ href, icon: Icon, title, isActive }: NavItemProps) => (
  <Link to={href}>
    <Button
      variant="ghost"
      className={cn(
        "w-full justify-start gap-2",
        isActive && "bg-accent text-accent-foreground"
      )}
    >
      <Icon className="h-4 w-4" />
      {title}
    </Button>
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showSidebar, setShowSidebar] = useState(false);
  
  // Update sidebar visibility when user auth state changes
  useEffect(() => {
    setShowSidebar(!!user);
  }, [user]);
  
  const navigation = [
    {
      href: "/",
      icon: FileSearch,
      title: "Analyze Page"
    },
    ...(user ? [
      {
        href: "/account",
        icon: UserCog,
        title: "Account"
      }
    ] : [])
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Successfully signed out");
  };

  // On home page without auth, or not authenticated, show simple layout
  if (location.pathname === "/" && !user) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="min-h-screen flex">
      {/* Desktop Sidebar - Shown when authenticated */}
      {showSidebar && (
        <aside className="hidden md:flex w-64 flex-col gap-4 border-r bg-background p-6">
          <div className="font-semibold text-lg text-brand-800">Page Analyzer</div>
          <nav className="flex flex-col gap-2">
            {navigation.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={location.pathname === item.href}
              />
            ))}
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
              onClick={handleSignOut}
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </Button>
          </nav>
        </aside>
      )}

      {/* Mobile Navigation - Shown when authenticated */}
      {showSidebar && (
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-4">
              <div className="font-semibold text-lg mb-4 text-brand-800">Page Analyzer</div>
              <nav className="flex flex-col gap-2">
                {navigation.map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    isActive={location.pathname === item.href}
                  />
                ))}
                <Button
                  variant="ghost"
                  className="w-full justify-start gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                  onClick={handleSignOut}
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Main Content */}
      <main className={cn("flex-1", showSidebar && "md:ml-0")}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
