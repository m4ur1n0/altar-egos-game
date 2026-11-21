'use client';
import dynamic from 'next/dynamic';

// Client-only: the game needs localStorage, EventSource and the URL on first render.
const App = dynamic(() => import('@/components/App'), { ssr: false });

export default function Page() { return <App />; }
