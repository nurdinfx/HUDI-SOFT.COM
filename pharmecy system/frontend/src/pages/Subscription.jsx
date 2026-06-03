import { CreditCard, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import useAuthStore from '../store/authStore';

const Subscription = () => {
  const { user } = useAuthStore();
  
  // Mock data for now, would come from tenant record
  const subscription = {
    plan: user?.tenant?.subscriptionPlan || 'Basic',
    status: user?.tenant?.subscriptionStatus || 'Trial',
    expiryDate: user?.tenant?.expiryDate || new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
    price: '$29/mo'
  };

  const daysLeft = Math.ceil((new Date(subscription.expiryDate) - new Date()) / (1000 * 60 * 60 * 24));

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-slate-900">Subscription & Billing</h1>
        <p className="text-slate-500 font-medium">Manage your plan and billing details.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Current Plan Card */}
        <div className="md:col-span-2 bg-white p-10 rounded-3xl border border-slate-100 shadow-sm space-y-8">
          <div className="flex justify-between items-start">
            <div className="space-y-2">
              <span className="px-3 py-1 bg-primary/10 text-primary text-xs font-bold rounded-full uppercase tracking-widest">Current Plan</span>
              <h3 className="text-4xl font-black text-slate-900">{subscription.plan}</h3>
            </div>
            <div className={`p-4 rounded-2xl ${subscription.status === 'Active' ? 'bg-green-50 text-green-600' : 'bg-orange-50 text-orange-600'}`}>
              <CheckCircle2 className="w-8 h-8" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8 py-8 border-y border-slate-100">
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Status</p>
              <p className="text-lg font-bold text-slate-900">{subscription.status}</p>
            </div>
            <div>
              <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-1">Next Billing Date</p>
              <p className="text-lg font-bold text-slate-900">{new Date(subscription.expiryDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 text-slate-600">
              <Clock className="w-5 h-5" />
              <span className="font-medium">{daysLeft} days remaining in your {subscription.status.toLowerCase()}</span>
            </div>
            <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold hover:scale-105 transition-transform shadow-lg shadow-primary/20">
              Upgrade Plan
            </button>
          </div>
        </div>

        {/* Small Action Cards */}
        <div className="space-y-6">
          <div className="bg-slate-900 p-8 rounded-3xl text-white space-y-6">
            <CreditCard className="w-10 h-10 text-primary" />
            <h4 className="text-xl font-bold">Payment Method</h4>
            <p className="text-slate-400 text-sm">You haven't added a payment method yet.</p>
            <button className="w-full py-3 bg-white text-slate-900 font-bold rounded-xl hover:bg-slate-100 transition-colors">
              Add Method
            </button>
          </div>

          <div className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex items-center gap-3 text-orange-600">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="font-bold">Important</h4>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              Your subscription will expire on {new Date(subscription.expiryDate).toDateString()}. 
              Add a payment method to avoid service interruption.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Subscription;
