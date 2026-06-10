# Core Concepts

## Core Concepts

### API Data Model

The i3X API is built around four primary concepts:

#### Namespaces
Namespaces provide organizational groupings for types and object type definitions. Each namespace has:
- `uri`: A unique namespace URI identifier
- `displayName`: A human-readable name

Note: Object *instances* exist in the server's implicit address space and are not scoped to a namespace directly. Namespaces are a property of types, not instances.

#### ObjectTypes
ObjectTypes define the schema for objects. They are based on OPC UA Information Models and include:
- `elementId`: Unique type identifier
- `displayName`: Human-readable name
- `namespaceUri`: The namespace this type belongs to
- `sourceTypeId`: Identifier of this type within its source namespace (e.g., an OPC UA BrowseName or NodeId), used to correlate back to the originating definition
- `version`: Semantic version string (optional, recommended)
- `schema`: JSON Schema definition describing the type's structure
- `related`: Optional related type metadata

A schema with `"type": "object"` defines a **branch** type with a structured value; a scalar schema type (`"number"`, `"integer"`, `"string"`, `"boolean"`) defines a **leaf** type whose instances return a bare scalar value. Clients should use `schema.type` to decide how to render an object. When an instance's type cannot be determined, servers register an `UnknownType` placeholder (schema `{"type": "object"}`) and reference it via `typeElementId`.

#### Objects
Objects are instances of ObjectTypes representing actual manufacturing equipment, data points, or other elements:
- `elementId`: Unique object identifier
- `displayName`: Human-readable name
- `typeElementId`: The ObjectType this object is an instance of
- `parentId`: Parent object in the hierarchy (null for root objects)
- `isComposition`: Whether this object encapsulates child component objects
- `isExtended`: Whether this object carries attributes beyond its type schema (default: false)
- `metadata`: Full relationship and metadata (included only when `includeMetadata=true`)

#### RelationshipTypes
RelationshipTypes define how objects can be connected to each other. Every relationship type **must** define its inverse:
- `elementId`: Unique relationship type identifier
- `displayName`: Human-readable name
- `namespaceUri`: The namespace this relationship type belongs to
- `relationshipId`: Identifier of this relationship type within its source namespace
- `reverseOf`: The elementId of the inverse relationship (required — all relationships are bidirectional)

### Contextualized Data

The API provides access to data that has been:
- Properly structured according to information models
- Tagged with appropriate metadata
- Organized within hierarchical relationships
- (Optionally) related with graph relationships
- Timestamped and quality-assured

### Value-Quality-Timestamp (VQT)

All data values in i3X are represented as VQT structures:

```json
{
  "value": 75.5,
  "quality": "Good",
  "timestamp": "2025-01-15T12:00:00Z"
}
```

The four quality states are:
- `Good` — Value is reliable
- `GoodNoData` — No data available, but this is not an error condition
- `Bad` — Value is unreliable
- `Uncertain` — Value reliability is unknown

When `value` is null, `quality` must be `Bad` or `GoodNoData`.

### Server Capabilities

Before making requests, clients should call `GET /info` (no authentication required) to discover what the server supports:

```json
{
  "specVersion": "1.0",
  "serverVersion": "2.3.1",
  "serverName": "My Platform",
  "capabilities": {
    "query": { "history": true },
    "update": { "current": true, "history": false },
    "subscribe": { "stream": true }
  }
}
```

Not all servers implement every optional feature. Check capabilities before calling history, update, or subscribe endpoints.
