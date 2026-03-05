import { desc, eq, gt } from 'drizzle-orm';
import { mkdir, writeFile } from 'fs/promises';
import { resolve } from 'path';
import { db, schema } from '../db/index.js';
import { previewMatchPredictionPrompt, type MatchInput } from '../services/prediction-agent.js';

interface CliOptions {
  fixtureId?: number;
}

function parseCliOptions(argv: string[]): CliOptions {
  const options: CliOptions = {};

  for (const arg of argv) {
    if (arg.startsWith('--fixture-id=')) {
      const raw = arg.slice('--fixture-id='.length).trim();
      const parsed = Number.parseInt(raw, 10);
      if (Number.isFinite(parsed) && parsed > 0) {
        options.fixtureId = parsed;
      }
    }
  }

  return options;
}

async function resolveMatchInput(fixtureId?: number): Promise<MatchInput> {
  if (fixtureId) {
    const [row] = await db
      .select({
        apiFootballId: schema.matches.apiFootballId,
        homeTeam: schema.matches.homeTeam,
        homeTeamId: schema.matches.homeTeamId,
        awayTeam: schema.matches.awayTeam,
        awayTeamId: schema.matches.awayTeamId,
        leagueId: schema.matches.leagueId,
        leagueName: schema.matches.leagueName,
        kickoff: schema.matches.kickoff,
        venue: schema.matches.venue,
      })
      .from(schema.matches)
      .where(eq(schema.matches.apiFootballId, fixtureId))
      .limit(1);

    if (!row) {
      throw new Error(`No match found in DB for fixture-id=${fixtureId}`);
    }

    return {
      fixtureId: row.apiFootballId,
      homeTeam: row.homeTeam,
      homeTeamId: row.homeTeamId,
      awayTeam: row.awayTeam,
      awayTeamId: row.awayTeamId,
      leagueId: row.leagueId,
      leagueName: row.leagueName,
      kickoff: row.kickoff,
      venue: row.venue || undefined,
    };
  }

  const [latest] = await db
    .select({
      apiFootballId: schema.matches.apiFootballId,
      homeTeam: schema.matches.homeTeam,
      homeTeamId: schema.matches.homeTeamId,
      awayTeam: schema.matches.awayTeam,
      awayTeamId: schema.matches.awayTeamId,
      leagueId: schema.matches.leagueId,
      leagueName: schema.matches.leagueName,
      kickoff: schema.matches.kickoff,
      venue: schema.matches.venue,
    })
    .from(schema.matches)
    .where(gt(schema.matches.apiFootballId, 0))
    .orderBy(desc(schema.matches.kickoff))
    .limit(1);

  if (!latest) {
    throw new Error('No API-sourced match found in DB. Seed upcoming/API fixtures first.');
  }

  return {
    fixtureId: latest.apiFootballId,
    homeTeam: latest.homeTeam,
    homeTeamId: latest.homeTeamId,
    awayTeam: latest.awayTeam,
    awayTeamId: latest.awayTeamId,
    leagueId: latest.leagueId,
    leagueName: latest.leagueName,
    kickoff: latest.kickoff,
    venue: latest.venue || undefined,
  };
}

async function main(): Promise<void> {
  const options = parseCliOptions(process.argv.slice(2));
  const match = await resolveMatchInput(options.fixtureId);

  console.log(
    `[PromptPreview] match=${match.homeTeam} vs ${match.awayTeam} fixture=${match.fixtureId} league=${match.leagueName}`
  );

  const preview = await previewMatchPredictionPrompt(match);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');

  const promptText = [
    '# SYSTEM PROMPT',
    '',
    preview.systemPrompt,
    '',
    '# USER PROMPT',
    '',
    preview.userPrompt,
    '',
  ].join('\n');

  const outDir = resolve(process.cwd(), '../../output/prompt-previews');
  await mkdir(outDir, { recursive: true });
  const outPath = resolve(outDir, `prompt-preview-${match.fixtureId}-${timestamp}.md`);
  await writeFile(outPath, promptText, 'utf8');

  console.log(`[PromptPreview] Context: web=${preview.context.webIntelIncluded} weather=${preview.context.weatherStatus} location=${preview.context.locationStatus}`);
  console.log(`[PromptPreview] Saved: ${outPath}`);
  console.log('----- PROMPT START -----');
  console.log(promptText);
  console.log('----- PROMPT END -----');
  process.exit(0);
}

await main();
