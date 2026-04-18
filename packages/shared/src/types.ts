export type Chain = 'ethereum' | 'base' | 'arbitrum' | 'bsc' | 'polygon';
export type Plane = 'structural' | 'setup' | 'trigger' | 'squeeze' | 'distribution';
export type Band = 'critical' | 'high' | 'moderate' | 'low';
export interface PlaneScores { structural: number; setup: number; trigger: number; squeeze: number; distribution: number; }
export interface CompositeResult { composite: number; planes: PlaneScores; band: Band; drawdownProbability: number; action: string; contributingSignals: string[]; }
export interface SignalRow { tokenId: string; plane: Plane; signalId: string; value: number | null; rawPayload: unknown; source: string; observedAt: Date; }
export interface RequestLog { source: string; endpoint: string; latency_ms: number; status: number; cost_units: number; }
export type WalletLabel = 'deployer' | 'early_accumulator' | 'exchange_hot' | 'exchange_cold' | 'insider' | 'known_manipulator' | 'smart_money' | string;
