import { GameId, SpiceLevel } from "./types";

const SYSTEM_PROMPT = `You are a sharp, irreverent host for "party games" — a group drinking game played in a circle of friends (3 to 16 players, mixed genders, mostly in their 20s and 30s). Your job is to write content that lands with a friend group on a night out: funny, bold, occasionally provocative, never crude for the sake of it.

You are NOT writing for couples. You are NOT writing for date night. Never reference "your partner", "your date", "your relationship", "the person you're playing with", or anything that assumes the players are romantically involved. The audience is a group of friends.

Always return ONLY valid JSON in the exact shape requested. No markdown fencing, no commentary, no preamble.`;

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

// --- Layer 1: Prompt Variants ---

const NHIE_VARIANTS: Record<string, string[]> = {
  mild: [
    "Focus on travel, adventure, and spontaneous experiences.",
    "Focus on social situations, parties, and public events.",
    "Focus on food, challenges, and trying new things.",
    "Focus on bravery, dares, and adrenaline-fuelled experiences.",
    "Focus on technology mishaps, online life, and modern-world experiences.",
  ],
  spicy: [
    "Focus on romantic and sexual experiences.",
    "Focus on social deception, lying, and sneaky behaviour.",
    "Focus on nights out, alcohol, and party stories.",
    "Focus on relationship drama, exes, and romantic chaos.",
    "Focus on rule-breaking, misbehaviour, and things you shouldn't have done.",
  ],
  villain: [
    "Focus on sexually extreme acts and bold bedroom experiences.",
    "Focus on betrayal, cheating, and morally dark behaviour.",
    "Focus on deception, manipulation, and secret-keeping.",
    "Focus on revenge, sabotage, and cruel behaviour.",
    "Focus on illegal acts, rule-breaking, and getting caught.",
  ],
};

const WYR_VARIANTS: Record<string, string[]> = {
  silly: [
    "Focus on body and physical absurdities.",
    "Focus on food, drink, and dietary restrictions.",
    "Focus on daily life inconveniences and awkward permanent conditions.",
    "Focus on superpowers, abilities, and fantastical twists.",
    "Focus on social embarrassment and public spectacles.",
  ],
  deep: [
    "Focus on career, success, and life purpose.",
    "Focus on relationships, trust, and human connection.",
    "Focus on time, mortality, and the shape of your life.",
    "Focus on knowledge, truth, and self-awareness.",
    "Focus on fame, legacy, and how you're remembered.",
  ],
  cursed: [
    "Focus on gross sensory experiences and bodily horror.",
    "Focus on excruciating social embarrassment and exposure.",
    "Focus on horrible real-world choices with lasting consequences.",
    "Focus on disgusting food and drink scenarios.",
    "Focus on permanent uncomfortable physical sensations.",
  ],
  shuffle: [
    "Lean slightly toward silly and absurd dilemmas this batch.",
    "Lean slightly toward deep and philosophical dilemmas this batch.",
    "Lean slightly toward cursed and uncomfortable dilemmas this batch.",
    "Ensure a perfectly even split across silly, deep, and cursed.",
    "Include at least one dilemma from each category that's especially extreme.",
  ],
};

const MLT_VARIANTS: Record<string, string[]> = {
  silly: [
    "Focus on chaotic night-out behaviour.",
    "Focus on tech mishaps, social media moments, and digital embarrassment.",
    "Focus on absurd hypothetical scenarios.",
    "Focus on overreactions and dramatic responses to small things.",
    "Focus on niche habits, weird tendencies, and awkward moments.",
  ],
  personal: [
    "Focus on dating, exes, and romantic chaos.",
    "Focus on dishonesty, secrecy, and things people hide.",
    "Focus on lurking, stalking, and unhealthy social media habits.",
    "Focus on impulsive behaviour and bad decisions.",
    "Focus on group dynamics, gossip, and friend group chaos.",
  ],
  spicy: [
    "Focus on bold sexual confessions and bedroom history.",
    "Focus on hookups in the wrong places or with the wrong people.",
    "Focus on dating apps, thirst traps, and modern hookup culture.",
    "Focus on secret kinks, fetishes, and things people don't admit.",
    "Focus on infidelity, getting caught, and morally grey hookups.",
  ],
};

