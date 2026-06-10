# i3X SDK Docs

Docusaurus site documenting the i3X (Industrial Information Interoperability eXchange) API, served at https://i3x.dev/sdk/.

## Keep llms.txt in sync

`static/llms.txt` is an index of this site for AI tools, served at https://i3x.dev/sdk/llms.txt (and redirected from https://i3x.dev/llms.txt). **Any time the content or structure of the docs changes — pages added, removed, renamed, or substantially rewritten — update `static/llms.txt` to match**: page URLs, one-line descriptions, and the "key facts" summary if API semantics changed.

Page URLs follow Docusaurus slug rules: numeric prefixes are stripped (`docs/Client-Developers/03-api-usage.md` → `/sdk/Client-Developers/api-usage`).

## Authoritative sources

Docs must stay consistent with the normative i3X documents; if they conflict, the spec wins (exception: the acronym is "Industrial Information Interoperability eXchange" — the spec's "Interface" is an upstream error):

- OpenAPI spec: https://api.i3x.dev/v1/openapi.json
- Implementation Guide: https://raw.githubusercontent.com/cesmii/i3X/refs/heads/1.0/spec/IMPLEMENTATION_GUIDE.md
- Understanding Relationships: https://raw.githubusercontent.com/cesmii/i3X/refs/heads/1.0/spec/UNDERSTANDING_RELATIONSHIPS.md

## Structure notes

- Sidebar order is explicit: quickstart (1), faq (2), Client-Developers (3), Server-Developers (4), gotchas (5). Category positions live in each folder's `_category_.json`; don't give a root doc a position that collides with them.
