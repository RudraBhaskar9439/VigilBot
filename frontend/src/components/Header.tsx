import { FC } from 'react';
import { Link } from 'react-router-dom';

const Header: FC = () => {
  return (
    <header className="bg-[#0a1628] border-b border-[#1a2942] py-4 px-8 flex items-center justify-between">
      <div className="flex items-center gap-4">
        <Link to="/" className="text-xl font-bold text-cyan-400">VigilBot</Link>
      </div>
      <nav className="flex items-center gap-6">
        <Link to="/dashboard" className="text-gray-300 hover:text-cyan-400 font-medium">Dashboard</Link>
        <Link to="/profile" className="text-gray-300 hover:text-cyan-400 font-medium">Profile</Link>
        <Link to="/settings" className="text-gray-300 hover:text-cyan-400 font-medium">Settings</Link>
        <Link to="/payment" className="text-gray-300 hover:text-cyan-400 font-medium">Pricing</Link>
      </nav>
    </header>
  );
};

export default Header;
