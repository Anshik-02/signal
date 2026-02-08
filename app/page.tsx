'use client';

import dynamic from 'next/dynamic';

const PhaserGame = dynamic(() => import('@/src/game/components/phase-games'), {
  ssr: false,
});

export default function GamePage() {
  return (
    <div className="w-screen h-screen">
      <PhaserGame />
    </div>
  );
}
