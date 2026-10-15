# Contributing

Please read the shared [CloudFlare ImgBed contribution guide](https://github.com/MarSeventh/CloudFlare-ImgBed/blob/dev/CONTRIBUTING.md) for repository selection, code style, architecture, compatibility and atomic PR requirements.

- Submit frontend features and fixes to **`dev`**, even though the default branch is `master`.
- Change source files in this repository; maintainers synchronize built assets to the backend repository.
- Use Node.js 22 and the existing lockfile: `npm ci`.
- Start development with `npm run serve`; validate with `npm test` and `npm run build`.
- Follow [test/README.md](test/README.md) when extending regressions. **Update it in the same PR whenever tests or helpers change.**
- Reuse existing Vue components, themes, state management and localization. Include appropriate screenshots or recordings for UI changes and list any incomplete translations.
- Link related backend or documentation PRs and describe compatibility and merge order.
