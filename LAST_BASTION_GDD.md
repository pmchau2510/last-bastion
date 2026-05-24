# LAST BASTION — Game Design Document v8.0

> **Cập nhật:** 2026-05-24  
> **Stack:** Single HTML file · Canvas API · Web Audio API · Node.js WebSocket (multiplayer)

---

## 1. Tổng quan

Last Bastion là game tower defense theo lượt (20 round) được chơi trên trình duyệt. Người chơi đặt tháp dọc theo đường kẻ để ngăn quái đến phá vỡ Tinh Thể. Hỗ trợ 1–4 người chơi qua WebSocket với kiến trúc host-authoritative.

**Mục tiêu:** Bảo vệ Tinh Thể qua 20 round (Standard/Challenge) hoặc chơi đến khi vỡ (Endless).

---

## 2. Stack kỹ thuật

| Thành phần | Chi tiết |
|---|---|
| Rendering | HTML5 Canvas API — offscreen `bgCanvas` cache tĩnh (nền + đường + đá) |
| Audio | Web Audio API — oscillator synthesis, không cần file âm thanh |
| Multiplayer | Node.js + `ws` WebSocket, phòng lưu trong RAM |
| Tương thích | iOS Safari, Android Chrome, Desktop — `pointer-events`, `touch-action`, safe-area inset |
| Orientation | Chỉ hỗ trợ **landscape** — `@media(orientation:portrait)` hiện overlay yêu cầu xoay ngang |
| DPR | Canvas scale bằng `ctx.setTransform(dpr,0,0,dpr,0,0)`, bgCanvas `W*dpr × H*dpr` |

---

## 3. Onboarding & Tutorial

### 3.1 Lần đầu chơi
- Lần đầu mở game (`!localStorage.lb_played`) → tự động vào Tutorial trước khi chọn map.
- Sau khi xong / bỏ qua → đặt cờ `lb_played`, không hiện lại.

### 3.2 Truy cập bất kỳ lúc nào
- Menu chính có nút **"📖 Hướng dẫn chơi"** luôn hiển thị.
- Bấm → vào map Ironhold Pass + mode Standard ở chế độ tutorial.
- Tutorial chạy song song với game thật (không phải demo riêng).

### 3.3 Nội dung tutorial (8 bước)
1. Giới thiệu giao diện
2. Chọn tháp từ thanh dưới
3. Đặt tháp lên bản đồ
4. Xem tầm bắn khi hover/đặt
5. Quái xuất hiện — quan sát
6. Nâng cấp tháp (bấm tháp đã đặt)
7. Hero skill
8. Lifeline

---

## 4. Maps

Tất cả map được thiết kế với **đường đi dài + nhiều làn** (multi-path). Quái phân chia đồng đều theo số path, mỗi path có cổng spawn riêng ở cạnh trái.

| # | Tên | Độ khó | Kích thước | Số làn | Thời tiết | Quái Elite | Màu quái |
|---|-----|--------|-----------|--------|-----------|-----------|---------|
| 0 | Ironhold Pass | ⭐⭐ | 36×24 | 2 | Ngẫu nhiên | 🔥 Lava Titan | Đỏ nâu |
| 1 | Sylvan Crossing | ⭐⭐⭐ | 40×28 | 2 | Mưa/Bão tuyết | 👻 Shadow Stalker | Tím đen |
| 2 | Tidal Docks | ⭐⭐⭐ | 42×28 | 2 | Giông/Nắng | 🌊 Tide Colossus | Xanh dương |
| 3 | Ashfield Ruins | ⭐⭐⭐⭐ | 44×30 | 2 | Nắng cố định | ⚔ Cinder Warrior | Đỏ tro |
| 4 | Crimson Rift | ⭐⭐⭐⭐ | 46×30 | 3 | Nhật thực định kỳ | 💀 Void Reaper | Đỏ đậm |
| 5 | Void Nexus | ⭐⭐⭐⭐⭐ | 48×32 | 2 | Chaos | 🌀 Nexus Horror | Tím void |

