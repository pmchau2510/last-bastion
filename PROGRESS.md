# Last Bastion — Work Progress

> Read this file at the start of each session to know where we left off.

---

## Current State (2026-05-24) — last updated (solo starting gold +100)

**Branch:** `main`  
**Server:** `node server.js` → `http://localhost:3000`

---

## Completed Features

### Solo Starting Gold Buff (2026-05-24)
- Solo: Standard 300→**400**, Hardcore 200→**300**, Endless 300→**400**, Challenge 250→**350**
- MP unchanged: `[200, 150, 200, 200]`

---

### Fullscreen, Special Abilities, Quota Removal (2026-05-24)

#### Fullscreen improvements
- Removed in-game `#fs-btn` from HUD (already moved to main menu)
- Fixed `#menu-fs-btn` color: was near-invisible (`#5a5878`), now clearly visible (`#c0aeff` with border `#4a4870` and semi-dark background)
- iOS detection in `toggleFullscreen()`: shows an informational toast ("iOS không hỗ trợ toàn màn hình — Thêm vào màn hình chính") instead of silently failing
- fullscreenchange listener cleaned up (no longer references removed `#fs-btn`)
- Fullscreen via Fullscreen API persists across screen transitions in the SPA (no fix needed for Android)

#### Special abilities — Time Warp only
- Removed Iron Shield and Napalm (orbital strike) lifelines
- Time Warp is the only lifeline (now idx 0, was idx 2)
- CSS updated: `.ll-0 .ll-icon` is now purple (was blue)
- `lifelinesUsed` array reduced from `[0,0,0]` to `[0]`
- Tutorial step 6 updated to describe Time Warp only
- Lifeline row width changed from `flex:3` to `flex:none;width:72px` (compact single-button layout)

#### Quota HUD removed
- Removed `<div class="hud-quota">` visual bar and all quota CSS
- Removed `updateQuotaHUD()` function and all 5 call sites
- **Underlying `leakCount`/`leakQuota` logic kept** — lives system and game-over condition unchanged
- `hud-hp` "Mạng" display still shows remaining lives numerically
- Mode pills updated: Standard → "20 mạng", Hardcore → "10 mạng" (removed "Quota ×0.4", removed "Không bán tháp")
- Hardcore description updated (removed "không bán lại tháp được" since sell is now allowed everywhere)

---

### Tower Placement + Sell Fix (2026-05-24)

#### Path collision: segment-distance check
- Old check tested distance to individual waypoints only → towers could be placed on road between distant waypoints
- Added `ptSegDist(px,py,ax,ay,bx,by)` helper (point-to-segment projection/clamp) and `onAnyPath(tx,ty,paths,elitePath,threshold)` helper
- All 3 placement checks (draw indicator, handleTap, host place_tower handler) now use segment distance with threshold 20px
- `elitePath` now included in the check (was previously omitted)

#### Sell tower in all modes
- Removed `modeIdx===1` (Hardcore) restriction from `sellTower()`, `showTowerPanel()` sell button visibility, and host `sell_tower` handler
- Sell is now available in all modes: Standard, Hardcore, Endless, Challenge

---

### Android/iOS MP Bug Fixes + UI Polish (2026-05-24)

#### Critical: Missing `.mp-card.hidden` CSS rule
- **Root cause**: `.mp-card.hidden{display:none}` CSS rule did not exist → ALL 4 mp-cards rendered simultaneously (create/rooms/lobby stacked on top of mp-card-main)
- Symptom on Android: overlay showed multiple cards stacked, couldn't scroll to join area; room browser showed but had no WebSocket connection (never triggered `showRoomBrowser()`)
- Also fixed missing rules: `.hud-pause.hidden`, `.w-bonus.hidden`, `#lobby-guest-controls.hidden`

#### MP overlay scroll fix (Android)
- Removed `justify-content:center` from `#mp-overlay` — centers content but makes top overflow unreachable on scroll
- Added `#mp-inner` wrapper div inside overlay with `margin:auto` — centers when content fits, scrolls from top when it overflows
- Added `overscroll-behavior:contain` to prevent page bounce while scrolling overlay

#### WebSocket keepalive ping
- `MP.connect()` now starts a 25-second ping interval on open → prevents Render.com free-tier from closing idle connections (causing rooms to disappear cross-device)
- Interval cleared on close/error; cleaned up with `_pingTimer`

#### Fullscreen button on main menu
- Added `#menu-fs-btn` (⛶) to top-right corner of main menu screen — accessible before entering game
- `fullscreenchange` listener updates both `#fs-btn` (in-game) and `#menu-fs-btn` (menu) icon

