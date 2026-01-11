import GameWaitingRoomClient from "@/components/Game/GameWaitingRoomClient";

export default async function GameWaitingRoomPage({
  params,
}: {
  params: Promise<{ gameId: string }> | { gameId: string };
}) {
  // Handle both Promise and direct params (for different Next.js versions)
  const resolvedParams = params instanceof Promise ? await params : params;
  const gameId = resolvedParams?.gameId;

  if (!gameId) {
    return (
      <div className="min-h-screen bg-background text-white flex items-center justify-center">
        <div className="text-center">
          <h3 className="text-xl font-black mb-2">Invalid Game ID</h3>
          <p className="text-gray-400">No game ID provided in the URL.</p>
        </div>
      </div>
    );
  }

  return <GameWaitingRoomClient gameId={gameId} />;
}
