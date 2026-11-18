# @e2e-dev/revyl

## 0.0.1

### Patch Changes

- [#1708](https://github.com/e2e-inc/e2e/pull/1708) [`f659d64`](https://github.com/e2e-inc/e2e/commit/f659d64d80cbb484f539681a6bf72f5047854a99) Thanks [@KayaanT](https://github.com/KayaanT)! - Add `@e2e-dev/revyl`: `revyl({ app, device, osVersion })` runs mobile targets on Revyl's hosted iOS simulators and Android emulators, one device per worker slot, through agent-device's `@agent-device/revyl` plugin. Set `REVYL_API_KEY` in the run environment; Revyl installs the build from the `https` `app` URL. Needs `@e2e-dev/mobile` 0.12.8 or later.
