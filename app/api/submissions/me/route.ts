import { getChatGPTUser } from "@/app/chatgpt-auth";
import { findSubmissionByOwner, toPublicSubmission } from "@/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getChatGPTUser();
  if (!user) {
    return Response.json(
      { error: "Sign in with ChatGPT to view your submission." },
      { status: 401 },
    );
  }

  try {
    const submission = await findSubmissionByOwner(user.userId);
    return Response.json({
      submission: submission ? toPublicSubmission(submission) : null,
    });
  } catch {
    return Response.json(
      { error: "Your submission could not be loaded right now." },
      { status: 500 },
    );
  }
}
