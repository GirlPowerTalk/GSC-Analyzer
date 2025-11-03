import { Database, Edit, Search, Save } from "lucide-react";
import { motion } from "framer-motion";

const Features = () => {
  const features = [
    {
      icon: Database,
      title: "GSC Queries Integration",
      description: "Connect directly to your Google Search Console and pull live search query data instantly."
    },
    {
      icon: Edit,
      title: "Editable Content Area",
      description: "Modify, highlight, and refine your content with live keyword tracking feedback."
    },
    {
      icon: Search,
      title: "Query Mentions Tracking",
      description: "Analyze how effectively your content aligns with top-performing search queries."
    },
    {
      icon: Save,
      title: "Save & Export Options",
      description: "Easily save edited versions, compare progress, and export your optimized content."
    }
  ];

  return (
    <section className="py-28 bg-gradient-to-b from-[#0B0B12] via-[#0E0E18] to-[#131320]">
      <div className="max-w-6xl mx-auto px-6 text-center">
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          viewport={{ once: true }}
          className="text-sm uppercase tracking-widest text-purple-light mb-4"
        >
          Why Choose GSC Analyzer
        </motion.p>

        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold bg-gradient-glow bg-clip-text text-transparent mb-16"
        >
          Powerful Features to Boost Your SEO Workflow
        </motion.h2>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
          {features.map((feature, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              viewport={{ once: true }}
              className="bg-dark-card p-8 rounded-2xl border border-purple/10 hover:border-purple/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] transition-all duration-300 transform hover:-translate-y-1"
            >
              <div className="bg-gradient-purple/10 w-14 h-14 rounded-xl flex items-center justify-center mb-6 mx-auto">
                <feature.icon className="h-7 w-7 text-purple-light" />
              </div>
              <h3 className="text-xl font-semibold mb-3 text-white">
                {feature.title}
              </h3>
              <p className="text-gray-400 leading-relaxed">
                {feature.description}
              </p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
