import React, { useState } from 'react';
import { useSubscription } from '../context/SubscriptionContext';
import { useAuth } from '../context/AuthContext';
import { trackEvent } from '../utils/analytics';
import { 
  Crown, 
  Calendar, 
  CreditCard, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  ExternalLink,
  RefreshCw,
  Settings,
  Loader2
} from 'lucide-react';

const SubscriptionManager: React.FC = () => {
  const { 
    isPremium, 
    subscription, 
    plans, 
    isLoading, 
    cancelSubscription, 
    refreshSubscription 
  } = useSubscription();
  const { user } = useAuth();
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefreshSubscription = async () => {
    setRefreshing(true);
    try {
      await refreshSubscription();
      await trackEvent('subscription_refreshed', {
        user_id: user?.id,
      });
    } catch (error) {
      console.error('Error refreshing subscription:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCanceling(true);
    try {
      const success = await cancelSubscription();
      if (success) {
        setShowCancelDialog(false);
        alert('Your subscription has been canceled. You\'ll continue to have access until the end of your billing period.');
      } else {
        alert('Failed to cancel subscription. Please try again or contact support.');
      }
    } catch (error) {
      console.error('Error canceling subscription:', error);
      alert('Failed to cancel subscription. Please try again or contact support.');
    } finally {
      setCanceling(false);
    }
  };

  const openCustomerPortal = async () => {
    await trackEvent('customer_portal_accessed', {
      subscription_id: subscription?.subscription_id,
    });
    
    // In a real implementation, this would redirect to Stripe Customer Portal
    alert('Customer portal integration would redirect to Stripe here.');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={20} className="text-green-400" />;
      case 'trialing':
        return <Clock size={20} className="text-blue-400" />;
      case 'canceled':
        return <XCircle size={20} className="text-red-400" />;
      case 'past_due':
        return <AlertTriangle size={20} className="text-yellow-400" />;
      default:
        return <XCircle size={20} className="text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return 'Active';
      case 'trialing':
        return 'Trial Period';
      case 'canceled':
        return 'Canceled';
      case 'past_due':
        return 'Payment Due';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const currentPlan = plans.find(plan => plan.id === subscription?.plan_id);

  if (isLoading) {
    return (
      <div className="bg-gray-800 rounded-lg p-6 text-white">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <Loader2 size={48} className="animate-spin text-blue-500" />
            <p className="text-gray-400">Loading subscription details...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 text-white space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-gray-700 pb-4">
        <div className="flex items-center gap-3">
          <Crown size={24} className="text-yellow-400" />
          <h2 className="text-xl font-bold">Subscription Management</h2>
        </div>
        <button
          onClick={handleRefreshSubscription}
          disabled={refreshing}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors text-sm"
        >
          <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {/* Subscription Status */}
      {isPremium && subscription ? (
        <div className="space-y-4">
          {/* Current Plan */}
          <div className="bg-gray-700 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-lg">Current Plan</h3>
              <div className="flex items-center gap-2">
                {getStatusIcon(subscription.status)}
                <span className="text-sm">{getStatusText(subscription.status)}</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-2xl font-bold text-purple-400 mb-1">
                  {subscription.plan_name}
                </div>
                <div className="text-gray-400 text-sm">
                  {currentPlan && (
                    <>
                      ${currentPlan.price}/{currentPlan.interval_type}
                    </>
                  )}
                </div>
              </div>
              
              <div className="text-right md:text-left">
                <div className="text-sm text-gray-400 mb-1">Next billing date</div>
                <div className="font-medium">
                  {formatDate(subscription.current_period_end)}
                </div>
                {subscription.cancel_at_period_end && (
                  <div className="text-sm text-yellow-400 mt-1">
                    Cancels at period end
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Plan Features */}
          {currentPlan?.features && (
            <div className="bg-gray-700 rounded-lg p-4">
              <h4 className="font-semibold mb-3">Your Premium Features</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                {Object.entries(currentPlan.features as Record<string, boolean>).map(([feature, enabled]) => 
                  enabled && (
                    <div key={feature} className="flex items-center gap-2">
                      <CheckCircle size={14} className="text-green-400" />
                      <span className="capitalize">
                        {feature.replace(/_/g, ' ')}
                      </span>
                    </div>
                  )
                )}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={openCustomerPortal}
              className="flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md transition-colors"
            >
              <Settings size={18} />
              Manage Billing
            </button>
            
            {subscription.status === 'active' && !subscription.cancel_at_period_end && (
              <button
                onClick={() => setShowCancelDialog(true)}
                className="flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white py-2 px-4 rounded-md transition-colors"
              >
                <XCircle size={18} />
                Cancel Subscription
              </button>
            )}
          </div>

          {/* Billing Information */}
          <div className="bg-gray-700 rounded-lg p-4">
            <h4 className="font-semibold mb-3 flex items-center gap-2">
              <CreditCard size={18} />
              Billing Information
            </h4>
            <div className="text-sm text-gray-300 space-y-1">
              <div>Subscription ID: {subscription.subscription_id}</div>
              <div>Started: {formatDate(subscription.current_period_start)}</div>
              <div>
                All billing is securely handled by 
                <a 
                  href="https://stripe.com" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-400 hover:text-blue-300 ml-1 inline-flex items-center gap-1"
                >
                  Stripe
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* No Premium Subscription */
        <div className="text-center py-8">
          <Crown size={48} className="mx-auto text-gray-500 mb-4" />
          <h3 className="text-xl font-semibold mb-2">No Premium Subscription</h3>
          <p className="text-gray-400 mb-6">
            You're currently using the free version of MemeForge. Upgrade to Premium to unlock exclusive features!
          </p>
          <button 
            onClick={() => {
              // This would open the premium features modal or navigate to pricing
              console.log('Navigate to premium features');
            }}
            className="bg-purple-600 hover:bg-purple-700 text-white py-3 px-6 rounded-md transition-colors"
          >
            View Premium Features
          </button>
        </div>
      )}

      {/* Cancel Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-gray-800 rounded-lg shadow-xl w-full max-w-md border border-gray-700">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <AlertTriangle size={24} className="text-yellow-400" />
                <h3 className="text-lg font-semibold">Cancel Subscription</h3>
              </div>
              
              <p className="text-gray-300 mb-6">
                Are you sure you want to cancel your subscription? You'll lose access to all premium features at the end of your current billing period ({formatDate(subscription?.current_period_end || '')}).
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={canceling}
                  className="flex-1 bg-gray-600 hover:bg-gray-500 disabled:bg-gray-700 text-white py-2 px-4 rounded-md transition-colors"
                >
                  Keep Subscription
                </button>
                <button
                  onClick={handleCancelSubscription}
                  disabled={canceling}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:bg-red-800 disabled:cursor-not-allowed text-white py-2 px-4 rounded-md transition-colors flex items-center justify-center gap-2"
                >
                  {canceling ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Canceling...
                    </>
                  ) : (
                    'Yes, Cancel'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionManager;