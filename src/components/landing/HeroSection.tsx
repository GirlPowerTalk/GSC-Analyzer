
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <div className="relative px-4 py-20 md:py-32 bg-gradient-dark overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-30">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-purple-light rounded-full blur-[120px]" />
          <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-glow-blue rounded-full blur-[100px]" />
        </div>
      </div>
      
      <div className="relative max-w-6xl mx-auto text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-glow bg-clip-text text-transparent">
          Optimize Your SEO Content with Live GSC Data
        </h1>
        <p className="text-xl md:text-2xl text-gray-400 max-w-3xl mx-auto mb-8">
          Instantly fetch real Google Search Console queries, analyze your page content, and improve keyword targeting — all in one tool.
        </p>
        <Button 
          onClick={() => navigate("/auth")}
          size="lg"
          className="h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-purple hover:opacity-90"
        >
          Start Analyzing Your Page
          <ArrowRight className="ml-2 h-5 w-5" />
        </Button>
      </div>
    </div>
  );
};

export default HeroSection;
