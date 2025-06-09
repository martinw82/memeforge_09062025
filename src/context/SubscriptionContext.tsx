import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { supabaseHelpers } from '../utils/supabase';
import { trackEvent } from '../utils/analytics';
import { Plan, UserSubscriptionInfo, PlanFeatures } from '../types/supabase';

interface SubscriptionContextType {
  isPremium: boolean;
  isLoading: boolean;
  subscription: UserSubscriptionInfo | null;
  plans: Plan[];
  features: PlanFeatures;
  checkPremiumStatus: () => Promise<void>;
  initializeCheckout: (planId: string) => Promise<string | null>;
  cancelSubscription: () => Promise<boolean>;
  refreshSubscription: () => Promise<void>;
}

const SubscriptionContext = createContext<SubscriptionContextType | undefined>(undefined);

const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';

export const SubscriptionProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [isPremium, setIsPremium] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<UserSubscriptionInfo | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [features, setFeatures] = useState<PlanFeatures>({});

  useEffect(() => {
    if (isAuthenticated && user) {
      initializeSubscription();
    } else {
      resetSubscriptionState();
    }
  }, [isAuthenticated, user]);

  const resetSubscriptionState = () => {
    setIsPremium(false);
    setSubscription(null);
    setFeatures({});
    setIsLoading(false);
  };

  const initializeSubscription = async () => {
    setIsLoading(true);
    try {
      await Promise.all([
        loadPlans(),
        checkPremiumStatus(),
      ]);
    } catch (error) {
      console.error('Failed to initialize subscription:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadPlans = async () => {
    try {
      const { data, error } = await supabaseHelpers.getPlans();
      if (error) {
        console.error('Error loading plans:', error);
        return;
      }
      setPlans(data || []);
    } catch (error) {
      console.error('Error loading plans:', error);
    }
  };

  const checkPremiumStatus = async () => {
    if (!user) return;

    try {
      // Check if user is premium using database function
      const { data: isPremiumData, error: premiumError } = await supabaseHelpers.checkUserPremium(user.id);
      
      if (premiumError) {
        console.error('Error checking premium status:', premiumError);
        return;
      }

      setIsPremium(isPremiumData || false);

      // Get detailed subscription info
      const { data: subscriptionData, error: subscriptionError } = await supabaseHelpers.getUserSubscription(user.id);
      
      if (subscriptionError) {
        console.error('Error getting subscription:', subscriptionError);
        return;
      }

      if (subscriptionData && subscriptionData.length > 0) {
        const sub = subscriptionData[0];
        setSubscription(sub);

        // Get plan features
        const plan = plans.find(p => p.id === sub.plan_id);
        if (plan && plan.features) {
          setFeatures(plan.features as PlanFeatures);
        }
      } else {
        setSubscription(null);
        setFeatures({});
      }
    } catch (error) {
      console.error('Error checking premium status:', error);
    }
  };

  const initializeCheckout = async (planId: string): Promise<string | null> => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    try {
      setIsLoading(true);

      // Track subscription attempt
      await trackEvent('subscription_checkout_attempt', {
        plan_id: planId,
        user_id: user.id,
      });

      // Create checkout session
      const { data, error } = await supabaseHelpers.createCheckoutSession(planId);
      
      if (error) {
        await trackEvent('subscription_checkout_failed', {
          plan_id: planId,
          error_message: error.message,
        });
        throw new Error(error.message);
      }

      if (!data?.checkout_url) {
        throw new Error('No checkout URL returned');
      }

      await trackEvent('subscription_checkout_redirected', {
        plan_id: planId,
        checkout_url: data.checkout_url,
      });

      return data.checkout_url;
    } catch (error) {
      console.error('Error initializing checkout:', error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const cancelSubscription = async (): Promise<boolean> => {
    if (!subscription) return false;

    try {
      setIsLoading(true);

      // Track cancellation attempt
      await trackEvent('subscription_cancel_attempt', {
        subscription_id: subscription.subscription_id,
        plan_id: subscription.plan_id,
      });

      const { error } = await supabaseHelpers.cancelSubscription(subscription.subscription_id);
      
      if (error) {
        await trackEvent('subscription_cancel_failed', {
          subscription_id: subscription.subscription_id,
          error_message: error.message,
        });
        throw new Error(error.message);
      }

      await trackEvent('subscription_cancelled', {
        subscription_id: subscription.subscription_id,
        plan_id: subscription.plan_id,
      });

      // Refresh subscription status
      await checkPremiumStatus();
      return true;
    } catch (error) {
      console.error('Error canceling subscription:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSubscription = async () => {
    await checkPremiumStatus();
  };

  const contextValue: SubscriptionContextType = {
    isPremium,
    isLoading,
    subscription,
    plans,
    features,
    checkPremiumStatus,
    initializeCheckout,
    cancelSubscription,
    refreshSubscription,
  };

  return (
    <SubscriptionContext.Provider value={contextValue}>
      {children}
    </SubscriptionContext.Provider>
  );
};

export const useSubscription = () => {
  const context = useContext(SubscriptionContext);
  if (context === undefined) {
    throw new Error('useSubscription must be used within a SubscriptionProvider');
  }
  return context;
};