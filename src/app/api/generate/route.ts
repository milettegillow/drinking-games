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
  let text = "";
  try {
    const body: GenerateRequest = await request.json();

    if (!body.game || !VALID_GAMES.includes(body.game)) {
      return Response.json(
        { error: "Invalid game type" },
        { status: 400 }
      );
    }

    const message = await client.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 4096,
      output_config: { effort: "low" },
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

    const textBlock = message.content.find(
      (block): block is Anthropic.TextBlock => block.type === "text"
    );
    text = textBlock?.text ?? "";

    // Extract JSON from response (handle potential markdown fencing)
    const jsonMatch = text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("Generate API: no JSON array in response", {
        stop_reason: message.stop_reason,
        rawText: text,
      });
      return Response.json(
        { error: "Failed to parse response" },
        { status: 500 }
      );
    }

    const items = JSON.parse(jsonMatch[0]);

    return Response.json({ items });
  } catch (error) {
    console.error("Generate API error:", error);
    if (error instanceof SyntaxError) {
      console.error("Generate API: failed to parse raw text:", text);
    }
    return Response.json(
      { error: "Shuffling the deck... try again!" },
      { status: 500 }
    );
  }
}
