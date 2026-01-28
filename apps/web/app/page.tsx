'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Canvas } from '../canvas/Canvas';
import { useAuth } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { nanoid } from 'nanoid';

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [roomId, setRoomId] = useState<string | null>(null);
  const [inputRoomId, setInputRoomId] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  const handleCreateRoom = () => {
    const newRoomId = nanoid(10);
    setRoomId(newRoomId);
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputRoomId.trim()) {
      setRoomId(inputRoomId.trim());
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-white">
        <p className="uppercase tracking-[0.2em] font-bold animate-pulse">Initializing...</p>
      </div>
    );
  }

  if (!user) return null;

  if (!roomId) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <Card className="w-full max-w-md border-black border-2 shadow-none rounded-none bg-white">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tighter uppercase">Collaborative Canvas</CardTitle>
            <CardDescription className="text-gray-500 uppercase text-xs tracking-widest">
              Create a new room or join an existing one
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Button
              onClick={handleCreateRoom}
              className="w-full rounded-none bg-black text-white hover:bg-gray-800 font-bold uppercase tracking-widest py-6"
            >
              Create New Room
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500 font-bold">Or Join Existing</span>
              </div>
            </div>

            <form onSubmit={handleJoinRoom} className="space-y-3">
              <Input
                placeholder="Enter Room ID"
                value={inputRoomId}
                onChange={(e) => setInputRoomId(e.target.value)}
                className="rounded-none border-black border-2 focus:ring-0 focus-visible:ring-0 focus:border-gray-500"
              />
              <Button
                type="submit"
                variant="outline"
                className="w-full rounded-none border-black border-2 font-bold uppercase tracking-widest"
              >
                Join Room
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <main className="fixed inset-0 w-screen h-screen">
      <Canvas roomId={roomId} />
      <button
        onClick={() => setRoomId(null)}
        className="absolute bottom-6 left-6 px-4 py-2 bg-white border-2 border-black font-bold uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-colors z-20 shadow-lg"
      >
        Exit Room
      </button>
    </main>
  );
}
