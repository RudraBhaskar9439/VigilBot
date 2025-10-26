import React, { useState, useEffect } from 'react';

export default function CoverPage() {
  const [mounted, setMounted] = useState(false);
  const [activeFeature, setActiveFeature] = useState(0);

  useEffect(() => {
    setMounted(true);
    const interval = setInterval(() => {
      setActiveFeature((prev) => (prev + 1) % 6);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const features = [
    { icon: "₿", title: "Live Market Data", desc: "Bitcoin, Ethereum & Solana" },
    { icon: "🤖", title: "Bot Detection", desc: "Real-time on-chain analysis" },
    { icon: "📊", title: "Analytics Dashboard", desc: "Bot activity & risk metrics" },
    { icon: "🔐", title: "Blockchain Security", desc: "Secure & transparent" },
    { icon: "⚡", title: "Instant Alerts", desc: "Real-time notifications" },
    { icon: "🎯", title: "Tiered Access", desc: "Flexible subscriptions" }
  ];

  const stats = [
    { value: "10K+", label: "Transactions Analyzed" },
    { value: "95.8%", label: "Accuracy Rate" },
    { value: "24/7", label: "Monitoring" }
  ];

  return (
    <div className="min-h-screen bg-[#0a1628] text-white overflow-hidden relative">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-[linear-gradient(rgba(20,184,166,0.1)_1px,transparent_1px),linear-gradient(90deg,rgba(20,184,166,0.1)_1px,transparent_1px)] bg-[size:48px_48px]"></div>
      </div>

      <div className="relative z-10 min-h-screen flex flex-col items-center justify-center px-4 py-12">
        {/* Logo & Header */}
        <div className={`transition-all duration-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-8'}`}>
          <div className="relative mb-8 flex justify-center">
            <div className="bg-[#1a2942] p-6 rounded-2xl border border-[#2a3f5f]">
              <svg className="w-16 h-16 text-[#14b8a6]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
          </div>
          <div className="flex items-center justify-center gap-3 mb-8">
            <span className="px-4 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded-lg text-sm font-medium text-gray-300">
              Sepolia Testnet
            </span>
            <span className="px-4 py-1.5 bg-[#1a2942] border border-[#2a3f5f] rounded-lg text-sm font-medium text-gray-300">
              Pyth Network
            </span>
          </div>
        </div>

        {/* Main Content */}
        <div className={`max-w-5xl w-full text-center transition-all duration-1000 delay-200 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
          <h1 className="text-5xl md:text-7xl font-bold mb-4 text-white">
            VigilBot
          </h1>
          <h2 className="text-xl md:text-2xl font-medium mb-8 text-gray-400">
            Real-time Analytics Dashboard
          </h2>
          <p className="text-base md:text-lg text-gray-400 max-w-3xl mx-auto mb-12 leading-relaxed">
            Advanced platform leveraging blockchain event monitoring and Pyth Network price feeds to detect and classify trading bots in real market conditions.
          </p>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4 max-w-3xl mx-auto mb-16">
            {stats.map((stat, i) => (
              <div 
                key={i}
                className={`bg-[#1a2942] border border-[#2a3f5f] rounded-xl p-6 transition-all duration-500 hover:border-[#14b8a6] ${mounted ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
                style={{ transitionDelay: `${400 + i * 100}ms` }}
              >
                <div className="text-3xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-400 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Features Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl mx-auto mb-16">
            {features.map((feature, i) => (
              <div
                key={i}
                className={`group bg-[#1a2942] border rounded-xl p-6 transition-all duration-300 hover:border-[#14b8a6] cursor-pointer ${
                  activeFeature === i 
                    ? 'border-[#14b8a6]' 
                    : 'border-[#2a3f5f]'
                } ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}
                style={{ transitionDelay: `${600 + i * 100}ms` }}
              >
                <div className="text-3xl mb-3">
                  {feature.icon}
                </div>
                <h3 className="font-semibold text-white mb-1 text-sm">{feature.title}</h3>
                <p className="text-xs text-gray-400">{feature.desc}</p>
              </div>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className={`flex flex-col sm:flex-row gap-4 items-center justify-center transition-all duration-1000 delay-1000 ${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
            <a 
              href="/dashboard" 
              className="group px-8 py-4 bg-[#14b8a6] rounded-xl font-semibold text-base text-white transition-all hover:bg-[#0d9488] flex items-center gap-2"
            >
              Enter Dashboard
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
            
            <a 
              href="/payment" 
              className="group px-8 py-4 bg-[#1a2942] border border-[#2a3f5f] rounded-xl font-semibold text-base text-gray-300 transition-all hover:border-[#14b8a6] hover:text-white flex items-center gap-2"
            >
              View Pricing
              <svg className="w-5 h-5 transition-transform group-hover:translate-x-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>

          {/* Tech Stack */}
          <div className={`mt-16 transition-all duration-1000 delay-1200 ${mounted ? 'opacity-100' : 'opacity-0'}`}>
            <p className="text-xs text-gray-500 mb-4 font-medium uppercase tracking-wider">Powered By</p>
            <div className="flex items-center justify-center gap-4 flex-wrap">
              <div className="px-5 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded-lg text-sm text-gray-400 font-medium">Solidity</div>
              <div className="px-5 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded-lg text-sm text-gray-400 font-medium">Node.js</div>
              <div className="px-5 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded-lg text-sm text-gray-400 font-medium">React</div>
              <div className="px-5 py-2 bg-[#1a2942] border border-[#2a3f5f] rounded-lg text-sm text-gray-400 font-medium">Supabase</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}