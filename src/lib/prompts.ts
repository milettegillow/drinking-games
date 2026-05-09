import { GameId, SpiceLevel } from "./types";

const SYSTEM_PROMPT = `You are a playful, romantic game host for a Valentine's Date Night. You create fun, engaging content for couples. Your tone is warm, flirty, and creative. Never be offensive or crude — even "spicy" content should be bold and intimate but tasteful. Always return ONLY valid JSON with no markdown fencing, no explanation, no extra text.`;

export function getSystemPrompt(): string {
  return SYSTEM_PROMPT;
}

// --- Layer 1: Prompt Variants ---
// Each variant steers the AI toward a different thematic cluster.
// One is picked randomly per API call.

const WHEEL_VARIANTS: Record<string, string[]> = {
  "Funny Stories": [
    "Mix of childhood, work, travel, nights out, and family stories.",
    "Lean toward cringe moments, misunderstandings, and things that went wrong.",
    "Lean toward stories involving other people: strangers, friends, or authority figures.",
    "Lean toward stories with an unexpected twist or surprise ending.",
    "Lean toward stories about being caught, exposed, or publicly embarrassed.",
  ],
  "Big Questions": [
    "Mix of identity, ambition, ethics, turning points, and society.",
    "Lean toward questions about alternate timelines and roads not taken.",
    "Lean toward questions about beliefs, values, and what you stand for.",
    "Lean toward questions about self-knowledge and personal blind spots.",
    "Lean toward questions about the future and what comes next.",
  ],
  "Guilty Pleasures": [
    "Mix of entertainment, food, social media, vanity, and nostalgia.",
    "Lean toward secret habits nobody knows about.",
    "Lean toward things you enjoy but are slightly ashamed of.",
    "Lean toward comforts, routines, and indulgent rituals.",
    "Lean toward throwbacks, childhood favourites, and retro obsessions.",
  ],
  "Hot Takes": [
    "Mix of social norms, food opinions, relationships, work culture, and media.",
    "Lean toward takes that would start a genuine argument.",
    "Lean toward controversial opinions about everyday life.",
    "Lean toward takes about modern culture that most people disagree on.",
    "Lean toward unpopular opinions about popular things.",
  ],
  "Fears & Peeves": [
    "Mix of phobias, social irritations, workplace annoyances, tech frustrations, and relationship pet peeves.",
    "Lean toward irrational fears that are hard to explain.",
    "Lean toward small everyday annoyances that drive you mad.",
    "Lean toward things other people do that are secretly infuriating.",
    "Lean toward anxieties about the future or modern life.",
  ],
  "Confessions": [
    "Mix of petty behaviour, lies, hidden talents, regrets, and youthful rebellion.",
    "Lean toward things you've never told anyone.",
    "Lean toward things you got away with and never confessed.",
    "Lean toward petty grudges and secret competitiveness.",
    "Lean toward embarrassing truths about your habits or personality.",
  ],
  "Situationships": [
    "Mix of dating disasters, red flags, exes, modern dating, and crush stories.",
    "Lean toward cringe moments and awkward encounters.",
    "Lean toward stories about misread signals and miscommunication.",
    "Lean toward opinions about modern dating culture.",
    "Lean toward the most unhinged dating behaviour you've witnessed.",
  ],
  "Wild Card": [
    "Mix of hypotheticals, unusual experiences, money, extreme scenarios, and secrets.",
    "Lean toward bizarre what-if questions with no easy answer.",
    "Lean toward questions that reveal something unexpected about someone.",
    "Lean toward thought experiments about human nature.",
    "Lean toward questions that are impossible to answer the same way twice.",
  ],
};

const MR_AND_MRS_VARIANTS = {
  standard: [
    "Focus on social behaviour, friendships, and how they act around others.",
    "Focus on skills, talents, knowledge, and things they're good (or bad) at.",
    "Focus on daily habits, quirks, and routines.",
    "Focus on ambition, career, bravery, and risk-taking.",
    "Focus on emotional reactions, personality traits, and how they handle situations.",
  ],
  spicy: [
    "Focus on sexual history, preferences, and bold bedroom-related questions.",
    "Focus on moral grey areas, dishonesty, and things they'd never want made public.",
    "Focus on jealousy, loyalty, trust, and relationship boundaries.",
    "Focus on wild behaviour, impulsive decisions, and reckless moments.",
    "Focus on secrets, confessions, and things people only admit in private.",
  ],
};

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

