# GitHub Spec Kit

This folder introduces a lightweight **GitHub Spec Kit** for this repository so feature work can start from a clear, reviewable specification before implementation.

## What this is

The kit is a small documentation workflow built around pull requests:

1. Copy the feature spec template.
2. Fill in goals, constraints, UX/API changes, and rollout plan.
3. Link the completed spec in your implementation PR.
4. Track execution with the task checklist template.

## Folder structure

- `templates/spec-template.md` — primary feature specification template
- `templates/task-checklist.md` — implementation task and verification checklist

## Suggested workflow

1. Create a branch for planning (or use your feature branch).
2. Copy `templates/spec-template.md` to `docs/specs/<feature-name>.md`.
3. Open a planning PR using that spec as the source of truth.
4. After approval, implement and reference the spec in code PRs.
5. Use `templates/task-checklist.md` to track delivery progress.

## Why this helps here

This project spans:

- a TypeScript MCP/REST+WebSocket backend (`mcp-server`)
- an Angular + CoreUI + ng-diagram frontend (`ngdiagram-app`)

A shared spec format keeps backend contract updates, graph UX changes, and test expectations aligned across both codebases.
