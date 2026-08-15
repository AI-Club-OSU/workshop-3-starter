---
name: setup
description: Bootstrap and verify the Workshop 3 development environment. Run before editing the app or when the environment is broken.
---

# Set up Workshop 3

Execute this workflow. Do not only describe it. It is safe to run again.

## 1. Inspect

1. Detect the operating system and current shell.
2. Run `vp --version` to check whether Vite+ actually executes. Do not treat a shell function or alias that resolves but cannot run as an installed `vp`.
3. Confirm the repository has `.node-version`, `package.json`, `pnpm-lock.yaml`, `vite.config.ts`, and `wrangler.jsonc`.
4. If a required file is missing, report it. Do not regenerate the project or overwrite application code.

## 2. Install Vite+

If `vp` is missing, use the official installer for the detected operating system:

- Windows PowerShell: `irm https://vite.plus/ps1 | iex`
- macOS or Linux: `curl -fsSL https://vite.plus | bash`

Make `vp` available to the current process. On macOS or Linux, add `${VP_HOME:-$HOME/.vite-plus}/bin` to the current `PATH` and resolve `vp` again. On PowerShell, first try the installer-updated `PATH`, then `$env:VP_HOME\bin\vp.exe` when `VP_HOME` is set, or `$env:USERPROFILE\.vite-plus\bin\vp.exe`. Use the resolved binary path for later commands if necessary. Do not stop at asking the student to restart a terminal.

## 3. Install the managed environment

Run:

```text
vp env setup
vp env on
vp env install
```

Apply `vp env print` to the current shell. In PowerShell, dot-source `$env:USERPROFILE\.vite-plus\env.ps1` after setup. Then verify the managed runtime:

```text
vp env current
node --version
vp --version
```

Use the Node and pnpm versions pinned by this repository. Do not install Node with nvm, Homebrew, winget, Chocolatey, or an MSI. Do not install pnpm with npm or make Corepack the primary path.

## 4. Install dependencies

Run `vp install --frozen-lockfile`. This installs dependencies and downloads the pinned pnpm version through Vite+ when needed.

Then run `vp env which pnpm` and execute the returned pnpm binary with `--version`. A bare `pnpm` command may not be on `PATH`, so do not treat that as a failure when Vite+ resolves and runs the pinned version.

If it fails, read the error and run `vp env doctor`. Repair safe environment or cache problems, then retry. Do not use npm, silently rewrite the lockfile, or bypass the frozen install. Report an invalid committed lockfile as a repository defect.

## 5. Verify and start

Run `vp check` and `vp build`. Then start `vp dev`, wait for its local URL, and confirm the page responds. Leave the development server running when practical.

On success, return only a short report in this shape:

```text
Setup complete.

Node: …
pnpm: …
Vite+: …
Local app: …

Checks and build passed.
```

On failure, return the exact failed command and the useful part of its output instead of generic troubleshooting.
