import ArenaRoundClient from "@/components/Game/ArenaRoundClient";

export default async function ArenaRoundPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <ArenaRoundClient matchId={matchId} />;
}

