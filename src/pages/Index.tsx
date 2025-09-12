
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileSearch, Search, Sparkles, BarChart } from "lucide-react";
import { useState } from "react";
import UrlValidator from "@/components/UrlValidator";
import HeroSection from "@/components/landing/HeroSection";
import HowItWorks from "@/components/landing/HowItWorks";
import Features from "@/components/landing/Features";

const Index = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [url, setUrl] = useState("");
  const [isValidUrl, setIsValidUrl] = useState(false);

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setUrl(value);
    
    try {
      const urlObj = new URL(value);
      setIsValidUrl(urlObj.protocol === "http:" || urlObj.protocol === "https:");
    } catch (error) {
      setIsValidUrl(false);
    }
  };
  
  const handleAnalysis = () => {
    if (isValidUrl) {
      navigate(`/analyze?url=${encodeURIComponent(url)}&type=full`);
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-dark text-white">
        <HeroSection />
        <Features />
        <HowItWorks />
      </div>
    );
  }

  return (
    <div className="p-8 bg-gradient-dark min-h-screen">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            <span className="bg-gradient-glow bg-clip-text text-transparent">
              Page Analyzer
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-xl mx-auto">
            Enter a URL to start analyzing your content performance
          </p>
        </div>

        <Card className="backdrop-blur-sm bg-dark-card border-purple/10">
          <CardHeader>
            <CardTitle className="text-xl text-center text-white">Analyze Your Page</CardTitle>
          </CardHeader>
          
          <CardContent>
            <div className="space-y-4">
              <Input
                type="url"
                placeholder="https://example.com/blog/my-post"
                value={url}
                onChange={handleUrlChange}
                className="text-base p-6 bg-dark-lighter border-purple/10 text-white placeholder:text-gray-500"
              />
              
              <UrlValidator url={url} isValid={isValidUrl} />
              
              <div className="pt-4">
                <div className="text-sm text-gray-400 space-y-3">
                  <h3 className="font-medium text-white">Analysis includes:</h3>
                  <ul className="grid grid-cols-2 gap-2">
                    <li className="flex items-center gap-2">
                      <FileSearch className="h-4 w-4 text-purple-light" />
                      <span>Content Analysis</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Search className="h-4 w-4 text-purple-light" />
                      <span>Query Data</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-purple-light" />
                      <span>Performance Stats</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <BarChart className="h-4 w-4 text-purple-light" />
                      <span>Visual Reports</span>
                    </li>
                  </ul>
                </div>
                <Button 
                  className="w-full mt-6 bg-gradient-purple hover:opacity-90 transition-all duration-300" 
                  disabled={!isValidUrl}
                  onClick={handleAnalysis}
                >
                  <FileSearch className="h-5 w-5 mr-2" />
                  Generate Analysis Report
                </Button>
              </div>
            </div>
          </CardContent>
          
          <CardFooter className="flex justify-center text-sm text-gray-500">
            <p>Your data is secure and private</p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Index;
