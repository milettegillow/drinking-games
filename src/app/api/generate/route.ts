import Anthropic from "@anthropic-ai/sdk";
import { getSystemPrompt, buildUserPrompt } from "@/lib/prompts";
import { GameId, GenerateRequest } from "@/lib/types";

const client = new Anthropic();

const VALID_GAMES: GameId[] = [
  "never-have-i-ever",
  "would-you-rather",
  "most-likely-to",
  "bold-claims",
];

export async function POST(request: Request) {
  try {
    const body: GenerateRequest = await request.json();

    if (!body.game || !VALID_GAMES.includes(body.game)) {
      return Response.json(
        { error: "Invalid game type" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      system: getSystemPrompt(),
      messages: [
        {
          role: "user",
          content: buildUserPrompt(body.game, {
            category: body.category,
            spiceLevel: body.spiceLevel,
            mode: body.mode,
            count: body.count || 10,
            exclude: body.exclude,
          }),
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    // Extract JSON from response (handle potential markdown fencing)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return Response.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    const items = JSON.parse(jsonMatch[0]);

    return Response.json({ items });
  } catch (error) {
    console.error("Generate API error:", error);
    return Response.json(
      { error: "Shuffling the deck... try again!" },
      { status: 500 }
    );
  }
}
