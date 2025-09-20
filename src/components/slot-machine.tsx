import React, { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Coins, Flame } from "lucide-react";

// Add WebKit AudioContext for Safari compatibility
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Infernal runes representing dice faces 1-6
const INFERNAL_RUNES = ["☥", "⚡", "🔥", "☠", "⚔", "👁"];

interface ReelProps {
  value: number;
  isSpinning: boolean;
}

function Reel({ value, isSpinning }: ReelProps) {
  const [displayValue, setDisplayValue] = useState(value);

  useEffect(() => {
    if (isSpinning) {
      const interval = setInterval(() => {
        setDisplayValue(Math.floor(Math.random() * 6));
      }, 100);

      setTimeout(
        () => {
          clearInterval(interval);
          setDisplayValue(value);
        },
        1000 + Math.random() * 500,
      );

      return () => clearInterval(interval);
    }
  }, [isSpinning, value]);

  return (
    <div className="w-20 h-24 bg-gradient-to-b from-red-900 to-red-950 border-2 border-yellow-600 rounded-lg flex items-center justify-center shadow-lg">
      <span className="text-4xl text-yellow-400 drop-shadow-lg">
        {INFERNAL_RUNES[displayValue]}
      </span>
    </div>
  );
}

function PayoutTable() {
  return (
    <Card className="bg-gray-900 border-red-800">
      <CardHeader>
        <CardTitle className="text-red-400 flex items-center gap-2">
          <Flame className="w-5 h-5" />
          Copper Slots Payouts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-yellow-400">
          <span>Three of a kind:</span>
          <span>2-to-1</span>
        </div>
        <div className="flex justify-between text-yellow-400">
          <span>Four of a kind:</span>
          <span>4-to-1</span>
        </div>
        <div className="flex justify-between text-yellow-400">
          <span>Five of a kind:</span>
          <span>10-to-1</span>
        </div>
      </CardContent>
    </Card>
  );
}