const CYB_VARIANTS: Record<string, string[]> = {
  silly: [
    "Focus on physical comedy traits and clumsy moments.",
    "Focus on social/party traits — loudness, dancing, energy.",
    "Focus on skill traits — trivia, memory, coordination, talents.",
    "Focus on quirky habit traits — sleep, food, caffeine, routines.",
    "Focus on charm and presence traits — storytelling, photogenic, magnetism.",
  ],
  personal: [
    "Focus on physical attractiveness and presence.",
    "Focus on social charm — charisma, confidence, magnetism.",
    "Focus on style and presentation.",
    "Focus on bedroom-adjacent desirability without being explicit.",
    "Focus on ambition, success, and life-quality traits.",
  ],
};

// --- Layer 2: Seed Phrases ---

const SEED_PHRASES = [
  "Make one item unexpectedly specific or niche.",
  "Make one item about a scenario most people have secretly experienced.",
  "Make one item that would be especially fun to answer at 2am.",
  "Make one item that would divide a room 50/50.",
  "Make one item with a surprising or counterintuitive angle.",
  "Make one item that triggers a very specific memory.",
  "Make one item that sounds simple but is actually hard to answer.",
  "Make one item that would make someone pause before answering.",
  "Make one item about something people rarely talk about openly.",
  "Make one item that gets funnier the more you think about it.",
  "Make one item that reveals something unexpected about someone.",
  "Make one item with high storytelling potential.",
  "Make one item that people would immediately want to discuss.",
  "Make one item about a universal experience seen from an unusual angle.",
  "Make one item that would get a strong reaction from most people.",
  "Make one item that taps into a very specific life stage or era.",
];

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomSeed(): string {
  return pickRandom(SEED_PHRASES);
}

function buildExcludeClause(exclude?: string[]): string {
  if (!exclude || exclude.length === 0) return "";

  // Cap at 100 most recent items to avoid overly long prompts
  const capped = exclude.slice(-100);

  return `\n\nCRITICAL — DO NOT REPEAT: The following items have been shown across ALL games in this session. Do NOT repeat them, rephrase them, or generate anything with substantially the same meaning or theme. If an item mentions messiness, do not generate anything about messiness. If an item mentions cheating, do not generate anything about cheating. Treat the entire list as off-limits territory — not just identical matches but also variations on the same topic or concept:\n${capped.map((e) => `- "${e}"`).join("\n")}`;
}

