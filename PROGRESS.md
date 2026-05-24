# Last Bastion — Work Progress

> Read this file at the start of each session to know where we left off.

---

## Current State (2026-05-24) — last updated (elite path preview added)

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
- **Elite path** cũng được vẽ trong preview:
  - Đường đứt khúc màu đỏ đen (`dashed`, tối hơn đường thường)
  - Marker ★ đỏ thay vì A/B/C
  - Badge **"R10+"** nhỏ phía trên marker
  - Quái elite nhỏ di chuyển trên đường (màu + glow theo từng map)

### Bottom HUD Redesign (landscape mobile)
- Towers + Lifelines gộp vào **1 hàng ngang** thay vì 2 hàng chồng — tiết kiệm ~55px
- Hero row thu gọn: avatar nhỏ hơn (18px), hero name nhỏ hơn, skill button → chỉ còn icon `✨`
- `tower-grid` đổi thành `repeat(5,1fr)` khớp với số tháp thực tế (5 tháp/nation)
- `botH` giảm 148→95: map được thêm **~53px chiều cao** hiển thị
- Nation modal: `max-height:100svh` + `overflow-y:auto` + confirm button `sticky bottom`
- Landscape CSS: 3 nation card hiển thị ngang hàng (`@media orientation:landscape`)

### Elite Gate (Cổng Đặc Biệt)
- Từ **Round 10** mỗi map xuất hiện thêm 1 cổng quái đặc biệt (`elitePath`)
- Quái elite mạnh hơn: `hpMult`, `spdMult`, `rewardMult` riêng theo map
- Round 10: màn hình rung mạnh (`addShake(18)`), nhạc aura (`SFX.eliteGate()`), thông báo đặc biệt
- Round 11+: rung nhẹ hơn, thông báo ngắn gọn
- Số quái elite tăng theo round: `min(3 + floor((round-10)/3), 8)`
- Mỗi map có thiết kế quái elite riêng:
  - Map 0 Ironhold: **Lava Titan** 🔥 (đỏ cam, body ellipse + lava cracks)
  - Map 1 Shadefall: **Shadow Stalker** 👻 (tím đen, phantom + tentacles)
  - Map 2 Tidegate: **Tide Colossus** 🌊 (xanh dương, armored + water drops)
  - Map 3 Ashfield: **Cinder Warrior** ⚔ (đỏ tro, knight visor + armor)
  - Map 4 Voidrift: **Void Reaper** 💀 (đỏ đậm, cloak + scythe)
  - Map 5 Nexus: **Nexus Horror** 🌀 (tím void, distorted polygon + 3 eyes)
- `pathIdx=100` đặc biệt → dùng `this.elitePath` (không làm ảnh hưởng round-robin)

### Round Completion Gold Bonus
- Sau mỗi round thắng: tất cả người chơi nhận vàng thưởng
- Công thức: `30 + round * 12` vàng (round 1: 42g, round 10: 150g, round 20: 270g)
- Hiển thị popup `+N 💰 Vàng thưởng vòng` fade-up animation
- MP: host broadcast `round_bonus` event; guest apply qua `applyRemoteEvent`

### Map-Specific Enemy Color Themes
- Mỗi map có `enemyColors[typeId]` — override màu quái khi spawn
- Ironhold: đỏ nâu; Shadefall: tím; Tidegate: xanh; Ashfield: đỏ tro; Voidrift: đỏ tối; Nexus: tím void

### Room List / Lobby Browser
- Thay thế nhập mã thủ công: nút **"🔍 Xem danh sách phòng chờ"** hiển thị danh sách real-time
- Server: `list_rooms` → `rooms_list` response (code, map, mode, playerCount, hasPassword)
- Phòng có mật khẩu: tạo với `mp-room-pw` input, join từ browser → prompt nhập pw
- Join thẳng bằng mã vẫn giữ, có thêm field "🔒 Mật khẩu phòng (nếu có)"
- Server-side: validate password trước khi vào, check all-ready trước khi start
- Host chỉ bắt đầu được khi **tất cả** guest đã nhấn Sẵn sàng (cả client + server check)

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
- **Elite path**: `pathIdx=100` → routes to `Game.elitePath` (set from `mapData.elitePathFn`)
- Elite path isolated from `Game.paths[]` to avoid breaking round-robin distribution

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
| `index.html` | Entire game (HTML + CSS + JS, ~4350 lines) |
| `server.js` | Node.js WebSocket signaling server |
| `LAST_BASTION_GDD.md` | Game Design Document |
| `PROGRESS.md` | This file — session context tracker |

---

### Room Browser Architecture
- `MP.showRoomBrowser()` connects WebSocket then calls `refreshRooms()` → sends `list_rooms`
- Server `list_rooms` returns all non-started rooms; client renders with `handleRoomsList()`
- `MP.joinFromList(code, hasPassword)` — prompts for password if needed, calls `_joinWithCode()`
- `MP.backFromBrowser()` closes WS (if not yet in lobby) and returns to main card

---

## Pending / Backlog

These features exist in an old todo list but have NOT been implemented:
1. Admin password flow (hide create button, host-only start)
2. Host-only lifelines + max 2 uses each
3. Tower upgrade system (5 levels, exponential cost)
4. Tower ownership (ownerIdx, player colors, restrict upgrade/sell)
5. Per-player gold + donation system

> **Do NOT start these without explicit user instruction.** They may conflict with each other and need planning.
