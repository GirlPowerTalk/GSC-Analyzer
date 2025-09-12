
import { ArrowRight, FileSearch, Search, Edit } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: FileSearch,
      title: "Input your URL",
      description: "Start by entering the page URL you want to analyze"
    },
    {
      icon: Search,
      title: "Fetch GSC Data",
      description: "Get real search queries and performance metrics"
    },
    {
      icon: Edit,
      title: "Optimize Content",
      description: "Edit and improve your content with data-driven insights"
    }
  ];

  return (
    <div className="py-24 bg-dark relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/2 left-1/4 w-[400px] h-[400px] bg-purple-light/20 rounded-full blur-[100px]" />
      </div>
      
      <div className="relative max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16 text-white">How It Works</h2>
        <div className="grid md:grid-cols-3 gap-12">
          {steps.map((step, index) => (
            <div key={index} className="text-center group">
              <div className="bg-dark-card border border-purple/10 group-hover:border-purple/20 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6 transition-all duration-300">
                {<step.icon className="h-8 w-8 text-purple-light" />}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default HowItWorks;