**Thiết kế đường đi (v7.0 redesign):**
- Tất cả 6 map đã được thiết kế lại với hình dạng **S-curve, zigzag, staircase, mê cung** để quái di chuyển lâu hơn và phức tạp hơn.
- Map 0: S-curve đôi · Map 1: Staircase U-turn · Map 2: Wide plateau S · Map 3: W/M wave · Map 4: 3 làn (cầu thang + S + zigzag) · Map 5: W-maze kép (phức tạp nhất)

**Cơ chế multi-path:**
- `pathFns: [fn1, fn2, ...]` — mảng hàm tạo path theo chiều rộng màn hình.
- `resize()` tính Y-range chung cho tất cả paths → scale đồng đều.
- Enemies phân phối **round-robin** qua tất cả paths (`i % numPaths`).
- `ptOnPath(t, pi)` dùng **arc-length parameterization** — tốc độ pixel tuyệt đối đều.

**Cổng Elite (từ Round 10):**
- `elitePathFn` → đường riêng cho quái elite, `pathIdx = 100`.
- Số quái elite/round: `min(3 + floor((round-10)/3), 8)`.

**Làn trên không (Aerial Lane):**
- Background canvas vẽ đường đứt nét xanh dương ngang giữa màn hình (`aerialY = topH + mapH × 0.5`).
- Quái bay xuất hiện từ cạnh trái, bay thẳng sang phải theo làn này.

**Preview map (MapRenderer):**
- Y-scaling tự động: tất cả path scale vừa canvas 130px.
- Hiển thị đường thường + elite path (đứt khúc đỏ đen, badge "R10+").
- Quái elite nhỏ di chuyển trên đường preview.

**Thưởng vàng sau mỗi round:**
- Sau mỗi round thắng: `30 + round × 12` vàng cho tất cả người chơi.

---

## 5. Chế độ chơi

| # | Tên | Thời gian chuẩn bị | Bán tháp | Đặc điểm |
|---|-----|-------------------|---------|---------|
| 0 | **Standard** | **45 giây** / round | ✅ | Cân bằng, khuyên dùng |
| 1 | **Hardcore** | **20 giây** / round | ❌ | Chuẩn bị thật nhanh, +50% thưởng, Quota ×0.4 |
| 2 | **Endless** | **45 giây** / round | ✅ | Không kết thúc, sau round 20 quái +9%/round |
| 3 | **Challenge** | **35 giây** / round | ✅ | Điều kiện ẩn ngẫu nhiên, thưởng ×2 |

> `prepT = [45, 20, 45, 35][modeIdx]` — tất cả mode đều có thời gian chuẩn bị.

---

## 6. Hero

### 6.1 Kael (Pháp sư lửa)
- Passive: Tháp Lửa +15% sát thương
- Skill: **Meteor Shower** — 5 thiên thạch rơi ngẫu nhiên trên đường đi, mỗi cái 120 DMG AoE

### 6.2 Lyria (Cung thủ gió)
- Passive: Tháp Cung +20% tốc bắn
- Skill: **Gale Arrow** — 1 mũi tên xuyên toàn bộ quái trên đường, 80 DMG

> Skill hồi chiêu: mỗi 3 round. HUD dưới chỉ có nút **"✨ Kỹ năng"** — hero selector đã bị ẩn khỏi HUD để tiết kiệm không gian.

---

## 7. Hệ thống Nation (Phe)

### 7.1 Cơ chế Nation

Mỗi người chọn **1 trong 3 nation**. Nation quyết định bộ **7 tháp** được dùng: 5 tháp chia sẻ (Cung, Đại Bác/Băng/Lửa, Sét, T.Nhiên, Đại Pháo) + 1 tháp độc quyền + **Phòng Không** (chung).

| ID | Tên | Icon | Màu | Tháp có (7 tháp) |
|----|-----|------|-----|-----------------|
| 0 | Ironhold | ⚔️ | #d08030 | Cung, Đại Bác, Sét, T.Nhiên, Ballista, Đại Pháo, **Phòng Không** |
| 1 | Glacien | ❄️ | #5ab8f8 | Cung, Băng, Sét, T.Nhiên, Băng Đền, Đại Pháo, **Phòng Không** |
| 2 | Emberon | 🔥 | #ff4400 | Cung, Đại Bác, Lửa, T.Nhiên, Magma, Đại Pháo, **Phòng Không** |

Tower grid: **7 cột** (`grid-template-columns: repeat(7, 1fr)`).

