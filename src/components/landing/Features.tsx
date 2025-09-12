
import { Database, Edit, Search, Save } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Database,
      title: "GSC Queries Integration",
      description: "Direct access to your Google Search Console data"
    },
    {
      icon: Edit,
      title: "Editable Content Area",
      description: "Make changes and track improvements in real-time"
    },
    {
      icon: Search,
      title: "Query Mentions Tracking",
      description: "Monitor how well your content targets search terms"
    },
    {
      icon: Save,
      title: "Save & Export Options",
      description: "Keep track of changes and export your optimizations"
    }
  ];

  return (
    <div className="py-24 bg-dark-lighter">
      <div className="max-w-6xl mx-auto px-4">
        <h2 className="text-3xl font-bold text-center mb-16 text-white">Key Features</h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div 
              key={index} 
              className="bg-dark-card backdrop-blur-sm p-8 rounded-2xl border border-purple/10 hover:border-purple/20 transition-all duration-300"
            >
              <div className="bg-gradient-purple/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6">
                {<feature.icon className="h-7 w-7 text-purple-light" />}
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Features;