export function SlotMachine() {
  const [reels, setReels] = useState([0, 1, 2, 3, 4]);
  const [bet, setBet] = useState(1);
  const [copper, setCopper] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [lastWin, setLastWin] = useState(0);
  const [lastResult, setLastResult] = useState<string>("");
  const [gameStarted, setGameStarted] = useState(false);
  
  // Audio context and sound refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const spinningOscillatorRef = useRef<OscillatorNode | null>(null);

  // Initialize audio context
  const initAudioContext = () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
  };

  // Play spinning sound (mechanical whirring)
  const playSpinningSound = () => {
    initAudioContext();
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.type = 'sawtooth';
    oscillator.frequency.setValueAtTime(120, audioContextRef.current.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(80, audioContextRef.current.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.05, audioContextRef.current.currentTime + 1.6);
    
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 1.6);
    
    spinningOscillatorRef.current = oscillator;
  };

  // Play win sound (ascending chimes)
  const playWinSound = () => {
    initAudioContext();
    if (!audioContextRef.current) return;

    const frequencies = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    
    frequencies.forEach((freq, index) => {
      const oscillator = audioContextRef.current!.createOscillator();
      const gainNode = audioContextRef.current!.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContextRef.current!.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(freq, audioContextRef.current!.currentTime);
      
      gainNode.gain.setValueAtTime(0, audioContextRef.current!.currentTime + index * 0.2);
      gainNode.gain.linearRampToValueAtTime(0.3, audioContextRef.current!.currentTime + index * 0.2 + 0.05);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current!.currentTime + index * 0.2 + 0.4);
      
      oscillator.start(audioContextRef.current!.currentTime + index * 0.2);
      oscillator.stop(audioContextRef.current!.currentTime + index * 0.2 + 0.4);
    });
  };

  // Play lose sound (descending tone)
  const playLoseSound = () => {
    initAudioContext();
    if (!audioContextRef.current) return;

    const oscillator = audioContextRef.current.createOscillator();
    const gainNode = audioContextRef.current.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContextRef.current.destination);
    
    oscillator.type = 'triangle';
    oscillator.frequency.setValueAtTime(220, audioContextRef.current.currentTime);
    oscillator.frequency.exponentialRampToValueAtTime(110, audioContextRef.current.currentTime + 0.8);
    
    gainNode.gain.setValueAtTime(0.2, audioContextRef.current.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContextRef.current.currentTime + 0.8);
    
    oscillator.start();
    oscillator.stop(audioContextRef.current.currentTime + 0.8);
  };

  const calculatePayout = (reelValues: number[]) => {
    // Count occurrences of each rune
    const counts = reelValues.reduce(
      (acc, reel) => {
        acc[reel] = (acc[reel] || 0) + 1;
        return acc;
      },
      {} as Record<number, number>,
    );

    // Find the highest count
    const maxCount = Math.max(...Object.values(counts));

    // Determine payout based on matches
    if (maxCount >= 5) {
      return { multiplier: 10, result: "Five of a kind!" };
    } else if (maxCount >= 4) {
      return { multiplier: 4, result: "Four of a kind!" };
    } else if (maxCount >= 3) {
      return { multiplier: 2, result: "Three of a kind!" };
    }

    return { multiplier: 0, result: "No match" };
  };

  const spinReels = () => {
    if (bet < 1 || bet > 9 || bet > copper || isSpinning)
      return;

    setIsSpinning(true);
    setCopper((prev) => prev - bet);
    setLastWin(0);
    setLastResult("");

    // Play spinning sound
    playSpinningSound();

    // Simulate 5d6 rolls
    const newRolls = Array.from({ length: 5 }, () =>
      Math.floor(Math.random() * 6),
    );

    // Set reels immediately
    setReels(newRolls);

    // Wait for all reel animations to complete (longest is 1000 + 500 = 1500ms)
    setTimeout(() => {
      // Calculate payout after animations are done
      const { multiplier, result } = calculatePayout(newRolls);
      const winAmount = bet * multiplier;

      setLastWin(winAmount);
      setLastResult(result);
      setCopper((prev) => prev + winAmount);
      setIsSpinning(false);

      // Play win or lose sound based on result
      if (winAmount > 0) {
        playWinSound();
      } else {
        playLoseSound();
      }
    }, 1600); // Slightly longer than max reel animation time
  };

  const handleBetChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const value = parseInt(e.target.value) || 1;
    setBet(Math.max(1, Math.min(9, value)));
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black p-4 flex flex-col items-center justify-center">
      <div className="max-w-4xl w-full space-y-6">
        {/* Title */}
        <div className="text-center">
          <h1 className="text-4xl text-red-400 mb-2 drop-shadow-lg">
            Tricky Devils Slot Machine
          </h1>
          <p className="text-gray-400">
            Insert copper coins and pull the lever to match
            Infernal runes!
          </p>
        </div>

        {/* Currency Setup */}
        {!gameStarted && (
          <Card className="bg-gradient-to-b from-gray-800 to-gray-900 border-yellow-600 border-2">
            <CardHeader>
              <CardTitle className="text-yellow-400 text-center">
                Set Your Starting Copper Coins
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="max-w-sm mx-auto space-y-2">
                <label className="text-yellow-400 flex items-center gap-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  Copper Coins
                </label>
                <Input
                  type="number"
                  min="1"
                  value={copper}
                  onChange={(e) =>
                    setCopper(parseInt(e.target.value) || 0)
                  }
                  className="bg-gray-800 border-yellow-600 text-yellow-400 text-center"
                  placeholder="Enter amount"
                />
              </div>
              <div className="text-center">
                <Button
                  onClick={() => setGameStarted(true)}
                  disabled={copper < 1}
                  className="bg-gradient-to-b from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 text-black px-8 py-2"
                >
                  Start Playing
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Main Game Area */}
        {gameStarted && (
          <Card className="bg-gradient-to-b from-red-950 to-red-900 border-yellow-600 border-2">
            <CardContent className="p-8 h-[40vh]">
              {/* Currency Display and Bet */}
              <div className="flex flex-col lg:flex-row justify-between items-center mb-6 gap-4">
                <div className="flex items-center gap-2 text-yellow-400">
                  <Coins className="w-6 h-6 text-orange-500" />
                  <span className="text-xl">
                    {copper} copper coins
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <label className="text-yellow-400">
                    Bet:
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="9"
                    value={bet}
                    onChange={handleBetChange}
                    className="w-20 bg-gray-800 border-yellow-600 text-yellow-400"
                    disabled={isSpinning}
                  />
                  <span className="text-yellow-400">
                    copper
                  </span>
                </div>
              </div>

              {/* Reels */}
              <div className="flex justify-center gap-4 mb-6">
                {reels.map((reel, index) => (
                  <Reel
                    key={index}
                    value={reel}
                    isSpinning={isSpinning}
                  />
                ))}
              </div>

              {/* Spin Button */}
              <div className="text-center mb-4">
                <Button
                  onClick={spinReels}
                  disabled={
                    isSpinning || bet > copper || copper < 1
                  }
                  className="bg-gradient-to-b from-yellow-600 to-yellow-800 hover:from-yellow-500 hover:to-yellow-700 text-black text-xl px-8 py-4 rounded-lg shadow-lg disabled:opacity-50"
                >
                  {isSpinning ? "Spinning..." : "Pull Lever!"}
                </Button>
              </div>

              {/* Results */}
              {lastResult && (
                <div className="text-center space-y-2">
                  <div className="text-xl text-yellow-400">
                    {lastResult}
                  </div>
                  {lastWin > 0 && (
                    <Badge className="bg-green-700 text-green-100 text-lg px-4 py-2">
                      Won {lastWin} copper!
                    </Badge>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Payout Table */}
        {gameStarted && (
          <div className="flex justify-center">
            <PayoutTable />
          </div>
        )}

        {/* Game Over */}
        {gameStarted && copper < 1 && (
          <Card className="bg-red-900 border-red-600">
            <CardContent className="p-6 text-center">
              <h3 className="text-xl text-red-400 mb-2">
                Out of Copper!
              </h3>
              <p className="text-gray-300">
                You're out of copper coins. The devils have
                claimed their due!
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    setGameStarted(false);
                    setLastWin(0);
                    setLastResult("");
                    setCopper(0);
                  }}
                  className="bg-blue-700 hover:bg-blue-600"
                >
                  Play Again
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}