### 7.2 Tháp độc quyền

| ID | Tên | Nation | Giá | DMG | Range | Rate | Hiệu ứng đặc biệt |
|----|-----|--------|-----|-----|-------|------|-------------------|
| 6 | Ballista | Ironhold | 130 | 38 | 110 | 2500ms | Tầm siêu xa, +80% DMG với quái áo giáp |
| 7 | Băng Đền | Glacien | 110 | 3 | 85 | 1000ms | AoE passive: làm chậm 70% TẤT CẢ quái đất trong tầm |
| 8 | Magma | Emberon | 100 | 25 | 65 | 900ms | Chain lửa đến 3 mục tiêu, chain nhận 60% DMG |

### 7.3 Đạn / Projectile đặc trưng theo Nation

| Type | Tháp | Ironhold | Glacien | Emberon |
|------|------|----------|---------|---------|
| 0 | Cung | Steel Bolt (kim loại xám, trail tia lửa cam) | Ice Needle (tinh thể, vòng xoay băng) | Flame Arrow (đầu lửa cam, trail tro đỏ) |
| 1 | Đại Bác | Iron Cannonball (gradient xám, highlight cam) | — | Lava Bomb (cầu dung nham nổi, crack vàng) |
| 3 | Sét | Copper Arc (tia điện amber, zigzag rộng) | Frost Bolt (tia điện xanh trắng geometric) | — |

---

## 8. Hệ thống Tháp

### 8.1 Danh sách tháp đầy đủ

| # | Tên | Icon | Giá | DMG | Range | Rate | Ghi chú |
|---|-----|------|-----|-----|-------|------|---------|
| 0 | Cung | 🏹 | 50 | 9 | 80 | 800ms | Đơn mục tiêu — tốc bắn tăng mạnh khi nâng cấp |
| 1 | Đại Bác | 💣 | 100 | 45 | 70 | 2000ms | AoE radius 40 — Ironhold, Emberon |
| 2 | Băng | ❄️ | 80 | 8 | 75 | 1200ms | Làm chậm quái 75% — Glacien |
| 3 | Sét | ⚡ | 120 | 30 | 85 | 1500ms | Chain 2 mục tiêu — Ironhold, Glacien |
| 4 | Lửa | 🔥 | 90 | 18 | 65 | 1000ms | DoT, diệt đám đông — Emberon |
| 5 | T.Nhiên | 🌿 | 150 | — | — | — | **+8 vàng/round** cho chủ tháp — mọi nation |
| 6 | Ballista | 🎯 | 130 | 38 | 110 | 2500ms | Xuyên giáp — **Ironhold độc quyền** |
| 7 | Băng Đền | 🔮 | 110 | 3 | 85 | 1000ms | AoE slow — **Glacien độc quyền** |
| 8 | Magma | 🌋 | 100 | 25 | 65 | 900ms | Chain lửa — **Emberon độc quyền** |
| 9 | Đại Pháo | 🎆 | 160 | 50 | 95 | 3200ms | AoE radius 55px full damage — mọi nation |
| 10 | Phòng Không | 🦅 | 140 | 35 | 160 | 1100ms | **Chỉ bắn quái bay** — tầm siêu xa — mọi nation |

### 8.2 Quy tắc bắn: Mặt đất vs Trên không

| Tháp | Có thể bắn quái đất | Có thể bắn quái bay |
|------|--------------------|--------------------|
| Cung, Đại Bác, Băng, Sét, Lửa, Ballista, Magma | ✅ | ❌ |
| Băng Đền (AoE slow) | ✅ (chỉ đất) | ❌ |
| Đại Pháo (AoE splash) | ✅ (chỉ đất) | ❌ |
| T.Nhiên | — (sinh vàng) | — |
| **Phòng Không** | ❌ | ✅ **Chỉ trên không** |

> Mỗi loại tháp chỉ có thể tương tác với **một tầng**. Phòng Không là tháp duy nhất bắn được quái bay.

### 8.3 T.Nhiên — Cơ chế sinh vàng per-round

Tháp T.Nhiên **không bắn**. Thay vào đó, đầu mỗi round (`startRound()`), mỗi tháp T.Nhiên cộng **+8 vàng** vào pool của người đã đặt tháp đó.

