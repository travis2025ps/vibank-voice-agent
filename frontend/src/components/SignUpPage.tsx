// In src/components/SignUpPage.tsx

import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';

// We get the backend URL from the environment variables
const BACKEND_API_URL = import.meta.env.VITE_BACKEND_API_URL || 'http://localhost:8000';

const SignUpPage: React.FC = () => {
    const navigate = useNavigate();
    const { login } = useApp();

    // --- THIS IS THE FIX ---
    // We need to create state variables to hold the input from the form fields.
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    // -------------------------

    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSignUp = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // Now the 'name', 'email', and 'password' variables exist and can be sent to the backend.
            const response = await axios.post(`${BACKEND_API_URL}/api/auth/register`, {
                name,
                email,
                password,
                role: 'customer' // All public signups are customers
            });

            // Log the user in immediately after successful registration
            login(response.data.user);
            navigate('/customer-dashboard');

        } catch (err: any) {
            // If the backend returns an error (e.g., "User already exists"), display it
            setError(err.response?.data?.msg || 'Could not create account. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-900 text-white">
            <div className="w-full max-w-md bg-blue-900/50 backdrop-blur-sm p-8 rounded-2xl border border-blue-700">
                <form onSubmit={handleSignUp}>
                    <div className="text-center mb-6">
                        <span className="text-5xl text-green-400">📝</span>
                        <h2 className="text-3xl font-bold mt-2">Create Customer Account</h2>
                    </div>
                    {/* Input field for Name */}
                    <div className="mb-4">
                        <label className="block mb-1">Full Name</label>
                        <input 
                            type="text" 
                            value={name} 
                            onChange={(e) => setName(e.target.value)} 
                            required 
                            className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400" 
                        />
                    </div>
                    {/* Input field for Email */}
                    <div className="mb-4">
                        <label className="block mb-1">Email</label>
                        <input 
                            type="email" 
                            value={email} 
                            onChange={(e) => setEmail(e.target.value)} 
                            required 
                            className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400" 
                        />
                    </div>
                    {/* Input field for Password */}
                    <div className="mb-6">
                        <label className="block mb-1">Password</label>
                        <input 
                            type="password" 
                            value={password} 
                            onChange={(e) => setPassword(e.target.value)} 
                            required 
                            className="w-full p-3 bg-gray-700 rounded-lg border border-gray-600 focus:outline-none focus:ring-2 focus:ring-green-400" 
                        />
                    </div>
                    {/* Display error messages */}
                    {error && <p className="text-red-400 text-center mb-4">{error}</p>}
                    <button type="submit" disabled={isLoading} className="w-full p-3 bg-green-600 rounded-lg font-bold hover:bg-green-700 transition-colors disabled:opacity-50">
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>
                    <p className="mt-4 text-center text-gray-400">
                        Already have an account? <Link to="/login" className="font-semibold text-green-300 hover:underline">Log In</Link>
                    </p>
                </form>
            </div>
        </div>
    );
};

export default SignUpPage;