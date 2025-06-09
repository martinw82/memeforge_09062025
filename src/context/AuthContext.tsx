import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, supabaseHelpers } from '../utils/supabase';
import { AuthUser } from '../types/supabase';

type AuthContextType = {
  user: AuthUser | null;
  session: Session | null;
  isLoading: boolean;
  signUp: (email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('Error getting session:', error);
        } else {
          setSession(session);
          setUser(session?.user ? {
            id: session.user.id,
            email: session.user.email,
            created_at: session.user.created_at,
          } : null);
        }
      } catch (error) {
        console.error('Error in getSession:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email);
        
        setSession(session);
        setUser(session?.user ? {
          id: session.user.id,
          email: session.user.email,
          created_at: session.user.created_at,
        } : null);
        
        if (event === 'SIGNED_OUT') {
          setUser(null);
          setSession(null);
        }
        
        setIsLoading(false);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseHelpers.signUp(email, password);
      
      if (error) {
        console.error('Sign up error:', error);
        return { error: error.message };
      }

      if (data.user && !data.session) {
        return { 
          error: 'Please check your email and click the confirmation link to complete your registration.' 
        };
      }

      return {};
    } catch (error) {
      console.error('Sign up error:', error);
      return { error: 'An unexpected error occurred during sign up.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      const { data, error } = await supabaseHelpers.signIn(email, password);
      
      if (error) {
        console.error('Sign in error:', error);
        return { error: error.message };
      }

      return {};
    } catch (error) {
      console.error('Sign in error:', error);
      return { error: 'An unexpected error occurred during sign in.' };
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = async () => {
    try {
      setIsLoading(true);
      const { error } = await supabaseHelpers.signOut();
      if (error) {
        console.error('Sign out error:', error);
      }
    } catch (error) {
      console.error('Sign out error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    isLoading,
    signUp,
    signIn,
    signOut,
    isAuthenticated: !!user,
  };

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};