export function buildUserPrompt(
  game: GameId,
  options: {
    category?: string;
    spiceLevel?: SpiceLevel;
    mode?: string;
    count?: number;
    exclude?: string[];
  },
): string {
  const count = options.count || 10;
  const excludeClause = buildExcludeClause(options.exclude);

  switch (game) {
    case "never-have-i-ever": {
      const nhieLevel = options.spiceLevel || "mild";
      const nhieVariant = pickRandom(NHIE_VARIANTS[nhieLevel] || NHIE_VARIANTS.mild);
      const nhieSeed = getRandomSeed();

      const spiceInstructions: Record<SpiceLevel, string> = {
        mild: `MILD level. Completely non-sexual. Genuinely eventful, adventurous, or surprising things that a nice, stand-up person might have done. Still interesting and story-worthy, not boring.

Good examples: "stalked someone's social media back to an embarrassing depth and accidentally liked a very old photo", "locked myself out of my own house in a truly stupid way", "hitchhiked", "gone skinny dipping", "crashed a wedding", "gone swimming in the sea at night", "booked a one-way flight", "snuck in somewhere I wasn't allowed to be", "gotten a tattoo on a whim", "slept in an airport overnight", "eaten something at a market in another country with absolutely no idea what it was", "entered a competition or talent show with zero relevant skill", "been on TV or in a newspaper"

Bad examples (too boring, no story): "forgotten someone's name", "cried on public transport", "waved at someone who wasn't waving at me", "pretended to understand a conversation"`,

        spicy: `SPICY level. A bit sexual, a bit morally grey, but nothing dark. House party confession stories you'd tell close friends on a night out.

Good examples: "snooped through someone's phone", "said 'I love you' and not meant it", "been skinny dipping", "had a one-night stand", "lied about my body count", "ghosted someone", "kissed someone I'd met that same day", "sent a nude", "pretended to be single when I wasn't", "had a crush on a friend's sibling", "kissed two different people in the same night", "been escorted out of a venue by security", "faked an orgasm", "drunk-dialled an ex", "sent a nude to the wrong person"`,

        villain: `VILLAIN level. Genuinely shocking. The bar is: would admitting this make the room go quiet before anyone reacts? If a statement could comfortably fit in Spicy, it is NOT villain enough.

Every batch MUST contain a roughly even mix of two flavours:
(1) SEXUALLY EXTREME: acts that go well beyond "a bit naughty"
(2) MORALLY DARK: betrayal, cruelty, deception, things most people would judge you for

Sexually extreme examples: "had a threesome", "joined the mile high club", "hooked up with someone whose name I never bothered to learn", "slept with someone to get something I wanted", "slept with a friend's ex knowing it would hurt them", "been the other woman/man", "had sex somewhere genuinely risky and almost got caught"

Morally dark examples: "cheated on a partner", "lied to the police", "deliberately made someone cry to win an argument", "kept a secret that would destroy a friendship if it came out", "sabotaged someone's opportunity because I wanted it", "stolen something worth more than £50", "been the reason a couple broke up", "taken revenge on someone in a way I've never told anyone about", "pretended to be someone's friend while actively disliking them for months", "let someone else take the blame for something I did", "read someone's diary or private messages and used what I found against them"

Bad examples (these belong in Spicy, not Villain): "had a one-night stand", "kissed a stranger", "sent a nude to the wrong person", "gone skinny dipping"`,
      };

      return `Generate ${count} "Never have I ever" statement completions at the "${nhieLevel}" spice level for a GROUP party game (3-16 friends in a circle).

${spiceInstructions[nhieLevel]}

THEMATIC DIRECTION FOR THIS BATCH: ${nhieVariant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${nhieSeed}

RULES (follow these strictly):
- The ${count} items must cover a wide range of different subjects. NEVER have two items about the same topic, theme, or subject area. Diversity is critical.
- Every statement must be a single, specific thing. NEVER combine two things with "or".
- Never use emdashes. Use parentheses if clarification is needed.
- Statements must be specific enough to trigger a story. If someone has done it, they should immediately remember when and where. Vague, mundane things that everyone has done are bad.
- No editorialising or commentary. Just state the thing plainly.
- These are written in first person ("I"), about things you have done in your life. NEVER reference "your partner", "your date", or any couples framing — the players are a group of friends, not a couple.
- Use British English spelling throughout.
- Each statement must be distinct from the others in the batch.

Return a JSON array of ${count} strings. Each string is ONLY the completion after "Never have I ever" (do NOT include "Never have I ever" in the output, the app adds it).
Example: ["hitchhiked", "crashed a wedding", "gone swimming in the sea at night"]${excludeClause}`;
    }

    case "would-you-rather": {
      const wyrCategory = options.category || "shuffle";
      const wyrVariant = pickRandom(WYR_VARIANTS[wyrCategory] || WYR_VARIANTS.shuffle);
      const wyrSeed = getRandomSeed();

      const wyrCategoryInstructions: Record<string, string> = {
        silly: `SILLY category. Absurd, hypothetical, funny. The options should be ridiculous enough to be funny but specific enough to be genuinely debatable. Think "pub argument that gets way too heated for what it is."

Good examples:
- "have fingers as long as your legs" / "have legs as long as your fingers"
- "always smell faintly of onions" / "always have slightly damp socks"
- "your only mode of transport is a horse" / "your only mode of transport is a canoe"
- "every time you sneeze you audibly moan" / "every time you laugh you do a full pig snort"
- "have to wear a wedding dress to every casual event" / "pyjamas to every formal event"
- "your life has a permanent backing track that everyone can hear" / "a live studio audience that reacts to everything you do"
- "be able to fly but only at walking speed" / "run at 200mph but only on all fours"
- "give up cheese forever" / "give up every hot drink forever"
- "never be able to use a door (windows, climbing, etc. only)" / "never be able to sit down"

Bad examples: cliché internet questions everyone has heard (horse-sized duck, etc.), anything referencing the players' relationship`,

        deep: `DEEP category. Genuinely thought-provoking dilemmas about life, identity, values, and mortality. These should stick with you after the game. Both options should represent a real philosophical trade-off.

Good examples:
- "know the date of your death" / "know the cause"
- "be wildly successful at a job you hate" / "mediocre at something you love"
- "everyone you meet instantly trusts you" / "everyone you meet instantly respects you"
- "be the funniest person in every room" / "the smartest"
- "lose all your money" / "lose all your photos and memories"
- "live a comfortable, unremarkable life" / "a turbulent, extraordinary one"
- "peak at 25" / "peak at 55"
- "be remembered for something you didn't do" / "forgotten for something amazing you did"
- "have a rewind button for your life (but you can only use it once)" / "a pause button you can use whenever you want"
- "live twice as long at half the intensity" / "half as long at double the intensity"`,

        cursed: `CURSED category. Both options are horrible. The reaction should be an immediate "oh NO" followed by agonised deliberation.

IMPORTANT: Cursed questions are NOT silly body-modification hypotheticals. Those are Silly. Cursed means both options make you physically cringe, squirm, or feel deeply uncomfortable. Think: gross sensory experiences with real things (licking a pub floor, sharing a toothbrush), excruciating social embarrassment (your parents seeing your search history, your nudes being leaked), or horrible real-world choices. The test: if someone laughs immediately, it's Silly. If someone grimaces and says "oh god, neither", it's Cursed.

Good examples:
- "walk in on your parents" / "have your parents walk in on you"
- "lick the floor of a pub bathroom" / "drink a shot of a stranger's bathwater"
- "sit through a detailed PowerPoint of your parents' sex life" / "have them sit through one of yours"
- "every chair you sit on is slightly warm (as if someone just got up)" / "every drink you're handed has a single hair floating in it"
- "share a toothbrush with a stranger for a year" / "wear the same underwear for a month"
- "bite into every apple and find half a worm" / "feel something brush against your foot in every body of water you enter"
- "have a counter above your head showing how many people in the room have seen you naked" / "have your Spotify listening history displayed above your head at all times"
- "eat a bowl of toenail clippings" / "drink a glass of someone else's sweat"
- "your group chat history is read aloud at your next family dinner" / "your boss reads your entire search history"

Bad examples (these are Silly, NOT Cursed): "sweat maple syrup", "have fingers for legs", "sneeze confetti", "your tears are hot sauce"`,

        shuffle: `SHUFFLE mode. Return a mix of questions with roughly equal distribution across three categories: silly, deep, and cursed. Tag each item with its category.

Refer to these descriptions:
- SILLY: Absurd, hypothetical, funny pub arguments
- DEEP: Thought-provoking dilemmas about life, identity, values, mortality
- CURSED: Both options are horrible, gross, or deeply uncomfortable`,
      };

      return `Generate ${count} "Would you rather" dilemmas for the "${wyrCategory}" category. This is a GROUP party game (3-16 friends in a circle).

${wyrCategoryInstructions[wyrCategory]}

THEMATIC DIRECTION FOR THIS BATCH: ${wyrVariant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${wyrSeed}

RULES (follow these strictly):
- The ${count} items must cover a wide range of different subjects. NEVER have two items about the same topic, theme, or subject area. Diversity is critical.
- Never use emdashes. Use parentheses if clarification is needed.
- Both options must be genuinely hard to choose between. If one option is obviously better, the question fails.
- Keep options concise. Each option should ideally be under 15 words.
- NEVER reference the players' relationship with each other, dating, romance, or "your partner". Audience is friends.
- British English spelling throughout.
- Each dilemma must be distinct from the others in the batch.

Return a JSON array of ${count} objects. Each object has "optionA" (string), "optionB" (string), and "category" ("silly", "deep", or "cursed").
Do NOT include the "Would you rather" prefix in the options (the app adds it).
Example: [{"optionA": "give up cheese forever", "optionB": "give up every hot drink forever", "category": "silly"}]${excludeClause}`;
    }

    case "most-likely-to": {
      const mode = options.mode || "silly";
      const mltVariant = pickRandom(MLT_VARIANTS[mode] || MLT_VARIANTS.silly);
      const mltSeed = getRandomSeed();

      const modeInstructions: Record<string, string> = {
        silly: `SILLY mode. Light, funny, embarrassing-but-harmless traits. Things that make the group laugh and immediately point at someone. No sexual content, no genuinely hurtful traits.

Good examples (in the style we want — these are completions for "Most likely to ___"):
- "lose their phone tonight"
- "fall asleep on the sofa first"
- "start karaoke at 3am"
- "text the wrong person tonight"
- "order something they regret on Uber Eats at 2am"
- "cry at a happy ending"
- "accidentally adopt a pet"
- "become a meme"
- "survive a zombie apocalypse"
- "correct someone's grammar at the worst time"
- "argue with a stranger on the internet"
- "wear something weird and pretend it's intentional"
- "fall down the stairs in heels"
- "forget their own birthday"
- "accidentally start an argument at brunch"
- "show up first to the pre-drinks"
- "lose their shoes tonight"
- "become a niche TikTok celebrity"
- "accidentally end up in a different city"
- "start a 'what would you do with £10 million' debate"`,

        personal: `PERSONAL mode. Reveals personality, dating life, social habits, dishonesty, friend-group dynamics. Mildly invasive but not sexual. The vibe is "we all know who this is".

Good examples:
- "text their ex tonight"
- "cry over a TV show this week"
- "ghost someone they're seeing"
- "have a secret crush on someone in this room"
- "send a risky Snapchat"
- "hook up with a coworker"
- "lurk on someone's Instagram for hours"
- "lie about their age"
- "fake an injury to skip work"
- "fall in love with someone they just met"
- "flirt with a friend's sibling"
- "lie on their CV"
- "have been blocked by an ex"
- "pretend to know someone they don't"
- "snoop through their partner's phone"
- "send a 'you up?' text tonight"
- "screenshot a chat to share with friends"
- "cancel plans last minute"
- "start a fight in the group chat"
- "lie about going to the gym"`,

        spicy: `SPICY mode. Sexual, bold, revealing. The kind of thing that gets pointed fingers and gasps. These are about sexual history, hookups, and bedroom secrets.

Good examples:
- "have had a threesome"
- "have had an orgy"
- "have hooked up at a wedding"
- "have hooked up in a public park"
- "have a secret OnlyFans"
- "have sent nudes to the wrong person"
- "have hooked up with a friend's ex"
- "have skinny-dipped with strangers"
- "have a fetish they've never told anyone about"
- "have lied about their number of past partners"
- "have been caught having sex in public"
- "have hooked up with someone whose name they don't remember"
- "have hooked up with someone in this room"
- "have flashed someone deliberately"
- "have a dating app open on their phone right now"
- "have hooked up with a coworker's partner"
- "have used a sex toy somewhere they shouldn't have"
- "have hooked up with two people in the same friend group"
- "have sent a thirst trap this week"
- "have a hookup story they'll take to the grave"`,
      };

      return `Generate ${count} trait completions for the prompt "Most likely to ___" in the "${mode}" mode.

${modeInstructions[mode]}

THEMATIC DIRECTION FOR THIS BATCH: ${mltVariant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${mltSeed}

RULES (follow these strictly):
- The ${count} items must cover a wide range of different subjects. NEVER have two items about the same topic, theme, or subject area. Diversity is critical.
- Each item is a verb phrase that completes "Most likely to ___". Start with a verb (lose, fall, text, hook up, send, etc.) — never a noun.
- Use third-person singular references ("their", "they") when needed — the players will pick which person fits.
- Never reference "your partner", couples framing, or assume any romantic relationship between players.
- Never use emdashes. Use parentheses if clarification is needed.
- British English spelling throughout.
- Keep each item concise (one short sentence, ideally under 12 words).
- Each trait should make the group immediately think of someone specific.

Return a JSON array of ${count} strings.
Example: ["lose their phone tonight", "fall asleep on the sofa first", "start karaoke at 3am"]${excludeClause}`;
    }

    case "call-your-bluff": {
      const mode = options.mode || "silly";
      const cybVariant = pickRandom(CYB_VARIANTS[mode] || CYB_VARIANTS.silly);
      const cybSeed = getRandomSeed();

      const modeInstructions: Record<string, string> = {
        silly: `SILLY mode. Light, observable traits — funny, social, skill-based, quirky. The kind of thing where standing up is a mild claim, not a confession.

Good examples (provided as singular forms — you must produce both singular and plural):
- "funniest"
- "loudest"
- "clumsiest"
- "messiest eater"
- "best dancer"
- "best at karaoke"
- "fastest texter"
- "best storyteller"
- "quickest thinker"
- "most photogenic"
- "worst at directions"
- "fastest at finishing a drink"
- "best at trivia"
- "most caffeinated person here"
- "best at impressions"
- "most likely to laugh first at anything"
- "biggest sweet tooth"
- "best at remembering everyone's birthdays"
- "heaviest sleeper"
- "best at parallel parking"`,

        personal: `PERSONAL mode. The trait must be DESIRABLE — something people would actually want to claim. The mechanic only works if standing up is attractive. Think: attractiveness, charisma, sexual confidence, success, magnetism. NEVER include negative or embarrassing traits in this mode.

Good examples (singular forms — all desirable):
- "most attractive"
- "best in bed"
- "most charming"
- "best looking"
- "best kisser"
- "most stylish"
- "most confident"
- "richest"
- "coolest"
- "most successful"
- "most charismatic"
- "most ambitious"
- "fittest"
- "most well-traveled"
- "most talented"
- "most desirable"
- "most magnetic"
- "biggest flirt"
- "best dressed"
- "most adventurous"

Bad examples (do NOT generate these — they are not desirable enough):
- "loudest"
- "clumsiest"
- "messiest"
- "worst at X"
- anything self-deprecating`,
      };

      return `Generate ${count} traits for the "Call Your Bluff" game in "${mode}" mode. Each trait will be plugged into two templates:
- "I am one of the X {plural} in the circle" (used when X >= 2)
- "I am THE {singular} in the circle" (used when X = 1)

You must return BOTH a singular and a plural form for each trait. For traits that don't change form (like "funniest"), the two strings can be identical. For traits like "biggest flirt" / "biggest flirts", they differ.

${modeInstructions[mode]}

THEMATIC DIRECTION FOR THIS BATCH: ${cybVariant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${cybSeed}

RULES (follow these strictly):
- The ${count} items must cover a wide range of different traits. NEVER have two items about the same trait or theme. Diversity is critical.
- Each trait must read naturally in BOTH templates. Test mentally: "I am one of the 3 X in the circle" and "I am THE X in the circle".
- Each trait is a noun phrase or superlative ("funniest", "biggest flirt", "best dancer") — NOT a verb phrase, NOT a sentence.
- Never use emdashes.
- British English spelling throughout.
- Never reference "your partner", couples framing, or romance assumptions. Audience is friends.

Return a JSON array of ${count} objects. Each object has "singular" (string) and "plural" (string).
Example: [{"singular": "funniest", "plural": "funniest"}, {"singular": "biggest flirt", "plural": "biggest flirts"}, {"singular": "best dancer", "plural": "best dancers"}]${excludeClause}`;
    }

    default:
      return `Generate ${count} fun party game prompts for a group of friends. Return a JSON array of strings.${excludeClause}`;
  }
}
