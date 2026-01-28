'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';

export default function SignupPage() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            const baseUrl = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://quickshow-jsj1.onrender.com';
            const response = await fetch(`${baseUrl}/api/auth/signup`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Signup failed');
            }

            login(data.token, data.user);
            router.push('/');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-white text-black p-4">
            <Card className="w-full max-w-md border-black border-2 shadow-none rounded-none">
                <CardHeader className="space-y-1">
                    <CardTitle className="text-3xl font-bold tracking-tighter uppercase">Sign Up</CardTitle>
                    <CardDescription className="text-gray-500 uppercase text-xs tracking-widest">
                        Create an account to start drawing
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="name" className="uppercase text-xs font-bold tracking-wider">Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="John Doe"
                                required
                                className="rounded-none border-black border-2 focus:ring-0 focus-visible:ring-0 focus:border-gray-500 transition-colors"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="email" className="uppercase text-xs font-bold tracking-wider">Email</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                required
                                className="rounded-none border-black border-2 focus:ring-0 focus-visible:ring-0 focus:border-gray-500 transition-colors"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password" id="pass-label" className="uppercase text-xs font-bold tracking-wider">Password</Label>
                            <Input
                                id="password"
                                type="password"
                                required
                                className="rounded-none border-black border-2 focus:ring-0 focus-visible:ring-0 focus:border-gray-500 transition-colors"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                        </div>
                        {error && <p className="text-red-600 text-xs font-bold uppercase">{error}</p>}
                        <Button
                            type="submit"
                            disabled={isLoading}
                            className="w-full rounded-none bg-black text-white hover:bg-gray-800 font-bold uppercase tracking-widest py-6"
                        >
                            {isLoading ? 'Processing...' : 'Create Account'}
                        </Button>
                    </form>
                </CardContent>
                <CardFooter className="flex justify-center border-t border-black mt-6 pt-6">
                    <p className="text-sm uppercase tracking-wider">
                        Already have an account?{' '}
                        <Link href="/login" className="font-bold underline hover:text-gray-600">
                            Login
                        </Link>
                    </p>
                </CardFooter>
            </Card>
        </div>
    );
}
