# Changelog

## [0.11.2](https://github.com/zigordev/cv/compare/v0.11.1...v0.11.2) (2026-09-21)


### Bug Fixes

* **i18n:** report Tolgee down when it answers with an error ([#115](https://github.com/zigordev/cv/issues/115)) ([246db2f](https://github.com/zigordev/cv/commit/246db2f4c7e5509a8a1be5ae730bdf8a2c19b612))

## [0.11.1](https://github.com/zigordev/cv/compare/v0.11.0...v0.11.1) (2026-09-21)


### Bug Fixes

* **observability:** share health state across Next's module graphs ([#112](https://github.com/zigordev/cv/issues/112)) ([8662e6d](https://github.com/zigordev/cv/commit/8662e6d53bf6fe0e06d7f04bf38c09025a641376))

## [0.11.0](https://github.com/zigordev/cv/compare/v0.10.0...v0.11.0) (2026-09-21)


### Features

* **observability:** structured logs, route metrics and honest health ([#110](https://github.com/zigordev/cv/issues/110)) ([819ced8](https://github.com/zigordev/cv/commit/819ced8710a62bc2f7fb6a54543ebcf732db7073))

## [0.10.0](https://github.com/zigordev/cv/compare/v0.9.2...v0.10.0) (2026-09-20)


### Features

* **observability:** trace requests with OpenTelemetry ([#108](https://github.com/zigordev/cv/issues/108)) ([94c9020](https://github.com/zigordev/cv/commit/94c9020d973342c2dfc778f2cc2258f9851ed2bd))

## [0.9.2](https://github.com/zigordev/cv/compare/v0.9.1...v0.9.2) (2026-09-20)


### Bug Fixes

* **rum:** record real visits again in production ([#105](https://github.com/zigordev/cv/issues/105)) ([87f1ed2](https://github.com/zigordev/cv/commit/87f1ed2caf07a09f4b2b87cebbca439c79b23529))

## [0.9.1](https://github.com/zigordev/cv/compare/v0.9.0...v0.9.1) (2026-09-20)


### Bug Fixes

* **lifecycle:** stop cleanly on SIGTERM and start without warnings ([#103](https://github.com/zigordev/cv/issues/103)) ([6c45dac](https://github.com/zigordev/cv/commit/6c45dac401dcf3fe8fdc790d376f4672c49ff36d))

## [0.9.0](https://github.com/zigordev/cv/compare/v0.8.2...v0.9.0) (2026-09-18)


### Features

* **ask:** answer questions about the CV with cited sources ([#101](https://github.com/zigordev/cv/issues/101)) ([9af48f5](https://github.com/zigordev/cv/commit/9af48f5afd11a8471da2f325aeefd5ebdacaf0b1))

## [0.8.2](https://github.com/zigordev/cv/compare/v0.8.1...v0.8.2) (2026-09-12)


### Bug Fixes

* **docker:** build the web image on node 24 ([#70](https://github.com/zigordev/cv/issues/70)) ([9a23bf3](https://github.com/zigordev/cv/commit/9a23bf3dbb4f2d72f11b70591a34548addefcb25))
* **i18n:** stop the pull from replacing a message file it cannot parse ([#69](https://github.com/zigordev/cv/issues/69)) ([4a60285](https://github.com/zigordev/cv/commit/4a60285a2d3d45a85788d22d11b135229683eea2))

## [0.8.1](https://github.com/zigordev/cv/compare/v0.8.0...v0.8.1) (2026-09-10)


### Bug Fixes

* **cv:** keep sity out of the platform and design system diagrams ([#67](https://github.com/zigordev/cv/issues/67)) ([f267c9f](https://github.com/zigordev/cv/commit/f267c9ff98b28ec821ec1563306ce1ad5e98e9dc))

## [0.8.0](https://github.com/zigordev/cv/compare/v0.7.0...v0.8.0) (2026-09-10)


### Features

* **cv:** add the sity case study ([#63](https://github.com/zigordev/cv/issues/63)) ([e32c5f5](https://github.com/zigordev/cv/commit/e32c5f5c154899c5f45ed4e87f785994cc21301e))

## [0.7.0](https://github.com/zigordev/cv/compare/v0.6.3...v0.7.0) (2026-09-09)


### Features

* **contact:** send RFC 9457 problem details ([#58](https://github.com/zigordev/cv/issues/58)) ([56ecaa8](https://github.com/zigordev/cv/commit/56ecaa8ba0d05133aaac1b7f049ca22ad01dcaed))

## [0.6.3](https://github.com/zigordev/cv/compare/v0.6.2...v0.6.3) (2026-09-09)


### Bug Fixes

* **contact:** bound the address and make its pattern linear ([#56](https://github.com/zigordev/cv/issues/56)) ([73cc165](https://github.com/zigordev/cv/commit/73cc16535f0073aa043fe3a3dc4d58b8cc0712c5))

## [0.6.2](https://github.com/zigordev/cv/compare/v0.6.1...v0.6.2) (2026-09-08)


### Bug Fixes

* **deploy:** reuse an image already in ECR instead of failing on it ([#50](https://github.com/zigordev/cv/issues/50)) ([d22371c](https://github.com/zigordev/cv/commit/d22371cb7d1f862bc10faa117f2e7e34f29dfdec))

## [0.6.1](https://github.com/zigordev/cv/compare/v0.6.0...v0.6.1) (2026-09-08)


### Bug Fixes

* **flags:** land the corrections, and stop the flag service blocking a deploy ([#47](https://github.com/zigordev/cv/issues/47)) ([9ba7a79](https://github.com/zigordev/cv/commit/9ba7a79b532cefac131a90ce3d7d427c17ab0643))

## [0.6.0](https://github.com/zigordev/cv/compare/v0.5.0...v0.6.0) (2026-09-08)


### Features

* **flags:** gate the Download CV button on a feature flag ([#45](https://github.com/zigordev/cv/issues/45)) ([0d2e334](https://github.com/zigordev/cv/commit/0d2e3340f0f3c07ae0ccc3dc2f7d38f9e1f0557d))

## [0.5.0](https://github.com/zigordev/cv/compare/v0.4.0...v0.5.0) (2026-09-08)


### Features

* **deploy:** give cv a working deploy path ([#43](https://github.com/zigordev/cv/issues/43)) ([5374ddb](https://github.com/zigordev/cv/commit/5374ddbf8a7b83f06774a7ba07f54ab43d02e2a0))

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
