import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";

const HeroSection = () => {
  const navigate = useNavigate();

  return (
    <section className="relative px-6 py-24 md:py-36 bg-gradient-dark overflow-hidden">
      {/* Glowing Background Orbs */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -inset-[10px] opacity-30">
          <div className="absolute top-1/2 left-1/3 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-purple-light rounded-full blur-[140px]" />
          <div className="absolute top-1/4 right-1/4 w-[450px] h-[450px] bg-glow-blue rounded-full blur-[120px]" />
          <div className="absolute bottom-1/4 left-1/4 w-[300px] h-[300px] bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full blur-[100px]" />
        </div>
      </div>

      {/* Hero Content */}
      <div className="relative max-w-5xl mx-auto text-center text-white">

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-glow bg-clip-text text-transparent leading-tight"
        >
          Optimize Your SEO Content with Live GSC Data
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-lg md:text-2xl text-gray-300 max-w-2xl mx-auto mb-10"
        >
          Instantly fetch your real Google Search Console queries, analyze page content, and boost your keyword targeting — all in one dashboard.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Button
            onClick={() => navigate("/auth")}
            size="lg"
            className="h-14 px-8 text-lg shadow-lg hover:shadow-xl transition-all duration-300 bg-gradient-purple hover:opacity-90"
          >
            Start Analyzing Your Page
            <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
