
Goal: eliminate any remaining React render leak and make startup behavior deterministic so the full-screen gate can only appear after a real startup validation failure.

What I verified
- Exact default state: `locationStatus` is initialized to `'checking'` in `src/contexts/LocationContext.tsx:87`.
- Exact gate render path: the full-screen “Location Required” UI exists only in `src/components/LocationGate.tsx`.
- App shell path: `src/App.tsx` wraps the whole app in `<LocationGate>...</LocationGate>`, so gate visibility is controlled entirely by that component.
- No alternate full-screen gate path found:
  - no `return <LocationGate` elsewhere
  - no `location === null` checks
  - no page-level `!location` / `!lat` / `!lng` guards controlling app-vs-gate rendering

Exact root cause found
1. `src/components/LocationGate.tsx`
- Current logic is already status-based:
  - `checking` → spinner
  - `ready` → children
  - else → gate
- So the false gate is not caused by a hidden render condition here.

2. `src/contexts/LocationContext.tsx`
- Real bug is in startup validation, not in `LocationGate`.
- Problematic logic:
  - state hydrates `location` from `localStorage` on mount (`lines 74-82`)
  - then startup geolocation probe runs (`lines 95-157`)
  - after two failures it calls `markBlocked()` (`lines 114-121`)
- This means the gate appears because startup validation is setting `locationStatus = 'blocked'`, not because UI is checking `!location`.

3. Async race / state override bug
- `setLocation()` can set `locationStatus = 'ready'` (`lines 159-165`)
- But startup validation remains in flight and can later still call `markBlocked()`
- The current stale-check only guards by validation id/unmount, not by “ready already achieved from another path”
- So a late startup failure can overwrite a valid ready state

Non-status checks found
- `src/components/LocationPickerDrawer.tsx:177`
  - `if (!open || !location.lat || !location.lng) return;`
- `src/components/LocationPickerDrawer.tsx:262`
  - `const biasLocation = location.lat && location.lng ? ... : undefined;`
These do not control the full-screen gate, but they should still be tightened to avoid truthiness issues and keep location handling consistent.

Implementation plan
1. Make startup validation the only source of initial decision
- Keep `locationStatus` hardcoded to `'checking'` on every mount
- Stop deriving initial `location` state from `localStorage` for startup render decisions
- Either:
  - initialize `location` to `DEFAULT_LOCATION` only, or
  - keep cached data separately as display-only metadata, not as render-driving state

2. Add a startup lock to prevent `blocked` after `ready`
- Introduce a ref such as `resolvedStatusRef` or `hasReachedReadyRef`
- When any path successfully confirms location (`startup geolocation`, `setLocation`, native callback), set the ref immediately
- In `markBlocked()`, bail out if ready has already been reached
- This guarantees “once ready, never blocked by late startup validation”

3. Narrow `LocationGate` to explicit blocked rendering
- Change final branch from implicit “else show gate” to explicit:
  - `if (locationStatus === 'blocked') return gate`
  - otherwise return spinner/null as a safety fallback
- This removes any accidental future rendering if a new status is introduced

4. Remove cached-state influence from startup correctness
- Continue persisting location if needed for convenience
- But do not hydrate startup `location` from `localStorage` in a way that can affect app flow before validation completes
- Cached location should only enrich UI after `ready`, never bypass or shape startup validation

5. Tighten non-status truthiness checks
- In `LocationPickerDrawer`, replace truthy checks with explicit nullish/number checks:
  - avoid `!location.lat || !location.lng`
  - use `location.lat == null || location.lng == null`
- This prevents valid `0` coordinates from being treated as missing and keeps location logic consistent

6. Keep startup behavior deterministic
- Preserve current silent validation pattern:
  - no permission API
  - no Flutter bridge call on mount
  - one retry
  - 5–7s timeout
- During `checking`, render only neutral loading
- After validation:
  - success → `ready`
  - double failure → `blocked`

Why this guarantees no false gate
- The gate is already only rendered by `LocationGate`
- After this change, `LocationGate` will only render on explicit `locationStatus === 'blocked'`
- Cached location can no longer influence startup path
- Late startup failures can no longer override a valid `ready`
- Therefore, with location ON at reopen, the path becomes:
  `checking → ready`
  and the gate never renders

Code paths to remove or change
- Remove startup hydration dependency:
  - `src/contexts/LocationContext.tsx:74-82`
- Guard against late override:
  - `markBlocked()` and `markReady()` in `src/contexts/LocationContext.tsx`
- Make gate rendering explicit:
  - `src/components/LocationGate.tsx`
- Clean up non-gate truthiness checks:
  - `src/components/LocationPickerDrawer.tsx:177`
  - `src/components/LocationPickerDrawer.tsx:262`

Validation to run after implementation
1. Location ON, reopen app
- expected: `checking → ready`
- gate never appears, not even for one frame

2. Location OFF, reopen app
- expected: `checking → blocked`
- gate appears after validation

3. Slow GPS
- expected: longer `checking`
- no premature gate

Technical details
```text
Startup after fix

mount
  -> locationStatus = checking
  -> render spinner only
  -> silent geolocation probe starts
      -> success: set ready lock, set locationStatus=ready, render app
      -> fail twice: if ready lock not set, set locationStatus=blocked, render gate
```