- **Ví dụ:** 3 tháp T.Nhiên → +24 vàng ngay khi round bắt đầu.
- Trong MP: chỉ chủ tháp nhận vàng (không chia sẻ).
- Kèm âm thanh `earnGold` khi có ít nhất 1 tháp T.Nhiên.

> Trước v8.0: T.Nhiên sinh vàng theo timer 60 giây — không nhất quán với thời gian chuẩn bị khác nhau giữa các mode.

### 8.4 Nâng cấp tháp (5 cấp, chi phí lũy tiến)

| Cấp | DMG mult | Range mult | Rate mult (chung) | Rate mult (Cung) | Chi phí | Scale |
|-----|---------|-----------|-----------------|-----------------|---------|-------|
| 1 | ×1.0 | ×1.0 | ×1.0 | ×1.0 | — | ×1.0 |
| 2 | ×1.4 | ×1.15 | ×0.88 | **×0.81** | `base×0.5` | ×1.2 |
| 3 | ×2.1 | ×1.35 | ×0.75 | **×0.62** | `base×0.8` | ×1.45 |
| 4 | ×3.2 | ×1.55 | ×0.62 | **×0.43** | `base×1.5` | ×1.7 |
| 5 | ×5.0 | ×1.8 | ×0.50 | **×0.29** | `base×2.5` | ×2.0 |

**Sell refund:** 60% tổng chi phí. Không thể bán trong Hardcore.

### 8.5 Tower Ownership (MP)

- `ownerIdx` — chỉ người xây mới nâng cấp/bán được.
- Badge màu: P1=tím, P2=xanh dương, P3=xanh lá, P4=đỏ.

### 8.6 Preview tầm bắn

Khi đang chọn tháp → di chuột/ngón tay → hiện vòng tròn tầm bắn theo cursor.

---

## 9. Hệ thống kẻ địch

### 9.1 Quái mặt đất (Ground Enemies)

| ID | Tên | HP | Tốc | Thưởng | Đặc tính |
|----|-----|-----|-----|--------|---------|
| 0 | Shade Crawler | 60 | 1.2 | 8 | — |
| 1 | Swarm Bat | 40 | 1.8 | 6 | Bay thấp (vẫn theo đường đất) |
| 2 | Stone Golem | 180 | 0.7 | 20 | — |
| 3 | Healer Shaman | 80 | 1.0 | 15 | Hồi máu quái xung quanh |
| 4 | Phase Wraith | 100 | 1.3 | 18 | Tàng hình định kỳ |
| 5 | Berserker | 140 | 1.0 | 22 | Tăng tốc khi HP thấp |
| 6 | Behemoth | 400 | 0.5 | 40 | Áo giáp |

### 9.2 Quái trên không (Aerial Enemies) — mới v8.0

| ID | Tên | HP | Tốc | Thưởng | Visual |
|----|-----|-----|-----|--------|--------|
| 7 | Storm Wyvern | 90 | 1.5 | 18 | Wyvern xanh dương, cánh vỗ nhanh, đuôi dài |
| 8 | Siege Drake | 260 | 0.85 | 40 | Rồng xanh lá bọc giáp, cánh rộng, sừng |

**Cơ chế aerial:**
- Thuộc tính `aerial: true` — phân biệt với quái đất.
- Di chuyển **thẳng ngang** từ trái sang phải theo `aerialY = topH + mapH × 0.5` (giữa màn hình).
- Tốc độ thực: `en.x += en.spd × fps60 × 0.5` — không dùng path system.
- **Chỉ Phòng Không (id:10) mới bắn được** — tháp đất hoàn toàn bỏ qua.
- Không bị Healer Shaman hồi máu; không bị Băng Đền làm chậm.
- Visual: shadow đổ xuống bên dưới + cánh vỗ animation.

**Xuất hiện ở 5 round:** 4, 8, 11, 14, 18 — không trùng boss round (5, 10, 15, 20).

**Số lượng:** `4 + floor(round / 4)` quái bay/round (tăng dần theo round).

**Thông báo:** Toast xanh dương xuất hiện khi round aerial bắt đầu: `🦅 QUÁI TRÊN KHÔNG XUẤT HIỆN — CẦN THÁP PHÒNG KHÔNG!`

