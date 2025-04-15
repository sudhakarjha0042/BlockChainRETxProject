import { useState, useEffect } from 'react';
import { user } from '../lib/gun-config';

export function useAuth() {
  const [username, setUsername] = useState<string | null>(null);

  useEffect(() => {
    user.get('alias').on(v => setUsername(v));
  }, []);

  const signUp = (username: string, password: string) => {
    return new Promise((resolve, reject) => {
      user.create(username, password, (ack) => {
        if ('err' in ack) {
          reject(ack.err);
        } else {
          resolve(ack);
        }
      });
    });
  };

  const signIn = (username: string, password: string) => {
    return new Promise((resolve, reject) => {
      user.auth(username, password, (ack) => {
        if ('err' in ack) {
          reject(ack.err);
        } else {
          resolve(ack);
        }
      });
    });
  };

  const signOut = () => {
    return new Promise((resolve) => {
      user.leave();
      resolve(true);
    });
  };

  return { username, signUp, signIn, signOut };
}

