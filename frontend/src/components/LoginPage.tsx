// In src/components/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom'; // Added Link for the signup button
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// We get the backend URL from the environment variables now
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useApp();
    const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

    // State for the forms
    const [customerEmail, setCustomerEmail] = useState('');
    const [customerPassword, setCustomerPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Agent voice login logic
    useEffect(() => {
        if (!isListening && transcript) {
            const agentName = transcript.trim();
            if (agentName) {
                const agentUser = {
                    name: agentName,
                    email: `${agentName.toLowerCase().replace(/\s/g, '')}@vibank.agent`,
                    role: 'agent' as const,
                };
                login(agentUser);
                navigate('/agent-dashboard');
            }
            resetTranscript();
        }
    }, [isListening, transcript, login, navigate, resetTranscript]);

    // Real Customer Login Handler
    const handleCustomerLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const response = await axios.post(`${BACKEND_API_URL}/api/auth/login`, {
                email: customerEmail,
                password: customerPassword,
            });

            const { user } = response.data;

            if (user.role !== 'customer') {
                setError('This login is for customers only.');
                setIsLoading(false);
                return;
            }

            login(user);
            navigate('/customer-dashboard');

        } catch (err: any) {
            setError(err.response?.data?.msg || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };

    // Spacebar listener for voice login
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.code === 'Space' && !isListening) {
                e.preventDefault();
                startListening();
            }
        };
        const handleKeyUp = (e: KeyboardEvent) => {
            if (e.code === 'Space' && isListening) {
                stopListening();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [isListening, startListening, stopListening]);

    // This is the UI that gets rendered to the screen
    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            
            <header className="text-center mb-10">
                <h1 className="text-5xl font-bold">VIBank</h1>
                <p className="text-xl text-gray-300 mt-2">Accessible Banking Platform</p>
            </header>

            {/* Display error messages in a single, central place */}
            {error && <div className="mb-4 p-3 bg-red-900/80 border border-red-700 text-red-300 rounded-lg">{error}</div>}

            <div className="w-full max-w-4xl flex flex-col items-center gap-8">
                {/* Customer Login Card */}
                <div className="w-full max-w-md bg-blue-900/50 backdrop-blur-sm p-8 rounded-2xl border border-blue-700">
                    
                    {/* The form for customer login */}
                    <form onSubmit={handleCustomerLogin}>
                        <div className="text-center mb-6">
                            <span className="text-5xl text-green-400">👥</span>
                            <h2 className="text-3xl font-bold mt-2">Customer Login</h2>
                        </div>
                        <div className="mb-4">
                            <label className="block mb-1">Email</label>
                            <input 
                                type="email"
                                value={customerEmail}
                                onChange={(e) => setCustomerEmail(e.target.value)}
                                required 
                                className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" 
                            />
                        </div>
                        <div className="mb-6">
                            <label className="block mb-1">Password</label>
                            <input 
                                type="password"
                                value={customerPassword}
                                onChange={(e) => setCustomerPassword(e.target.value)}
                                required 
                                className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" 
                            />
                        </div>
                        <button 
                            type="submit" 
                            disabled={isLoading}
                            className="w-full p-3 bg-green-600 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Verifying...' : 'Login as Customer'} 
                        </button>
                    </form>
                </div>

                {/* Agent Voice Login Section */}
                <div className="w-full max-w-md text-center p-6 rounded-2xl border-dashed border-2 border-yellow-500">
                    <h2 className="text-2xl font-bold">Agent Voice Login</h2>
                    <p className="text-yellow-300 mt-2">Hold <kbd className="px-2 py-1.5 text-xs font-semibold text-gray-800 bg-gray-100 border rounded-lg">Spacebar</kbd> and say your name.</p>
                    <div className="mt-4 text-5xl">
                        <span className={isListening ? 'animate-pulse' : ''}>🎙️</span>
                    </div>
                </div>
            </div>
            
            <p className="mt-8 text-center text-gray-300">
                New Customer? <Link to="/signup" className="font-semibold text-green-400 hover:underline">Create an Account</Link>
            </p>
        </div>
    );
};

export default LoginPage;