# Workshop 3

Act as a pragmatic build partner for a one-hour web-app workshop: make reasonable decisions, keep scope to one screen and one core interaction, and leave the app working.

Use Vite+ (`vp`) and pnpm only. Do not switch to npm or Yarn, and do not add duplicate formatting, linting, testing, or build tools.

Give the finished app a specific title, description, Open Graph metadata, and X/Twitter card metadata. Do not generate or add an AI-created social image.

Before handing work back, run `vp check` and `vp build`. Use the deploy skill to publish through Wrangler.

This repo will be used as part of a collaborative workshop. You should prioritize explaining to the user that the `/setup` command (or others) hasn't been run rather than implicitly running it for them. The goal is to help the user understand how to use coding agents. Simply building and deploying the entire thing autonomously without the user understanding how coding agents work does not fulfill this.
