// Homepage redirects to /browse via next.config.js (permanent 308 redirect)
// This file exists as a fallback and for TypeScript route completion

import { redirect } from 'next/navigation';

export default function Home() {
  // Fallback redirect in case config redirect doesn't trigger
  redirect('/browse');
}
