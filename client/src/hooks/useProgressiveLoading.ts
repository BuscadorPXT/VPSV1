
import { useState, useEffect, useCallback } from 'react';

export type LoadingPhase = 'skeleton' | 'critical' | 'important' | 'optional' | 'complete';

interface UseProgressiveLoadingProps {
  phases: LoadingPhase[];
  delays?: { [key in LoadingPhase]?: number };
}

export function useProgressiveLoading({ 
  phases, 
  delays = {} 
}: UseProgressiveLoadingProps) {
  const [currentPhase, setCurrentPhase] = useState<LoadingPhase>(phases[0]);
  const [completedPhases, setCompletedPhases] = useState<Set<LoadingPhase>>(new Set());

  const advanceToPhase = useCallback((phase: LoadingPhase) => {
    const phaseIndex = phases.indexOf(phase);
    const currentIndex = phases.indexOf(currentPhase);
    
    if (phaseIndex > currentIndex) {
      const delay = delays[phase] || 0;
      
      if (delay > 0) {
        setTimeout(() => {
          setCurrentPhase(phase);
          setCompletedPhases(prev => new Set([...prev, phase]));
        }, delay);
      } else {
        setCurrentPhase(phase);
        setCompletedPhases(prev => new Set([...prev, phase]));
      }
    }
  }, [currentPhase, phases, delays]);

  const isPhaseActive = useCallback((phase: LoadingPhase) => {
    const phaseIndex = phases.indexOf(phase);
    const currentIndex = phases.indexOf(currentPhase);
    return phaseIndex <= currentIndex;
  }, [currentPhase, phases]);

  const isPhaseComplete = useCallback((phase: LoadingPhase) => {
    return completedPhases.has(phase);
  }, [completedPhases]);

  return {
    currentPhase,
    advanceToPhase,
    isPhaseActive,
    isPhaseComplete,
    isComplete: currentPhase === phases[phases.length - 1]
  };
}
