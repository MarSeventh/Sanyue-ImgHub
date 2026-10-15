# Frontend regression tests

Tests are organized by functionality so that future changes can extend the relevant module instead of adding a separate suite for every bug fix.

**Whenever tests or test helpers are added, removed, renamed or changed, update this README in the same PR.** Review the module overview, coverage limits and affected commands or helpers against the final change. Update the relevant descriptions rather than making unrelated wording changes just to touch this file.

## Running the checks

Use Node.js 22 and the existing lockfile from the frontend repository root:

```sh
npm ci
npm test
npm run build
```

For a single module or an interactive watch session:

```sh
npm test -- test/upload.test.js
npm test -- test/auth.test.js
npm test -- test/update.test.js -t "localStorage"
npm run test:watch
```

Vitest discovers `test/**/*.test.js` and runs in `happy-dom`. The `@` alias resolves to `src/`; no backend server, cloud credentials or live service is required. An empty test selection fails instead of silently passing. Vue CLI remains responsible for the production build; Vitest does not replace the application build toolchain.

## Module overview

Production paths below are relative to `src/`.

| Module | Test file | Production entry points | Covered behavior |
| --- | --- | --- | --- |
| Upload preparation | [upload.test.js](upload.test.js) | `utils/upload/directoryTraversal.js`, `utils/upload/urlBuilder.js` | Directory/path cleanup, browser relative paths, Chromium multi-batch directory entries, File System Access handles, plain-file fallback and read failures; raw, Markdown, HTML and BBCode links, unknown-format fallback and prefix updates |
| Reading and querying | [read.test.js](read.test.js) | `utils/fileManager.js` | Local cache round trips and isolation, corrupt-cache recovery, encoded query parameters, server counts, pagination, unindexed warnings and failed requests preserving the cache |
| Deletion | [delete.test.js](delete.test.js) | `utils/fileManager.js` | Local-cache file removal, idempotent missing-file removal and directory boundaries that preserve similarly named sibling folders |
| Updates and validation | [update.test.js](update.test.js) | `utils/fileManager.js`, `utils/fileIdValidator.js`, `utils/pathValidator.js` | Unique file/folder additions, moving cached views, storage-quota fallback, stale-cache removal and one-time warnings; invalid IDs and paths, Unicode names and final validation versus input-time validation |
| Authentication | [auth.test.js](auth.test.js) | `utils/fetchWithAuth.js`, `utils/tokenExpiration.js` | Session cookies, preserved request options, development proxy paths, deduplicated 401 navigation, 403 handling and network errors; UTC expiry calculation, invalid durations, exact expiry boundaries and legacy token defaults |
| Batch retrieval | [batch.test.js](batch.test.js) | `utils/batchProcessor.js` | Encoded cursors, record values, cumulative progress, request signals, HTTP/API errors, cancellation and state reset |
| Settings | [settings.test.js](settings.test.js) | `mixins/unsavedSettings.js` | Stable snapshots, nested and array edits, save, subsequent edits and revert |
| Dashboard selection | [selection.test.js](selection.test.js) | `utils/dashboard/useDragSelect.js`, `utils/dashboard/rectIntersects.js` | Reverse drags, intersection boundaries, replacing/appending selections, interactive targets, right clicks, mobile widths, view changes and listener cleanup on unmount |
| AI tags | [ai.test.js](ai.test.js) | `utils/aiTags.js` | Authentication and structured errors, malformed responses, preview input guards, failed-preview isolation, multipart requests, response/file matching, apply batches and per-file save results |
| Locales | [locales.test.js](locales.test.js) | `locales/index.js` | Stored preference, unsupported-language fallback, document language initialization and persisted language changes |

Extend the existing suite for a related behavior. Add a separate file for a substantial independent feature and document its production entry points, assertions and remaining limits here. Test counts come from the runner; this document describes scope rather than maintaining a fixed count.

## Helpers and isolation

- [helpers/fileManager.js](helpers/fileManager.js) resets the real file-manager singleton and local storage before each cache test. It replaces authenticated requests, warning notifications and translation text at their boundaries; assertions still exercise the real cache/query implementation.
- Authentication tests use the real request wrapper with a mocked browser `fetch`, router and store. Other request-oriented suites replace `fetchWithAuth` to test their own request construction and response handling.
- Selection tests mount a small Vue component around the real composable, dispatch DOM mouse events and supply explicit element rectangles. They unmount the component and clean the document after each test.
- Vitest restores spies and unstubs globals/environment variables between tests. Suites also reset their own mock calls, local storage, module state or mounted components as needed.
- AI suggestion tests supply a preview-preparation function where browser image decoding would otherwise be required. This isolates batching and result validation from canvas support.

## Current coverage limits

- Upload tests cover preparation and link generation, not the complete upload component, multipart transport, provider failover or interrupted-upload recovery.
- Delete/update tests cover frontend cache behavior and validation. They do not verify that UI actions send correct backend deletion, rename or move requests, or that remote files are changed. Backend API regressions are maintained in the main repository.
- Reading tests cover the file-manager utility, not full dashboard rendering, all filters or every store/component integration.
- Authentication tests do not mount login pages or exercise real backend sessions. Settings tests cover the shared unsaved-settings mixin, not every settings form or save API.
- `happy-dom` does not reproduce browser layout. Selection geometry is supplied by the test; scrolling, touch gestures, visual appearance and full browser interactions still require browser validation.
- AI tests do not verify actual image decoding, canvas compression, live providers or the complete AI dialog. Locale tests protect locale selection, not translation completeness.
- These checks are utility/composable regressions and a production build, not a complete browser end-to-end suite. There are no live cloud requests or deployment checks.

Keep these limits explicit until corresponding tests exist. A passing CI run does not establish coverage of every UI operation or deployment environment.

## Extending the suite

1. Select the module by user-visible behavior. Cover normal inputs, failure paths and compatibility boundaries, especially when fixing a regression.
2. Execute the real implementation under test. Mock external boundaries rather than replacing the logic that the assertion is meant to protect.
3. Assert observable results: returned values, request paths/options, cache contents, warnings, navigation or selection state. Include failure cases that must preserve existing state.
4. Keep tests independent and repeatable. Reset shared state and clean listeners, mounted apps and globals. Avoid live services, private credentials and arbitrary delays.
5. **Update this README in the same PR**, including affected coverage limits and helper descriptions. Changes to discovery, dependencies or commands also require the corresponding configuration and CI updates.
6. Run the affected suite, then `npm test` and `npm run build`. Report actual results and any manual/browser checks in the PR.

## CI

`.github/workflows/check_pr.yml` runs for PRs targeting `dev` or `master`, pushes to those branches and manual dispatches. It installs locked dependencies on Node.js 22, runs the regression suite, builds the Vue application and checks that `dist/index.html` is nonempty. It cancels superseded runs and requires no deployment secrets.

CI supports code review. UI or browser-specific changes should also describe the relevant manual checks and include screenshots or recordings when useful.
