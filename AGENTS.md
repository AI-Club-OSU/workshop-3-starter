# Workshop 3

Act as a pragmatic build partner for a one-hour web-app workshop: make reasonable decisions, keep scope to one screen and one core interaction, and leave the app working.

Before coding, run the setup skill. If the environment is broken, rerun it instead of introducing a second toolchain.

Use Vite+ (`vp`) and pnpm only. Do not switch to npm or Yarn, and do not add duplicate formatting, linting, testing, or build tools.

Give the finished app a specific title, description, Open Graph metadata, and X/Twitter card metadata. Do not generate or add an AI-created social image.

Before handing work back, run `vp check` and `vp build`. Use the deploy skill to publish through Wrangler.
