"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";

interface Stats {
  hero: {
    uniqueVisitors: number;
    uniquePlayers: number;
    sessions: number;
    gamesPlayed: number;
    totalInteractions: number;
  };
  gamePopularity: { game: string; count: number }[];
  engagement: {
    completionRate: number | null;
    avgRoundsPerSession: number | null;
    dropoffRound: number | null;
    roundCounts: { round: number; count: number }[];
    wheelSpins: number;
    wheelNextTopics: number;
    timeAndClicks: {
      game: string;
      avgDuration: number | null;
      avgClicks: number | null;
      avgRounds: number | null;
      sessions: number;
    }[];
  };
  settings: {
    nhieSpiceLevels: { level: string; count: number }[];
    mrsmrsSpicy: { spicyPercent: number; total: number };
    wyrCategories: { category: string; count: number }[];
  };
  countries: { country: string; sessions: number }[];
  funFacts: {
    avgMrsmrsScore: number | null;
    avgNhieScore: number | null;
    topWheelCategory: string | null;
    wyrAgreementRate: number | null;
  };
  excludingTestUsers: boolean;
  filteredEvents: number | null;
  updatedAt: string;
}

const GAME_LABELS: Record<string, string> = {
  wheel: "Conversation Wheel",
  "never-have-i-ever": "Never Have I Ever",
  "mr-and-mrs": "Mr & Mrs",
  "would-you-rather": "Would You Rather",
};

const GAME_EMOJIS: Record<string, string> = {
  wheel: "♣",
  "never-have-i-ever": "♦",
  "mr-and-mrs": "♥",
  "would-you-rather": "♠",
};

function formatNumber(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
  return n.toLocaleString();
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  if (m === 0) return `${s}s`;
  return `${m}m ${s}s`;
}

const COUNTRY_FLAGS: Record<string, string> = {
  "United States": "🇺🇸", "Canada": "🇨🇦", "United Kingdom": "🇬🇧",
  "Australia": "🇦🇺", "Germany": "🇩🇪", "France": "🇫🇷",
  "Netherlands": "🇳🇱", "Brazil": "🇧🇷", "India": "🇮🇳",
  "Japan": "🇯🇵", "South Korea": "🇰🇷", "Mexico": "🇲🇽",
  "Spain": "🇪🇸", "Italy": "🇮🇹", "Sweden": "🇸🇪",
  "Norway": "🇳🇴", "Denmark": "🇩🇰", "Finland": "🇫🇮",
  "Poland": "🇵🇱", "Ireland": "🇮🇪", "New Zealand": "🇳🇿",
  "Singapore": "🇸🇬", "Portugal": "🇵🇹", "Belgium": "🇧🇪",
  "Switzerland": "🇨🇭", "Austria": "🇦🇹", "South Africa": "🇿🇦",
  "Argentina": "🇦🇷", "Chile": "🇨🇱", "Colombia": "🇨🇴",
  "Philippines": "🇵🇭", "Indonesia": "🇮🇩", "Thailand": "🇹🇭",
  "Vietnam": "🇻🇳", "Malaysia": "🇲🇾", "Turkey": "🇹🇷",
  "Israel": "🇮🇱", "Romania": "🇷🇴", "Czech Republic": "🇨🇿",
  "Czechia": "🇨🇿", "Hungary": "🇭🇺", "Ukraine": "🇺🇦",
  "Greece": "🇬🇷", "Egypt": "🇪🇬", "Nigeria": "🇳🇬",
  "Kenya": "🇰🇪", "Pakistan": "🇵🇰", "Bangladesh": "🇧🇩",
  "China": "🇨🇳", "Taiwan": "🇹🇼", "Hong Kong": "🇭🇰",
};

function getFlag(country: string): string {
  return COUNTRY_FLAGS[country] || "🌍";
}

