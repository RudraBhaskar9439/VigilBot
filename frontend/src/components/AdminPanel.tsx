import React, { useState } from 'react';
import { Flag, ShieldOff, Power, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AdminPanel() {
  const [unflagAddress, setUnflagAddress] = useState('');
  const [proofMode, setProofMode] = useState(true);
  const [loading, setLoading] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleFlagPendingBots = async () => {
    setLoading('flag');
    setMessage(null);

    try {
      const { data: pendingBots, error } = await supabase
        .from('bots')
        .select('*')
        .eq('is_flagged', false);

      if (error) throw error;

      if (!pendingBots || pendingBots.length === 0) {
        setMessage({ type: 'success', text: 'No pending bots to flag' });
        return;
      }

      const updates = pendingBots.map((bot) => ({
        id: bot.id,
        is_flagged: true,
      }));

      const { error: updateError } = await supabase
        .from('bots')
        .upsert(updates);

      if (updateError) throw updateError;

      setMessage({
        type: 'success',
        text: `Successfully flagged ${pendingBots.length} bot(s)`,
      });
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to flag bots' });
    } finally {
      setLoading(null);
    }
  };

  const handleUnflagBot = async () => {
    if (!unflagAddress) {
      setMessage({ type: 'error', text: 'Please enter a wallet address' });
      return;
    }

    setLoading('unflag');
    setMessage(null);

    try {
      const { data: bot, error: fetchError } = await supabase
        .from('bots')
        .select('*')
        .eq('address', unflagAddress.toLowerCase())
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (!bot) {
        setMessage({ type: 'error', text: 'Bot not found' });
        return;
      }

      const { error: updateError } = await supabase
        .from('bots')
        .update({ is_flagged: false })
        .eq('id', bot.id);

      if (updateError) throw updateError;

      setMessage({ type: 'success', text: 'Bot successfully unflagged' });
      setUnflagAddress('');
    } catch (error: any) {
      setMessage({ type: 'error', text: error.message || 'Failed to unflag bot' });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur border border-slate-800 rounded-xl p-6">
      <h3 className="text-xl font-bold text-white mb-6">Admin Actions</h3>

      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === 'success'
              ? 'bg-green-500/10 border border-green-500/50 text-green-400'
              : 'bg-red-500/10 border border-red-500/50 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-slate-400 text-sm font-semibold mb-3">
            Batch Flag Pending Bots
          </label>
          <button
            onClick={handleFlagPendingBots}
            disabled={loading !== null}
            className="w-full px-6 py-3 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading === 'flag' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Flagging Bots...
              </>
            ) : (
              <>
                <Flag className="w-5 h-5" />
                Flag Pending Bots
              </>
            )}
          </button>
          <p className="text-slate-500 text-xs mt-2">
            This will flag all detected bots that are currently pending review
          </p>
        </div>

        <div>
          <label className="block text-slate-400 text-sm font-semibold mb-3">
            Unflag Bot
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              value={unflagAddress}
              onChange={(e) => setUnflagAddress(e.target.value)}
              placeholder="Enter wallet address (0x...)"
              className="flex-1 px-4 py-3 bg-slate-800 border border-slate-700 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleUnflagBot}
              disabled={loading !== null || !unflagAddress}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {loading === 'unflag' ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Unflagging...
                </>
              ) : (
                <>
                  <ShieldOff className="w-5 h-5" />
                  Unflag
                </>
              )}
            </button>
          </div>
          <p className="text-slate-500 text-xs mt-2">
            Remove a bot from the flagged list if it was incorrectly identified
          </p>
        </div>

        <div>
          <label className="block text-slate-400 text-sm font-semibold mb-3">
            Pyth Proof Mode
          </label>
          <div className="flex items-center justify-between p-4 bg-slate-800 rounded-lg">
            <div>
              <p className="text-white font-semibold">
                {proofMode ? 'Enabled' : 'Disabled'}
              </p>
              <p className="text-slate-500 text-xs mt-1">
                {proofMode
                  ? 'Flagging with Pyth price proofs (higher gas, more secure)'
                  : 'Flagging without proofs (lower gas, less secure)'}
              </p>
            </div>
            <button
              onClick={() => setProofMode(!proofMode)}
              className={`relative inline-flex h-10 w-20 items-center rounded-full transition-colors ${
                proofMode ? 'bg-cyan-500' : 'bg-slate-600'
              }`}
            >
              <span
                className={`inline-block h-8 w-8 transform rounded-full bg-white transition-transform ${
                  proofMode ? 'translate-x-11' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
