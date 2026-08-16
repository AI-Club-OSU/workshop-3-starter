import { env } from "cloudflare:workers";
import type {
  PublicSubmission,
  Submission,
  SubmissionMetadata,
} from "@/lib/types";

function getDb(): D1Database {
  if (!env.DB) {
    throw new Error(
      "Cloudflare D1 binding `DB` is unavailable. Set the `d1` field in .openai/hosting.json to `DB` or let your control plane inject the real binding values before using the database.",
    );
  }

  return env.DB;
}

type SubmissionRow = {
  id: string;
  owner_user_id: string;
  display_name: string;
  url: string;
  title: string | null;
  description: string | null;
  open_graph_title: string | null;
  open_graph_description: string | null;
  twitter_title: string | null;
  twitter_description: string | null;
  canonical_url: string | null;
  site_name: string | null;
  created_at: string;
  updated_at: string;
};

const PUBLIC_COLUMNS = `
  id, owner_user_id, display_name, url, title, description,
  open_graph_title, open_graph_description, twitter_title,
  twitter_description, canonical_url, site_name, created_at, updated_at
`;

export async function listSubmissions(): Promise<Submission[]> {
  const result = await getDb()
    .prepare(
      `SELECT ${PUBLIC_COLUMNS}
       FROM submissions
       ORDER BY updated_at DESC
       LIMIT 100`,
    )
    .all<SubmissionRow>();

  return result.results.map(toSubmission);
}

export function toPublicSubmission(
  submission: Submission,
): PublicSubmission {
  const publicSubmission: Partial<Submission> = { ...submission };
  delete publicSubmission.ownerUserId;
  return publicSubmission as PublicSubmission;
}

export async function findSubmissionByOwner(
  ownerUserId: string,
): Promise<Submission | null> {
  const row = await getDb()
    .prepare(
      `SELECT ${PUBLIC_COLUMNS}
       FROM submissions
       WHERE owner_user_id = ?
       LIMIT 1`,
    )
    .bind(ownerUserId)
    .first<SubmissionRow>();

  return row ? toSubmission(row) : null;
}

export async function upsertSubmission(input: {
  ownerUserId: string;
  displayName: string;
  metadata: SubmissionMetadata;
}): Promise<Submission> {
  const now = new Date().toISOString();
  const row = await getDb()
    .prepare(
      `INSERT INTO submissions (
         id, owner_user_id, display_name, url, title, description,
         open_graph_title, open_graph_description, twitter_title,
         twitter_description, canonical_url, site_name, created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(owner_user_id) DO UPDATE SET
         display_name = excluded.display_name,
         url = excluded.url,
         title = excluded.title,
         description = excluded.description,
         open_graph_title = excluded.open_graph_title,
         open_graph_description = excluded.open_graph_description,
         twitter_title = excluded.twitter_title,
         twitter_description = excluded.twitter_description,
         canonical_url = excluded.canonical_url,
         site_name = excluded.site_name,
         updated_at = excluded.updated_at
       RETURNING ${PUBLIC_COLUMNS}`,
    )
    .bind(
      crypto.randomUUID(),
      input.ownerUserId,
      input.displayName,
      input.metadata.url,
      input.metadata.title,
      input.metadata.description,
      input.metadata.openGraphTitle,
      input.metadata.openGraphDescription,
      input.metadata.twitterTitle,
      input.metadata.twitterDescription,
      input.metadata.canonicalUrl,
      input.metadata.siteName,
      now,
      now,
    )
    .first<SubmissionRow>();

  if (!row) throw new Error("The submission could not be saved.");
  return toSubmission(row);
}

function toSubmission(row: SubmissionRow): Submission {
  return {
    id: row.id,
    ownerUserId: row.owner_user_id,
    displayName: row.display_name,
    url: row.url,
    title: row.title,
    description: row.description,
    openGraphTitle: row.open_graph_title,
    openGraphDescription: row.open_graph_description,
    twitterTitle: row.twitter_title,
    twitterDescription: row.twitter_description,
    canonicalUrl: row.canonical_url,
    siteName: row.site_name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
