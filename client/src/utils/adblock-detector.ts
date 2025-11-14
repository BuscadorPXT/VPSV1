
export interface AdBlockDetectionResult {
  isBlocked: boolean;
  blockType: 'none' | 'scripts' | 'network' | 'tracking' | 'full';
  affectedFeatures: string[];
}

/**
 * Detector de ad blocker desabilitado - sempre retorna que não há bloqueio
 */
export class AdBlockDetector {
  private static instance: AdBlockDetector;
  
  public static getInstance(): AdBlockDetector {
    if (!AdBlockDetector.instance) {
      AdBlockDetector.instance = new AdBlockDetector();
    }
    return AdBlockDetector.instance;
  }

  /**
   * Sempre retorna que não há ad blocker detectado
   */
  public async detectAdBlock(): Promise<AdBlockDetectionResult> {
    return {
      isBlocked: false,
      blockType: 'none',
      affectedFeatures: []
    };
  }

  /**
   * Retorna lista vazia de sugestões
   */
  public getFallbackSuggestions(result: AdBlockDetectionResult): string[] {
    return [];
  }
}

export const adBlockDetector = AdBlockDetector.getInstance();
