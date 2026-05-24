# Last Bastion — Work Progress

> Read this file at the start of each session to know where we left off.

---

## Current State (2026-05-24) — last updated (aerial enemies + anti-air tower system)

**Branch:** `main`  
**Server:** `node server.js` → `http://localhost:3000`

---

## Completed Features

### Aerial Enemy System + Anti-Air Tower (2026-05-24)
- **Aerial enemies**: Storm Wyvern (id:7, spd 1.5, HP 90) + Siege Drake (id:8, spd 0.85, HP 260), `aerial:true`
- Aerial enemies fly **straight across** at `aerialY = topH + mapH * 0.5` (center of game area), independent of ground paths — direct pixel movement `en.x += en.spd * fps60 * 0.5`
- **5 aerial rounds**: rounds 4, 8, 11, 14, 18 (not boss rounds); 4 + round/4 enemies each
- **Anti-air tower** (id:10, `antiAir:true`): cost 140, DMG 35, range 160, rate 1100ms, `🦅` icon — **only** hits aerial enemies
- Tower targeting filter: anti-air → `en.aerial`; all other towers → `!en.aerial`
- Frost shrine AoE + Đại Pháo splash also skip aerial enemies
- **Radar dish visual**: rotating antenna with sweep pulse, per-nation color badge
- **Cyan energy dart** projectile for anti-air (speed 9, spinning ring + trail)
- Healer Shaman can't accidentally heal aerial enemies (`!e.aerial` filter added)
- Each nation gets id:10 → tower grids now have **7 columns** (`repeat(7,1fr)`)
- Background canvas shows a subtle aerial lane (sky blue dashed line at aerialY)
- Announcement toast reuses `#elite-gate-announce` styled in blue: `🦅 QUÁI TRÊN KHÔNG XUẤT HIỆN`

### Map Navigation Arrows (thay tab bar)
- Thay scrollable tab bar bằng nút **‹ ›** trong header màn hình chọn map
- Counter `X/Y` cho biết đang ở map số mấy / tổng unlocked
- Nút tự disable khi đã ở đầu/cuối danh sách — thân thiện hơn nhiều trên mobile

### Tower Fire Rate Upgrade System
- `UPGRADE_RATE_MULTS = [1, 0.88, 0.75, 0.62, 0.50]` — áp dụng cho **tất cả** tháp khi upgrade
- Archer thêm `UPGRADE_ARCHER_RATE = [1, 0.92, 0.82, 0.70, 0.58]` chồng lên → Cấp 5 bắn nhanh hơn ~71%
- Archer base DMG 12 → 9 (nerf để cân bằng với rate tăng)
- Tower panel hiển thị rate thực tế sau upgrade (kèm ⚡ nếu > cấp 1)

### Tháp mới: Đại Pháo (type 9)
- 🎆 cost 160, DMG 50, range 95, rate 3200ms
- **AoE bán kính 55px**: nổ instant — damage 100% tất cả quái trong vùng (không cần projectile)
- Có ở cả 3 nation. Tower grid đổi từ 5 → **6 cột**
- Visual: mortar nặng đặt trên nền đá, barrel xoay 60°, flash ring vàng khi nổ

### Time Warp 6 giây
- Trước: set `slow=0.2` 1 lần, enemy tự recover sau ~0.67s → không có tác dụng thực tế
- Sau: `timeWarpTimer = 360 frames (6s)` — enemy slow bị cap ≤ 0.22 suốt thời gian
- `timeWarpActive` + `timeWarpTimer` được sync qua MP (`state_sync` + `applyNetState`)

### Multi-Boss Rounds
- R5: 1 boss — Malachar's Puppet (intro)
- R10: **2 boss** — Void Serpent (path 1) + Puppet (path 2)
- R15: **2 boss** — Iron Colossus + The Twins cùng lúc
- R20: **3 boss** — Void Colossus + Iron Colossus + The Twins
- Boss phụ có 70% HP; spawn cách nhau 90 frames trên các path round-robin
- Announce hiển thị: "⚠️ BOSS ×2 — Void Serpent + đồng bọn!"

### HUD Collapse Button (▲ Thu)
- Nút `#hud-tab` dưới weather bar — bấm để thu gọn/mở rộng HUD top
- CSS sáng hơn: màu `#c4a0ff`, viền `#5a3aaa`, text-shadow glow tím
- Tự mở lại khi bắt đầu game mới

