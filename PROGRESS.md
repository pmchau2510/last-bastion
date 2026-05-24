# Last Bastion — Work Progress

> Read this file at the start of each session to know where we left off.

---

## Current State (2026-05-24) — last updated same session

**Branch:** `main`  
**Server:** `node server.js` → `http://localhost:3000`

---

## Completed Features

### Wave System (batch spawning)
- Enemies now release in **batches of 10** per sub-wave
- Within a sub-wave: 5-frame stagger between each enemy (near-simultaneous)
- Between sub-waves: **180-frame gap** (~3 seconds)
- First enemy spawns after 30-frame initial delay

### Global Leak Quota (lives system)
- **Normal:** 20 lives total for the entire game
- **Hard:** 10 lives total
- Each leaked enemy costs 1 life; **boss costs 3 lives**
- Reaching 0 lives = **instant lose** (no more crystal HP drain)
- Crystal visual changes color: blue → orange → red as lives deplete
- HUD shows "🛡 N Mạng" (remaining lives)

### Multi-Gate Bug Fix
- Enemies are now distributed **round-robin across ALL paths** regardless of `data.gates`
- Previously: enemies only spawned on path 0 when `data.gates < numPaths`

### Map Preview Fix (MapRenderer)
- Preview now draws **all paths** (`allPaths.forEach`)
- Each path gets its own spawn marker labeled A, B, C...
- Animated enemies walk across all paths proportionally

### Enemy Movement Speed Tuning
- Speed multiplier reduced from `* .01` → `* .006` (chậm ~40%)
- Áp dụng trong công thức: `spd = en.spd * en.slow * fps60 * .006`
- Thời gian qua map tham khảo (path 8 điểm, 60fps):

| Quái | spd | Thời gian |
|------|-----|-----------|
| Swarm Bat | 1.8 | ~12s |
| Shade Crawler | 1.2 | ~18s |
| Berserker | 1.0 | ~22s |
| Stone Golem | 0.7 | ~32s |
| Behemoth | 0.5 | ~44s |

- Nếu muốn điều chỉnh thêm: tìm dòng `* .006` trong game loop enemies (~line 1561)

### Nation System (3 factions)
- **Ironhold ⚔️**: Cung / Đại Bác / Sét / T.Nhiên / Ballista
- **Glacien ❄️**: Cung / Băng / Sét / T.Nhiên / Băng Đền (AoE slow shrine)
- **Emberon 🔥**: Cung / Đại Bác / Lửa / T.Nhiên / Magma (chain fire)
- Nation chosen before each game (solo: NationPicker modal; MP: per-player button in lobby)

### One-Room-Per-Connection
- Server rejects `create`/`join` if the WebSocket already belongs to a room

### Reconnect After Disconnect
- Mid-game disconnects keep the player slot for 10 minutes
- Browser saves `lb_session` to localStorage; toast on reload lets player rejoin
- `join` with matching name → `reconnected` response restores slot

---

## Known Architecture

### Multiplayer
- **Host-authoritative**: host runs full game loop, broadcasts `state_sync` every 5 frames
- Guests send `player_input` to host; host processes and re-syncs state

### Paths
- Maps define `pathFns: [fn1, fn2, ...]`
- Each path function takes `W` (canvas width) and returns array of `{x,y}` points
- `Game.paths[]` holds pre-computed paths; enemies use `enemy.pathIdx`

### Tower IDs
- `TOWERS_DATA[id]` — id === array index (0–8)
- `selectedTower` stores the tower **id** (not grid position)
- Nation filter: `NATIONS_DATA[nationIdx].towers` is an array of allowed tower IDs

### Spawn Queue
- `spawnQueue`: `[{enemy, delay}, ...]` where `delay` is relative to previous entry
- `spawnTimer` accumulates `fps60` per frame; shifts entries when `spawnTimer >= entry.delay`

### Leak / Lives
- `Game.leakCount` — global across all rounds, never resets mid-game
- `Game.leakQuota` — 20 (Normal) or 10 (Hard), set once in `init()`
- When `leakCount >= leakQuota`: call `lose()` immediately

---

## Files

| File | Purpose |
|------|---------|
| `index.html` | Entire game (HTML + CSS + JS, ~4200 lines) |
| `server.js` | Node.js WebSocket signaling server |
| `LAST_BASTION_GDD.md` | Game Design Document |
| `PROGRESS.md` | This file — session context tracker |

---

## Pending / Backlog

These features exist in an old todo list but have NOT been implemented:
1. Admin password flow (hide create button, host-only start)
2. Host-only lifelines + max 2 uses each
3. Tower upgrade system (5 levels, exponential cost)
4. Tower ownership (ownerIdx, player colors, restrict upgrade/sell)
5. Per-player gold + donation system

> **Do NOT start these without explicit user instruction.** They may conflict with each other and need planning.
