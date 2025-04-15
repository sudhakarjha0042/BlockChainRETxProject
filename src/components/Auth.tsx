'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { SignUp } from './SignUp';
import { SignIn } from './SignIn';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from './ui';
import { useRouter } from 'next/navigation'; // Import useRouter for routing

export function Auth() {
  const { username, signOut } = useAuth();
  const [isSignUp, setIsSignUp] = useState(true);
  const router = useRouter(); // Initialize useRouter for navigation

  const toggleForm = () => setIsSignUp(!isSignUp);

  useEffect(() => {
    if (username) {
      // Redirect to the marketplace if signed in
      router.push('/marketplace');
    }
  }, [username, router]);

  return (
    <Card className="space-y-8 w-full max-w-md">
      <CardContent className="p-8">
        <div className="space-y-8 w-full max-w-md">
          {username ? (
            <div className="text-center">
              <p className="mb-4">Welcome, {username}!</p>
              <Button onClick={signOut}>Sign Out</Button>
            </div>
          ) : (
            <>
              <div>
                <h2 className="flex justify-center text-3xl font-bold mb-4 items-center">
                  {isSignUp ? 'Sign Up' : 'Sign In'}
                </h2>
                {isSignUp ? <SignUp /> : <SignIn />}
              </div>
              <div className="text-center">
                <Button variant="link" onClick={toggleForm}>
                  {isSignUp
                    ? 'Already have an account? Sign In'
                    : 'Need an account? Sign Up'}
                </Button>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
