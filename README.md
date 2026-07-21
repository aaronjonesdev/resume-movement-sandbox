# Resume Movement Sandbox

A first technical prototype for a minimalist browser-based interactive resume. This version contains only a graphics-primitive stick figure, movement, jumping, gravity, collision, and reset behavior.

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
- `PlayerAccessory` is the extension point for future hats, headphones, vests, and tools; no accessories are enabled in this prototype.
