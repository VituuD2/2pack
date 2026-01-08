import React, { useState } from 'react';
import { supabase } from '@/services/supabaseClient';
import { AuroraBackground } from '@/components/AuroraBackground';

const LoginScreen: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAuthAction = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage("Sign up successful! Please check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        // Session update will be handled by the main App component
      }
    } catch (error: any) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative w-full h-screen flex items-center justify-center">
      <AuroraBackground />
      <div className="relative z-10 flex flex-col items-center w-full max-w-md p-8 m-4 bg-black/40 glass-panel-border rounded-2xl">
        <h2 className="text-3xl font-bold mb-6 text-white">{isSignUp ? 'Create Account' : '2Pack Login'}</h2>
        
        {message ? (
          <p className="p-4 text-center text-green-300 bg-green-500/10 rounded-lg">{message}</p>
        ) : (
          <form onSubmit={handleAuthAction} className="w-full flex flex-col gap-4">
            <input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 rounded-lg border border-white/20 focus:ring-2 focus:ring-[var(--aurora-1)] focus:outline-none"
              required
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 bg-white/10 rounded-lg border border-white/20 focus:ring-2 focus:ring-[var(--aurora-1)] focus:outline-none"
              required
            />
            <button 
              type="submit"
              disabled={loading}
              className="w-full px-4 py-3 mt-4 font-bold text-white bg-gradient-to-r from-[var(--aurora-1)] to-[var(--aurora-2)] rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              {loading ? 'Processing...' : (isSignUp ? 'Sign Up' : 'Login')}
            </button>
            {error && <p className="mt-4 text-center text-red-400">{error}</p>}
          </form>
        )}

        <button 
          onClick={() => {
            setIsSignUp(!isSignUp);
            setError(null);
            setMessage(null);
          }}
          className="mt-6 text-sm text-[var(--text-secondary)] hover:text-white"
        >
          {isSignUp ? 'Already have an account? Login' : "Don\'t have an account? Sign Up"}
        </button>
      </div>
    </div>
  );
};

export default LoginScreen;