### 9.3 Quái Elite (Cổng Đặc Biệt — từ Round 10)

Mỗi map có **1 cổng đặc biệt** từ Round 10 với `elitePath` riêng.

| Map | Tên | HP mult | Tốc mult | Thưởng mult |
|-----|-----|---------|---------|------------|
| 0 | Lava Titan | ×1.9 | ×1.3 | ×2.5 |
| 1 | Shadow Stalker | ×2.0 | ×1.4 | ×2.2 |
| 2 | Tide Colossus | ×2.2 | ×1.1 | ×2.8 |
| 3 | Cinder Warrior | ×2.0 | ×1.25 | ×2.4 |
| 4 | Void Reaper | ×2.3 | ×1.2 | ×2.6 |
| 5 | Nexus Horror | ×2.5 | ×1.15 | ×3.0 |

### 9.4 Boss (round 5, 10, 15, 20)

| Round | Boss |
|-------|------|
| 5 | 1× Malachar's Puppet (HP 800) |
| 10 | 2× Void Serpent + Puppet (70% HP) |
| 15 | 2× Iron Colossus + The Twins (70% HP) |
| 20 | 3× Void Colossus + Iron Colossus + The Twins (70% HP) |

### 9.5 Sự kiện đặc biệt theo round

| Round | Sự kiện | Hiệu ứng |
|-------|---------|---------|
| 3 | ⚡ Xung kích! | Quân số ×1.8, HP ×0.82 |
| 7 | 🌑 Tập kích đêm | Quân số +50% |
| 12 | 💚 Máu tái sinh | Quái tự hồi HP |
| 17 | 🔥 Cuồng phong! | Tất cả loại quái, quân số ×1.6 |

### 9.6 Spawn theo stage

| Round | Stage | Loại quái đất | Số quái/cổng |
|-------|-------|--------------|-------------|
| 1–5 | Early | 0,1 | 8–13 + floor(r) |
| 6–10 | Mid | 0,1,2,3 | 11–16 + floor(r) |
| 11–15 | Late | 0,1,2,3,4,5 | 14–19 + floor(r) |
| 16–20 | End | 0,1,2,3,4,5,6 | 18–22 + floor(r) |

### 9.7 Hệ thống sóng (Batch Wave)

- **WAVE_SIZE = 10** con/đợt · **Stagger = 5 frames** trong đợt · **WAVE_GAP = 180 frames** (~3s) giữa đợt

---

## 10. Vòng chơi (Game Loop)

### 10.1 Luồng 1 round

```
[T.Nhiên trả vàng] → [Wave Announce] → [Giai đoạn PREP] → [▶ Bắt đầu / Hết giờ] → [WAVE] → [Quái hết] → [+Vàng thưởng round] → [Round tiếp]
```

**Thưởng vàng cuối round:** `30 + round × 12` cho tất cả người chơi.

### 10.2 Giai đoạn PREP

| Mode | Thời gian |
|------|----------|
| Standard | 45 giây |
| Hardcore | 20 giây |
| Endless | 45 giây |
| Challenge | 35 giây |

Nút **"▶ Bắt đầu"** cho phép bỏ qua đếm ngược. Trong PREP: tự do đặt/bán tháp.

### 10.3 Giai đoạn WAVE

`#hud-phase` hiển thị `⚔️ ×N` (N = quái còn lại). Vẫn có thể đặt tháp.

### 10.4 Kết thúc game

- **Thắng:** Sống qua Round 20 (Standard/Challenge).
- **Thua:** Quái lọt qua đủ quota (`leakQuota = 20/10` tùy mode).

---

## 11. HUD & UI

### 11.1 HUD trên

```
[Round X/20] [⏱/⚔️ phase]   [● Gold] [🛡 N Mạng]   [▶ Bắt đầu] [⏸] [🔊] [⛶]
[Lives quota bar ───────────────────────────────── 0/20]
[☁ Thời tiết ────────────────────── bonus]
```

### 11.2 HUD trên — Thu gọn

- Nút **"▲ Thu"** → ẩn toàn bộ HUD trên. Đổi thành **"▼ HUD"** khi đã thu.
- `max-height` transition 280ms. Tự mở lại khi bắt đầu game mới.

