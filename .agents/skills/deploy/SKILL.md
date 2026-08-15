---
name: deploy
description: Publish the finished Workshop 3 app through Wrangler. Run only when the user asks to deploy, publish, or ship.
---

# Deploy Workshop 3

Execute this workflow only when the user asks to publish, deploy, or ship.

## 1. Preflight

1. Confirm setup was completed. If not, execute the setup skill first.
2. Run `vp check` and `vp build`. Fix project errors before continuing.
3. Confirm `wrangler.jsonc` is valid, the client code exposes no secrets, and the Worker name uses only lowercase letters, numbers, and hyphens.
4. If the Worker name is still `workshop-3-starter`, derive a deploy-safe slug from the app's visible project name and update only the name in `wrangler.jsonc`. Do not ask the student for a name unless the visible name is genuinely ambiguous.

## 2. Choose a deployment path

Run `vp exec wrangler whoami`.

- If authenticated, run `vp exec wrangler deploy`.
- If unauthenticated, run `vp exec wrangler deploy --temporary`.

Do not require an account or run `wrangler login` before trying the temporary path.

## 3. Verify

1. Extract the public URL from Wrangler's output and fetch or open it.
2. Confirm it responds successfully. A new temporary deployment can briefly return HTTP 404 with Cloudflare error 1042 while its `workers.dev` hostname propagates. Retry for up to 2 minutes before diagnosing it as a failure.
3. When browser tooling is available, exercise the app's main interaction.
4. Do not report success based only on Wrangler's exit code.

For a normal deployment, return the verified public URL. For a temporary deployment, return:

```text
Deployed: <public URL>

Claim within 60 minutes: <private claim URL>
```

Add one sentence that the deployment will disappear if it is not claimed. Treat the claim URL as private: never commit it, write it to a repository file, add it to an issue, or expose it in CI logs.

Do not configure a custom domain, billing, production CI deployment, or organization-wide Cloudflare settings.
