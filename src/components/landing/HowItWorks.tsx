import { motion } from "framer-motion";
import { FileSearch, Search, Edit } from "lucide-react";

const HowItWorks = () => {
  const steps = [
    {
      icon: FileSearch,
      title: "Input Your URL",
      description: "Enter the page URL you want to analyze for live performance insights.",
    },
    {
      icon: Search,
      title: "Fetch GSC Data",
      description: "Instantly connect with your verified Google Search Console data.",
    },
    {
      icon: Edit,
      title: "Optimize Content",
      description: "Edit your content directly with smart keyword and query highlights.",
    },
  ];

  return (
    <section className="relative py-28 bg-gradient-to-b from-[#0E0E18] via-[#121220] to-[#181830] overflow-hidden">
      {/* Glow background */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-[500px] h-[500px] bg-purple-light/20 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto px-6">
        <motion.h2
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
          viewport={{ once: true }}
          className="text-4xl md:text-5xl font-extrabold text-center mb-6 bg-gradient-glow bg-clip-text text-transparent"
        >
          How It Works
        </motion.h2>

        <motion.p
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          viewport={{ once: true }}
          className="text-gray-400 text-center text-lg mb-20 max-w-2xl mx-auto"
        >
          Analyze, refine, and optimize — your SEO workflow made effortless.
        </motion.p>

        <div className="relative grid md:grid-cols-3 gap-12">
          {/* Connecting Line */}
          <div className="hidden md:block absolute top-[4.5rem] left-0 right-0 h-[2px] bg-gradient-to-r from-purple-500/30 via-purple-400/20 to-transparent z-0" />

          {steps.map((step, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.2 }}
              viewport={{ once: true }}
              className="relative z-10 text-center group"
            >
              <div className="relative w-20 h-20 mx-auto mb-8 rounded-2xl bg-dark-card border border-purple/10 flex items-center justify-center group-hover:scale-105 transition-transform duration-300 shadow-[0_0_20px_rgba(139,92,246,0.15)]">
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <step.icon className="h-9 w-9 text-purple-light z-10" />
              </div>

              <div className="flex flex-col items-center">
                <span className="text-sm font-semibold text-purple-light mb-2">
                  Step {index + 1}
                </span>
                <h3 className="text-xl font-semibold mb-3 text-white">
                  {step.title}
                </h3>
                <p className="text-gray-400 max-w-sm mx-auto leading-relaxed">
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default HowItWorks;
