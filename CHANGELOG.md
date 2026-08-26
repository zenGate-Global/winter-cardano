## [3.0.0](https://github.com/zenGate-Global/winter-cardano/compare/v2.0.1...v3.0.0) (2026-08-26)

### ⚠ BREAKING CHANGES

* the script hash changes, so the contract address and the
minting policy id change. A commodity minted by an earlier version stays
at the old address, and it needs version 2.0.1 to spend.

mainnet addr1wx0u9dyeeex4nsgp6pk3qaq92s5ap3xc56edsk3hlgdhjnce8qkjd
now     addr1w8dmzvsy5mhpx4x5leggtk96yvvrftmfsp7z3jxu20623gsrv9np4
preview addr_test1wph2wcr4ysaen987g87magjh96l2ymvrgyvnu6yjvrtahdqu7qvqy
now     addr_test1wpfc7e7zqlqtra8hnyq7k0hh3rdwjm7m0fnzuyqjl0xxt3gatmv8f

### Features

* ship the silent trace validators ([#34](https://github.com/zenGate-Global/winter-cardano/issues/34)) ([260f1bc](https://github.com/zenGate-Global/winter-cardano/commit/260f1bcbe84a71f58e534b37de58e13f0d281dc1))

## [2.0.1](https://github.com/zenGate-Global/winter-cardano/compare/v2.0.0...v2.0.1) (2026-08-22)

### Bug Fixes

* **ci:** let the release commit skip the git hooks ([#33](https://github.com/zenGate-Global/winter-cardano/issues/33)) ([f90b378](https://github.com/zenGate-Global/winter-cardano/commit/f90b37815c961f1fac6bc24ca0111772bd70c732))
* publish the build output, and fail the build instead of exiting 0 ([#32](https://github.com/zenGate-Global/winter-cardano/issues/32)) ([07f0644](https://github.com/zenGate-Global/winter-cardano/commit/07f0644ed84823572ef297a00c0815322f0ca32c))

## [2.0.0](https://github.com/zenGate-Global/winter-cardano/compare/v1.6.0...v2.0.0) (2026-08-22)

### ⚠ BREAKING CHANGES

* getUtxosByOutRef now returns UTxOs in the caller's
requested order and throws "UTxO not found: txHash#index" when a requested
outref is absent, instead of silently returning a shorter, reordered array.
* spend() no longer takes the unused recipientAddress
parameter. The signature is now
spend(signerAddress, walletUtxos, events, utxoRefMap).
* mintSingleton, recreate and spend now reject empty UTxO
arrays, empty or malformed signer lists, empty data references, and a
newDataReferences count that differs from the event count. These previously
built a transaction that either failed at submit or locked a token forever.

### Bug Fixes

* correct multi-event tx building, evaluation, and outref resolution ([7bb0750](https://github.com/zenGate-Global/winter-cardano/commit/7bb07504bf5bbaf1f696b1e0d8da306f52e8406a))

## [1.6.0](https://github.com/zenGate-Global/winter-cardano/compare/v1.5.1...v1.6.0) (2025-08-07)

### Features

* add full utxo info to txIn to prevent unnecessary api calls ([bd5b721](https://github.com/zenGate-Global/winter-cardano/commit/bd5b72174fc0fce7004259e56771df0977c100d8))

## [1.5.1](https://github.com/zenGate-Global/winter-cardano/compare/v1.5.0...v1.5.1) (2025-08-06)

### Bug Fixes

* force mint contract utxo ref inclusion in tx building ([00fc1bd](https://github.com/zenGate-Global/winter-cardano/commit/00fc1bdf16a0b2270c51ca78f5942cd8952bbd81))

## [1.5.0](https://github.com/zenGate-Global/winter-cardano/compare/v1.4.2...v1.5.0) (2025-08-05)

### Features

* allow singleton ref or object event ref to be undefined inside of utxoRefMap ([5ad3e4c](https://github.com/zenGate-Global/winter-cardano/commit/5ad3e4c90f28f490fc124a24fb533ba68a6d64b9))

## [1.4.2](https://github.com/zenGate-Global/winter-cardano/compare/v1.4.1...v1.4.2) (2025-08-05)

### Bug Fixes

* mint redeemer for spend should use burn redeemer ([67f72a1](https://github.com/zenGate-Global/winter-cardano/commit/67f72a18afb1774025bd5337525f2c5b973e8128))

## [1.4.1](https://github.com/zenGate-Global/winter-cardano/compare/v1.4.0...v1.4.1) (2025-08-05)

### Bug Fixes

* spend and burn redeemer encoding ([e628d53](https://github.com/zenGate-Global/winter-cardano/commit/e628d53310cca6dd4664ce1997699dbfeed5bd92))

## [1.4.0](https://github.com/zenGate-Global/winter-cardano/compare/v1.3.0...v1.4.0) (2025-08-05)

### Features

* use for loop for async & validate all contract utxos are inlcuded in tx builder ([0dcbfd3](https://github.com/zenGate-Global/winter-cardano/commit/0dcbfd31ee214bf22c157f6e8573034724844643))

## [1.3.0](https://github.com/zenGate-Global/winter-cardano/compare/v1.2.1...v1.3.0) (2025-08-05)

### Features

* allow optional deploy singleton ([6d6a952](https://github.com/zenGate-Global/winter-cardano/commit/6d6a95231e447f7bdcc15cf2b2a10fb18ecb4f21))
* improved collateral selection algo ([1db9da6](https://github.com/zenGate-Global/winter-cardano/commit/1db9da63accd9f7a7a0079acecc5819033152005))

## [1.2.1](https://github.com/zenGate-Global/winter-cardano/compare/v1.2.0...v1.2.1) (2025-08-04)

### Bug Fixes

* object event contract compile ([e5b43b4](https://github.com/zenGate-Global/winter-cardano/commit/e5b43b405658a0975557e5eaadc0521210663560))

## [1.2.0](https://github.com/zenGate-Global/winter-cardano/compare/v1.1.2...v1.2.0) (2025-08-04)

### Features

* update deploy refs for object event, add ref support for spend method ([8fac02c](https://github.com/zenGate-Global/winter-cardano/commit/8fac02c4e0d96321a00b27905b04cd142e207677))

## [1.1.2](https://github.com/zenGate-Global/winter-cardano/compare/v1.1.1...v1.1.2) (2025-08-04)

### Bug Fixes

* ref script deployment issue, mesh sdk upgrade ([e961799](https://github.com/zenGate-Global/winter-cardano/commit/e9617995e5100966444fd6447e9b375b59fd6f02))

## [1.1.1](https://github.com/zenGate-Global/winter-cardano/compare/v1.1.0...v1.1.1) (2025-08-04)

### Bug Fixes

* use utxo ref map to allow recreation of various contract utxos in one tx ([88c8268](https://github.com/zenGate-Global/winter-cardano/commit/88c8268b01824baf12cc217c0ca3c17111688967))

## [1.1.0](https://github.com/zenGate-Global/winter-cardano/compare/v1.0.6...v1.1.0) (2025-08-03)

### Features

* add deploy ref utxo method, add ref script support to recreate method ([98ce71a](https://github.com/zenGate-Global/winter-cardano/commit/98ce71a3cc9c1dc8897840942ae8208641a71cbe))

### Bug Fixes

* make packages external with bun ([1189e83](https://github.com/zenGate-Global/winter-cardano/commit/1189e8320e68d131479e82548204f3af829fb402))

## [1.0.5](https://github.com/zenGate-Global/winter-cardano/compare/v1.0.4...v1.0.5) (2025-04-23)

### Bug Fixes

* make @meshsdk/core package external ([3d88d91](https://github.com/zenGate-Global/winter-cardano/commit/3d88d91fe6f168f4c907fe9905acf833cf2a8ee2))

## [1.0.4](https://github.com/zenGate-Global/winter-cardano/compare/v1.0.3...v1.0.4) (2025-04-23)

### Bug Fixes

* **build:** use cjs and mjs extensions ([cc66133](https://github.com/zenGate-Global/winter-cardano/commit/cc66133db69e8060cdeef53d4019595ef7e238a9))

## [1.0.3](https://github.com/zenGate-Global/winter-cardano/compare/v1.0.2...v1.0.3) (2025-04-23)

### Bug Fixes

* modify bun config file to export es + cjs module ([0c1418a](https://github.com/zenGate-Global/winter-cardano/commit/0c1418a51b6977279ab4436dfcf3bf54882d115e))
* only include dist to files attribute + revert to previous setup + fix module path ([8b6cc96](https://github.com/zenGate-Global/winter-cardano/commit/8b6cc968ef84a0403baafa0fc922d994b4a6b476))

## [1.0.2](https://github.com/zenGate-Global/winter-cardano/compare/v1.0.1...v1.0.2) (2025-04-22)

### Bug Fixes

* add main field to package.json ([4270e7c](https://github.com/zenGate-Global/winter-cardano/commit/4270e7cfec37a0cb133bce29b862b795b9ca9421))

## [1.0.1](https://github.com/zenGate-Global/winter-cardano/compare/v1.0.0...v1.0.1) (2025-04-17)

### Bug Fixes

* **release:** test to see if workflow_run will work ([bcdad08](https://github.com/zenGate-Global/winter-cardano/commit/bcdad088b4cfe61735a58ac09dcdf359d5ef4b95))
* **workflow:** update release workflow to only run when ci workflow succeeds ([aa3e46a](https://github.com/zenGate-Global/winter-cardano/commit/aa3e46a0658e996600df8414772002a932f273b2))

## [1.0.0](https://github.com/zenGate-Global/winter-cardano/compare/392369b0359834d92efd950c07ddbb5d70e2d55e...v1.0.0) (2025-04-16)

### Bug Fixes

* **mintSingleton:** add try-catch block ([392369b](https://github.com/zenGate-Global/winter-cardano/commit/392369b0359834d92efd950c07ddbb5d70e2d55e))
* **recreate:** add try-catch block ([571a2c1](https://github.com/zenGate-Global/winter-cardano/commit/571a2c14906a1484f62bd8b108804e3dd0b173f1))
* remove console.log from events class ([8e65bf9](https://github.com/zenGate-Global/winter-cardano/commit/8e65bf92dc1e4d31b6811a95c1c908ef11284044))
* **spend:** add try-catch block ([6a26c65](https://github.com/zenGate-Global/winter-cardano/commit/6a26c65dd3ff1702462d63424685b24a8c3b6fb9))
