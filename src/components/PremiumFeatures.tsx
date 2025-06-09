import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/analytics';
import { 
  Crown, 
  Sparkles, 
  Download, 
  Zap, 
  Shield, 
  Star,
  Check,
  X,
  Loader2,
  ExternalLink,
  ArrowRight
} from 'lucide-react';

interface PremiumFeaturesProps {
  isModal?: boolean;
  onClose?: () => void;
}

const PremiumFeatures: React.FC<PremiumFeaturesProps> = ({ isModal = false, onClose }) => {
  const { isPremium, plans, isLoading, initializeCheckout } = useSubscription();
  const { isAuthenticated } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  const premiumFeatures = [
    {
      icon: <Zap size={24} className="text-yellow-400" />,
      title: 'Ad-Free Experience',
      description: 'Enjoy MemeForge without any sponsored content or watermarks',
      highlight: true,
    },
    {
      icon: <Crown size={24} className="text-purple-400" />,
      title: 'Exclusive Templates',
      description: 'Access premium meme templates not available to free users',
      highlight: true,
    },
    {
      icon: <Download size={24} className="text-blue-400" />,
      title: 'High-Resolution Downloads',
      description: 'Download your memes in crystal-clear 4K quality',
      highlight: true,
    },
    {
      icon: <Sparkles size={24} className="text-pink-400" />,
      title: 'Unlimited NFT Mints',
      description: 'Mint as many NFTs as you want with no restrictions',
      highlight: false,
    },
    {
      icon: <Shield size={24} className="text-green-400" />,
      title: 'Priority Support',
      description: 'Get faster response times and dedicated support',
      highlight: false,
    },
    {
      icon: <Star size={24} className="text-orange-400" />,
      title: 'Early Access Features',
      description: 'Be the first to try new features and improvements',
      highlight: false,
    },
  ];

  const handlePlanSelect = async (planId: string) => {
    if (!isAuthenticated) {
      alert('Please sign in to subscribe');
      return;
    }

    try {
      setSelectedPlan(planId);
      setCheckoutLoading(true);

      const checkoutUrl = await initializeCheckout(planId);
      
      if (checkoutUrl) {
        // Redirect to Stripe Checkout
        window.location.href = checkoutUrl;
      }
    } catch (error) {
      console.error('Checkout error:', error);
      alert('Failed to start checkout. Please try again.');
    } finally {
      setCheckoutLoading(false);
      setSelectedPlan(null);
    }
  };

  const handleFeatureView = async () => {
    await trackEvent('premium_features_viewed', {
      is_modal: isModal,
      is_premium: isPremium,
    });
  };

  // Track feature view on mount
  React.useEffect(() => {
    handleFeatureView();
  }, []);

  const activePlans = plans.filter(plan => plan.is_active);
  const monthlyPlan = activePlans.find(plan => plan.interval_type === 'month');
  const yearlyPlan = activePlans.find(plan => plan.interval_type === 'year');

  const calculateYearlySavings = () => {
    if (!monthlyPlan || !yearlyPlan) return 0;
    const monthlyCost = monthlyPlan.price * 12;
    const yearlyCost = yearlyPlan.price;
    return Math.round(((monthlyCost - yearlyCost) / monthlyCost) * 100);
  };

  const content = (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-4">
          <Crown size={32} className="text-yellow-400" />
          <h2 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-yellow-400 via-purple-500 to-pink-500">
            MemeForge Premium
          </h2>
        </div>
        <p className="text-gray-300 text-lg max-w-2xl mx-auto">
          Unlock the full potential of MemeForge with premium features designed for serious meme creators
        </p>
      </div>

      {/* Current Status Banner */}
      {isPremium && (
        <div className="bg-gradient-to-r from-green-900 to-blue-900 bg-opacity-30 border border-green-700 rounded-lg p-4 mb-8 text-center">
          <div className="flex items-center justify-center gap-2 text-green-400 mb-2">
            <Crown size={20} />
            <span className="font-semibold">Premium Active</span>
          </div>
          <p className="text-gray-300 text-sm">
            You're enjoying all premium features! Thank you for supporting MemeForge.
          </p>
        </div>
      )}

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
        {premiumFeatures.map((feature, index) => (
          <div
            key={index}
            className={`p-6 rounded-lg border transition-all hover:transform hover:scale-105 ${
              feature.highlight
                ? 'bg-gradient-to-br from-purple-900 to-blue-900 bg-opacity-30 border-purple-500'
                : 'bg-gray-800 border-gray-700'
            }`}
          >
            <div className="flex items-center gap-3 mb-3">
              {feature.icon}
              <h3 className="font-semibold text-white">{feature.title}</h3>
              {feature.highlight && (
                <Star size={16} className="text-yellow-400 fill-current" />
              )}
            </div>
            <p className="text-gray-300 text-sm leading-relaxed">
              {feature.description}
            </p>
          </div>
        ))}
      </div>

      {/* Pricing Plans */}
      {!isPremium && activePlans.length > 0 && (
        <div className="mb-8">
          <h3 className="text-2xl font-bold text-center mb-8">Choose Your Plan</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-2xl mx-auto">
            {/* Monthly Plan */}
            {monthlyPlan && (
              <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 hover:border-purple-500 transition-colors">
                <div className="text-center mb-6">
                  <h4 className="text-xl font-bold text-white mb-2">{monthlyPlan.name}</h4>
                  <div className="text-3xl font-bold text-purple-400 mb-1">
                    ${monthlyPlan.price}
                    <span className="text-lg text-gray-400 font-normal">/month</span>
                  </div>
                  <p className="text-gray-400 text-sm">{monthlyPlan.description}</p>
                </div>
                
                <button
                  onClick={() => handlePlanSelect(monthlyPlan.id)}
                  disabled={checkoutLoading || isLoading}
                  className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {checkoutLoading && selectedPlan === monthlyPlan.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Get Monthly
                      <ArrowRight size={18} />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Yearly Plan */}
            {yearlyPlan && (
              <div className="bg-gradient-to-br from-yellow-900 to-orange-900 bg-opacity-30 border border-yellow-500 rounded-lg p-6 relative">
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-yellow-500 text-black px-3 py-1 rounded-full text-xs font-bold">
                  BEST VALUE • SAVE {calculateYearlySavings()}%
                </div>
                
                <div className="text-center mb-6 mt-2">
                  <h4 className="text-xl font-bold text-white mb-2">{yearlyPlan.name}</h4>
                  <div className="text-3xl font-bold text-yellow-400 mb-1">
                    ${yearlyPlan.price}
                    <span className="text-lg text-gray-400 font-normal">/year</span>
                  </div>
                  <div className="text-sm text-gray-300 mb-2">
                    Only ${(yearlyPlan.price / 12).toFixed(2)}/month
                  </div>
                  <p className="text-gray-400 text-sm">{yearlyPlan.description}</p>
                </div>
                
                <button
                  onClick={() => handlePlanSelect(yearlyPlan.id)}
                  disabled={checkoutLoading || isLoading}
                  className="w-full bg-yellow-500 hover:bg-yellow-600 disabled:bg-gray-600 disabled:cursor-not-allowed text-black py-3 px-4 rounded-md font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {checkoutLoading && selectedPlan === yearlyPlan.id ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Get Yearly
                      <Crown size={18} />
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* FAQ Section */}
      <div className="border-t border-gray-700 pt-8">
        <h3 className="text-xl font-bold text-center mb-6">Frequently Asked Questions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div>
            <h4 className="font-semibold text-white mb-2">Can I cancel anytime?</h4>
            <p className="text-gray-400">
              Yes, you can cancel your subscription at any time. You'll continue to have access until the end of your billing period.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-2">Do I keep my NFTs if I cancel?</h4>
            <p className="text-gray-400">
              Absolutely! Any NFTs you've minted are permanently yours on the blockchain, regardless of your subscription status.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-2">What payment methods do you accept?</h4>
            <p className="text-gray-400">
              We accept all major credit cards, debit cards, and digital payment methods through Stripe.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-white mb-2">Is my payment information secure?</h4>
            <p className="text-gray-400">
              Yes, all payments are processed securely by Stripe. We never store your payment information on our servers.
            </p>
          </div>
        </div>
      </div>

      {/* Support Link */}
      <div className="text-center mt-8 pt-6 border-t border-gray-700">
        <p className="text-gray-400 text-sm">
          Have questions about Premium? 
          <a 
            href="mailto:support@memeforge.app" 
            className="text-blue-400 hover:text-blue-300 ml-1 inline-flex items-center gap-1"
          >
            Contact our support team
            <ExternalLink size={12} />
          </a>
        </p>
      </div>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
        <div className="bg-gray-900 rounded-lg shadow-xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-700">
          <div className="sticky top-0 bg-gray-900 border-b border-gray-700 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white">Premium Features</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={24} />
            </button>
          </div>
          <div className="p-6">
            {content}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900 min-h-screen text-white">
      {content}
    </div>
  );
};

export default PremiumFeatures;