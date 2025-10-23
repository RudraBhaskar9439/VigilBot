import React, { useState } from 'react';

export default function ProfilePage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('');
  const [wallet, setWallet] = useState('');

  return (
    <div className="min-h-screen bg-[#0a1628] text-white flex flex-col items-center justify-center px-4">
      <div className="max-w-md w-full bg-[#1a2942] rounded-xl p-8 shadow">
        <h1 className="text-2xl font-bold mb-6">Profile</h1>
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Full Name</label>
          <input type="text" className="w-full px-4 py-2 rounded bg-slate-900 text-white" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Enter your full name" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Email</label>
          <input type="email" className="w-full px-4 py-2 rounded bg-slate-900 text-white" value={email} onChange={e => setEmail(e.target.value)} placeholder="Enter your email" />
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Gender</label>
          <select className="w-full px-4 py-2 rounded bg-slate-900 text-white" value={gender} onChange={e => setGender(e.target.value)}>
            <option value="">Select</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="other">Other</option>
            <option value="prefer_not_to_say">Prefer not to say</option>
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-gray-300 mb-1">Wallet Address</label>
          <input type="text" className="w-full px-4 py-2 rounded bg-slate-900 text-white" value={wallet} onChange={e => setWallet(e.target.value)} placeholder="0x..." />
        </div>
        <button className="w-full bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-2 px-4 rounded mt-4">Save Profile</button>
      </div>
    </div>
  );
}
