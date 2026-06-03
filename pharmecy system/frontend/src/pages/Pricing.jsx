import { Link } from 'react-router-dom';
import { Check, ShoppingCart } from 'lucide-react';

const Pricing = () => {
  const plans = [
    {
      name: "Basic",
      price: "$29",
      period: "/month",
      desc: "Perfect for single branch pharmacies starting their digital journey.",
      features: [
        "1 Branch",
        "Up to 3 Staff Members",
        "Inventory Management",
        "Basic POS",
        "Sales Reports",
        "Email Support"
      ],
      cta: "Start Basic",
      popular: false
    },
    {
      name: "Standard",
      price: "$79",
      period: "/month",
      desc: "Ideal for growing businesses with multiple locations.",
      features: [
        "Up to 3 Branches",
        "Unlimited Staff",
        "Inter-branch Stock Transfer",
        "Advanced Analytics",
        "Supplier Management",
        "Priority Support"
      ],
      cta: "Go Standard",
      popular: true
    },
    {
      name: "Premium",
      price: "$149",
      period: "/month",
      desc: "For large pharmacy chains requiring ultimate power.",
      features: [
        "Unlimited Branches",
        "Unlimited Staff",
        "Audit Logs & Security",
        "Custom Logo & Branding",
        "Profit/Loss Aggregation",
        "24/7 Dedicated Support"
      ],
      cta: "Choose Premium",
      popular: false
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 py-24 px-8">
      <div className="max-w-7xl mx-auto space-y-16">
        <div className="text-center space-y-6">
          <Link to="/" className="inline-flex items-center space-x-2 mb-8 group">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
              <ShoppingCart className="text-white w-5 h-5" />
            </div>
            <span className="text-xl font-black text-slate-900 tracking-tight">PharmSaaS</span>
          </Link>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight">Simple, Transparent Pricing</h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto">
            Choose the plan that fits your business needs. Scale up or down at any time.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {plans.map((plan, i) => (
            <div 
              key={i} 
              className={`relative bg-white p-12 rounded-3xl border-2 transition-all hover:shadow-2xl flex flex-col ${
                plan.popular ? 'border-primary shadow-xl scale-105 z-10' : 'border-slate-100'
              }`}
            >
              {plan.popular && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-primary text-white px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                  Most Popular
                </div>
              )}
              
              <div className="space-y-4 mb-10">
                <h3 className="text-2xl font-black text-slate-900">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-black text-slate-900">{plan.price}</span>
                  <span className="text-slate-400 font-semibold">{plan.period}</span>
                </div>
                <p className="text-slate-500 text-sm leading-relaxed">{plan.desc}</p>
              </div>

              <div className="space-y-4 mb-12 flex-grow">
                {plan.features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-slate-700 font-medium">
                    <div className="p-1 bg-green-50 rounded-full">
                      <Check className="w-4 h-4 text-green-600" />
                    </div>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Link 
                to="/register" 
                className={`w-full py-4 rounded-2xl font-bold text-center transition-all ${
                  plan.popular 
                    ? 'bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20' 
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                {plan.cta}
              </Link>
            </div>
          ))}
        </div>

        <div className="text-center pt-12">
          <p className="text-slate-400 font-medium">
            Looking for an enterprise solution? <a href="#" className="text-primary font-bold hover:underline">Contact our sales team</a>
          </p>
        </div>
      </div>
    </div>
  );
};

export default Pricing;