### 11.3 HUD dưới

```
[▼ Ẩn]
[Tháp1][Tháp2][Tháp3][Tháp4][Tháp5][Tháp6][Tháp7] │ [LL1][LL2][LL3]
```

- **7 tháp** (nation-specific, gồm Đại Pháo + Phòng Không) + 3 lifeline cùng 1 hàng.
- Nút **"▼ Ẩn"** / **"▲ HUD"** thu gọn HUD dưới — animation `max-height` 280ms.
- `botH = 78px` (hero row đã bỏ để tiết kiệm không gian).
- Hero selector bị loại khỏi HUD dưới — hero được chọn ngầm định.

### 11.4 Tower Panel UI

- Bấm tháp đã đặt → hiện panel: icon, tên, cấp X/5, DMG/Range thực tế.
- Nút ⬆ Nâng cấp (kèm giá) · Nút 💰 Bán (kèm hoàn tiền 60%).
- Khóa nếu không phải chủ (MP) hoặc Hardcore (bán).

### 11.5 Fullscreen

- Nút `⛶` trong HUD trên — toggle fullscreen (`requestFullscreen` + webkit fallback).
- Icon đổi thành `✕` khi đang fullscreen, `⛶` khi không.

---

## 12. Mạng Sống (Lives / Leak Quota)

- Quái đất lọt qua → **−1 mạng**. Boss → **−3 mạng**. Quái bay lọt qua → **−1 mạng**.
- **20 mạng** (Standard/Endless/Challenge) · **10 mạng** (Hardcore).
- Không hồi phục. Hết → Game Over ngay.

---

## 13. Thời tiết

Thay đổi ngẫu nhiên mỗi vài round.

| Thời tiết | Bonus |
|-----------|-------|
| ☀️ Nắng to | Lửa +30% |
| 🌧️ Mưa | Sét +50% |
| ❄️ Bão tuyết | Băng +40% |
| ⛈️ Giông bão | Sét chain +2 mục tiêu |
| 🌑 Nhật thực | Quái tàng hình |
| ⛅ Bình thường | Không có bonus |

---

## 14. Lifeline (Phao cứu sinh)

Ba lifeline mỗi trận, **mỗi chiêu tối đa 2 lần/trận**. Chỉ Host dùng được.

| # | Tên | Hiệu ứng |
|---|-----|---------|
| 0 | 🔰 Iron Shield | Tinh Thể bảo vệ hoàn toàn 10 giây |
| 1 | 💥 Napalm | Tiêu diệt toàn bộ quái trên sân |
| 2 | 🌀 Time Warp | Làm chậm ~80% tất cả quái trong **6 giây** |

---

## 15. Multiplayer — Kiến trúc Host-Authoritative

### 15.1 Tổng quan

- Tối đa **4 người** / phòng, mã phòng 6 ký tự.
- **Host** chạy toàn bộ game loop. **Guest** nhận state snapshot ~12Hz và render.
- Vàng là **per-player** — pool riêng. HP Tinh Thể là shared.

### 15.2 Tìm phòng (Room Browser)

1. Nhập tên → **"🔍 Xem danh sách phòng chờ"**.
2. Danh sách tự refresh mỗi 3 giây khi đang xem.
3. Bấm **"Vào →"** → nhập mật khẩu nếu phòng có khóa.

### 15.3 Admin & Tạo phòng

- Nút "Tạo phòng mới" ẩn mặc định, hiện sau khi nhập mật khẩu admin (`BASTION`).
- Host đặt mật khẩu phòng tùy chọn khi tạo.

### 15.4 Lobby

- Host chọn map/mode; guests chọn nation + **bấm "✓ Sẵn sàng"**.
- Server từ chối `start` nếu có guest chưa ready.

### 15.5 State Snapshot (`state_sync`)

Host gửi mỗi 5 frame:
```js
{ enemies[], towers[], gold, playerGold[], crystalHP, round, roundTimer,
  gamePhase, leakCount, leakQuota, roundEvent, spawnQueueLen, lifelinesUsed[] }
```

Enemy fields: `{ _id, t, x, y, hp, maxHp, slow, isBoss, color, typeId, radius, reward, heals, pathIdx, aerial }`

