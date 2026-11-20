# Resume Movement Sandbox

**[Play in browser](https://resume-movement-sandbox.vercel.app/)**

Desktop only. A keyboard is required to play.

An interactive résumé built with Phaser 3, TypeScript, and Vite. Play through three keyboard-controlled levels inspired by cable installation, autonomous vehicle testing, and data center operations.

## Run locally

Requirements: Node.js 18 or newer and pnpm 11.

If pnpm is not installed, enable it through Corepack:

```bash
corepack enable
corepack prepare pnpm@11.9.0 --activate
```

Install dependencies and start the development server from the project directory:

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`. Press `Control+C` to stop the server.

## Controls

- Move: `A` / `D` or Left / Right Arrow
- Jump: `W`, Up Arrow, or Space
- Reset: the button in the top-right corner
- Skip a level: select **Skip Level**
- Background music: press `M` to mute or unmute

## Music license

“Coffee House Bump” by OatCog is available under the CC0 1.0 Universal public-domain dedication from [OpenGameArt](https://opengameart.org/content/coffee-house-bump). Attribution is not required. The repository copy is converted from the original WAV to a 128 kbps MP3 for web delivery.

## Production build

```bash
pnpm build
pnpm preview
```

The production files are written to `dist/`.

## Structure

- `SandboxScene` owns the ground, collision, resizing, and reset flow.
- `PlayerControls` translates supported keys into a small intent object.
- `StickFigurePlayer` owns physics, movement, procedural drawing, and walking poses.
- `PlayerAccessory` is the extension point for props such as the hard hat and ladder.
