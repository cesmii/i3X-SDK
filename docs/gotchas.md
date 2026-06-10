---
sidebar_position: 5
---

# Gotchas

The i3X API is concise, but a few of its rules may seem counterintuitive on first read -- there's logic behind each, but they're worth explaining. Each item below is normative behavior from the [Implementation Guide](https://github.com/cesmii/i3X/blob/1.0/spec/IMPLEMENTATION_GUIDE.md) — not server quirks.

## Reading Values

### `maxDepth: 0` means infinite, `maxDepth: 1` means none

The default (`1`) returns only the element's own value with **no** recursion. `0` requests the *entire* composition tree (subject to server limits). Higher numbers recurse that many levels. If you assumed `0` meant "no children," you'll silently request everything.

### `maxDepth` never follows hierarchical children

Recursion applies to `HasComponent` (composition) relationships **only**. Objects related via `HasChildren` are independent and are *never* included in a `POST /objects/value` response, no matter how large `maxDepth` is — even though they sit under the same parent in a tree view. Query hierarchical children with their own `elementIds`.

### `isComposition: false` does not mean "scalar value"

An object with no components can still return a structured value. The authoritative signal for value shape is the ObjectType's `schema.type`: a scalar type (`"number"`, `"string"`, …) is a leaf returning a bare value; `"object"` is a branch returning structure. Conversely, `isComposition: true` in a default-depth (`maxDepth: 1`) result means components exist but **were not fetched** — re-query with `maxDepth: 0` to get them.

### `value: null` is constrained, not free-form

A null `value` must be paired with `quality: "Bad"` or `"GoodNoData"` — never `"Good"` or `"Uncertain"`. Within structured values, an *absent* nullable field and a `null` field are semantically equivalent on reads; servers may omit nulls to save bytes, so don't infer anything from a field's absence.

## Response Envelope

### Top-level `success: false` doesn't mean the request failed

In bulk responses, the top-level `success` is `false` if *any single item* failed. Nine of ten elements may have succeeded. Always iterate `results[]` and check each item's own `success`; results arrive in the same order and count as your request, so you can index them directly.

### HTTP 206 is a success code

Servers return `206 Partial Content` when their own limits truncate a result — composition depth limits on value/history queries, or queue overflow on `/subscriptions/sync`. The body is valid and should be processed; `responseDetail` explains what was cut. To recover missing composition data, issue follow-up queries for the specific deeper `elementId`s. After a sync overflow, the dropped range is `lastSequenceNumber + 1` through the first returned `sequenceNumber - 1` — backfill it with `POST /objects/history` if you need it.

## Address Space

### Object instances have no namespace

Namespaces scope **types** only. Instances live in the server's implicit address space; an instance's type may come from any namespace, discoverable via `metadata.typeNamespaceUri` when you request `includeMetadata=true`.

### `parentId` is a convenience field, not the relationship graph

`parentId` lets you build a tree from a flat `GET /objects` list, but graph traversal goes through `POST /objects/related`, which returns *all* relationship kinds (hierarchical, composition, and graph). Don't reconstruct relationships from `parentId` alone — and don't expect `metadata.relationships` unless you asked for metadata.

### `sourceTypeId` is not a base type

It identifies the type within its *source* namespace (e.g., an OPC UA BrowseName or NodeId) so you can correlate back to the originating definition. Inheritance is expressed separately, via `allOf` in the JSON Schema and an `InheritsFrom` entry in the type's `related` metadata.

## Subscriptions

### Sync re-delivers everything until you acknowledge

`POST /subscriptions/sync` without a `lastSequenceNumber` returns *all* pending batches — including ones you've already seen. Pass the highest `sequenceNumber` from the previous response on every call after the first. Special case: `lastSequenceNumber: -1` acknowledges (discards) the entire queue. When there are no new updates, the response is an empty `result` array with no sequence number — keep acknowledging with your last known value.

### Sync and stream are mutually exclusive

While a subscription has an open SSE stream, calls to `/sync` for it return an error. Close the stream first. And opening a *second* stream on the same subscription silently closes the first one with no error — the original client just sees its stream end.

### Subscriptions expire

If a subscription receives neither a `/sync` call nor an active stream within the server's TTL, the server **must** delete it, along with all queued values. A 404 from `/sync` or `/stream` means it's gone: re-create, re-register, and optionally backfill the gap from `/objects/history`.

## Writes

### Writes replace the whole value

`PUT /objects/value` writes the full value for the element — partial attribute updates are not supported. Read-modify-write if you only want to change one field, and remember the value must conform to the ObjectType schema (including its nullability declarations).

### Successful writes return `result: null`

This is intentional, not an error: write entries confirm acceptance via `success: true` and do not echo the written VQT. Read the value back with `POST /objects/value` if you need confirmation of state.
