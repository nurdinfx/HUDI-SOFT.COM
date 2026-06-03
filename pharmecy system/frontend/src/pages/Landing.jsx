import { Link } from 'react-router-dom';
import { ShoppingCart, ShieldCheck, BarChart3, Users, ArrowRight, CheckCircle2 } from 'lucide-react';

const Landing = () => {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-8 py-6 max-w-7xl mx-auto">
        <div className="flex items-center space-x-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <ShoppingCart className="text-white w-6 h-6" />
          </div>
          <span className="text-2xl font-black text-slate-900 tracking-tight">PharmSaaS</span>
        </div>
        <div className="hidden md:flex items-center space-x-8 text-sm font-semibold text-slate-600">
          <a href="#features" className="hover:text-primary transition-colors">Features</a>
          <a href="#pricing" className="hover:text-primary transition-colors">Pricing</a>
          <Link to="/login" className="hover:text-primary transition-colors">Log in</Link>
          <Link to="/register" className="bg-primary text-white px-6 py-2.5 rounded-xl hover:bg-primary/90 transition-all shadow-lg shadow-primary/20">
            Get Started
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="px-8 py-20 max-w-7xl mx-auto text-center md:text-left flex flex-col md:flex-row items-center gap-16">
        <div className="flex-1 space-y-8">
          <div className="inline-flex items-center space-x-2 bg-primary/10 text-primary px-4 py-2 rounded-full text-sm font-bold">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
            <span>Now with Multi-Branch Support</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-slate-900 leading-[1.1]">
            Manage your Pharmacy <br />
            <span className="text-primary">Professionally.</span>
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl leading-relaxed">
            The all-in-one SaaS platform for pharmacy owners. Track inventory, manage multiple branches, 
            and scale your business with real-time analytics.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <Link to="/register" className="w-full sm:w-auto bg-primary text-white px-10 py-4 rounded-2xl text-lg font-bold hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-xl shadow-primary/20">
              Start Free Trial <ArrowRight className="w-5 h-5" />
            </Link>
            <Link to="/pricing" className="w-full sm:w-auto bg-white border-2 border-slate-200 text-slate-900 px-10 py-4 rounded-2xl text-lg font-bold hover:border-primary hover:text-primary transition-all flex items-center justify-center">
              View Pricing
            </Link>
          </div>
        </div>
        <div className="flex-1 w-full max-w-2xl relative">
          <div className="absolute inset-0 bg-primary/10 blur-3xl -z-10 rounded-full"></div>
          <img 
            src="https://images.unsplash.com/photo-1576091160550-2173dba999ef?auto=format&fit=crop&q=80&w=2070" 
            alt="Dashboard Preview" 
            className="rounded-3xl shadow-2xl border-8 border-white"
          />
        </div>
      </header>

      {/* Features */}
      <section id="features" className="bg-slate-50 py-24 px-8">
        <div className="max-w-7xl mx-auto space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-slate-900">Everything you need to grow</h2>
            <p className="text-slate-500 text-lg max-w-2xl mx-auto">Powerful features designed specifically for modern pharmacies.</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { 
                icon: <ShieldCheck className="w-8 h-8 text-primary" />, 
                title: "Data Isolation", 
                desc: "Your business data is securely isolated with enterprise-grade multi-tenancy logic." 
              },
              { 
                icon: <BarChart3 className="w-8 h-8 text-primary" />, 
                title: "Real-time Analytics", 
                desc: "Monitor sales, profits, and expenses across all your branches in real-time." 
              },
              { 
                icon: <Users className="w-8 h-8 text-primary" />, 
                title: "Role-Based Access", 
                desc: "Assign specific roles to your staff: Manager, Pharmacist, Cashier, or Accountant." 
              }
            ].map((f, i) => (
              <div key={i} className="bg-white p-10 rounded-3xl border border-slate-100 hover:border-primary/20 transition-all hover:shadow-xl group">
                <div className="mb-6 p-4 bg-slate-50 rounded-2xl w-fit group-hover:bg-primary/10 transition-colors">
                  {f.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">{f.title}</h3>
                <p className="text-slate-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Badge */}
      <section className="py-24 px-8 max-w-7xl mx-auto text-center space-y-12">
        <h3 className="text-xl font-bold text-slate-400 uppercase tracking-widest">Trusted by 500+ Pharmacies Worldwide</h3>
        <div className="flex flex-wrap justify-center gap-12 opacity-40 grayscale">
          {/* Placeholders for logos */}
          <span className="text-3xl font-black italic">PHARM-CORE</span>
          <span className="text-3xl font-black italic">HEALTH-NET</span>
          <span className="text-3xl font-black italic">MEDI-FLOW</span>
          <span className="text-3xl font-black italic">CITY-DRUGS</span>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-16 px-8">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-12">
          <div className="space-y-6">
            <div className="flex items-center space-x-2 text-white">
              <ShoppingCart className="w-8 h-8" />
              <span className="text-2xl font-black tracking-tight">PharmSaaS</span>
            </div>
            <p className="text-sm">The leading pharmacy management software for growing businesses.</p>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Product</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Support</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
              <li><a href="#" className="hover:text-white transition-colors">API Docs</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Status</a></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white font-bold mb-6">Company</h4>
            <ul className="space-y-4 text-sm">
              <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
              <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
            </ul>
          </div>
        </div>
        <div className="max-w-7xl mx-auto pt-16 mt-16 border-t border-slate-800 text-center text-xs">
          © 2026 PharmSaaS. All rights reserved. Built for professional pharmacy management.
        </div>
      </footer>
    </div>
  );
};

export default Landing;