### Fullscreen (ẩn thanh địa chỉ)
- Nút ⛶ trong HUD top bar và main menu
- Gọi `requestFullscreen()` API — Android Chrome ẩn URL bar
- iOS: dùng "Add to Home Screen" (PWA meta tags đã có sẵn)

### Xóa Admin Password
- Bỏ `ADMIN_PASSWORD` constant và `checkAdminPw()` method
- "Tạo phòng mới" hiển thị mặc định — ai cũng tạo được
- Vẫn giữ mật khẩu phòng (tùy chọn) để giới hạn người vào

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

### Map Redesign — Đường Dài + Phức Tạp
- Thiết kế lại path cho tất cả 6 map để quái di chuyển lâu hơn và phong phú hơn:
  - **Map 0 Ironhold Pass**: Hình chữ S kép — 3 đỉnh sóng mỗi làn
  - **Map 1 Sylvan Crossing**: Cầu thang / U-turn — quái rơi thẳng đứng rồi đổi hướng (góc L)
  - **Map 2 Tidal Docks**: Phẳng rồi rơi sâu — đoạn phẳng dài + valley đột ngột
  - **Map 3 Ashfield Ruins**: Sóng W/M chéo — đường sóng nghiêng 4 đỉnh
  - **Map 4 Crimson Rift**: 3 làn mỗi làn khác nhau — cầu thang / S-curve / zigzag
  - **Map 5 Void Nexus**: W kép 5 đảo chiều — phức tạp nhất, nhiều cầu thang
- `MapRenderer.draw()` thêm **y-scaling** (giống `Game.resize()`) — preview luôn khớp tỷ lệ dù path dùng y range nào
- Mỗi path đều đã verify không giao nhau (gap tối thiểu 7-40px tùy map)

### Thời Gian Chuẩn Bị Tất Cả Chế Độ
- Trước: Hardcore = 0s (không có prep), các mode khác = 45s
- Sau: `prepT = [45, 20, 45, 35][modeIdx]` — **Hardcore 20s**, Standard 45s, Endless 45s, Challenge 35s
- Cập nhật mô tả + badge pill Hardcore: "0s chuẩn bị" → "20s chuẩn bị"

### Map Preview Arc-length Fix
- `MapRenderer.draw()` dùng arc-length parameterization giống game loop
- `buildAL(pts)` tính trước cumulative pixel distance; `ptOnPath(t, pts, al)` map `t` theo pixel distance thực
- Áp dụng cho cả enemy thường (allALs) và elite enemy (eliteAL)
- `epts` và `eliteAL` tính một lần ngoài `frame()` — không tính lại mỗi frame nữa

### Room Browser Auto-refresh
- Khi mở danh sách phòng: cứ 3 giây tự gửi `list_rooms` → danh sách cập nhật real-time
- `_stopRoomRefresh()` dọn interval khi rời browser (back, join, create)
- `showLobby()` cũng gọi `_stopRoomRefresh()` và ẩn `mp-card-rooms` để tránh bị stuck

### Fullscreen Fix
- Xóa nút fullscreen khỏi main menu (nó là nút "lạ" bên dưới Nhiều người chơi)
- `toggleFullscreen()` dùng `document.webkitFullscreenElement` đúng cách; thêm `.catch(()=>{})` cho iOS
- Global `fullscreenchange` / `webkitfullscreenchange` listener cập nhật icon `⛶`/`✕` HUD button

### Bottom HUD Cleanup — Bỏ Hero Row, Thêm Nút Thu
- Xóa hoàn toàn `.hero-row` (Kael/Lyria chips + skill button ✨) khỏi `#game-bottom`
- Thêm `#bot-tab` — nút **"▼ Ẩn"** ở trên cùng bottom HUD → thu gọn/mở rộng khu vực tháp + lifeline
  - Khi thu: nút đổi thành **"▲ HUD"** → bấm lại để mở ra
  - CSS: `#bot-rows` dùng `max-height` transition (0 ↔ 90px, 280ms ease)
- `toggleBottomHUD()` thêm vào Game object
- Reset `bot-rows` (mở ra) khi bắt đầu game mới
- `botH` giảm 95 → **78** (tiết kiệm ~17px map space do không còn hero row)

