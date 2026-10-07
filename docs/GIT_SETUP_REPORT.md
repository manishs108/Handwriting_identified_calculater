# CalcInk Git/GitHub Setup Report

## Project
Project path: `/Users/sabajitboro/Documents/interIITproject/calcink`
Project name: `calcink` (CalcInk — On-Device Handwritten Math Calculator)
Framework: React 19 with Vite 8

## Git
Git version: `git version 2.54.0 (Apple Git-157)`
Repository initialized: Yes; initialized locally during this setup
Current branch: `main`
Existing commits: None
Existing remote: None
Tags: None
Working tree: Project files are untracked; `node_modules/` is ignored

## GitHub CLI
Installed: No (`gh` was not available during this audit)
Version: Not available
Authentication status: Not checked; GitHub CLI installation is awaiting approval

## Git Identity
Configured name: `sabajitboro0-sudo` (global; user elected to keep)
Configured email: `sabajitboro0@gmail.com` (global; user elected to keep)
Repository-local name/email: Not set; Git inherits the global values

## Package Manager
Package manager: npm (`package-lock.json` present; no pnpm, Yarn, or Bun lockfile)
Node version: `v24.11.1`
Package manager version: npm `11.6.2`

## Repository Safety
.gitignore: Existing rules preserved. Added `.env`, `.env.*`, `!.env.example`, `*.pem`, and `*.key`.
Secret scan: No candidate credentials, environment files, or key files found in the project files scanned. The broad keyword scan had ordinary source-code matches only.
Large file scan: Largest project files are the ONNX models: `decoder_int8.onnx` ~3.93 MiB and `encoder_int8.onnx` ~3.30 MiB. Both are below GitHub's normal 100 MB per-file limit. No other unusually large files were found.

## Model Files
Model location: `public/models/comer/`
Encoder: `encoder_int8.onnx` (~3.30 MiB)
Decoder: `decoder_int8.onnx` (~3.93 MiB)
Vocabulary: `vocab.json` (under 1 KiB)
Runtime: `onnxruntime-web` dependency; recognition code requests the ONNX Runtime WASM execution provider. Runtime assets come from the npm dependency.
Tracked/untracked: The repository has no commits, so all three model assets are currently untracked and will be included by Git unless ignored later. None are ignored by `.gitignore`.
Clean-clone readiness: Source and model assets are present in this project. A clean clone can install dependencies from the npm lockfile and has the model paths expected by the recognition code.

## Reproducibility
Install command: `npm ci` (or `npm install`)
Dev command: `npm run dev`
Test command: Not defined in `package.json`
Lint command: `npm run lint`
Type check command: Not defined in `package.json`
Build command: `npm run build`
Preview command: `npm run preview`

## Recommended Collaboration Workflow

```text
main
↓
feature branches (one per person's actual work)
↓
commits by the person who did the work
↓
pull requests
↓
review
↓
merge to main
```

Use separate feature branches for each person's work, with attributable commits and review through pull requests. Keep contribution balance genuine by splitting actual tasks and reviewing each other's changes; do not manufacture commits or use another person's identity.

## Problems Found
- GitHub CLI is not installed, so GitHub authentication and HTTPS/SSH configuration could not be checked. Homebrew is installed; the requested CLI installation is awaiting approval.
- No remote is configured, so there is no current GitHub/GitLab connection or transport to report.
- No test or type-check scripts are defined.
- This project had no Git repository before setup. It now has an empty local `main` branch and no commits.

## Actions Performed
- Initialized a local Git repository on `main`; did not add or commit files.
- Preserved the existing `.gitignore` contents and added ignores for environment and private key files.
- Created this setup report.
- Did not create a remote repository, push code, create a release, deploy, or change application functionality.