---

### MP: Wave-Ready Indicator + Donate Gold Improvements (2026-05-24)

#### Wave-Ready Indicator (tính năng 2)
- Trong pha prep (chuẩn bị), hiện thanh `#wave-ready-bar` bên cạnh nút "Bắt đầu" trên HUD
- Mỗi người chơi hiển thị là **✅ tên** (sẵn sàng) hoặc **⏳ tên** (chưa)
- **Guest**: bấm vào slot của mình trong thanh để toggle sẵn sàng → gửi `wave_ready` input đến host
- **Host**: slot host luôn ✅; khi tất cả guest ✅ → nút "Bắt đầu" chuyển sang **pulse gold** (animation `all-ready`)
- Flag reset mỗi round mới (host và guest đều reset)
- Bar tự ẩn khi wave bắt đầu (timer hết hoặc host bấm start)
- Luồng: guest click → `player_input(wave_ready)` → host update `waveReadyFlags[]` → `broadcastEvent(wave_ready_update)` → tất cả `updateWaveReadyBar()`

#### Donate Gold Improvements (tính năng 6)
- Menu donate (💰 button) giờ **hiển thị gold hiện tại** của từng người nhận — không cần đoán ai đang cần tiền
- **Recipient toast**: khi ai đó donate cho bạn, bạn thấy toast `💰 +50 vàng từ [Tên]`
- Guest → guest donate đã hoạt động đúng (không có bug); cải thiện là UX và notification
- Luồng toast: host xử lý `give_gold` → `broadcastEvent(gold_gift)` → recipient nhận và hiện toast qua `applyRemoteEvent`

---

### Tower Upgrade Balance + Boss HP Buff (2026-05-24)

**Problem:** Cheap towers (Cung 50g) maxed to level 5 gave ~194 DPS — higher than Ballista (130g) at ~152 DPS, making late rounds/bosses trivially easy.

**Root cause:** DMG scale 5.0× + double-stacked rate bonus (UPGRADE_RATE_MULTS × UPGRADE_ARCHER_RATE) → Archer at max shot every 232ms with 45 DMG.

#### Upgrade constant changes
| Constant | Before | After |
|---|---|---|
| `UPGRADE_DMG_MULTS[4]` (max) | 5.0 | **4.2** |
| `UPGRADE_RATE_MULTS[4]` (max) | 0.50 | **0.62** |
| `UPGRADE_ARCHER_RATE[4]` (max) | 0.58 | **0.74** |
| `UPGRADE_COST_MULTS[3]` (lvl3→4) | 1.5 | **2.0** |
| `UPGRADE_COST_MULTS[4]` (lvl4→5) | 2.5 | **4.0** |

**Result (Cung max):** 194 DPS @ 315g → **103 DPS @ 420g** (-47% DPS, +33% cost)

#### Boss HP buffs
| Boss | Before | After |
|---|---|---|
| Scorpion King (R5) | 800 | **900** |
| Venomfang Serpent (R10) | 1400 | **2000** |
| Goblin Warlord (R10) | 700 | **1000** |
| Stone Titan (R15) | 2200 | **3200** |
| Storm Drake (R15) | 1600 | **2400** |
| Eternal Dragon (R20) | 5000 | **8000** |
| Shadow Colossus (R20) | 3200 | **5000** |

---

### Performance Optimizations (2026-05-24)

#### Particle Object Pool + Cap 200
- `spawnParticles()` now reuses objects from `this._particlePool` (cap 400) instead of allocating each frame
- Particle removal uses **swap-and-pop** (`particles[i] = particles[last]; pop()`) instead of `splice()` — O(1) vs O(n)
- Hard cap: max 200 active particles at a time; new ones drop when full
- Both host loop and guest loop updated

#### DamageNum Object Pool
- `damageNums.push()` reuses from `this._dmgPool` (cap 200)
- Damage number removal also uses swap-and-pop
- Both host loop and guest loop updated

#### Split Sync Rate (enemies vs full state)
- **Every 2 frames (~33ms)**: enemy-only sync (position, HP, slow) — keeps movement smooth
- **Every 10 frames (~167ms)**: full sync (towers, gold, round info, timers) — rarely changes
- `_fullSyncCounter` added to `reset()` alongside `_syncCounter`
- `broadcastState(full)` and `getNetState(full)` parameterized accordingly

#### Compressed getNetState Payload
- Enemy positions: `~~en.x`, `~~en.y` (integer pixels)
- Enemy HP: `~~en.hp`, `~~en.maxHp`
- Path progress: `~~(en.t*10000)/10000` (4 decimal precision)
- Towers/gold/round only included in full sync — not sent every frame