// --- Layer 2: Seed Phrases ---
// A random seed phrase is appended to each call to nudge the output in unpredictable directions.

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
    count?: number;
    exclude?: string[];
  },
): string {
  const count = options.count || 10;
  const excludeClause = buildExcludeClause(options.exclude);

  switch (game) {
    case "wheel": {
      const wheelCategoryInstructions: Record<string, string> = {
        "Funny Stories": `Category: Funny Stories. Trigger actual anecdotes. These should make someone immediately think of a specific event they can tell as a story.

Good examples:
- "What's the most chaotic night out you've ever had?"
- "What's a story your friends always bring up to embarrass you?"
- "What's the worst lie you've ever told that somehow worked?"
- "What's the most embarrassing thing you've done in a professional setting?"
- "What's the most ridiculous thing you've ever spent money on?"
- "What's the most absurd misunderstanding you've been involved in?"

Bad examples: "Tell a funny story" (too vague), "What makes you laugh?" (too broad, not story-triggering)`,

        "Big Questions": `Category: Big Questions. Life, identity, values, the future. These should make people think, not cringe.

Good examples:
- "If money was irrelevant, what would your average Tuesday look like?"
- "What's a belief you held strongly 5 years ago that you've completely changed your mind on?"
- "What do you think people misunderstand about you most?"
- "What's something you want to have done before you turn 40?"
- "When did you last feel genuinely out of your depth?"
- "What's a part of your personality you've had to actively work on?"
- "If you could go back to university and study something completely different, what would it be?"

Bad examples: "What are your hopes and dreams?" (too vague, sappy), "Where do you see yourself in 5 years?" (job interview)`,

        "Guilty Pleasures": `Category: Guilty Pleasures. Things you'd only admit after a couple of drinks. Embarrassing tastes, habits, and preferences.

Good examples:
- "What's a celebrity you find attractive that your friends would roast you for?"
- "What's a song you'd never play in front of others but absolutely love?"
- "What app do you waste the most time on, and how bad is the screen time?"
- "What's a TV show you're embarrassed to admit you've watched all of?"
- "What's a comfort food you eat that other people would judge you for?"
- "What's a trend you secretly enjoyed even though you publicly mocked it?"

Bad examples: "What's your most embarrassing guilty pleasure song that you secretly dance to when no one's watching?" (too wordy, too performative)`,

        "Hot Takes": `Category: Hot Takes. Opinions that might start a friendly argument. The goal is genuine disagreement and debate.

Good examples:
- "What's a popular thing that you genuinely think is overrated?"
- "What's an opinion you hold that most people disagree with?"
- "What's a hill you'd die on that other people think is ridiculous?"
- "What's a social norm you think is completely pointless?"
- "What's something everyone seems to enjoy that you genuinely don't understand the appeal of?"
- "What's a 'nice' thing people do that you secretly find annoying?"`,

        "Fears & Peeves": `Category: Fears & Pet Peeves. Real fears and genuine irritations. Not sappy fears like "losing the people I love". Actual specific things.

Good examples:
- "What's something that terrifies you that most people aren't bothered by?"
- "What's the most scared you've ever been?"
- "Is there something you avoid that you know is irrational?"
- "What's a small everyday thing that irritates you way more than it should?"
- "What's a personality trait in other people that you just cannot deal with?"
- "What's something that gives you the ick immediately?"`,

        "Confessions": `Category: Confessions. Things you probably haven't told many people. Secrets, petty behaviour, hidden sides of yourself.

Good examples:
- "What's something you've never apologised for but probably should?"
- "What's the pettiest thing you've ever done?"
- "What's a secret skill or hobby you have that most people don't know about?"
- "What's something you did that you still can't believe you got away with?"
- "What's a lie you've maintained for so long that it would be weird to correct it now?"
- "Have you ever completely reinvented yourself, and what triggered it?"`,

        "Situationships": `Category: Situationships. Dating stories, relationship opinions, love life chaos. NOT about the two people playing. About dating in general, exes, and the absurdity of modern romance.

Good examples:
- "What's the biggest red flag you've ever ignored?"
- "What's the worst date you've ever been on?"
- "What's a dealbreaker for you that other people think is unreasonable?"
- "What's the most unhinged thing you've ever done after a breakup?"
- "What's a dating trend you think is genuinely toxic?"
- "What's the longest situationship you've been in, and how did it end?"

Bad examples: "If we could wake up tomorrow in any city together..." (assumes romantic relationship, sappy), "What first attracted you to your date?" (references the players)`,

        "Wild Card": `Category: Wild Card. Anything goes. The most interesting, unexpected, or provocative questions that don't fit neatly elsewhere. Conversation grenades.

Good examples:
- "What's the most illegal thing you've done?"
- "What's something you've done that you still can't believe you got away with?"
- "If you had to disappear and start a new life tomorrow, where would you go and what would you do?"
- "What's the most expensive thing you've broken that wasn't yours?"
- "What's a decision that completely changed the direction of your life?"
- "What's the most unhinged impulse purchase you've ever made?"`,
      };

      const catKey = options.category || "Wild Card";
      const catInstructions = wheelCategoryInstructions[catKey] || wheelCategoryInstructions["Wild Card"];
      const variant = pickRandom(WHEEL_VARIANTS[catKey] || WHEEL_VARIANTS["Wild Card"]);
      const seed = getRandomSeed();

      return `Generate ${count} conversation topics/questions for the specified category.

${catInstructions}

THEMATIC DIRECTION FOR THIS BATCH: ${variant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${seed}

RULES (follow these strictly):
- The ${count} items must cover a wide range of different subjects. NEVER have two items about the same topic, theme, or subject area. Diversity is critical.
- Never use emdashes. Use parentheses if clarification is needed.
- Never reference "your partner", "your date", "your relationship", "together", "as a couple", or anything that assumes romance.
- Questions should be addressed to "you" (singular), not "you two" or "both of you".
- Every topic should be a genuine conversation opener that could sustain at least 5 minutes of discussion.
- Keep questions concise. One or two sentences max.
- British English spelling throughout.
- Questions should be specific enough to get an interesting answer. "What do you dream about?" is too vague. "If you could be world-class at one thing overnight, what would you pick?" is good.
- Vary the format: some direct questions, some "what's the most...", some "have you ever...", some "what's your take on...". Don't use the same structure repeatedly.

Return a JSON array of ${count} strings.${excludeClause}`;
    }

    case "mr-and-mrs": {
      const isSpicy = options.spiceLevel === "spicy";
      const mmVariant = pickRandom(isSpicy ? MR_AND_MRS_VARIANTS.spicy : MR_AND_MRS_VARIANTS.standard);
      const mmSeed = getRandomSeed();

      const spicyInstructions = isSpicy
        ? `SPICY MODE. ALL questions must be sexual or morally edgy. Every item must have spicy: true. No clean/standard questions in this batch.

Good spicy examples:
- "Who has had the most sexual partners?"
- "Who is most likely to have a threesome?"
- "Who is most likely to cheat?"
- "Who has the wilder search history?"
- "Who is more likely to sleep with someone on the first date?"
- "Who is more likely to have a secret they've never told anyone?"
- "Who would be more likely to lie to the police?"
- "Who is more likely to have hooked up with a friend?"
- "Who has done the most embarrassing thing they'd never want made public?"
- "Who is most likely to send a nude to the wrong person?"
- "Who would be more likely to have a one-night stand with a stranger?"
- "Who is more likely to have been the other woman/man?"
- "Who is most likely to read their partner's messages without telling them?"
- "Who is more likely to kiss someone else on a night out?"
- "Who has told the bigger lie?"

Spicy questions should make people squirm slightly before answering. A mix of sexually extreme and morally dubious.`
        : `STANDARD MODE. ALL questions must be clean and non-sexual. Every item must have spicy: false. Fun, provocative, personality-revealing questions. Not sexual but not boring. These should trigger playful arguments.`;

      return `Generate ${count} "Who is more likely to..." / "Who is the bigger..." / "Who would..." questions for a two-player game where both players independently pick which person the question applies to more.

${spicyInstructions}

THEMATIC DIRECTION FOR THIS BATCH: ${mmVariant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${mmSeed}

Good standard examples:
- "Who is more likely to survive a zombie apocalypse?"
- "Who is more likely to start an argument over something petty?"
- "Who would last longer without their phone?"
- "Who is more likely to talk their way out of a speeding ticket?"
- "Who is the bigger drama queen?"
- "Who would be worse in a survival situation?"
- "Who is more likely to accidentally go viral on social media?"
- "Who would win in a physical fight?"
- "Who is the bigger flirt?"
- "Who gives better advice?"
- "Who is more likely to quit their job on impulse?"
- "Who would handle being arrested more calmly?"
- "Who is more competitive?"
- "Who is more likely to do karaoke completely sober?"
- "Who has better stories from their teenage years?"
- "Who is more likely to say something inappropriate at the wrong moment?"
- "Who would be better at keeping a secret?"
- "Who is more likely to take a board game way too seriously?"
- "Who is the bigger risk-taker?"
- "Who is more likely to befriend a complete stranger?"

Bad examples (do NOT generate questions like these):
- "Who is the biggest foodie?" (boring, no debate)
- "Who is more likely to forget where they put their keys?" (mundane, no story)
- "Who is more likely to cry during a romantic movie?" (cliche, predictable)
- "Who is more likely to plan a surprise date?" (too romance-focused)
- "Who is more likely to say I love you first?" (assumes romantic relationship)

RULES (follow these strictly):
- The ${count} items must cover a wide range of different subjects. NEVER have two items about the same topic, theme, or subject area. Diversity is critical.
- Never use emdashes. Use parentheses if clarification is needed.
- Questions must work as "[Name] or [Name]" answers.
- Questions should work equally well for friends, new couples, or long-term couples. Never assume anything about the relationship.
- British English spelling throughout.
- Every question should spark a genuine debate. If both players would obviously give the same answer, the question is too easy.
- Questions should be about the two players specifically, not hypothetical scenarios about others.
- Keep questions concise. One sentence, no caveats or clarifications needed.
- "Who is more likely to...", "Who would...", and "Who is the bigger..." are the right formats.

The test for a good standard question: would two friends playing this game find it just as fun as a couple?

Return a JSON array of ${count} objects. Each object has "question" (string) and "spicy" (boolean).
Do NOT include any prefix (the app adds "[Name], " before displaying).
Example: [{"question": "Who is more likely to survive a zombie apocalypse?", "spicy": false}]${excludeClause}`;
    }

    case "never-have-i-ever": {
      const nhieLevel = options.spiceLevel || "mild";
      const nhieVariant = pickRandom(NHIE_VARIANTS[nhieLevel] || NHIE_VARIANTS.mild);
      const nhieSeed = getRandomSeed();

      const spiceInstructions = {
        mild: `MILD level. Completely non-sexual. Genuinely eventful, adventurous, or surprising things that a nice, stand-up person might have done. Still interesting and story-worthy, not boring.

Good examples: "stalked someone's social media back to an embarrassing depth and accidentally liked a very old photo", "locked myself out of my own house in a truly stupid way", "hitchhiked", gone skinny dipping", "crashed a wedding", "gone swimming in the sea at night", "booked a one-way flight", "snuck in somewhere I wasn't allowed to be", "gotten a tattoo on a whim", "slept in an airport overnight", "eaten something at a market in another country with absolutely no idea what it was", "entered a competition or talent show with zero relevant skill", "been on TV or in a newspaper"

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

      return `Generate ${count} "Never have I ever" statement completions at the "${nhieLevel}" spice level.

${spiceInstructions[nhieLevel]}

THEMATIC DIRECTION FOR THIS BATCH: ${nhieVariant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${nhieSeed}

RULES (follow these strictly):
- The ${count} items must cover a wide range of different subjects. NEVER have two items about the same topic, theme, or subject area. Diversity is critical.
- Every statement must be a single, specific thing. NEVER combine two things with "or".
- Never use emdashes. Use parentheses if clarification is needed.
- Statements must be specific enough to trigger a story. If someone has done it, they should immediately remember when and where. Vague, mundane things that everyone has done are bad.
- No editorialising or commentary (no "...and honestly, no regrets" style additions). Just state the thing plainly.
- These are NOT about the players' relationship with each other. NEVER reference "your date", "your partner", "the person you're playing with", etc. These are about things you've done in your life.
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

IMPORTANT: Cursed questions are NOT silly body-modification hypotheticals like "would you rather sweat maple syrup" or "have fingers for legs". Those are Silly. Cursed means both options make you physically cringe, squirm, or feel deeply uncomfortable. Think: gross sensory experiences with real things (licking a pub floor, sharing a toothbrush), excruciating social embarrassment (your parents seeing your search history, your nudes being leaked), or horrible real-world choices (your partner reads your group chat, everyone you've slept with is in one room). The test: if someone laughs immediately, it's Silly. If someone grimaces and says "oh god, neither", it's Cursed.

Good examples:
- "walk in on your parents" / "have your parents walk in on you"
- "lick the floor of a pub bathroom" / "drink a shot of a stranger's bathwater"
- "sit through a detailed PowerPoint of your parents' sex life" / "have them sit through one of yours"
- "every chair you sit on is slightly warm (as if someone just got up)" / "every drink you're handed has a single hair floating in it"
- "share a toothbrush with a stranger for a year" / "wear the same underwear for a month"
- "bite into every apple and find half a worm" / "feel something brush against your foot in every body of water you enter"
- "have a counter above your head showing how many people in the room have seen you naked" / "have your Spotify listening history displayed above your head at all times"
- "eat a bowl of toenail clippings" / "drink a glass of someone else's sweat"
- "your partner reads your entire group chat history" / "your boss reads your entire search history"

Bad examples (these are Silly, NOT Cursed): "sweat maple syrup", "have fingers for legs", "sneeze confetti", "your tears are hot sauce"`,

        shuffle: `SHUFFLE mode. Return a mix of questions with roughly equal distribution across three categories: silly, deep, and cursed. Tag each item with its category.

Refer to these descriptions:
- SILLY: Absurd, hypothetical, funny pub arguments
- DEEP: Thought-provoking dilemmas about life, identity, values, mortality
- CURSED: Both options are horrible, gross, or deeply uncomfortable`,
      };

      return `Generate ${count} "Would you rather" dilemmas for the "${wyrCategory}" category.

${wyrCategoryInstructions[wyrCategory]}

THEMATIC DIRECTION FOR THIS BATCH: ${wyrVariant}
CREATIVE SEED (apply to at most 1 item, not the whole batch): ${wyrSeed}

RULES (follow these strictly):
- The ${count} items must cover a wide range of different subjects. NEVER have two items about the same topic, theme, or subject area. Diversity is critical.
- Never use emdashes. Use parentheses if clarification is needed.
- Both options must be genuinely hard to choose between. If one option is obviously better, the question fails.
- Keep options concise. Each option should ideally be under 15 words.
- NEVER reference the players' relationship with each other, dating, romance, or "your partner".
- British English spelling throughout.
- The questions should trigger genuine debate and conversation.
- Each dilemma must be distinct from the others in the batch.

Return a JSON array of ${count} objects. Each object has "optionA" (string), "optionB" (string), and "category" ("silly", "deep", or "cursed").
Do NOT include the "Would you rather" prefix in the options (the app adds it).
Example: [{"optionA": "give up cheese forever", "optionB": "give up every hot drink forever", "category": "silly"}]${excludeClause}`;
    }

    default:
      return `Generate ${count} fun conversation starters for a couple on a date night. Return a JSON array of strings.${excludeClause}`;
  }
}