function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-cream/5 ${className}`}
    />
  );
}

function BarChart({
  items,
  labelFn,
}: {
  items: { label: string; count: number }[];
  labelFn?: (label: string) => string;
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  const total = items.reduce((sum, i) => sum + i.count, 0);

  return (
    <div className="space-y-3">
      {items.map((item) => {
        const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
        return (
          <div key={item.label}>
            <div className="flex justify-between font-body text-sm mb-1">
              <span className="text-cream/80">
                {labelFn ? labelFn(item.label) : item.label}
              </span>
              <span className="text-cream/50">{pct}%</span>
            </div>
            <div className="h-2.5 rounded-full bg-cream/5 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gold/60"
                initial={{ width: 0 }}
                animate={{ width: `${(item.count / max) * 100}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatsPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState(false);
  const [excludeTestUsers, setExcludeTestUsers] = useState(true);

  const fetchStats = useCallback((exclude: boolean) => {
    setStats(null);
    setError(false);
    fetch(`/api/stats?excludeTestUsers=${exclude}`)
      .then((res) => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  useEffect(() => {
    fetchStats(excludeTestUsers);
  }, [fetchStats, excludeTestUsers]);

  const minutesAgo = stats
    ? Math.max(
        1,
        Math.round((Date.now() - new Date(stats.updatedAt).getTime()) / 60000)
      )
    : null;

  return (
    <div
      className="min-h-[100dvh] flex flex-col items-center px-5 pb-8 safe-bottom"
      style={{ paddingTop: "max(2.5rem, env(safe-area-inset-top, 0px))" }}
    >
      {/* Header */}
      <div className="w-full max-w-md mb-4">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cream/10 border border-gold/20 font-body text-cream/70 text-sm hover:bg-cream/15 hover:text-cream transition-colors"
        >
          ← Back
        </Link>
      </div>

      <motion.h1
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="font-display font-bold text-gold leading-tight mb-1"
        style={{ fontSize: "clamp(2rem, 10vw, 2.75rem)" }}
      >
        Live Stats
      </motion.h1>
      <p className="font-body text-cream/40 text-xs mb-3">
        {minutesAgo
          ? `Updated ${minutesAgo === 1 ? "just now" : `${minutesAgo}m ago`}`
          : "Loading..."}
      </p>

      {/* Test user toggle */}
      <label className="flex items-center gap-2 mb-6 cursor-pointer select-none">
        <input
          type="checkbox"
          checked={excludeTestUsers}
          onChange={(e) => setExcludeTestUsers(e.target.checked)}
          className="accent-gold w-3.5 h-3.5 rounded"
        />
        <span className="font-body text-cream/30 text-xs">
          Exclude test users
        </span>
      </label>

      {error && (
        <div className="text-center py-12">
          <p className="font-display text-cream/60 text-lg mb-2">
            Stats are brewing...
          </p>
          <p className="font-body text-cream/40 text-sm">
            Check back soon!
          </p>
        </div>
      )}

      {!error && (
        <div className="w-full max-w-md space-y-6">
          {/* Hero Stats */}
          <div className="grid grid-cols-3 gap-3">
            {stats ? (
              <>
                <HeroStat
                  value={formatNumber(stats.hero.uniqueVisitors)}
                  label="Visitors"
                  delay={0}
                />
                <HeroStat
                  value={formatNumber(stats.hero.uniquePlayers)}
                  label="Players"
                  delay={0.05}
                />
                <HeroStat
                  value={formatNumber(stats.hero.sessions)}
                  label="Sessions"
                  delay={0.1}
                />
                <HeroStat
                  value={formatNumber(stats.hero.gamesPlayed)}
                  label="Games Played"
                  delay={0.15}
                />
                <HeroStat
                  value={formatNumber(stats.hero.totalInteractions)}
                  label="Interactions"
                  delay={0.2}
                />
              </>
            ) : (
              <>
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
                <Skeleton className="h-20" />
              </>
            )}
          </div>

          {/* Game Popularity */}
          <Section title="Game Popularity">
            {stats ? (
              stats.gamePopularity.length > 0 ? (
                <BarChart
                  items={stats.gamePopularity.map((g) => ({
                    label: g.game as string,
                    count: g.count as number,
                  }))}
                  labelFn={(g) =>
                    `${GAME_EMOJIS[g] || ""}  ${GAME_LABELS[g] || g}`
                  }
                />
              ) : (
                <EmptyState />
              )
            ) : (
              <SkeletonBars />
            )}
          </Section>

          {/* Players Around the World */}
          <Section title="Players Around the World">
            {stats ? (
              stats.countries.length > 0 ? (
                <BarChart
                  items={stats.countries.map((c) => ({
                    label: c.country as string,
                    count: c.sessions as number,
                  }))}
                  labelFn={(c) => `${getFlag(c)}  ${c}`}
                />
              ) : (
                <EmptyState />
              )
            ) : (
              <SkeletonBars />
            )}
          </Section>

          {/* Engagement */}
          <Section title="Engagement">
            {stats ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  {stats.engagement.completionRate != null && (
                    <FactCard
                      emoji="🏁"
                      value={`${stats.engagement.completionRate}%`}
                      label="Completion Rate"
                    />
                  )}
                  {stats.engagement.avgRoundsPerSession != null && (
                    <FactCard
                      emoji="🎯"
                      value={`${stats.engagement.avgRoundsPerSession}`}
                      label="Avg Rounds/Session"
                    />
                  )}
                  {(stats.engagement.wheelSpins > 0 || stats.engagement.wheelNextTopics > 0) && (
                    <FactCard
                      emoji="♣"
                      value={`${formatNumber(stats.engagement.wheelSpins)}`}
                      label="Wheel Spins"
                    />
                  )}
                  {stats.engagement.wheelNextTopics > 0 && (
                    <FactCard
                      emoji="➡️"
                      value={`${formatNumber(stats.engagement.wheelNextTopics)}`}
                      label="Next Topic Taps"
                    />
                  )}
                </div>

                {/* Drop-off chart */}
                {stats.engagement.roundCounts.length > 0 && (
                  <div>
                    <p className="font-body text-cream/50 text-xs uppercase tracking-wider mb-3">
                      Rounds Played{stats.engagement.dropoffRound != null && (
                        <span className="text-cream/30 normal-case tracking-normal">
                          {" "}— biggest drop after round {stats.engagement.dropoffRound}
                        </span>
                      )}
                    </p>
                    <BarChart
                      items={stats.engagement.roundCounts.map((r) => ({
                        label: `Round ${r.round}`,
                        count: r.count,
                      }))}
                    />
                  </div>
                )}

                {stats.engagement.completionRate == null &&
                  stats.engagement.avgRoundsPerSession == null &&
                  stats.engagement.wheelSpins === 0 &&
                  stats.engagement.roundCounts.length === 0 && <EmptyState />}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            )}
          </Section>

          {/* Time & Clicks */}
          <Section title="Time & Clicks">
            {stats ? (
              stats.engagement.timeAndClicks.length > 0 ? (
                <div className="space-y-4">
                  {stats.engagement.timeAndClicks.map((tc) => {
                    const timePerRound = tc.avgDuration != null && tc.avgRounds != null && tc.avgRounds > 0
                      ? Math.round(tc.avgDuration / tc.avgRounds)
                      : null;
                    const clicksPerMin = tc.avgClicks != null && tc.avgDuration != null && tc.avgDuration > 0
                      ? Math.round((tc.avgClicks / (tc.avgDuration / 60)) * 10) / 10
                      : null;
                    return (
                      <div key={tc.game as string} className="bg-cream/5 border border-gold/10 rounded-lg p-4">
                        <p className="font-body text-cream/60 text-xs uppercase tracking-wider mb-3">
                          {GAME_EMOJIS[tc.game as string] || ""} {GAME_LABELS[tc.game as string] || tc.game}
                          <span className="text-cream/30 normal-case tracking-normal"> — {tc.sessions} sessions</span>
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {tc.avgDuration != null && (
                            <div className="text-center">
                              <p className="font-display text-cream text-base leading-tight">{formatDuration(tc.avgDuration)}</p>
                              <p className="font-body text-cream/40 text-xs">Avg Time</p>
                            </div>
                          )}
                          {tc.avgClicks != null && (
                            <div className="text-center">
                              <p className="font-display text-cream text-base leading-tight">{tc.avgClicks}</p>
                              <p className="font-body text-cream/40 text-xs">Avg Clicks</p>
                            </div>
                          )}
                          {timePerRound != null && tc.game !== 'wheel' && (
                            <div className="text-center">
                              <p className="font-display text-cream text-base leading-tight">{formatDuration(timePerRound)}</p>
                              <p className="font-body text-cream/40 text-xs">Per Round</p>
                            </div>
                          )}
                          {clicksPerMin != null && (
                            <div className="text-center">
                              <p className="font-display text-cream text-base leading-tight">{clicksPerMin}</p>
                              <p className="font-body text-cream/40 text-xs">Clicks/Min</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <EmptyState />
              )
            ) : (
              <div className="space-y-3">
                <Skeleton className="h-28" />
                <Skeleton className="h-28" />
              </div>
            )}
          </Section>

          {/* Settings Preferences */}
          <Section title="Player Preferences">
            {stats ? (
              <div className="space-y-5">
                {/* NHIE Spice Levels */}
                {stats.settings.nhieSpiceLevels.length > 0 && (
                  <div>
                    <p className="font-body text-cream/50 text-xs uppercase tracking-wider mb-3">
                      Never Have I Ever — Spice Level
                    </p>
                    <BarChart
                      items={stats.settings.nhieSpiceLevels.map((s) => ({
                        label: s.level as string,
                        count: s.count as number,
                      }))}
                      labelFn={(l) =>
                        l === "mild"
                          ? "🌸 Mild"
                          : l === "spicy"
                            ? "🌶️ Spicy"
                            : "😈 Villain"
                      }
                    />
                  </div>
                )}

                {/* Mr & Mrs Spicy */}
                {stats.settings.mrsmrsSpicy.total > 0 && (
                  <div>
                    <p className="font-body text-cream/50 text-xs uppercase tracking-wider mb-3">
                      Mr & Mrs — Spicy Mode
                    </p>
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2.5 rounded-full bg-cream/5 overflow-hidden">
                        <motion.div
                          className="h-full rounded-full bg-casino-red/60"
                          initial={{ width: 0 }}
                          animate={{
                            width: `${stats.settings.mrsmrsSpicy.spicyPercent}%`,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                      <span className="font-body text-cream/60 text-sm w-12 text-right">
                        {stats.settings.mrsmrsSpicy.spicyPercent}% 🌶️
                      </span>
                    </div>
                  </div>
                )}

                {/* WYR Categories */}
                {stats.settings.wyrCategories.length > 0 && (
                  <div>
                    <p className="font-body text-cream/50 text-xs uppercase tracking-wider mb-3">
                      Would You Rather — Category
                    </p>
                    <BarChart
                      items={stats.settings.wyrCategories.map((c) => ({
                        label: c.category as string,
                        count: c.count as number,
                      }))}
                      labelFn={(c) => c.charAt(0).toUpperCase() + c.slice(1)}
                    />
                  </div>
                )}

                {stats.settings.nhieSpiceLevels.length === 0 &&
                  stats.settings.mrsmrsSpicy.total === 0 &&
                  stats.settings.wyrCategories.length === 0 && <EmptyState />}
              </div>
            ) : (
              <SkeletonBars />
            )}
          </Section>

          {/* Fun Facts */}
          <Section title="Fun Facts">
            {stats ? (
              <div className="grid grid-cols-2 gap-3">
                {stats.funFacts.avgMrsmrsScore != null && (
                  <FactCard
                    emoji="♥"
                    value={`${stats.funFacts.avgMrsmrsScore}/10`}
                    label="Avg Mr & Mrs Score"
                  />
                )}
                {stats.funFacts.avgNhieScore != null && (
                  <FactCard
                    emoji="♦"
                    value={`${stats.funFacts.avgNhieScore}/20`}
                    label="Avg NHIE Score"
                  />
                )}
                {stats.funFacts.topWheelCategory && (
                  <FactCard
                    emoji="♣"
                    value={stats.funFacts.topWheelCategory}
                    label="Top Wheel Category"
                  />
                )}
                {stats.funFacts.wyrAgreementRate != null && (
                  <FactCard
                    emoji="♠"
                    value={`${stats.funFacts.wyrAgreementRate}%`}
                    label="WYR Agreement Rate"
                  />
                )}
                {stats.funFacts.avgMrsmrsScore == null &&
                  stats.funFacts.avgNhieScore == null &&
                  !stats.funFacts.topWheelCategory &&
                  stats.funFacts.wyrAgreementRate == null && (
                    <div className="col-span-2">
                      <EmptyState />
                    </div>
                  )}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
                <Skeleton className="h-24" />
              </div>
            )}
          </Section>

          {/* Footer */}
          <div className="text-center pt-4 pb-2">
            <div className="h-px w-48 mx-auto bg-gradient-to-r from-transparent via-gold/20 to-transparent mb-4" />
            {stats?.excludingTestUsers && stats.filteredEvents != null && (
              <p className="font-body text-cream/20 text-xs mb-2">
                Excluding 3 test users ({formatNumber(stats.filteredEvents)} events filtered)
              </p>
            )}
            <p className="font-body text-cream/20 text-xs">
              Built with PostHog
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function HeroStat({
  value,
  label,
  delay,
}: {
  value: string;
  label: string;
  delay: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.4 }}
      className="bg-cream/5 border border-gold/15 rounded-xl p-3 text-center"
    >
      <p className="font-display text-gold text-2xl leading-none mb-1">
        {value}
      </p>
      <p className="font-body text-cream/40 text-xs">{label}</p>
    </motion.div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-cream/5 border border-gold/15 rounded-xl p-5"
    >
      <h2 className="font-display text-gold text-lg mb-4">{title}</h2>
      {children}
    </motion.div>
  );
}

function FactCard({
  emoji,
  value,
  label,
}: {
  emoji: string;
  value: string;
  label: string;
}) {
  return (
    <div className="bg-cream/5 border border-gold/10 rounded-lg p-3 text-center">
      <p className="text-lg mb-1">{emoji}</p>
      <p className="font-display text-cream text-base leading-tight mb-0.5">
        {value}
      </p>
      <p className="font-body text-cream/40 text-xs">{label}</p>
    </div>
  );
}

function EmptyState() {
  return (
    <p className="font-body text-cream/30 text-sm text-center py-4">
      No data yet — play some games!
    </p>
  );
}

function SkeletonBars() {
  return (
    <div className="space-y-3">
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
      <Skeleton className="h-8" />
    </div>
  );
}
