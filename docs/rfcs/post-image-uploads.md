# Post Image Uploads

## Metadata

- Title: Post image uploads
- Date: 2026-03-10
- Author: Codex
- Status: implemented

## Problem Statement

Knowledge/help posts sometimes need screenshots or reference images. The project needed a simple upload capability without introducing production-grade storage complexity.

## Goals

- Allow authenticated users to attach images to their own posts.
- Keep the implementation small enough for an academic project.

## Non-Goals

- Video upload.
- Cloud storage, thumbnails, drag-and-drop, or media reordering.

## Proposal

Store uploaded files on local disk under a runtime uploads folder served by Express, and store only image metadata in the `Post` document. Keep post creation/edit as JSON routes and add separate media-management endpoints for upload and removal.

## Scope

- In scope:
  - up to 4 images per post
  - create/edit modal support
  - feed first-image preview
  - full gallery on post detail
- Out of scope:
  - comment attachments
  - videos
  - external storage providers

## Decisions Requested From Developer

- Media scope:
  - Options: images only; images + videos; images now with later video plan
  - Recommended option: images only
  - Tradeoffs: lowest effort and least validation/rendering complexity
- Storage:
  - Options: disk + metadata; MongoDB binary; external cloud
  - Recommended option: disk + metadata
  - Tradeoffs: simplest practical option for an academic project
- Media edit rule:
  - Options: replace full list; add only; separate media endpoints
  - Recommended option: separate media endpoints
  - Tradeoffs: slightly more API work, but simpler state management than multipart post edit payloads

## Chosen Decisions and Rationale

- Chosen option:
  - images only
  - local disk + MongoDB metadata
  - separate upload/remove endpoints
- Why this option:
  - matches the project’s low-effort academic goal while still delivering real uploads
- Assumptions (if any):
  - only post authors can manage post media
  - moderators/admins keep delete-post powers only

## Implementation Notes

- The shared post modal uses a simple native file input with `multiple`, but repeated selections now accumulate into one temporary client-side list until the post reaches the 4-image limit.
- Each temporary selection item renders a local preview, file name, and remove control before upload.
- Ordering stays simple: new selections keep insertion order, and on edit the already-saved images remain first while newly selected images are appended after them.
- On feed cards, the first saved image remains the only preview image, but posts with additional saved images now expose that overflow through a compact `+N` overlay on top of the preview.

## API and Interface Impact

- New/changed endpoints:
  - `POST /api/v1/posts/:id/media`
  - `DELETE /api/v1/posts/:id/media/:mediaId`
- Request/response contract changes:
  - post/feed responses now include `media[]`
  - upload route uses `multipart/form-data`
- Auth/role implications:
  - upload/remove require authenticated post owner

## Data Model Impact

- Model/schema/index changes:
  - `Post.media[]` stores image metadata and storage path
- Migration/backfill needs:
  - none; existing posts default to empty media arrays

## Alternatives Considered

- Option A:
  - store image bytes in MongoDB
- Option B:
  - use Cloudinary/S3

## Risks and Mitigations

- Risk:
  - orphan files if disk deletion fails
- Mitigation:
  - best-effort cleanup on media removal and post deletion; keep runtime storage local and disposable

## Rollout Plan

Ship as a normal feature update. Rollback is removing the new endpoints/UI and deleting the runtime uploads folder.

## Acceptance Criteria

1. Users can upload up to 4 images to their own post.
2. Feed and post detail responses expose `media[]`.
3. Feed shows the first image preview and post detail shows the full image list.
4. Deleting a post removes its stored images.

## Test Plan

- Unit/service tests:
  - validate max-image limit and ownership checks
- API integration checks:
  - upload success, remove success, invalid type/size, unauthorized user
- Frontend/manual checks:
  - create modal accumulates repeated image selections up to 4, with preview and remove controls
  - edit modal keeps saved images first, appends newly selected images after them, and re-enables selection when a saved or temporary image is removed
  - partial-success message, gallery rendering

## Documentation Updates Required

- [ ] `AGENTS.md` if agent behavior/process changed
- [x] `docs/architecture/*`
- [x] `docs/api/*`
- [ ] `docs/workflows/*` if process changed
- [x] release notes
