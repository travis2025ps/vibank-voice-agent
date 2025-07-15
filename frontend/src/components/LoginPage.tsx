// In src/components/LoginPage.tsx

import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';

// We get the backend URL from the environment variables now
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useApp();
    const { isListening, transcript, startListening, stopListening, resetTranscript } = useSpeechRecognition();

    const [customerEmail,setCustomerEmail] = useState('');
    const [customerPassword,setCustomerPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    // Agent voice login logic remains the same (as it's a demo feature)
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

    // --- THIS IS THE FIX: Real Customer Login Handler ---
    const handleCustomerLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Make a REAL API call to your deployed backend
            const response = await axios.post(`${BACKEND_API_URL}/api/auth/login`, {
                email: customerEmail,
                password: customerPassword,
            });

            // The backend returns the user object on success
            const { user } = response.data;

            // Double-check the role before logging in
            if (user.role !== 'customer') {
                setError('This login is for customers only.');
                setIsLoading(false);
                return;
            }

            // If successful, call the login function from context
            login(user);
            navigate('/customer-dashboard');

        } catch (err: any) {
            // If the backend returns an error (400 Invalid Credentials), display it
            setError(err.response?.data?.msg || 'Login failed. Please check your credentials.');
        } finally {
            setIsLoading(false);
        }
    };
    // ----------------------------------------------------

    // Spacebar listener for voice login
    useEffect(() => { /* ... same as before ... */ }, [isListening, startListening, stopListening]);

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 text-white p-4">
            {/* ... rest of your JSX ... */}
            {/* ADD an error display message */}
            {error && <p className="text-red-400 text-center mb-4 bg-red-900/50 p-2 rounded-lg">{error}</p>}
            // In LoginPage.tsx, inside the return(...) statement

<form onSubmit={handleCustomerLogin}>
    {/* ... other div and h2 tags ... */}
    
    <div className="mb-4">
        <label className="block mb-1">Email</label>
        {/* --- THIS IS THE FIX --- */}
        {/* We connect the input to the state */}
        <input 
            type="email"
            value={customerEmail}  // Display the current state value in the box
            onChange={(e) => setCustomerEmail(e.target.value)} // When user types, call the update function
            required 
            className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" 
        />
        {/* -------------------- */}
    </div>
    
    <div className="mb-6">
        <label className="block mb-1">Password</label>
        {/* --- THIS IS THE FIX --- */}
        {/* We do the same for the password input */}
        <input 
            type="password"
            value={customerPassword} // Display the current state value
            onChange={(e) => setCustomerPassword(e.target.value)} // Call the update function
            required 
            className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600" 
        />
        {/* -------------------- */}
    </div>

    <button 
        type="submit" 
        disabled={isLoading}  // The button is disabled if isLoading is true
        className="w-full p-3 bg-green-600 rounded-lg font-bold disabled:opacity-50 disabled:cursor-not-allowed"
    >
        {isLoading ? 'Verifying...' : 'Login as Customer'} 
        {/* The text changes based on the isLoading state */}
    </button>
</form>
            {/* ... rest of your JSX ... */}
        </div>
    );
};

export default LoginPage;