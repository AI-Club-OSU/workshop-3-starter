import { getChatGPTUser } from "@/app/chatgpt-auth";
import {
  findSubmissionByOwner,
  listSubmissions,
  toPublicSubmission,
  upsertSubmission,
} from "@/db";
import { fetchSiteMetadata, MetadataFetchError } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const submissions = await listSubmissions();
    return Response.json({
      submissions: submissions.map(toPublicSubmission),
    });
  } catch {
    return Response.json(
      { error: "The Workshop 3 gallery could not be loaded right now." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sign in with ChatGPT before saving a submission." },
      { status: 401 },
    );
  }

  let payload: { displayName?: unknown; url?: unknown };
  try {
    payload = (await request.json()) as {
      displayName?: unknown;
      url?: unknown;
    };
  } catch {
    return Response.json({ error: "The request was not valid JSON." }, { status: 400 });
  }

  try {
    if (typeof payload.displayName !== "string") {
      return Response.json({ error: "Enter a display name." }, { status: 400 });
    }
    const displayName = payload.displayName.trim();
    if (!displayName) {
      return Response.json({ error: "Enter a display name." }, { status: 400 });
    }
    if (displayName.length > 80) {
      return Response.json(
        { error: "Keep your display name under 80 characters." },
        { status: 400 },
      );
    }
    if (typeof payload.url !== "string") {
      return Response.json({ error: "Enter a website URL first." }, { status: 400 });
    }

    const existing = await findSubmissionByOwner(user.userId);
    const metadata = await fetchSiteMetadata(payload.url);
    const submission = await upsertSubmission({
      ownerUserId: user.userId,
      displayName,
      metadata,
    });

    return Response.json(
      {
        submission: toPublicSubmission(submission),
        updated: Boolean(existing),
      },
      { status: existing ? 200 : 201 },
    );
  } catch (error) {
    if (error instanceof MetadataFetchError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "Your submission could not be saved right now. Please try again." },
      { status: 500 },
    );
  }
}
