# NextFlow — Node Contracts

Each node has a defined set of inputs and a single output.
Inputs can be provided by the **user** (form field) or by **connecting** another node's output handle to the input handle.
An edge is only valid when the **output type** of the source node matches the **expected type** of the target handle.

---

## Output Types

| Type    | Description                                      | Colour tag |
|---------|--------------------------------------------------|------------|
| `Text`  | A plain UTF-8 string                             | 🔵 blue    |
| `Image` | A publicly accessible URL pointing to an image  | 🟣 purple  |
| `Video` | A publicly accessible URL pointing to a video   | 🟠 orange  |

---

## Compatibility Matrix

| Source output → | `Text` input | `Image` input | `Images[]` input | `Video` input |
|-----------------|:---:|:---:|:---:|:---:|
| **Text**        | ✅  | ❌  | ❌  | ❌  |
| **Image**       | ❌  | ✅  | ✅  | ❌  |
| **Video**       | ❌  | ❌  | ❌  | ✅  |

> `Images[]` is a multi-connection handle — you can connect multiple `Image` outputs to it and they are collected into an array.

---

## Nodes

---

### TextNode

**Purpose:** Provides a static text value to downstream nodes.

#### Inputs

| Field  | Handle ID | Type   | Source        | Required |
|--------|-----------|--------|---------------|----------|
| `text` | —         | `Text` | User (textarea) | No (defaults to `""`) |

> No target handles — this node cannot receive connections.

#### Output

| Handle ID | Type   | Value                        |
|-----------|--------|------------------------------|
| `output`  | `Text` | The exact string typed by the user |

---

### UploadImageNode

**Purpose:** Uploads a local image file to cloud storage and exposes its public URL.

#### Inputs

| Field       | Handle ID | Type          | Source                  | Required |
|-------------|-----------|---------------|-------------------------|----------|
| `file`      | —         | File (binary) | User (file picker: PNG, JPG, WEBP) | Yes |

> No target handles — this node cannot receive connections.

#### Output

| Handle ID | Type    | Value                                       |
|-----------|---------|---------------------------------------------|
| `output`  | `Image` | CDN URL of the uploaded image (from Transloadit) |

---

### UploadVideoNode

**Purpose:** Uploads a local video file to cloud storage and exposes its public URL.

#### Inputs

| Field  | Handle ID | Type          | Source                          | Required |
|--------|-----------|---------------|---------------------------------|----------|
| `file` | —         | File (binary) | User (file picker: MP4, MOV, WebM) | Yes |

> No target handles — this node cannot receive connections.

#### Output

| Handle ID | Type    | Value                                       |
|-----------|---------|---------------------------------------------|
| `output`  | `Video` | CDN URL of the uploaded video               |

---

### RunLLMNode

**Purpose:** Sends a prompt (with optional images) to a Gemini model and returns the text response.

#### Inputs

| Field           | Handle ID       | Type      | Source                                          | Required |
|-----------------|-----------------|-----------|-------------------------------------------------|----------|
| `model`         | —               | Enum      | User (dropdown: Gemini 2.5 Flash / Flash-Lite)  | Yes (defaults to Gemini 2.5 Flash) |
| `system_prompt` | `system_prompt` | `Text`    | User (textarea) **or** connected `Text` output  | No       |
| `user_message`  | `user_message`  | `Text`    | User (textarea) **or** connected `Text` output  | Yes      |
| `images`        | `images`        | `Image[]` | Connected `Image` outputs (multiple allowed)    | No       |

> When a handle receives a connection its form field is hidden and the value is supplied by the upstream node at runtime.

#### Output

| Handle ID | Type   | Value                          |
|-----------|--------|--------------------------------|
| `output`  | `Text` | The LLM's text response string |

---

### CropImageNode

**Purpose:** Crops an image to a percentage-based region and returns the cropped image URL.

#### Inputs

| Field            | Handle ID | Type    | Source                             | Required |
|------------------|-----------|---------|------------------------------------|----------|
| `image_url`      | `image`   | `Image` | Connected `Image` output           | **Yes** (Run button is disabled without it) |
| `x_percent`      | —         | Number  | User (number input, 0–100)         | No (defaults to `0`)   |
| `y_percent`      | —         | Number  | User (number input, 0–100)         | No (defaults to `0`)   |
| `width_percent`  | —         | Number  | User (number input, 0–100)         | No (defaults to `100`) |
| `height_percent` | —         | Number  | User (number input, 0–100)         | No (defaults to `100`) |

#### Output

| Handle ID | Type    | Value                         |
|-----------|---------|-------------------------------|
| `output`  | `Image` | URL of the cropped image      |

---

### ExtractFrameNode

**Purpose:** Extracts a single frame from a video at a given timestamp and returns it as an image URL.

#### Inputs

| Field       | Handle ID | Type    | Source                             | Required |
|-------------|-----------|---------|------------------------------------|----------|
| `video_url` | `video`   | `Video` | Connected `Video` output           | **Yes** (Run button is disabled without it) |
| `timestamp` | —         | Text    | User (text input, e.g. `"5"` or `"00:01:30"`) | No (defaults to `"0"`) |

#### Output

| Handle ID | Type    | Value                                    |
|-----------|---------|------------------------------------------|
| `output`  | `Image` | URL of the extracted frame as an image   |

---

## Valid Connection Examples

```
TextNode ──────────────────────────► RunLLMNode (user_message)
TextNode ──────────────────────────► RunLLMNode (system_prompt)
UploadImageNode ───────────────────► RunLLMNode (images)
UploadImageNode ───────────────────► CropImageNode (image)
UploadVideoNode ───────────────────► ExtractFrameNode (video)
CropImageNode ─────────────────────► RunLLMNode (images)
ExtractFrameNode ──────────────────► RunLLMNode (images)
ExtractFrameNode ──────────────────► CropImageNode (image)
```

## Invalid Connection Examples

```
TextNode          ──✗──► CropImageNode (image)       — Text ≠ Image
TextNode          ──✗──► ExtractFrameNode (video)    — Text ≠ Video
UploadImageNode   ──✗──► RunLLMNode (user_message)   — Image ≠ Text
UploadImageNode   ──✗──► ExtractFrameNode (video)    — Image ≠ Video
UploadVideoNode   ──✗──► RunLLMNode (images)         — Video ≠ Image
UploadVideoNode   ──✗──► CropImageNode (image)       — Video ≠ Image
RunLLMNode        ──✗──► CropImageNode (image)       — Text ≠ Image
```
