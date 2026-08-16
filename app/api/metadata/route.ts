import { getChatGPTUser } from "@/app/chatgpt-auth";
import { fetchSiteMetadata, MetadataFetchError } from "@/lib/metadata";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sign in with ChatGPT before previewing a submission." },
      { status: 401 },
    );
  }

  let payload: { url?: unknown };
  try {
    payload = (await request.json()) as { url?: unknown };
  } catch {
    return Response.json({ error: "The request was not valid JSON." }, { status: 400 });
  }

  try {
    if (typeof payload.url !== "string") {
      return Response.json({ error: "Enter a website URL first." }, { status: 400 });
    }

    const metadata = await fetchSiteMetadata(payload.url);
    return Response.json({ metadata });
  } catch (error) {
    if (error instanceof MetadataFetchError) {
      return Response.json({ error: error.message }, { status: error.status });
    }
    return Response.json(
      { error: "That website could not be previewed right now. Please try again." },
      { status: 500 },
    );
  }
}