#### applyNetState: handles partial syncs
- `s.towers` optional: only rebuilds tower array when present (every 10 frames)
- `s.round` optional: round/timer/leakCount only updated when present (full sync)
- `gamePhase` always present: transition from `prep→wave` handled even in partial sync
- `s.gold`/`s.playerGold` optional: only updates when present

---

### Aerial Gate Fix + Elite Gate Animation + Tower Size Fix (2026-05-24)

#### Aerial enemies from gate (not separate lane)
- Aerial enemies (Storm Wyvern, Siege Drake) now spawn from **same gate as ground enemies** (round-robin across paths), fly straight right from that Y position
- Aerial bosses (Venomfang Serpent, Storm Drake, Eternal Dragon) also spawn from gate positions
- Removed the `aerialY` center-lane from `buildBgCanvas` entirely — no more blue sky strip

#### Elite Gate bug fix + animation (round 10)
- **Root cause**: elite path was never drawn on screen — enemies walked on an invisible road
- **Fix**: `buildBgCanvas` now draws the elite path (dark red road) when `eliteGateShown = true`
- **Round 10 animation** (`_drawEliteGateReveal`): 3-second animated path draw — path draws itself from gate to end, glowing front tip, spark particles, portal pops in at gate
- After animation completes: background rebuilds with elite path permanently
- Subsequent rounds (11+): path shows immediately on game start
- Guests get the same animation via `applyNetState` round detection
- Both solo and multiplayer fully supported

#### Tower upgrade visual size
- `UPGRADE_SCALE`: `[1, 1.2, 1.45, 1.7, 2.0]` → `[1, 1.1, 1.22, 1.35, 1.48]` — still grows visibly but less dramatically

---

### Boss Redesign + Multiplayer Fixes + Tower Placement + Room UI (2026-05-24)

#### Boss Redesign
- All 6 boss types completely redrawn with unique per-boss visuals using `en.id` switch
- **Scorpion King** (R5, id:10): segmented tail, stinger glow, paired claws, 6 legs, 3-eye cluster
- **Venomfang Serpent** (R10, id:11, aerial): S-curve snake body, folding wings, fangs, venom-green eyes
- **Goblin Warlord** (R10, id:12): armored goblin, gold axe, horned helmet, orange eyes
- **Stone Titan** (R15, id:13): cracked stone body with lava-glow cracks, rune chest, stone crown
- **Storm Drake** (R15, id:14, aerial): electric aura, lightning crackling, blue dragon with wings
- **Eternal Dragon** (R20, id:15, aerial, FINAL): dual wing pairs, golden scale pattern, crown of horns, 4 glowing eyes, fire breath, animated energy rings
- **Shadow Colossus** (R20, id:16): shifting void blob, 6 tentacle tendrils, giant purple single eye
- New `BOSS_TYPES`: R5=Scorpion King, R10=Venomfang Serpent+Goblin Warlord, R15=Stone Titan+Storm Drake, R20=Eternal Dragon+Shadow Colossus+Stone Titan
- Aerial bosses spawn at `aerialY` (not on path); aerial boss leak = 3 lives (same as ground boss)

#### Multiplayer Guest Lag Fix
- Sync rate increased: host broadcasts state every **2 frames** (was 5) → ~33ms interval
- **Client-side enemy prediction** added to guest update loop: enemies move smoothly between syncs using same speed formula as host (`en.spd * en.slow * fps60 * 0.006`); aerial enemies predicted with direct pixel movement
- **Tower panel flicker fix**: `applyNetState` re-finds `selectedPlacedTower` by position after tower array rebuild — panel stays open without flickering

#### Tower Placement Red/Green Indicator
- When dragging to place a tower: green circle = valid spot, red circle = path/collision blocked
- Range preview ring also turns red when placement is invalid
- Both solo and multiplayer (check is client-side, server validates on place)

#### Room UI Separation
- **Create Room** moved to its own card (`mp-card-create`) — separate from join/browse
- Main card now has clear "Create" and "Browse" buttons — no more mixed UI
- Room browser now shows **in-progress rooms** with orange "● Đang chơi" badge and green "Vào lại →" button
- `server.js`: `list_rooms` now includes started rooms (with `started:true` flag)
- Rejoining works: click "Vào lại" → name-match reconnect via existing server logic

---

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
- **Host-authoritative**: host runs full game loop, broadcasts `state_sync` every 2 frames (enemies) / every 10 frames (full state including towers, gold, round)
- Guests send `player_input` to host; host processes and re-syncs state
- Guest loop: client-side enemy prediction between syncs; object pools for particles + damage numbers

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
