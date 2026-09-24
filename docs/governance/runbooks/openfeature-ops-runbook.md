# Runbook — OpenFeature ops

## Flag not taking effect
- Verify provider kind in `cfg/feature-flags/openfeature.json` and catalog key spelling.
- Confirm evaluation context environment matches deploy stage (`development`, `testing`, `staging`, `master`).
- Check that runtime flag lookup defaults properly if provider is offline or disconnected.
