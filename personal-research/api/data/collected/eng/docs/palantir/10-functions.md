# Functions — Overview

# Functions

**Functions** enable code authors to write logic that can be executed quickly in operational contexts, such as dashboards and applications designed to empower decision-making processes. This logic is executed on the server side in an isolated environment.

Notably, functions include first-class support for authoring logic based on the Ontology. This includes support for reading the properties of various object types, traversing links, and flexibly making Ontology edits.

Common use cases for functions include:

- Returning object sets or variable values for use in [Workshop](https://www.palantir.com/docs/foundry/workshop/functions-use/).
- Displaying transformed values in a derived table column using [Workshop's function-backed columns](https://www.palantir.com/docs/foundry/workshop/widgets-object-table/#function-backed-columns).

- Aggregating object type values to display as [Workshop charts](https://www.palantir.com/docs/foundry/workshop/widgets-chart/#function-aggregations-function-backed-layers).
- Expressing a complex edit to the Ontology that updates many objects through a [function backed action](https://www.palantir.com/docs/foundry/action-types/function-actions-overview/).

- Running logic in the backend to return information to be displayed in the frontend in [Slate](https://www.palantir.com/docs/foundry/slate/overview/).
- Computing custom metrics or aggregations for display in [Quiver](https://www.palantir.com/docs/foundry/quiver/overview/).

- Querying external systems to enrich objects in the Ontology through [external functions](https://www.palantir.com/docs/foundry/functions/webhooks/).
- Using Python functions as a sidecar container in [Pipeline Builder](https://www.palantir.com/docs/foundry/functions/python-functions-builder/).

The languages supported by functions are [TypeScript ↗](https://www.typescriptlang.org/docs/handbook/basic-types.html) and [Python ↗](https://www.python.org/).

For more information on feature support by language and choosing a language or language version, refer to the [language feature support specifications](https://www.palantir.com/docs/foundry/functions/language-feature-support/).

To get started using functions in Foundry, we recommend the following tutorials:

- [Getting started with TypeScript v1 functions](https://www.palantir.com/docs/foundry/functions/typescript-v1-getting-started/)
- [Getting started with TypeScript v2 functions](https://www.palantir.com/docs/foundry/functions/typescript-v2-getting-started/)

- [Getting started with Python functions](https://www.palantir.com/docs/foundry/functions/python-getting-started/)

Palantir Learning portal

Try our ["Speedrun: Your first Ontology function" course ↗](https://learn.palantir.com/speedrun-your-first-ontology-function) on learn.palantir.com.

**Previous:** [Action types / Add action types to a Marketplace product](https://www.palantir.com/docs/foundry/action-types/marketplace-action-types/)

**Next:** [Feature support by language](https://www.palantir.com/docs/foundry/functions/language-feature-support/)

---

*Archived from official Palantir documentation for research. The source URL is authoritative if content diverges.*