> `aerial: true` được sync để guest biết quái nào thuộc làn trên không.

### 15.6 Guest Input Relay

| Action | Data |
|--------|------|
| `place_tower` | `{x, y, typeId}` |
| `sell_tower` | `{x, y}` |
| `upgrade_tower` | `{x, y}` |
| `give_gold` | `{toIdx, amount}` |

### 15.7 Reconnect

- Client lưu `{code, name, playerIdx, nationIdx}` vào `localStorage.lb_session`.
- F5/mất mạng → toast "Bạn đã ngắt kết nối" + nút **Vào lại**.
- Server khớp slot theo tên → gửi `reconnected` → game tiếp tục.
- Slot giữ **10 phút** sau disconnect.

---

## 16. Audio (Web Audio API)

Toàn bộ âm thanh tổng hợp bằng oscillator — không cần file.

| Sự kiện | Mô tả |
|---------|-------|
| Đặt tháp | Tone theo loại tháp |
| Bán tháp | 3 note coin jingle |
| Nâng cấp | Chord ascending |
| Quái chết | Short burst noise |
| Boss xuất hiện | Deep rumble |
| Hero skill | Ascending chord |
| Cổng Elite (R10) | Deep sine + noise burst + sawtooth fanfare |
| Cổng Elite (R11+) | Sawtooth short + noise nhẹ |
| **Phòng Không bắn** | High-pitch targeting ping (2 sine tần số cao) |
| Vàng thưởng round | earnGold tone |
| Game over | Descending minor |
| Win | Fanfare |

---

## 17. Luồng màn hình (Navigation)

```
Menu
 ├─ [📖 Hướng dẫn] → Game (Tutorial, nation=Ironhold)
 ├─ [⚔️ Bắt đầu chiến đấu]
 │    ├─ (Lần đầu) → Tutorial → Map Select
 │    └─ (Đã chơi) → Map Select → Mode Select → Nation Picker → Game
 └─ [👥 Nhiều người chơi] → MP Overlay
      ├─ [🔍 Danh sách phòng] → Room Browser (auto-refresh 3s) → Lobby
      ├─ [Nhập mã + mật khẩu] → Lobby
      ├─ [Admin: Tạo phòng] → Lobby
      └─ Lobby (Nation + Ready → Host Start) → Game
           └─ (F5/mất mạng) → Toast Reconnect → [Vào lại] → Game
```

---

## 18. Lưu trữ cục bộ

| Key | Giá trị | Mục đích |
|-----|---------|---------|
| `lb_played` | `"1"` | Đánh dấu đã xem tutorial |
| `lb_session` | `{code, name, playerIdx, nationIdx}` | Reconnect mid-game |

---

## 19. Roadmap (chưa triển khai)

- [ ] Mở khóa Void Nexus sau khi thắng 5 map
- [ ] Leaderboard Endless (score theo round sống được)
- [ ] Challenge mode: điều kiện ẩn ngẫu nhiên thật sự
- [ ] Skin tháp đặc biệt từ Challenge reward
- [ ] Ashfield Ruins: ô núi lửa buff Lửa lên Cấp 4
- [ ] Tidal Docks: thu hẹp bản đồ khi thủy triều dâng
- [ ] Boss aerial: boss rồng xuất hiện trên làn bay
- [ ] Swarm Bat thật sự bay (chuyển sang aerial lane, chỉ Phòng Không bắn)

---

## 20. Changelog

| Phiên bản | Ngày | Thay đổi chính |
|-----------|------|---------------|
| v8.0 | 2026-05-24 | Aerial enemy system (Storm Wyvern + Siege Drake), Phòng Không (id:10), T.Nhiên per-round, HUD collapse, hero row removed, 7-column grid |
| v7.0 | 2026-05-24 | Map redesign (S-curve/zigzag/mê cung), arc-length preview, prep time mọi mode, room browser auto-refresh, fullscreen fix |
| v6.0 | 2026-05-23 | Multi-boss rounds, batch wave spawn, global lives, multi-path fix |
| v5.0 | 2026-05-22 | Nation system, one-room-per-connection, mid-game reconnect |
| v4.0 | 2026-05-21 | Đại Pháo AoE, 6-column grid, 5-level upgrade |
