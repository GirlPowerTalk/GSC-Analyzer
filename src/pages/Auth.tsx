import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import { Mail, Lock, UserPlus, LogIn } from "lucide-react";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

const Auth = () => {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  /** ---------- SIGN-UP ---------- */
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/api/check-user`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.exists) {
        if (data.verified) {
          toast.error("User already registered. Please sign in.");
        } else {
          toast.success("Verification email already sent. Check your inbox.");
        }
        return;
      }

      const { error } = await supabase.auth.signUp({ email, password });
      if (error) {
        toast.error(error.message);
        return;
      }

      toast.success(
        "Signup successful! Check your inbox and click the verification link before signing in."
      );
    } catch (err: any) {
      toast.error(err.message || "Signup error");
    } finally {
      setLoading(false);
    }
  };

  /** ---------- SIGN-IN ---------- */
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;

      const { data: fresh } = await supabase.auth.getUser();
      const user = fresh.user;

      if (!user?.email_confirmed_at) {
        await supabase.auth.signOut();
        toast.error("Please verify your email before signing in.");
        return;
      }

      // Create service account after successful sign-in
      try {
        const res = await fetch(`${API_BASE_URL}/api/service-account`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.id }),
        });

        let data;
        try {
          data = await res.json();
        } catch {
          data = {};
        }

        if (res.ok) {
          console.log("Service account created:", data.serviceAccountEmail);
          toast.success("Service account created successfully!");
        } else {
          console.warn("Service account creation failed:", data.error);
          toast.error(data.error || "Service account creation failed");
        }
      } catch (svcErr) {
        console.error("Service account creation failed:", svcErr);
        toast.error("Service account creation failed");
      }

      toast.success("Successfully signed in!");
      navigate("/");
    } catch (err: any) {
      toast.error(err.message || "Sign in error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-[#eef2f7] to-[#f8fafc] px-4">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md"
      >
        <Card className="shadow-lg border border-gray-200 rounded-2xl backdrop-blur-md bg-white/90">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-semibold text-gray-800">
              Welcome to <span className="text-blue-600">Page Analyzer</span>
            </CardTitle>
            <CardDescription className="text-gray-500">
              Sign in or create an account to continue
            </CardDescription>
          </CardHeader>

          <CardContent className="pt-2">
            <Tabs defaultValue="signin" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6 bg-gray-100 rounded-xl p-1">
                <TabsTrigger
                  value="signin"
                  className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all"
                >
                   Sign In
                </TabsTrigger>
                <TabsTrigger
                  value="signup"
                  className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white transition-all"
                >
                   Sign Up
                </TabsTrigger>
              </TabsList>

              {/* Sign In */}
              <TabsContent value="signin">
                <form onSubmit={handleSignIn} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 transition-all text-white font-medium"
                    disabled={loading}
                  ><LogIn className="h-4 w-4 mr-2" />
                    {loading ? "Signing in..." : "Sign In"}
                  </Button>
                </form>
              </TabsContent>

              {/* Sign Up */}
              <TabsContent value="signup">
                
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="relative">
                    <Mail className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="email"
                      placeholder="Email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>

                  <div className="relative">
                    <Lock className="absolute left-3 top-3.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    className="w-full rounded-lg bg-blue-600 hover:bg-blue-700 transition-all text-white font-medium"
                    disabled={loading}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    {loading ? "Signing up..." : "Sign Up"}
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>

        <p className="text-center text-sm text-gray-500 mt-6">
          © {new Date().getFullYear()} Page Analyzer. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
};

export default Auth;
