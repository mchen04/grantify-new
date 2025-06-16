"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignUp() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to login page since we only support Google OAuth
    router.replace('/login');
  }, [router]);

  return null;
}