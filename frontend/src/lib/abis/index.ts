import GameManagerABI from "./GameManager.json";
import YieldVaultABI from "./YieldVault.json";
import NFTAchievementsABI from "./NFTAchievements.json";
import MatchmakingABI from "./Matchmaking.json";

// Export the ABI arrays
export const GameManagerABIArray = GameManagerABI;
export const YieldVaultABIArray = YieldVaultABI;
export const NFTAchievementsABIArray = NFTAchievementsABI;
export const MatchmakingABIArray = MatchmakingABI;


export { GameManagerABI, YieldVaultABI, NFTAchievementsABI, MatchmakingABI };


export type GameManagerABIType = typeof GameManagerABI;
export type YieldVaultABIType = typeof YieldVaultABI;
export type NFTAchievementsABIType = typeof NFTAchievementsABI;
export type MatchmakingABIType = typeof MatchmakingABI;
