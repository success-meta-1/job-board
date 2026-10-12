'use client';

import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';

/** The dashboard reads IndexedDB and localStorage, so it only renders in the browser. */
export const ClientDashboard = dynamic(() => import('./Dashboard'), {
  ssr: false,
  loading: () => (
    <div className="flex h-full items-center justify-center gap-2 text-slate-500">
      <Loader2 className="size-5 animate-spin" /> Loading dashboard…
    </div>
  ),
});
