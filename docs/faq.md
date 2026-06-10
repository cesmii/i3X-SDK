---
sidebar_position: 2
---

# Frequently Asked Questions

## General

### What is i3X?

i3X (Industrial Information Interoperability eXchange) is an open, vendor-agnostic REST API specification for accessing contextualized manufacturing data. It defines a common interface that application developers can code against once and deploy against any compliant manufacturing platform — without rewriting integrations for each vendor.

Think of it as doing for industrial software what web browsers did for the internet: a standardized contract that lets applications run on top of any compatible backend.

### Who created i3X?

i3X is coordinated by [CESMII](https://www.cesmii.org), a U.S. Department of Energy-funded smart manufacturing institute. The working group includes HighByte, GE Appliances, Georgia-Pacific, Rockwell Automation, Inductive Automation, AWS, Microsoft, Siemens, and ThinkIQ, among others.

### What is the current status of i3X?

i3X reached **1.0 release** (Q2 2026). The specification is stable and normative.

The public demo server at [https://api.i3x.dev/v1/docs](https://api.i3x.dev/v1/docs) is available for testing.

### What problem does i3X solve?

Manufacturing software stacks are fragmented. A typical facility runs historians, MES systems, quality platforms, and maintenance tools from different vendors — each with its own proprietary API. This forces application developers to write custom integrations for every platform combination, making apps non-portable and driving up integration costs for everyone.

i3X defines a single, stable API surface so an application written against it can run on any compliant platform without modification.

### Is i3X free to use?

Yes. The specification is open source under the MIT license. The GitHub repository, OpenAPI specification, demo server, i3X Explorer tool, and Python client library are all freely available and open source!

### Can I use this with AI?

Yes! The i3X API was designed to be easily understood by both humans and AI. Direct your AI to [read the Spec](https://api.i3x.dev/v1/openapi.json) and [Implementation Guide](https://raw.githubusercontent.com/cesmii/i3X/refs/heads/1.0/spec/IMPLEMENTATION_GUIDE.md) into its context.

### Is i3X only for Python?

No! While the Working Group used a Python demo and client library to explore the ideas in the RFC, the output of the effort is an OpenAPI specification that can be implemented in any programming language or environment. 

### How is i3X related to MQTT or Sparkplug/B?

MQTT is primarily concerned with the movement of event-based data. Sparkplug/B provides a common structure (namespace) for device data over MQTT.

i3X is primarily concerned with the discovery of the intended structure of data, the relationships between structured instances, and the current and historical values of data. MQTT has no mechanism for discovery (querying), structural declaration (types), or history. Implementing i3X with MQTT can only partially fulfill the requirements of the interface, meaning that implementations must co-ordinate complementary data sources, unifying the data structures and keys, to fully realise i3X.

In other words, i3X can use MQTT, but MQTT alone is not enough for i3X. This common API raises the minimum bar for information access.

### How is i3X related to OPC UA and the OPC UA Web API?

A thorough OPC UA implementation provides more type-safety, better type definitions, more explicit relationship types, structured events (alarms) and history, and security and access considerations, all over a standard interface that supports binary communication -- and with the Web API, REST-style communication. In other words, OPC UA provides more capabilities than i3X -- but at a higher level of complexity, and with more challenges to implement.

i3X aims to provide a simplified interface that can be bound to an OPC UA server as one of the options for a back-end data source. However i3X does not *require* OPC UA. As such, it allows an implementation to have some of the key features of OPC UA, without the requirements of a full OPC UA server implementation.

### Should I implement i3X on a PLC or Edge device?

Probably not. The purpose of i3X is to standardize the programmers interface for contextualized information. This means, raw data that has been shaped into a pre-defined repeatable model, stored as instance objects, with those instances related to each other hierarchically and graphically, usually with history. While some PLCs are very sophisticated, their context is usually fairly focused on the things they're controlling (by design!) The first place you can really start to get value out of an i3X implementation is at the HMI/SCADA level (and on up from there!)

### Does i3X support multiple inheritance?

By design, no. Multiple inheritance can lead to the [diamond problem](https://en.wikipedia.org/wiki/Multiple_inheritance#The_diamond_problem) that results in type information being harder to understand -- not easier! If you need to track multiple derivations, you can define your RelationshipTypes, but the preferred pattern in i3X is composition.

### How does i3X support Class composition?

For the initial release, the Working Group chose to simplify composition representation to the *instance object* level. This means that an object may be made up of Types from different Namespaces. However, the API does *not* support representing composition at the type level. Types return in a query must be simplified to a flat list within a single namespace.

Importantly, the underlying platform is still free to store and relate type definitions of any level of complexity or composition, but when responding to a query, must simplify results.

While the Working Group plans to revisit this in the future, it was determined that this "middle ground" would provide the best compromise between un-typed environments (like MQTT) and strongly-typed environments (like OPC UA).

### How do I report a bug or request a feature?

Open an issue on the [GitHub repository](https://github.com/cesmii/i3x/issues). For non-GitHub feedback, email [i3x@cesmii.org](mailto:i3x@cesmii.org).

### How do I get involved in the working group?

Review the contributing guidelines in `Contributing.md` in the [GitHub repo](https://github.com/cesmii/i3x). For broader involvement with the CESMII initiative, visit [www.cesmii.org](https://www.cesmii.org).

### Where can I find the formal specification?

The specification comes in two forms: an OpenAPI Spec and an Implementation Guide, both at 1.0 release, available in the [cesmii/i3x GitHub repository](https://github.com/cesmii/i3x). The live OpenAPI specification with interactive docs is at [https://api.i3x.dev/v1/docs](https://api.i3x.dev/v1/docs), while the Implementation Guide is at [https://github.com/cesmii/i3X/blob/1.0/spec/IMPLEMENTATION_GUIDE.md](https://github.com/cesmii/i3X/blob/1.0/spec/IMPLEMENTATION_GUIDE.md).

### Where can I find more information?

- **Quick Start**: [quickstart.md](quickstart.md)
- **i3X Home**: [https://www.i3x.dev](https://www.i3x.dev)
- **GitHub**: [https://github.com/cesmii/i3x](https://github.com/cesmii/i3x)
- **CESMII**: [https://www.cesmii.org](https://www.cesmii.org)