'use client';

import { Button } from '@/components/ui';
import { signOut } from '../actions/auth-actions';

export function SignOutButton() {
  async function handleSignOut() {
    await signOut();
  }

  return (
    <Button variant="outline" onClick={handleSignOut}>
      Sign Out
    </Button>
  );
}
