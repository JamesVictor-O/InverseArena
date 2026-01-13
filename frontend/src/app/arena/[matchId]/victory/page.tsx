import ResultVictoryClient from "@/components/Game/ResultVictoryClient";

export default async function VictoryPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <ResultVictoryClient matchId={matchId} />;
}
