import ResultDefeatClient from "@/components/Game/ResultDefeatClient";

export default async function DefeatPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  return <ResultDefeatClient matchId={matchId} />;
}

