# Workshop 3

You are going to build and publish a small web app with a coding agent.

## 1. Set up

Clone this repository, open it in your coding agent, and run:

`/setup`

If your agent does not support slash commands, tell it:

> Read `.agents/skills/setup/SKILL.md` and execute it completely.

Open the local URL when setup finishes. You should see the Workshop 3 starter screen.

## 2. Build

Tell the agent:

> Build [YOUR IDEA] as a polished one-screen web app. Keep it small enough to finish today. Make reasonable decisions, build the first working version, and do not stop after planning.

### Need an idea?

- A tip splitter that updates each person's share as you type.
- A pomodoro timer with a big countdown and a satisfying finished state.
- A decision maker that dramatically picks from the options you enter.
- A reaction game that measures how quickly you click when the screen changes.
- A unit converter for something you use, like recipes or running paces.

## 3. Inspect and steer

Actually use the app. Click everything and try it on a narrow screen.

Then ask the agent to fix the single biggest problem you notice. Check the result before asking for the next improvement.

## 4. Deploy

Run:

`/deploy`

Open the public URL it prints and try the main interaction again.

If you are not signed in to Cloudflare, Wrangler will create a temporary public deployment. Open the private claim link within 60 minutes to keep it. If you do not claim it, the deployment will disappear.

## Stuck?

Run `/setup` again.

Tell the agent not to switch away from Vite+ or pnpm. It should run `vp env doctor` and fix the actual environment problem.
