/**
 * API Service for Backend Communication
 * Fetches real-time data from the Trading Bot Detection backend
 */

// Use relative URL to go through Vite proxy in development
// In production, set VITE_API_URL to your backend domain
const API_BASE_URL = import.meta.env.VITE_API_URL || '';

export interface PriceData {
  price: number;
  confidence: number;
  publishTime: number;
  timestamp: number;
}

export interface BotData {
  user: string;
  score: number;
  signals: string[];
  liquidityProvided?: number;
  riskLevel?: string;
  botType?: string;
  detectedAt: number;
}

export interface BotSummary {
  summary: {
    totalBots: number;
    goodBots: {
      count: number;
      totalLiquidity: number;
      typeDistribution: Record<string, number>;
    };
    badBots: {
      count: number;
      riskDistribution: {
        CRITICAL: number;
        HIGH: number;
        MEDIUM: number;
      };
    };
  };
  timestamp: number;
}

export interface BotStatistics {
  statistics: {
    total: {
      bots: number;
      good: number;
      bad: number;
    };
    goodBots: {
      marketMakers: number;
      arbitrageBots: number;
      totalLiquidity: number;
    };
    badBots: {
      critical: number;
      high: number;
      medium: number;
    };
    recentDetections: {
      last24h: number;
    };
  };
  timestamp: number;
}

export interface UserStatus {
  address: string;
  isBot: boolean;
  botScore: number;
  signals: string[];
  category?: string;
  riskLevel?: string;
}

export interface UserTrade {
  user: string;
  amount: string;
  timestamp: number;
  blockNumber: number;
}

/**
 * API Service Class
 */
export class ApiService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Generic fetch wrapper with error handling
   */
  private async fetchData<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error(`API Error (${endpoint}):`, error.message);
      throw new Error(`Failed to fetch data: ${error.message}`);
    }
  }

  /**
   * Get all latest prices from Pyth
   */
  async getAllPrices(): Promise<{ prices: Record<string, PriceData> }> {
    return this.fetchData('/api/analytics/prices');
  }

  /**
   * Get specific asset price
   */
  async getAssetPrice(asset: string): Promise<PriceData & { asset: string }> {
    return this.fetchData(`/api/analytics/prices/${asset}`);
  }

  /**
   * Get all detected bots (good and bad)
   */
  async getAllBots(): Promise<{ goodBots: BotData[]; badBots: BotData[]; total: number }> {
    return this.fetchData('/api/analytics/bots');
  }

  /**
   * Get good bots (Market Makers & Arbitrage)
   */
  async getGoodBots(): Promise<{ count: number; category: string; description: string; bots: BotData[] }> {
    return this.fetchData('/api/analytics/bots/good');
  }

  /**
   * Get bad bots (Manipulative & Front-running)
   */
  async getBadBots(): Promise<{ count: number; category: string; description: string; bots: BotData[] }> {
    return this.fetchData('/api/analytics/bots/bad');
  }

  /**
   * Get bot detection summary
   */
  async getBotSummary(): Promise<BotSummary> {
    return this.fetchData('/api/analytics/bots/summary');
  }

  /**
   * Get detailed bot statistics
   */
  async getBotStatistics(): Promise<BotStatistics> {
    return this.fetchData('/api/analytics/bots/statistics');
  }

  /**
   * Get pending bots (not yet flagged)
   */
  async getPendingBots(): Promise<{ count: number; bots: BotData[] }> {
    return this.fetchData('/api/analytics/bots/pending');
  }

  /**
   * Get user status (check if address is a bot)
   */
  async getUserStatus(address: string): Promise<UserStatus> {
    return this.fetchData(`/api/user/${address}/status`);
  }

  /**
   * Get user trades
   */
  async getUserTrades(address: string): Promise<{ trades: UserTrade[] }> {
    return this.fetchData(`/api/user/${address}/trades`);
  }

  /**
   * Get user analytics
   */
  async getUserAnalytics(address: string): Promise<any> {
    return this.fetchData(`/api/user/${address}/analytics`);
  }

  /**
   * Manually trigger batch flagging (admin only)
   */
  async flagBotsNow(): Promise<{ message: string; goodBots: number; badBots: number }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/analytics/bots/flag-now`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      return await response.json();
    } catch (error: any) {
      console.error('API Error (flag-now):', error.message);
      throw new Error(`Failed to flag bots: ${error.message}`);
    }
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ status: string; timestamp: string; services: any }> {
    return this.fetchData('/health');
  }
}

// Export singleton instance
export const apiService = new ApiService();

// Export default
export default apiService;
