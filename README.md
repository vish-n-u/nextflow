# NextFlow

A visual node-based workflow editor that lets you build and run automated AI pipelines by connecting nodes on a canvas. Upload images and videos, process them with FFmpeg transforms, and chain everything through Gemini language models — all executing in parallel in the cloud.

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Node Types](#node-types)
- [Canvas & Connection Rules](#canvas--connection-rules)
- [Execution Engine](#execution-engine)
- [Run Modes](#run-modes)
- [Real-Time Status Updates](#real-time-status-updates)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Environment Variables](#environment-variables)
- [Local Setup](#local-setup)
- [Canvas Controls](#canvas-controls)
- [Architecture Decisions](#architecture-decisions)

---

## Overview

NextFlow is a full-stack Next.js application where users design workflows on a React Flow canvas. Each node in the workflow represents a discrete operation (upload a file, run an LLM, crop an image, extract a video frame). Edges wire node outputs into downstream node inputs, and a cloud execution engine runs nodes in the correct topological order — with parallel execution within each level — streaming per-node status back to the UI in real time.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| UI | React 19, Tailwind CSS v4, shadcn/ui, Radix UI |
| Canvas | React Flow (`@xyflow/react`) |
| Auth | Clerk |
| Database | PostgreSQL via Prisma ORM |
| State Management | Zustand |
| Background Jobs | Trigger.dev v4 |
| AI Model | Google Gemini (`@google/generative-ai`) |
| Media Processing | FFmpeg (via `@trigger.dev/build/extensions/core`) |
| File Storage | Transloadit (CDN upload after local FFmpeg processing) |
| Validation | Zod |

---

## Project Structure

```
src/
  app/
    page.tsx                        # Landing page
    dashboard/
      page.tsx                      # Redirects to WorkflowsHome
      [id]/page.tsx                 # Workflow editor (loads DashboardShell)
      new/page.tsx                  # Creates new workflow, redirects to [id]
      _components/
        WorkflowsHome.tsx           # Dashboard grid with SVG workflow previews
        DashboardShell.tsx          # Main editor layout: canvas + sidebars + toolbar
        FlowCanvas.tsx              # React Flow canvas, node rendering, edge validation
        LeftBar.tsx                 # Node palette — drag nodes onto canvas
        RightBar.tsx                # Selected node config panel
        TopBar.tsx                  # Run controls, save, workflow name
        edges/GlowEdge.tsx          # Custom animated edge component
        nodes/
          TextNode.tsx              # Node UI components (one per node type)
          UploadImageNode.tsx
          UploadVideoNode.tsx
          RunLLMNode.tsx
          CropImageNode.tsx
          ExtractFrameNode.tsx
          RunStatus.tsx             # Per-node status badge overlay
          WorkflowRunContext.ts     # React context for active run state
          nodeStatus.ts             # Node status helpers
          trackSingleRun.ts         # Polls run status for single-node runs
          componentRegistry.ts      # Maps node type strings to React components
    api/
      workflows/route.ts            # GET (list), POST (create)
      workflows/[id]/route.ts       # GET, PATCH (save), DELETE
      runs/route.ts                 # POST (start run)
      runs/[id]/route.ts            # GET (run status + node results)
      nodes/run/route.ts            # POST (single-node run)

  lib/
    nodeRegistry.ts                 # Node metadata: types, handles, validation, defaults
    nodeContracts.ts                # Handle type map + connection validator
    nodeColors.ts                   # Color per node type for canvas and SVG previews
    models.ts                       # LLM model list and defaults
    prisma.ts                       # Prisma client singleton
    with-auth.ts                    # Clerk auth wrapper for API routes
    errors.ts                       # Typed API error helpers
    stores/
      workflowsStore.ts             # Zustand store: workflow list, pagination
      runsStore.ts                  # Zustand store: active run polling
    api/
      workflows/                    # list-workflows.ts, get-workflow.ts, save-workflow.ts
      runs/                         # create-run.ts, get-run-or-throw.ts, complete-run.ts, transform-run.ts, get-runs.ts
    zod/schemas/                    # Zod schemas for workflows, nodes, runs

  trigger/
    orchestrator.ts                 # Orchestrator task + node-runner task
    taskRegistry.ts                 # Maps node types to Trigger.dev tasks + Zod schemas
    text.ts                         # Text node task
    uploadImage.ts                  # Image upload task (Transloadit)
    uploadVideo.ts                  # Video upload task (Transloadit)
    runLLM.ts                       # Gemini LLM task
    cropImage.ts                    # FFmpeg image crop task
    extractFrame.ts                 # FFmpeg video frame extraction task

prisma/
  schema.prisma                     # Database schema (User, Workflow, Run, NodeRun)

trigger.config.ts                   # Trigger.dev config with FFmpeg build extension
```

---

## Node Types

There are six node types organised into three categories:

### Input

| Node | Type ID | Output | Description |
|---|---|---|---|
| Text | `textNode` | `text` | Static text value, passed downstream as a string |
| Upload Image | `uploadImageNode` | `image` | Uploads a local image file; outputs a CDN URL |
| Upload Video | `uploadVideoNode` | `video` | Uploads a local video file; outputs a CDN URL |

### AI

| Node | Type ID | Inputs | Output | Description |
|---|---|---|---|---|
| Run LLM | `runLLMNode` | `system_prompt` (text), `user_message` (text), `images` (image, multi) | `text` | Sends a prompt to Google Gemini. Supports vision (attach images). Selectable model. |

### Transform

| Node | Type ID | Input | Output | Description |
|---|---|---|---|---|
| Crop Image | `cropImageNode` | `image_url` (image) | `image` | Crops a region of an image using FFmpeg. Parameters: `x_percent`, `y_percent`, `width_percent`, `height_percent` (all 0–100). |
| Extract Frame | `extractFrameNode` | `video_url` (video), `timestamp` (text) | `image` | Extracts a single frame from a video using FFmpeg. Timestamp can be seconds (`12.5`) or percentage (`50%`). |

---

## Canvas & Connection Rules

- Connections are **type-safe**: an edge from a node's output is only accepted if the target handle expects the same data type (`text`, `image`, or `video`).
- The validation is enforced client-side via `isValidHandleConnection()` in `src/lib/nodeContracts.ts`, which checks the `NODE_REGISTRY` handle type maps.
- The canvas enforces a **DAG** (no cycles allowed by React Flow).
- The `images` handle on the LLM node accepts **multiple incoming edges** — all connected image outputs are collected into an array.
- Edges render as animated glow curves (`GlowEdge`) with color-coded strokes matching the source node type.

---

## Execution Engine

Workflow execution is handled entirely by Trigger.dev background tasks. The flow is:

```
API route POST /api/runs
  └─► orchestratorTask.trigger(nodes, edges)
        └─► buildLevels()           ← backward-leveling algorithm
              └─► for each level:
                    batchTrigger() all nodes in the level concurrently
                    subscribeToBatch() → update status per node as it finishes
                    └─► nodeRunnerTask (one per node)
                          └─► taskRegistry lookup
                                └─► individual task (text / uploadImage / runLLM / etc.)
```

### Backward-Leveling Algorithm

The orchestrator uses a **backward-leveling** (depth-from-end) algorithm to determine execution order:

1. Terminal nodes (no outgoing edges) get depth `0`.
2. Every other node gets depth `max(successor depths) + 1`.
3. Nodes are grouped by depth, then sorted **highest depth first** — so nodes that feed the most downstream consumers run first.
4. All nodes within the same level are **independent** and run in parallel.

This replaces the earlier Kahn's algorithm (BFS topological sort) and is more efficient because it naturally produces maximally-parallel levels without needing a separate queue.

### Per-Node Execution

Each node in a level is dispatched as a separate Trigger.dev `nodeRunnerTask` invocation via `batchTrigger`. The node runner:

1. Looks up the node type in `TASK_REGISTRY`.
2. Validates and parses the node's `data` with the registered Zod schema.
3. Calls `task.triggerAndWait()` on the specific leaf task.
4. Returns `{ nodeId, output }` on success, or throws on failure.

Upstream node outputs are injected into downstream node `data` before dispatch — the orchestrator wires edges into the `data` object so each node receives its required inputs automatically.

---

## Run Modes

| Mode | How to trigger | Behavior |
|---|---|---|
| **Full run** | Click "Run" with no nodes selected, or in pan mode | Runs every node in the workflow |
| **Partial run** | Switch to Select tool, select 1+ nodes, click "Run" | Runs only the selected nodes and their upstream dependencies |
| **Single-node run** | Right-click a node (or dedicated action) | Runs exactly one node in isolation |

The mode is determined by `RunScope` (`full` / `partial` / `single`) stored in the `Run` record and passed to the orchestrator.

Selecting a node in the default **pan mode** does not activate partial-run — you must explicitly switch to the **Select tool** first.

---

## Real-Time Status Updates

The UI subscribes to live run status without polling the database:

1. The orchestrator uses `metadata.set()` + `metadata.flush()` to write per-node statuses to Trigger.dev's realtime metadata store after each node completes.
2. The frontend polls `GET /api/runs/[id]` which reads the Trigger.dev run's live metadata and merges it with the DB record.
3. Node status badges on the canvas update immediately when a node finishes — not when the entire level completes.

Statuses per node: `running` → `success` or `error`.

The orchestrator identifies each node in the batch stream by reading `run.output.nodeId` (on success) or `run.payload.nodeId` (on failure, since `output` is absent). A deduplication guard (`nodeStatuses[nodeId] !== "running"`) ensures each node is processed exactly once even though `subscribeToBatch` emits multiple events per run.

---

## Database Schema

```
User
  id          String (Clerk userId)
  email       String?
  workflows   Workflow[]
  runs        Run[]

Workflow
  id          String (cuid)
  name        String
  userId      String → User
  nodes       Json   (React Flow node array)
  edges       Json   (React Flow edge array)
  createdAt   DateTime
  updatedAt   DateTime
  runs        Run[]

Run
  id           String (cuid)
  workflowId   String? → Workflow
  userId       String → User
  status       RunStatus (running | success | failed | partial)
  scope        RunScope  (full | partial | single)
  triggerRunId String?   (Trigger.dev run ID)
  startedAt    DateTime
  completedAt  DateTime?
  durationMs   Int?
  nodeRuns     NodeRun[]

NodeRun
  id          String (cuid)
  runId       String → Run
  nodeId      String (React Flow node id)
  nodeType    String
  status      NodeStatus (pending | running | success | failed)
  input       Json?
  output      Json?
  error       String?
  startedAt   DateTime
  completedAt DateTime?
  durationMs  Int?
```

---

## API Routes

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/workflows` | List workflows for the authenticated user (paginated) |
| `POST` | `/api/workflows` | Create a new workflow |
| `GET` | `/api/workflows/[id]` | Fetch a single workflow with all nodes/edges |
| `PATCH` | `/api/workflows/[id]` | Save updated nodes/edges (and optionally rename) |
| `DELETE` | `/api/workflows/[id]` | Delete a workflow |
| `POST` | `/api/runs` | Start a full or partial workflow run |
| `GET` | `/api/runs/[id]` | Get run status + per-node results (live metadata merged) |
| `POST` | `/api/nodes/run` | Start a single-node run |

All routes are protected by Clerk authentication via the `withAuth` wrapper.

---

## Environment Variables

Create a `.env` file in the project root:

```env
# Database
DATABASE_URL=postgresql://...

# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_...
CLERK_SECRET_KEY=sk_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up

# Trigger.dev
TRIGGER_SECRET_KEY=tr_...

# Google Gemini
GOOGLE_GENERATIVE_AI_API_KEY=...

# Transloadit (file storage / CDN)
TRANSLOADIT_KEY=...
TRANSLOADIT_SECRET=...

# FFmpeg (set automatically by Trigger.dev build extension in production)
# FFMPEG_PATH=/usr/bin/ffmpeg
# FFPROBE_PATH=/usr/bin/ffprobe
```

`FFMPEG_PATH` and `FFPROBE_PATH` are injected automatically in Trigger.dev cloud workers via the `ffmpeg()` build extension in `trigger.config.ts`. For local dev, ensure FFmpeg is on your `PATH`.

---

## Local Setup

```bash
# 1. Install dependencies
npm install

# 2. Set up environment variables
cp .env.example .env   # then fill in values

# 3. Push database schema
npx prisma db push

# 4. Start Next.js dev server
npm run dev

# 5. In a separate terminal, start the Trigger.dev dev worker
npx trigger.dev@latest dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Canvas Controls

| Action | Control |
|---|---|
| Pan canvas | Middle-click drag, or switch to Pan mode (H key) |
| Select mode | S key, or click the Select tool in the toolbar |
| Select nodes | Click or drag-select in Select mode |
| Delete selected | Backspace / Delete |
| Save workflow | Ctrl+S (or Cmd+S on Mac) |
| Add node | Drag from the Left Bar onto the canvas |
| Configure node | Click any node to open the Right Bar |
| Run full workflow | Click "Run" in the Top Bar with no selection |
| Run selected nodes | Select nodes in Select mode, then click "Run" |

---

## Architecture Decisions

**Why backward-leveling instead of Kahn's?**
Kahn's BFS produces a valid topological order but doesn't naturally group independent nodes into parallel batches. Backward-leveling assigns each node a depth-from-end value, which directly groups nodes into maximally-parallel levels without extra bookkeeping.

**Why `batchTrigger` + `subscribeToBatch` instead of `batchTriggerAndWait`?**
`batchTriggerAndWait` is all-or-nothing — it blocks until every node in the batch completes, so the UI sees all nodes jump from `running` to done simultaneously. `batchTrigger` + `subscribeToBatch` lets the orchestrator react to each node's completion independently via a realtime async iterator, updating metadata immediately so the UI reflects each node's true finish time.

**Why FFmpeg instead of Transloadit for image/video transforms?**
Transloadit's crop and frame-extraction APIs require round-tripping files to an external service and are billed per operation. FFmpeg runs inside the Trigger.dev worker process via temp files, giving full control over filter expressions (e.g., percentage-based crop via `trunc(iw*fraction)`) with zero per-operation cost. Transloadit is still used for CDN upload after local processing.

**Why no retries on the orchestrator?**
The orchestrator is configured with `retry: { maxAttempts: 1 }`. A retry would re-execute every node from scratch, including ones that already succeeded. Node-level retries are instead configured on individual leaf tasks, so only the failing node is retried.

**Type-safe edges**
Handle types (`text`, `image`, `video`) are defined once in `nodeRegistry.ts` and shared between the canvas (connection validation) and the orchestrator (output wiring). This prevents mismatched types from being connected and ensures the data flowing between nodes is always the expected shape.
