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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import { Coins, Flame, Info } from "lucide-react";

// Add WebKit AudioContext for Safari compatibility
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext;
  }
}

// Infernal runes representing dice faces 1-6
const INFERNAL_RUNES = ["ᚠ", "ᛉ", "⟁", "☿", "⟡", "𐌑"];

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
    <div className="infernal-reel">
      <div className="infernal-reel__axle infernal-reel__axle--left" />
      <div className="infernal-reel__window">
        <div
          className={`infernal-reel__drum ${isSpinning ? "infernal-reel__drum--spinning" : ""}`}
        >
          <span className="infernal-reel__rune">
            {INFERNAL_RUNES[displayValue]}
          </span>
        </div>
      </div>
      <div className="infernal-reel__axle infernal-reel__axle--right" />
    </div>
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
  const [betError, setBetError] = useState<string>("");

  const normalizeNumericInput = (rawValue: string) =>
    rawValue.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  
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
      return {
        multiplier: 10,
        result: "Five runes align — the devils pay in full.",
      };
    } else if (maxCount >= 4) {
      return {
        multiplier: 4,
        result: "Four runes lock — infernal gears release your prize.",
      };
    } else if (maxCount >= 3) {
      return {
        multiplier: 2,
        result: "Three runes align — the machine yields a modest boon.",
      };
    }

    return {
      multiplier: 0,
      result: "The machine claims your offering.",
    };
  };

  const spinReels = () => {
    if (bet > copper) {
      setBetError(
        "Your wager exceeds the copper in your purse.",
      );
      return;
    }

    if (bet < 1 || bet > 9 || isSpinning)
      return;

    setBetError("");
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

  const startMachine = () => {
    if (copper < 1) return;
    setGameStarted(true);
  };

  const handleSetupSubmit = (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    startMachine();
  };

  const handleSpinSubmit = (
    e: React.FormEvent<HTMLFormElement>,
  ) => {
    e.preventDefault();
    spinReels();
  };

  const handleBetChange = (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const normalizedValue = normalizeNumericInput(
      e.target.value,
    );
    const value =
      normalizedValue === ""
        ? 1
        : parseInt(normalizedValue, 10);
    const nextBet = Math.max(1, Math.min(9, value));
    setBet(nextBet);

    if (nextBet > copper) {
      setBetError(
        "Your wager exceeds the copper in your purse.",
      );
    } else {
      setBetError("");
    }
  };

  return (
    <div className="infernal-page">
      <div className="infernal-page__smoke" />
      <div className="infernal-page__embers" />
      <div className="infernal-shell">
        {/* Title */}
        <div className="infernal-heading text-center">
          <h1 className="infernal-heading__title">
            Tricky Devils Slot Machine
          </h1>
          <p className="infernal-heading__subtitle">
            Feed copper into the infernal clockwork and
            pull the lever to align cursed runes.
          </p>
        </div>

        {/* Currency Setup */}
        {!gameStarted && (
          <Card className="infernal-machine infernal-machine--setup">
            <div className="infernal-machine__plate" />
            <div className="infernal-corner infernal-corner--tl" />
            <div className="infernal-corner infernal-corner--tr" />
            <div className="infernal-corner infernal-corner--bl" />
            <div className="infernal-corner infernal-corner--br" />
            <CardHeader>
              <CardTitle className="infernal-card-title">
                Prime the Tricky Devils Machine
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <form
                className="space-y-4"
                onSubmit={handleSetupSubmit}
              >
                <div className="infernal-setup-grid">
                  <label className="infernal-label">
                    <Coins className="w-5 h-5 text-orange-500" />
                    Offering in Copper Coins
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="1"
                    value={copper}
                    onChange={(e) => {
                      const normalizedValue =
                        normalizeNumericInput(
                          e.target.value,
                        );
                      setCopper(
                        normalizedValue === ""
                          ? 0
                          : parseInt(normalizedValue, 10),
                      );
                    }}
                    className="infernal-input h-14"
                    placeholder="0"
                  />
                </div>
                <div className="text-center mt-3">
                  <Button
                    type="submit"
                    disabled={copper < 1}
                    className="infernal-button"
                  >
                    Awaken the Machine
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Main Game Area */}
        {gameStarted && (
          <Card className="infernal-machine infernal-machine--game">
            <div className="infernal-machine__plate" />
            <div className="infernal-corner infernal-corner--tl" />
            <div className="infernal-corner infernal-corner--tr" />
            <div className="infernal-corner infernal-corner--bl" />
            <div className="infernal-corner infernal-corner--br" />
            <CardContent className="relative p-8">
              <form onSubmit={handleSpinSubmit}>
              <div className="infernal-topline">
                <div className="infernal-display-panel">
                  <Coins className="w-6 h-6 text-orange-500" />
                  <span>{copper} copper in purse</span>
                </div>
                <div className="infernal-bet-panel">
                  <label className="infernal-label infernal-label--compact">
                    Bet:
                  </label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    min="1"
                    max="9"
                    value={bet}
                    onChange={handleBetChange}
                    className="infernal-input infernal-input--bet w-20 h-11"
                    disabled={isSpinning}
                    aria-invalid={bet > copper}
                  />
                  <span className="infernal-bet-panel__unit">
                    copper
                  </span>
                </div>
              </div>

              <div className="infernal-bet-error-slot">
                {betError && (
                  <div className="infernal-bet-error">
                    {betError}
                  </div>
                )}
              </div>

              {/* Reels */}
              <div className="infernal-reel-bank">
                {reels.map((reel, index) => (
                  <Reel
                    key={index}
                    value={reel}
                    isSpinning={isSpinning}
                  />
                ))}
              </div>

              <div className="infernal-controls">
                <button
                  type="submit"
                  disabled={
                    isSpinning || bet > copper || copper < 1
                  }
                  className={`infernal-lever ${isSpinning ? "infernal-lever--pulled" : ""}`}
                >
                  <span className="infernal-lever__base" />
                  <span className="infernal-lever__arm">
                    <span className="infernal-lever__knob" />
                  </span>
                </button>
                <div className="infernal-controls__label">
                  {isSpinning
                    ? "Gears in motion..."
                    : "Pull the Lever"}
                </div>
              </div>

              {/* Results */}
              <div className="infernal-result-slot">
                {lastResult && (
                  <div className="infernal-result">
                    <div className="infernal-result__text">
                      {lastResult}
                    </div>
                    {lastWin > 0 && (
                      <Badge className="infernal-result__badge">
                        You gain {lastWin} copper.
                      </Badge>
                    )}
                  </div>
                )}
              </div>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Payout Info Button */}
        {gameStarted && (
          <div className="flex justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <button className="infernal-info-button">
                  <Info className="w-4 h-4" />
                  <span>Payout Table</span>
                </button>
              </DialogTrigger>
              <DialogContent className="infernal-dialog">
                <DialogHeader>
                  <DialogTitle className="infernal-payout__title">
                    <Flame className="w-5 h-5" />
                    Tricky Devils Payout Plate
                  </DialogTitle>
                </DialogHeader>
                <div className="infernal-payout__rows">
                  <div className="infernal-payout__row">
                    <span>Three of a kind:</span>
                    <span>2-to-1</span>
                  </div>
                  <div className="infernal-payout__row">
                    <span>Four of a kind:</span>
                    <span>4-to-1</span>
                  </div>
                  <div className="infernal-payout__row">
                    <span>Five of a kind:</span>
                    <span>10-to-1</span>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Game Over */}
        {gameStarted && copper < 1 && (
          <Card className="infernal-game-over">
            <CardContent className="p-6 text-center">
              <h3 className="infernal-game-over__title">
                Out of Copper!
              </h3>
              <p className="infernal-game-over__text">
                The machine has taken your last offering.
                Return with more copper to tempt the devils
                again.
              </p>
              <div className="mt-4">
                <Button
                  onClick={() => {
                    setGameStarted(false);
                    setLastWin(0);
                    setLastResult("");
                    setCopper(0);
                  }}
                  className="infernal-button"
                >
                  Rekindle the Machine
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}