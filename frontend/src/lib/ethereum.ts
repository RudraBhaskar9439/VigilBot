import { BrowserProvider, parseEther, formatEther } from 'ethers';

declare global {
  interface Window {
    ethereum?: any;
  }
}

export const PAYMENT_ADDRESS = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0';

export class EthereumService {
  private provider: BrowserProvider | null = null;

  async connectWallet(): Promise<string> {
    if (!window.ethereum) {
      throw new Error('MetaMask is not installed. Please install MetaMask to continue.');
    }

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      this.provider = provider;
      return accounts[0];
    } catch (error: any) {
      if (error.code === 4001) {
        throw new Error('Please connect to MetaMask.');
      }
      throw new Error('Failed to connect wallet: ' + error.message);
    }
  }

  async getConnectedAccount(): Promise<string | null> {
    if (!window.ethereum) return null;

    try {
      const provider = new BrowserProvider(window.ethereum);
      const accounts = await provider.send('eth_accounts', []);
      this.provider = provider;
      return accounts[0] || null;
    } catch {
      return null;
    }
  }

  async sendPayment(amountInEth: string): Promise<string> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const signer = await this.provider.getSigner();
      const tx = await signer.sendTransaction({
        to: PAYMENT_ADDRESS,
        value: parseEther(amountInEth),
      });

      return tx.hash;
    } catch (error: any) {
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction was rejected by user');
      }
      throw new Error('Payment failed: ' + error.message);
    }
  }

  async waitForTransaction(txHash: string): Promise<boolean> {
    if (!this.provider) {
      throw new Error('Wallet not connected');
    }

    try {
      const receipt = await this.provider.waitForTransaction(txHash);
      return receipt?.status === 1;
    } catch (error) {
      throw new Error('Transaction confirmation failed');
    }
  }

  formatEth(wei: string): string {
    return formatEther(wei);
  }

  parseEth(eth: string): bigint {
    return parseEther(eth).toBigInt();
  }
}

export const ethereumService = new EthereumService();
