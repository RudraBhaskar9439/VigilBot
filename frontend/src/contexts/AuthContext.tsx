import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, Subscription } from '../lib/supabase';
import { ethereumService } from '../lib/ethereum';

interface AuthContextType {
  walletAddress: string | null;
  subscription: Subscription | null;
  isLoading: boolean;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  hasActiveSubscription: boolean;
  checkSubscription: (address: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const checkSubscription = async (address: string) => {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('wallet_address', address.toLowerCase())
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const endDate = new Date(data.end_date);
        const isActive = data.is_active && endDate > new Date();
        setSubscription(isActive ? data : null);
      } else {
        setSubscription(null);
      }
    } catch (error) {
      console.error('Error checking subscription:', error);
      setSubscription(null);
    }
  };

  const connectWallet = async () => {
    try {
      setIsLoading(true);
      const address = await ethereumService.connectWallet();
      setWalletAddress(address);
      await checkSubscription(address);
    } catch (error: any) {
      console.error('Failed to connect wallet:', error);
      alert(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const disconnectWallet = () => {
    setWalletAddress(null);
    setSubscription(null);
  };

  useEffect(() => {
    const checkExistingConnection = async () => {
      try {
        const address = await ethereumService.getConnectedAccount();
        if (address) {
          setWalletAddress(address);
          await checkSubscription(address);
        }
      } catch (error) {
        console.error('Error checking existing connection:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingConnection();

    if (window.ethereum) {
      window.ethereum.on('accountsChanged', (accounts: string[]) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setWalletAddress(accounts[0]);
          checkSubscription(accounts[0]);
        }
      });

      window.ethereum.on('chainChanged', () => {
        window.location.reload();
      });
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
      }
    };
  }, []);

  const hasActiveSubscription = subscription !== null;

  return (
    <AuthContext.Provider
      value={{
        walletAddress,
        subscription,
        isLoading,
        connectWallet,
        disconnectWallet,
        hasActiveSubscription,
        checkSubscription,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
