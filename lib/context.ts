'use client';
import { createContext, useContext } from 'react';
import type { Game } from './game';

export const GameCtx = createContext<{ g: Game; now: number }>(null!);
export const useGame = () => useContext(GameCtx);
