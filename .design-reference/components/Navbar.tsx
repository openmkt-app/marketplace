import React, { useState } from 'react';
import { Search, ShoppingBag, Sparkles, Menu, User, Bell } from 'lucide-react';
import { parseNaturalLanguageQuery } from '../services/geminiService';
import { AISearchResponse } from '../types';

interface NavbarProps {
  onSearch: (term: string) => void;
  onAISearchResult: (result: AISearchResponse) => void;
}

const Navbar: React.FC<NavbarProps> = ({ onSearch, onAISearchResult }) => {
  const [inputValue, setInputValue] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    // Determine if this looks like a natural language query (more than 3 words)
    // or if the user explicitly clicked an "AI" toggle (simplified here to auto-detect complexity)
    const isComplexQuery = inputValue.split(' ').length > 3 || inputValue.toLowerCase().includes('cheap') || inputValue.toLowerCase().includes('near');

    if (isComplexQuery && process.env.API_KEY) {
      setIsAiThinking(true);
      const aiResult = await parseNaturalLanguageQuery(inputValue);
      setIsAiThinking(false);
      
      if (aiResult) {
        onAISearchResult(aiResult);
        return;
      }
    }
    
    // Fallback to standard keyword search
    onSearch(inputValue);
  };

  return (
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          
          {/* Logo */}
          <div className="flex items-center gap-2 cursor-pointer group">
            <div className="bg-brand-500 text-white p-1.5 rounded-lg group-hover:rotate-12 transition-transform duration-300">
              <ShoppingBag size={24} strokeWidth={2.5} />
            </div>
            <span className="font-bold text-xl tracking-tight text-slate-900">
              AT <span className="text-brand-600">Market</span>
            </span>
          </div>

          {/* Search Bar */}
          <div className="flex-1 max-w-2xl mx-8 hidden md:block">
            <form onSubmit={handleSearch} className="relative group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                {isAiThinking ? (
                  <Sparkles className="h-5 w-5 text-brand-500 animate-pulse" />
                ) : (
                  <Search className="h-5 w-5 text-gray-400 group-focus-within:text-brand-500 transition-colors" />
                )}
              </div>
              <input
                type="text"
                className="block w-full pl-10 pr-3 py-2.5 border border-gray-200 rounded-full leading-5 bg-gray-50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 transition-all duration-300 shadow-sm"
                placeholder={isAiThinking ? "Asking Gemini..." : "Search for 'cheap gardening tools near New York'..."}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
              />
              <button 
                type="submit"
                className="absolute inset-y-1 right-1 bg-brand-600 text-white px-4 rounded-full text-sm font-medium hover:bg-brand-700 transition-colors shadow-sm"
              >
                Search
              </button>
            </form>
          </div>

          {/* Right Actions */}
          <div className="flex items-center space-x-2 sm:space-x-4">
            <button className="p-2 text-gray-500 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors hidden sm:block">
              <Bell size={20} />
            </button>
            <button className="hidden sm:flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-full hover:bg-slate-800 transition-colors shadow-md">
              <span className="text-sm font-medium">Sell Item</span>
            </button>
            <div className="h-8 w-8 rounded-full bg-gray-200 border-2 border-white shadow-sm overflow-hidden cursor-pointer hover:ring-2 hover:ring-brand-500 transition-all">
                <img src="https://picsum.photos/seed/user_me/100/100" alt="Me" />
            </div>
            <button className="md:hidden p-2 text-gray-600">
                <Menu size={24} />
            </button>
          </div>
        </div>
        
        {/* Mobile Search (visible only on small screens) */}
        <div className="md:hidden pb-4">
            <form onSubmit={handleSearch} className="relative">
                <input 
                    type="text" 
                    placeholder="Search..." 
                    className="w-full pl-4 pr-10 py-2 border border-gray-200 rounded-lg bg-gray-50 focus:outline-none focus:border-brand-500"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                />
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
                    <Search className="h-5 w-5 text-gray-400" />
                </div>
            </form>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;