### Enemy Movement Speed Tuning + Uniform Speed Fix
- Speed multiplier: `spd = en.spd * en.slow * fps60 * .006`
- **Arc-length parameterization** (mới): `_buildArcLengths(path)` tính trước cumulative pixel distance cho mỗi path; `ptOnPath(t)` map `t` theo pixel distance thực tế thay vì số điểm → tốc độ đều tuyệt đối trên toàn path, không còn bị nhanh/chậm ở đoạn đầu/cuối
- Thời gian qua map tham khảo (path 8 điểm, 60fps):

| Quái | spd | Thời gian |
|------|-----|-----------|
| Swarm Bat | 1.8 | ~12s |
| Shade Crawler | 1.2 | ~18s |
| Berserker | 1.0 | ~22s |
| Stone Golem | 0.7 | ~32s |
| Behemoth | 0.5 | ~44s |

- Nếu muốn điều chỉnh thêm: tìm dòng `* .006` trong game loop enemies

### Collapsible Top HUD
- Nút **"▲ Thu"** ở góc phải HUD trên → thu gọn hud-top + quota + weather bar
- Khi thu: nút đổi thành **"▼ HUD"** → bấm lại để mở ra
- CSS: `#hud-rows` dùng `max-height` transition (0 ↔ 120px, 280ms ease)
- HUD tự mở lại (`hud-collapsed` bị remove) khi bắt đầu game mới

### Landscape-Only Orientation Lock
- `#rotate-msg`: `position:fixed; z-index:9999` — hiển thị khi `@media(orientation:portrait)`
- Nội dung: "📱 Xoay ngang điện thoại — Last Bastion chỉ hỗ trợ chế độ ngang"
- Pure CSS, không cần JS — tự ẩn khi xoay ngang

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
- **Arc-length**: each path has `._al` (cumulative distances array) and `._len` (total pixels), computed by `_buildArcLengths()` in `resize()`; used in `ptOnPath()` for uniform speed

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

### Nation-Specific Projectile Visuals
- Mỗi nation có đạn/phóng chiếu riêng biệt thay vì chung chung
- Helper `_towerNation(tw)` đọc nation từ `tw.ownerIdx` (MP) hoặc `this.nationIdx` (solo)
- Field `nation` gắn vào mỗi projectile khi tạo; `drawProjectile()` switch theo cả `typeId` và `p.nation`
- **Type 0 — Cung/Xạ Thủ (3 quốc gia)**
  - Ironhold: **Steel Bolt** — thân bolt kim loại xám, đầu hình thoi trắng bạc, 2 cánh nhỏ, trail tia lửa cam
  - Glacien: **Ice Needle** — mũi kim tinh thể mỏng, 2 đầu nhọn, vòng xoay băng nửa vòng tròn, trail xanh băng
  - Emberon: **Flame Arrow** — thân tên cháy đen, đầu lửa cam, glow vàng, trail tro đỏ/cam
- **Type 1 — Đại Bác (2 quốc gia)**
  - Ironhold: **Iron Cannonball** — quả đạn sắt xám gradient, highlight cam rèn lò, trail khói xám
  - Emberon: **Lava Bomb** — quả cầu dung nham nổi, cracked texture vàng, outer glow đỏ cam, trail dung nham
- **Type 3 — Sét (2 quốc gia)**
  - Ironhold: **Copper Arc** — tia điện amber/cam kiểu rèn lò, đường zíc zắc ngẫu nhiên rộng
  - Glacien: **Frost Bolt** — tia điện xanh trắng geometric, zigzag đối xứng, chain băng đồng màu
- Types 2/4/6/8 nation-exclusive → không cần phân nhánh

### Room Browser Architecture
- `MP.showRoomBrowser()` connects WebSocket then calls `refreshRooms()` → sends `list_rooms`
- Server `list_rooms` returns all non-started rooms; client renders with `handleRoomsList()`
- `MP.joinFromList(code, hasPassword)` — prompts for password if needed, calls `_joinWithCode()`
- `MP.backFromBrowser()` closes WS (if not yet in lobby) and returns to main card

---

## Pending / Backlog

> **Do NOT start these without explicit user instruction.**

1. Tower ownership UI improvements (player color indicators on placed towers)
2. Per-player gold display improvements in MP HUD
