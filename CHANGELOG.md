# Changelog

## [0.4.0](https://github.com/zigordev/cv/compare/v0.3.0...v0.4.0) (2026-09-07)


### Features

* **ui:** describe the new test gates in the pipelines tab ([#40](https://github.com/zigordev/cv/issues/40)) ([e50b4d9](https://github.com/zigordev/cv/commit/e50b4d93efedcd4aedf5dd6dcf32e038ae609307))

## [0.3.0](https://github.com/zigordev/cv/compare/v0.2.0...v0.3.0) (2026-09-07)


### Features

* pipelines tab and watch mode ([#36](https://github.com/zigordev/cv/issues/36)) ([3503c92](https://github.com/zigordev/cv/commit/3503c92e39b8c716e4bee40c27c25fd290fc238a))

## [0.2.0](https://github.com/zigordev/cv/compare/v0.1.0...v0.2.0) (2026-09-06)


### Features

* **build:** render the ATS PDF at build time instead of printing ([e9a0ee5](https://github.com/zigordev/cv/commit/e9a0ee55a8fe8fa559be9972b17b1d8ffc888c0a))
* **cv:** add an architecture diagram to every case study ([9779d89](https://github.com/zigordev/cv/commit/9779d895c0e3fc5332a47e8b80370c22677befc7))
* **cv:** list this site as a product and derive the diagram app lists ([3ca2380](https://github.com/zigordev/cv/commit/3ca2380bdc8ae5bbe2bb2be659bac1a33385ae0f))
* **cv:** replace the placeholder persona with the real CV ([679dde4](https://github.com/zigordev/cv/commit/679dde412e24def604609b6a940bd978702fd10b))
* **cv:** rework the page chrome and project presentation ([782a112](https://github.com/zigordev/cv/commit/782a112c4e68972596dfa41e5d427a23529d3b4d))
* first commit ([5b6e1dc](https://github.com/zigordev/cv/commit/5b6e1dc48b29cf48c7a3c98a5fff90b2b0d1c867))
* **health:** add the service name to the health response ([98a660d](https://github.com/zigordev/cv/commit/98a660dfd204591fdc3f28a1ffe850b304454f56))
* **i18n:** resolve the locale server-side and make the Tolgee sync idempotent ([507c177](https://github.com/zigordev/cv/commit/507c177ebf5ed6b760d7d9611be78bc49c2c722d))
* **observability:** converge on the shared standard, add e2e coverage ([0e459c5](https://github.com/zigordev/cv/commit/0e459c5753ae22e976dbe3aa88aaa8f2409c6b37))
* **security:** set security headers and enable Dependabot ([86403e0](https://github.com/zigordev/cv/commit/86403e00a599bf9ad02e8502ebc6125a2275b865))
* **ui:** add a favicon ([808e22c](https://github.com/zigordev/cv/commit/808e22c72db032bf3f0989ffc4710732aa48f3ca))
* **ui:** consume design-system as a package instead of vendoring it ([#26](https://github.com/zigordev/cv/issues/26)) ([3f067c4](https://github.com/zigordev/cv/commit/3f067c45cdd639e232e874a58956dedca0d656e9))


### Bug Fixes

* **a11y:** raise fg-subtle/fg-faint contrast to WCAG AA ([cb92c64](https://github.com/zigordev/cv/commit/cb92c64983f40d9bcff7d0b9005e6c48140ae300))
* **ci:** grant gitleaks the pull-requests:read it needs on Dependabot PRs ([988d803](https://github.com/zigordev/cv/commit/988d8032931a296feec93485a48f82efb62340d6))
* **ci:** merge main to pick up the gitleaks pull-requests:read fix ([bbed7f8](https://github.com/zigordev/cv/commit/bbed7f855500d6171cf39e389e1c391b0e30250c))
* **ci:** merge with a PAT so push-triggered workflows still run ([#27](https://github.com/zigordev/cv/issues/27)) ([53db118](https://github.com/zigordev/cv/commit/53db118f81474cec4a131fb5c457fbd6ee050258))
* **ci:** raise commitlint header-max-length to fit Dependabot titles ([6234e6b](https://github.com/zigordev/cv/commit/6234e6b47ea597c71cb2cf7403347474439b179f))
* **ci:** retry npm audit on transient registry failures ([8c2a0b7](https://github.com/zigordev/cv/commit/8c2a0b7329de2c26b160b9292253fc9505c6b226))
* **ci:** stop format:check from failing on generated CHANGELOG.md ([3f3c28a](https://github.com/zigordev/cv/commit/3f3c28a2bd1064ed855b542781e0b6f77341ef17))
* **deps:** bump react-dom to match react 19 ([f151c5c](https://github.com/zigordev/cv/commit/f151c5cadec012e3389049f9ca58e4955b5b35b5))
* **deps:** group react with react-dom in Dependabot config ([fa22f53](https://github.com/zigordev/cv/commit/fa22f53f76edf99444e562cce587b884d7ed3bb7))
* **design-system:** declare box-sizing on .ds-btn and type its anchor props ([9105a37](https://github.com/zigordev/cv/commit/9105a3797b5afd1b2b056fda8fd840fd3d68bf82))
* **e2e:** regenerate the Linux visual baselines from an actual CI run ([540cb2a](https://github.com/zigordev/cv/commit/540cb2a068b9eea7377de1465e08bfcb47e39fcf))
* translation sync ([a62ffd3](https://github.com/zigordev/cv/commit/a62ffd38700cabfa5696cf886c5dccf5a722d315))
* **ui:** migrate off next lint, ahead of its removal in Next 16 ([0aac431](https://github.com/zigordev/cv/commit/0aac431556bf2e64f20fc17e244587661ff01d7e))

## Changelog

All notable changes to this project are documented in this file.

This file is maintained by release-please; entries are generated from
Conventional Commit messages on `main`.
