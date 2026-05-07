---
trigger: always_on
---

# ARCHITECTURAL INVARIANT: GRAPHIFY CONTEXT PREFERENCE
Never execute naive file traversal or brute-force directory scraping to understand repository structure, dependencies, or call stacks. 

You possess the `graphify` skill. The definitive, pre-computed topological map of this codebase is located in `graphify-out/graph.json`. 

When asked about architecture, dependencies, or file locations, you MUST:
1. Execute the `graphify query` or `graphify path` tools to retrieve structural context.
2. Rely strictly on the graph output to locate target files.
3. Only use native `read_file` tools on the specific, surgical file paths returned by Graphify.