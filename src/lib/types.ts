export type GameId = 'wheel' | 'mr-and-mrs' | 'never-have-i-ever' | 'would-you-rather';

export type SpiceLevel = 'mild' | 'spicy' | 'villain';

export type WheelCategory =
  | 'Funny Stories'
  | 'Big Questions'
  | 'Guilty Pleasures'
  | 'Hot Takes'
  | 'Fears & Peeves'
  | 'Confessions'
  | 'Situationships'
  | 'Wild Card';

export const WHEEL_CATEGORIES: WheelCategory[] = [
  'Funny Stories',
  'Big Questions',
  'Guilty Pleasures',
  'Hot Takes',
  'Fears & Peeves',
  'Situationships',
  'Confessions',
  'Wild Card',
];

export const WHEEL_EMOJIS: Record<WheelCategory, string> = {
  'Funny Stories': '😂',
  'Big Questions': '🧠',
  'Guilty Pleasures': '🫣',
  'Hot Takes': '🔥',
  'Fears & Peeves': '😱',
  'Confessions': '🤫',
  'Situationships': '💋',
  'Wild Card': '🃏',
};

export interface GenerateRequest {
  game: GameId;
  category?: string;
  spiceLevel?: SpiceLevel;
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

export interface MrAndMrsQuestion {
  question: string;
  spicy: boolean;
}

export interface PlayerNames {
  player1: string;
  player2: string;
}
