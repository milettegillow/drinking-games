export type GameId =
  | 'never-have-i-ever'
  | 'would-you-rather'
  | 'most-likely-to'
  | 'bold-claims';

export type SpiceLevel = 'mild' | 'spicy' | 'villain';

export interface GenerateRequest {
  game: GameId;
  category?: string;
  spiceLevel?: SpiceLevel;
  mode?: string;
  count?: number;
  exclude?: string[];
}

export type WyrCategory = 'silly' | 'deep' | 'cursed' | 'shuffle';

export const WYR_CATEGORIES: { value: WyrCategory; label: string }[] = [
  { value: 'silly', label: '🤪 Silly' },
  { value: 'deep', label: '🧠 Deep' },
  { value: 'cursed', label: '💀 Cursed' },
  { value: 'shuffle', label: '🔀 Shuffle' },
];

export interface WouldYouRatherDilemma {
  optionA: string;
  optionB: string;
  category: 'silly' | 'deep' | 'cursed';
}

export type MostLikelyToMode = 'silly' | 'personal' | 'spicy';

export interface MostLikelyToOption {
  value: MostLikelyToMode;
  label: string;
}

export const MOST_LIKELY_TO_MODES: MostLikelyToOption[] = [
  { value: 'silly', label: '😇 Silly' },
  { value: 'personal', label: '😈 Personal' },
  { value: 'spicy', label: '🌶️ Spicy' },
];

export type BoldClaimsMode = 'silly' | 'personal';

export interface BoldClaimsOption {
  value: BoldClaimsMode;
  label: string;
}

export const BOLD_CLAIMS_MODES: BoldClaimsOption[] = [
  { value: 'silly', label: '😇 Silly' },
  { value: 'personal', label: '😈 Personal' },
];

export interface BoldClaimsTrait {
  singular: string;
  plural: string;
}
