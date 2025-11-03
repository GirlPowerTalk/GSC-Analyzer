import { Link, useLocation } from "react-router-dom";
import { FileSearch, UserCog, LogOut, Menu } from "lucide-react";
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
    <div
      className={cn(
        "relative flex items-center gap-3 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 group cursor-pointer",
        isActive
          ? "bg-blue-100 text-blue-600 shadow-sm"
          : "text-gray-600 hover:text-blue-600 hover:bg-gray-50"
      )}
    >
      <span
        className={cn(
          "absolute left-0 h-5 w-1.5 rounded-r-full transition-all duration-300",
          isActive
            ? "bg-gradient-to-b from-blue-500 to-purple-500"
            : "bg-transparent group-hover:bg-blue-400/70"
        )}
      />
      <Icon className="h-5 w-5" />
      <span>{title}</span>
    </div>
  </Link>
);

const Layout = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    setShowSidebar(!!user);
  }, [user]);

  const navigation = [
    { href: "/", icon: FileSearch, title: "Analyze Page" },
    ...(user ? [{ href: "/account", icon: UserCog, title: "Account" }] : []),
  ];

  const handleSignOut = async () => {
    await signOut();
    toast.success("Successfully signed out");
  };

  if (location.pathname === "/" && !user) {
    return <main className="flex-1">{children}</main>;
  }

  return (
    <div className="min-h-screen flex bg-gray-50 text-gray-900">
      {/* Desktop Sidebar */}
      {showSidebar && (
        <aside className="hidden md:flex w-64 flex-col gap-6 bg-gradient-to-b from-gray-100 to-gray-50 shadow-md">
          <div className="p-6 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
            Page Analyzer
          </div>
          <nav className="flex flex-col gap-1 px-3">
            {navigation.map((item) => (
              <NavItem
                key={item.href}
                {...item}
                isActive={location.pathname === item.href}
              />
            ))}
            <div className="mt-4 pt-4 border-t border-gray-200 px-1">
              <button
                onClick={handleSignOut}
                className="flex items-center gap-3 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-all duration-200 w-full text-left"
              >
                <LogOut className="h-5 w-5" />
                Sign Out
              </button>
            </div>
          </nav>
        </aside>
      )}

      {/* Mobile Sidebar */}
      {showSidebar && (
        <div className="md:hidden fixed top-4 left-4 z-50">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shadow-sm">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="w-64 p-5 bg-gray-50 border-r border-gray-200"
            >
              <div className="text-xl font-bold mb-4 bg-gradient-to-r from-blue-600 to-purple-600 text-transparent bg-clip-text">
                Page Analyzer
              </div>
              <nav className="flex flex-col gap-1">
                {navigation.map((item) => (
                  <NavItem
                    key={item.href}
                    {...item}
                    isActive={location.pathname === item.href}
                  />
                ))}
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-3 text-sm font-medium text-red-500 hover:text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-all duration-200 mt-4 border-t border-gray-200 pt-3 w-full text-left"
                >
                  <LogOut className="h-5 w-5" />
                  Sign Out
                </button>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      )}

      {/* Main Content */}
      <main className={cn("flex-1 shadow-none")}>
        {children}
      </main>
    </div>
  );
};

export default Layout;
