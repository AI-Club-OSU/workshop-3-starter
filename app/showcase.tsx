"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import type {
  PublicChatGPTUser,
  PublicSubmission,
  SubmissionMetadata,
} from "@/lib/types";

type Props = {
  user: PublicChatGPTUser | null;
  signInPath: string;
  signOutPath: string;
};

type ApiError = { error?: string };

function preferredTitle(item: SubmissionMetadata): string {
  return (
    item.openGraphTitle ??
    item.twitterTitle ??
    item.title ??
    item.siteName ??
    item.hostname
  );
}

function preferredDescription(item: SubmissionMetadata): string {
  return (
    item.openGraphDescription ??
    item.twitterDescription ??
    item.description ??
    "No description was found, but the project is ready to explore."
  );
}

function hostnameFor(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Website";
  }
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

async function readJson<T>(response: Response): Promise<T> {
  const payload = (await response.json()) as T & ApiError;
  if (!response.ok) {
    throw new Error(payload.error ?? "Something went wrong. Please try again.");
  }
  return payload;
}

export function Showcase({ user, signInPath, signOutPath }: Props) {
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [url, setUrl] = useState("");
  const [preview, setPreview] = useState<SubmissionMetadata | null>(null);
  const [previewedUrl, setPreviewedUrl] = useState("");
  const [previewState, setPreviewState] = useState<
    "idle" | "loading" | "ready" | "error"
  >("idle");
  const [previewError, setPreviewError] = useState("");
  const [saveState, setSaveState] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [existing, setExisting] = useState<PublicSubmission | null>(null);
  const [existingLoading, setExistingLoading] = useState(Boolean(user));
  const [submissions, setSubmissions] = useState<PublicSubmission[]>([]);
  const [galleryState, setGalleryState] = useState<
    "loading" | "ready" | "error"
  >("loading");
  const [galleryError, setGalleryError] = useState("");

  const loadGallery = useCallback(async () => {
    try {
      setGalleryState("loading");
      const response = await fetch("/api/submissions", {
        headers: { Accept: "application/json" },
      });
      const payload = await readJson<{ submissions: PublicSubmission[] }>(
        response,
      );
      setSubmissions(payload.submissions);
      setGalleryState("ready");
    } catch (error) {
      setGalleryError(
        error instanceof Error ? error.message : "The gallery could not load.",
      );
      setGalleryState("error");
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => void loadGallery(), 0);
    return () => window.clearTimeout(timer);
  }, [loadGallery]);

  useEffect(() => {
    if (!user) return;

    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/submissions/me", {
          headers: { Accept: "application/json" },
        });
        const payload = await readJson<{ submission: PublicSubmission | null }>(
          response,
        );
        if (cancelled || !payload.submission) return;

        const submission = payload.submission;
        setExisting(submission);
        setDisplayName(submission.displayName);
        setUrl(submission.url);
        setPreview({
          url: submission.url,
          hostname: hostnameFor(submission.url),
          title: submission.title,
          description: submission.description,
          openGraphTitle: submission.openGraphTitle,
          openGraphDescription: submission.openGraphDescription,
          twitterTitle: submission.twitterTitle,
          twitterDescription: submission.twitterDescription,
          canonicalUrl: submission.canonicalUrl,
          siteName: submission.siteName,
        });
        setPreviewedUrl(submission.url);
        setPreviewState("ready");
      } catch (error) {
        if (!cancelled) {
          setSaveMessage(
            error instanceof Error
              ? error.message
              : "Your existing submission could not be loaded.",
          );
          setSaveState("error");
        }
      } finally {
        if (!cancelled) setExistingLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user]);

  const hasCurrentPreview = useMemo(
    () => preview !== null && previewedUrl === url.trim(),
    [preview, previewedUrl, url],
  );

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPreviewState("loading");
    setPreviewError("");
    setSaveState("idle");
    setSaveMessage("");

    try {
      const response = await fetch("/api/metadata", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const payload = await readJson<{ metadata: SubmissionMetadata }>(response);
      setPreview(payload.metadata);
      setUrl(payload.metadata.url);
      setPreviewedUrl(payload.metadata.url);
      setPreviewState("ready");
    } catch (error) {
      setPreview(null);
      setPreviewedUrl("");
      setPreviewError(
        error instanceof Error ? error.message : "That website could not be previewed.",
      );
      setPreviewState("error");
    }
  }

  async function handleSave() {
    if (!hasCurrentPreview || !user) return;
    const cleanName = displayName.trim();
    if (!cleanName) {
      setSaveState("error");
      setSaveMessage("Enter the name you want shown in the gallery.");
      return;
    }

    setSaveState("saving");
    setSaveMessage("");
    try {
      const response = await fetch("/api/submissions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url, displayName: cleanName }),
      });
      const payload = await readJson<{
        submission: PublicSubmission;
        updated: boolean;
      }>(response);
      setExisting(payload.submission);
      setDisplayName(payload.submission.displayName);
      setUrl(payload.submission.url);
      setPreviewedUrl(payload.submission.url);
      setSaveState("saved");
      setSaveMessage(
        payload.updated
          ? "Your Workshop 3 submission is updated."
          : "Your Workshop 3 submission is live in the gallery.",
      );
      await loadGallery();
    } catch (error) {
      setSaveState("error");
      setSaveMessage(
        error instanceof Error ? error.message : "Your submission could not be saved.",
      );
    }
  }

  return (
    <main>
      <header className="site-header">
        <a className="brand" href="#top" aria-label="AI Club at Oregon State home">
          <span className="brand-mark" aria-hidden="true">AI</span>
          <span>
            <strong>AI Club</strong>
            <small>Oregon State University</small>
          </span>
        </a>
        <nav aria-label="Primary navigation">
          <a href="#submit">Submit</a>
          <a href="#gallery">Gallery</a>
          {user ? (
            <a className="account-link" href={signOutPath}>Sign out</a>
          ) : (
            <a className="account-link" href={signInPath}>Sign in</a>
          )}
        </nav>
      </header>

      <section className="hero" id="top">
        <div className="hero-copy">
          <p className="eyebrow">Workshop 3 · Build and ship</p>
          <h1>Small ideas.<br /><span>Live websites.</span></h1>
          <p className="hero-lede">
            Explore what AI Club at Oregon State participants made in Workshop 3,
            then add the project you shipped.
          </p>
          <a className="text-link" href="#gallery">
            Browse the showcase <span aria-hidden="true">↓</span>
          </a>
        </div>
        <div className="hero-card" aria-label="Workshop 3 showcase details">
          <div className="hero-card-top">
            <span>03</span>
            <span>AI CLUB / OSU</span>
          </div>
          <div className="window-dots" aria-hidden="true"><i /><i /><i /></div>
          <div className="code-lines" aria-hidden="true">
            <span className="line line-a" />
            <span className="line line-b" />
            <span className="line line-c" />
            <span className="line line-d" />
            <span className="cursor" />
          </div>
          <div className="hero-card-bottom">
            <strong>FROM PROMPT</strong>
            <strong>TO PUBLISHED</strong>
          </div>
        </div>
      </section>

      <section className="submit-section" id="submit">
        <div className="section-intro">
          <p className="eyebrow">Add your work</p>
          <h2>Put your project on the board.</h2>
          <p>
            Share one public website. We will pull its title and description so
            you can check exactly how it will appear before saving.
          </p>
        </div>

        <div className="submit-panel">
          {!user ? (
            <div className="sign-in-state">
              <span className="step-number">01</span>
              <div>
                <h3>Sign in to submit</h3>
                <p>
                  Use ChatGPT to verify who you are. Your account keeps one current
                  Workshop 3 project, which you can update at any time.
                </p>
                <a className="primary-button" href={signInPath}>
                  Sign in with ChatGPT <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          ) : (
            <>
              <div className="signed-in-row">
                <div className="avatar" aria-hidden="true">
                  {user.displayName.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <small>Signed in with ChatGPT</small>
                  <strong>{user.displayName}</strong>
                </div>
                <a href={signOutPath}>Not you?</a>
              </div>

              {existingLoading ? (
                <div className="inline-status" role="status">
                  <span className="spinner" aria-hidden="true" /> Checking for your submission…
                </div>
              ) : existing ? (
                <div className="existing-banner">
                  <span>Current submission</span>
                  <p>
                    Edit the details below, preview again, and choose Update submission.
                  </p>
                </div>
              ) : null}

              <form onSubmit={handlePreview} noValidate>
                <label htmlFor="display-name">Display name</label>
                <input
                  id="display-name"
                  name="displayName"
                  type="text"
                  maxLength={80}
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value);
                    setSaveState("idle");
                  }}
                  placeholder="How your name should appear"
                  autoComplete="name"
                  required
                />

                <label htmlFor="website-url">Public website URL</label>
                <div className="url-row">
                  <input
                    id="website-url"
                    name="url"
                    type="url"
                    inputMode="url"
                    value={url}
                    onChange={(event) => {
                      setUrl(event.target.value);
                      setPreviewState("idle");
                      setSaveState("idle");
                    }}
                    placeholder="https://your-project.com"
                    aria-describedby="url-help"
                    required
                  />
                  <button type="submit" disabled={previewState === "loading"}>
                    {previewState === "loading" ? "Fetching…" : "Preview"}
                  </button>
                </div>
                <p className="field-help" id="url-help">
                  Public http or https pages only. Private and local addresses are blocked.
                </p>
              </form>

              {previewState === "error" ? (
                <div className="message error-message" role="alert">
                  <strong>We could not build that preview.</strong>
                  <span>{previewError}</span>
                </div>
              ) : null}

              {previewState === "loading" ? (
                <div className="preview-loading" role="status">
                  <span className="spinner" aria-hidden="true" />
                  <div><strong>Reading website metadata</strong><span>Checking the public page and its social details…</span></div>
                </div>
              ) : null}

              {preview && hasCurrentPreview ? (
                <div className="preview-wrap">
                  <div className="preview-heading">
                    <div><span>Metadata preview</span><small>This is what the gallery will show.</small></div>
                    <span className="ready-pill">Ready</span>
                  </div>
                  <MetadataCard metadata={preview} displayName={displayName || user.displayName} />
                  <button
                    className="save-button"
                    type="button"
                    onClick={handleSave}
                    disabled={saveState === "saving"}
                  >
                    {saveState === "saving"
                      ? "Saving…"
                      : existing
                        ? "Update submission"
                        : "Save to showcase"}
                  </button>
                </div>
              ) : null}

              {saveMessage ? (
                <div
                  className={`message ${saveState === "error" ? "error-message" : "success-message"}`}
                  role={saveState === "error" ? "alert" : "status"}
                >
                  <span>{saveMessage}</span>
                </div>
              ) : null}
            </>
          )}
        </div>
      </section>

      <section className="gallery-section" id="gallery">
        <div className="gallery-heading">
          <div>
            <p className="eyebrow">Participant gallery</p>
            <h2>Made in Workshop 3.</h2>
          </div>
          <span className="project-count">
            {galleryState === "ready" ? submissions.length : "–"} project{submissions.length === 1 ? "" : "s"}
          </span>
        </div>

        {galleryState === "loading" ? (
          <div className="gallery-loading" role="status">
            <span className="spinner" aria-hidden="true" /> Loading the showcase…
          </div>
        ) : galleryState === "error" ? (
          <div className="gallery-empty">
            <strong>The showcase is taking a breather.</strong>
            <p>{galleryError}</p>
            <button type="button" onClick={loadGallery}>Try again</button>
          </div>
        ) : submissions.length === 0 ? (
          <div className="gallery-empty">
            <span>01</span>
            <strong>The first spot is open.</strong>
            <p>Be the first Workshop 3 participant to add a live project.</p>
            <a href="#submit">Add your website</a>
          </div>
        ) : (
          <div className="gallery-grid">
            {submissions.map((submission, index) => (
              <article className="gallery-card" key={submission.id}>
                <div className="card-index">{String(index + 1).padStart(2, "0")}</div>
                <div className="card-body">
                  <div className="site-chip">{submission.siteName ?? hostnameFor(submission.url)}</div>
                  <h3>{preferredTitle({ ...submission, hostname: hostnameFor(submission.url) })}</h3>
                  <p>{preferredDescription({ ...submission, hostname: hostnameFor(submission.url) })}</p>
                </div>
                <div className="card-footer">
                  <div><strong>{submission.displayName}</strong><span>Updated {formatDate(submission.updatedAt)}</span></div>
                  <a
                    href={submission.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`Visit ${preferredTitle({ ...submission, hostname: hostnameFor(submission.url) })}`}
                  >
                    Visit <span aria-hidden="true">↗</span>
                  </a>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <footer>
        <div>
          <strong>AI Club</strong>
          <span>Oregon State University</span>
        </div>
        <p>Built together in Workshop 3.</p>
      </footer>
    </main>
  );
}

function MetadataCard({
  metadata,
  displayName,
}: {
  metadata: SubmissionMetadata;
  displayName: string;
}) {
  return (
    <div className="metadata-card">
      <div className="metadata-accent" aria-hidden="true">
        <span>{metadata.hostname.slice(0, 1).toUpperCase()}</span>
      </div>
      <div className="metadata-content">
        <span>{metadata.siteName ?? metadata.hostname}</span>
        <strong>{preferredTitle(metadata)}</strong>
        <p>{preferredDescription(metadata)}</p>
        <small>Submitted by {displayName || "Workshop participant"}</small>
      </div>
    </div>
  );
}
