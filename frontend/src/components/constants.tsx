import React from "react";
import { Lobby, Winner, Stat } from "./types";

export const LOBBIES: Lobby[] = [
  {
    id: "492",
    name: "High Rollers",
    tag: "FAST",
    prizePool: "500",
    currency: "SOL",
    players: 8,
    maxPlayers: 10,
    startTime: "Starts in 00:45",
    status: "starting",
  },
  {
    id: "493",
    name: "Standard Arena",
    tag: "POPULAR",
    prizePool: "1,200",
    currency: "USDT",
    players: 45,
    maxPlayers: 100,
    startTime: "Starts in 02:10",
    status: "waiting",
  },
  {
    id: "494",
    name: "Micro Stakes",
    tag: "FILLING",
    prizePool: "50",
    currency: "USDC",
    players: 1,
    maxPlayers: 50,
    startTime: "Waiting for players",
    status: "full",
  },
];

export const WINNERS: Winner[] = [
  { address: "0x3f...8a2", amount: "42.5", currency: "SOL" },
  { address: "0x7b...c91", amount: "1,200", currency: "USDT" },
  { address: "0x1a...f44", amount: "8.0", currency: "SOL" },
  { address: "0x99...e21", amount: "150", currency: "USDC" },
  { address: "0x2c...1b9", amount: "33.1", currency: "SOL" },
  { address: "0x5d...a02", amount: "120", currency: "SOL" },
];

export const STATS: Stat[] = [
  { label: "Active Players", value: "1,240", color: "primary" },
  { label: "Total Prizes", value: "$450k+", color: "secondary" },
  { label: "Games Today", value: "85", color: "primary" },
  { label: "Avg Wait", value: "12s", color: "green" },
];
