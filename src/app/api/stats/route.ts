import { NextRequest, NextResponse } from "next/server";

const POSTHOG_API_KEY = process.env.POSTHOG_PERSONAL_API_KEY;
const POSTHOG_PROJECT_ID = process.env.POSTHOG_PROJECT_ID;
const POSTHOG_HOST = "https://eu.i.posthog.com";

const TEST_USER_IDS = [
  "019c5202-49bd-7c04-9fbb-0583a3934e8b",
  "019c520c-d6fd-78cc-8ce2-6474d7e17658",
  "019c5213-5d02-7d54-bc22-5786c26dfc9a",
];

async function hogql(query: string): Promise<{ results: unknown[][] }> {
  const res = await fetch(
    `${POSTHOG_HOST}/api/projects/${POSTHOG_PROJECT_ID}/query/`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${POSTHOG_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: { kind: "HogQLQuery", query },
      }),
      next: { revalidate: 300 },
    }
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`PostHog API error ${res.status}: ${text}`);
  }

  return res.json();
}

export async function GET(request: NextRequest) {
  if (!POSTHOG_API_KEY || !POSTHOG_PROJECT_ID) {
    return NextResponse.json(
      {
        error: "Missing environment variables",
        hasPosthogKey: !!POSTHOG_API_KEY,
        hasProjectId: !!POSTHOG_PROJECT_ID,
      },
      { status: 500 }
    );
  }

  const exclude = request.nextUrl.searchParams.get("excludeTestUsers") !== "false";
  const ex = exclude
    ? ` AND properties.distinct_id NOT IN ('${TEST_USER_IDS.join("','")}')`
    : "";

  try {
    const queries = [
      // Total unique sessions
      hogql(`SELECT count(DISTINCT "$session_id") FROM events WHERE "$session_id" IS NOT NULL${ex}`),

      // Total games started (all game_start events including wheel)
      hogql(`SELECT count() FROM events WHERE event IN ('mrsmrs_game_start', 'nhie_game_start', 'wyr_game_start', 'wheel_game_start')${ex}`),

      // Total interactions (every round_complete + wheel actions)
      hogql(`SELECT count() FROM events WHERE event IN ('mrsmrs_round_complete', 'nhie_round_complete', 'wyr_round_complete', 'wheel_spin', 'wheel_next_topic')${ex}`),

      // Game popularity breakdown
      hogql(`SELECT properties.game, count() FROM events WHERE event = 'game_selected'${ex} GROUP BY properties.game ORDER BY count() DESC`),

      // NHIE spice level breakdown
      hogql(`SELECT properties.spiceLevel, count() FROM events WHERE event = 'nhie_game_start'${ex} GROUP BY properties.spiceLevel ORDER BY count() DESC`),

      // Mr & Mrs spicy mode percentage
      hogql(`SELECT properties.spicy, count() FROM events WHERE event = 'mrsmrs_game_start'${ex} GROUP BY properties.spicy`),

      // WYR category breakdown
      hogql(`SELECT properties.category, count() FROM events WHERE event = 'wyr_game_start'${ex} GROUP BY properties.category ORDER BY count() DESC`),

      // Mr & Mrs average score
      hogql(`SELECT avg(toFloat(properties.score)) FROM events WHERE event = 'mrsmrs_game_complete'${ex}`),

      // NHIE average score
      hogql(`SELECT avg(toFloat(properties.score)) FROM events WHERE event = 'nhie_game_complete'${ex}`),

      // Most popular wheel category
      hogql(`SELECT properties.category, count() FROM events WHERE event = 'wheel_spin'${ex} GROUP BY properties.category ORDER BY count() DESC LIMIT 1`),

      // WYR average agreement rate
      hogql(`SELECT countIf(properties.matched = 'true') * 100.0 / count() FROM events WHERE event = 'wyr_round_complete'${ex}`),

      // Completion rate: starts vs completes per game
      hogql(`SELECT event, count() FROM events WHERE event IN ('mrsmrs_game_start', 'mrsmrs_game_complete', 'nhie_game_start', 'nhie_game_complete', 'wyr_game_start', 'wyr_game_complete')${ex} GROUP BY event`),

      // Average rounds per session (max round reached per session)
      hogql(`SELECT "$session_id", max(toFloat(properties.round)) FROM events WHERE event IN ('mrsmrs_round_complete', 'nhie_round_complete', 'wyr_round_complete') AND "$session_id" IS NOT NULL${ex} GROUP BY "$session_id"`),

      // Drop-off by round number
      hogql(`SELECT properties.round, count() FROM events WHERE event IN ('mrsmrs_round_complete', 'nhie_round_complete', 'wyr_round_complete')${ex} GROUP BY properties.round ORDER BY properties.round ASC`),

      // Wheel engagement: spins vs next topics
      hogql(`SELECT countIf(event = 'wheel_spin'), countIf(event = 'wheel_next_topic') FROM events WHERE event IN ('wheel_spin', 'wheel_next_topic')${ex}`),

      // Time & clicks per game: avg duration, avg clicks, avg rounds
      hogql(`SELECT properties.game, avg(toFloat(properties.duration_seconds)), avg(toFloat(properties.total_clicks)), avg(toFloat(properties.rounds_played)), count() FROM events WHERE event = 'game_session_end'${ex} GROUP BY properties.game ORDER BY avg(toFloat(properties.duration_seconds)) DESC`),

      // Country breakdown by unique sessions
      hogql(`SELECT properties.$geoip_country_name AS country, count(DISTINCT "$session_id") AS sessions FROM events WHERE "$session_id" IS NOT NULL AND properties.$geoip_country_name IS NOT NULL${ex} GROUP BY country ORDER BY sessions DESC LIMIT 10`),

      // Unique visitors (anyone who loaded the site)
      hogql(`SELECT count(DISTINCT properties.distinct_id) FROM events WHERE event = '$pageview'${ex}`),

      // Unique players (anyone who started a game)
      hogql(`SELECT count(DISTINCT properties.distinct_id) FROM events WHERE event = 'game_selected'${ex}`),
    ];

    // Count filtered events when excluding test users
    if (exclude) {
      queries.push(
        hogql(`SELECT count() FROM events WHERE properties.distinct_id IN ('${TEST_USER_IDS.join("','")}')`)
      );
    }

    const results = await Promise.all(queries);

    const [
      sessionsResult,
      gamesPlayedResult,
      totalInteractionsResult,
      gamePopularityResult,
      nhieSpiceResult,
      mrsmrsSpicyResult,
      wyrCategoryResult,
      mrsmrsScoreResult,
      nhieScoreResult,
      wheelCategoryResult,
      wyrMatchResult,
      completionRateResult,
      roundsPerSessionResult,
      dropoffResult,
      wheelEngagementResult,
      timeClicksResult,
      countryResult,
      uniqueVisitorsResult,
      uniquePlayersResult,
    ] = results;

    const filteredEventsResult = exclude ? results[19] : null;

    // Compute completion rate from start/complete event counts
    const completionRows = completionRateResult.results || [];
    const eventCount = (name: string) =>
      (completionRows.find(([e]) => e === name)?.[1] as number) ?? 0;
    const totalStarts = eventCount("mrsmrs_game_start") + eventCount("nhie_game_start") + eventCount("wyr_game_start");
    const totalCompletes = eventCount("mrsmrs_game_complete") + eventCount("nhie_game_complete") + eventCount("wyr_game_complete");

    // Compute average rounds per session from per-session max round
    const sessionRounds = (roundsPerSessionResult.results || []).map(
      ([, maxRound]) => Number(maxRound) || 0
    );
    const avgRoundsPerSession = sessionRounds.length > 0
      ? Math.round((sessionRounds.reduce((a, b) => a + b, 0) / sessionRounds.length) * 10) / 10
      : null;

    // Compute drop-off: find the round with the biggest absolute drop
    const dropoffRows = (dropoffResult.results || [])
      .map(([round, count]) => ({ round: Number(round), count: Number(count) }))
      .sort((a, b) => a.round - b.round);
    let biggestDrop = { fromRound: 0, drop: 0 };
    for (let i = 1; i < dropoffRows.length; i++) {
      const drop = dropoffRows[i - 1].count - dropoffRows[i].count;
      if (drop > biggestDrop.drop) {
        biggestDrop = { fromRound: dropoffRows[i - 1].round, drop };
      }
    }

    const stats = {
      hero: {
        uniqueVisitors: uniqueVisitorsResult.results[0]?.[0] ?? 0,
        uniquePlayers: uniquePlayersResult.results[0]?.[0] ?? 0,
        sessions: sessionsResult.results[0]?.[0] ?? 0,
        gamesPlayed: gamesPlayedResult.results[0]?.[0] ?? 0,
        totalInteractions: totalInteractionsResult.results[0]?.[0] ?? 0,
      },
      gamePopularity: (gamePopularityResult.results || []).map(
        ([game, count]) => ({ game, count })
      ),
      engagement: {
        completionRate: totalStarts > 0 ? Math.round((totalCompletes / totalStarts) * 100) : null,
        avgRoundsPerSession,
        dropoffRound: biggestDrop.drop > 0 ? biggestDrop.fromRound : null,
        roundCounts: dropoffRows,
        wheelSpins: (wheelEngagementResult.results[0]?.[0] as number) ?? 0,
        wheelNextTopics: (wheelEngagementResult.results[0]?.[1] as number) ?? 0,
        timeAndClicks: (timeClicksResult.results || []).map(
          ([game, avgDuration, avgClicks, avgRounds, sessions]) => ({
            game,
            avgDuration: avgDuration != null ? Math.round(avgDuration as number) : null,
            avgClicks: avgClicks != null ? Math.round((avgClicks as number) * 10) / 10 : null,
            avgRounds: avgRounds != null ? Math.round((avgRounds as number) * 10) / 10 : null,
            sessions: (sessions as number) ?? 0,
          })
        ),
      },
      settings: {
        nhieSpiceLevels: (nhieSpiceResult.results || []).map(
          ([level, count]) => ({ level, count })
        ),
        mrsmrsSpicy: (() => {
          const rows = mrsmrsSpicyResult.results || [];
          const spicyCount = rows.find(
            ([v]) => v === true || v === "true"
          )?.[1] as number ?? 0;
          const cleanCount = rows.find(
            ([v]) => v === false || v === "false"
          )?.[1] as number ?? 0;
          const total = spicyCount + cleanCount;
          return {
            spicyPercent: total > 0 ? Math.round((spicyCount / total) * 100) : 0,
            total,
          };
        })(),
        wyrCategories: (wyrCategoryResult.results || []).map(
          ([category, count]) => ({ category, count })
        ),
      },
      funFacts: {
        avgMrsmrsScore: mrsmrsScoreResult.results[0]?.[0] != null
          ? Math.round((mrsmrsScoreResult.results[0][0] as number) * 10) / 10
          : null,
        avgNhieScore: nhieScoreResult.results[0]?.[0] != null
          ? Math.round((nhieScoreResult.results[0][0] as number) * 10) / 10
          : null,
        topWheelCategory: wheelCategoryResult.results[0]?.[0] ?? null,
        wyrAgreementRate: wyrMatchResult.results[0]?.[0] != null
          ? Math.round(wyrMatchResult.results[0][0] as number)
          : null,
      },
      countries: (countryResult.results || []).map(
        ([country, sessions]) => ({ country, sessions })
      ),
      excludingTestUsers: exclude,
      filteredEvents: filteredEventsResult
        ? (filteredEventsResult.results[0]?.[0] as number) ?? 0
        : null,
      updatedAt: new Date().toISOString(),
    };

    return NextResponse.json(stats, {
      headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=60" },
    });
  } catch (error) {
    console.error("Stats API error:", error);
    return NextResponse.json(
      {
        error: "Stats fetch failed",
        message: error instanceof Error ? error.message : "Unknown error",
        hasPosthogKey: !!POSTHOG_API_KEY,
        hasProjectId: !!POSTHOG_PROJECT_ID,
        projectId: POSTHOG_PROJECT_ID,
      },
      { status: 500 }
    );
  }
}
