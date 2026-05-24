# LAST BASTION — Game Design Document v7.0

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

Tất cả map đều được thiết kế lại với **đường đi dài + nhiều làn** (multi-path). Quái phân chia đồng đều theo số path, mỗi path có cổng spawn riêng ở cạnh trái.

| # | Tên | Độ khó | Kích thước | Số làn | Thời tiết | Quái Elite | Màu quái |
|---|-----|--------|-----------|--------|-----------|-----------|---------|
| 0 | Ironhold Pass | ⭐⭐ | 36×24 | 2 | Ngẫu nhiên | 🔥 Lava Titan | Đỏ nâu |
| 1 | Sylvan Crossing | ⭐⭐⭐ | 40×28 | 2 | Mưa/Bão tuyết | 👻 Shadow Stalker | Tím đen |
| 2 | Tidal Docks | ⭐⭐⭐ | 42×28 | 2 | Giông/Nắng | 🌊 Tide Colossus | Xanh dương |
| 3 | Ashfield Ruins | ⭐⭐⭐⭐ | 44×30 | 2 | Nắng cố định | ⚔ Cinder Warrior | Đỏ tro |
| 4 | Crimson Rift | ⭐⭐⭐⭐ | 46×30 | 3 | Nhật thực định kỳ | 💀 Void Reaper | Đỏ đậm |
| 5 | Void Nexus | ⭐⭐⭐⭐⭐ | 48×32 | 2 | Chaos | 🌀 Nexus Horror | Tím void |

**Cơ chế multi-path:**
- `pathFns: [fn1, fn2, ...]` — mảng các hàm tạo path theo chiều rộng màn hình.
- `resize()` tính Y-range chung cho tất cả paths → scale đồng đều.
- Enemies được phân phối **round-robin** qua tất cả paths (`i % numPaths`); đảm bảo mọi path đều có quái ngay từ đầu.
- `ptOnPath(t, pi)` trả về tọa độ trên path `pi`.

**Cổng Elite (từ Round 10):**
- Mỗi map có `elitePathFn` — tạo ra đường đi riêng cho quái elite, không ảnh hưởng round-robin.
- `pathIdx = 100` là hằng số đặc biệt → route sang `Game.elitePath`.
- Màu sắc quái thường: mỗi map có `enemyColors[typeId]` tô màu riêng khi spawn.

**Thưởng vàng sau mỗi round:**
- Sau mỗi round thắng: `30 + round × 12` vàng cho tất cả người chơi.
- Round 1: 42g · Round 10: 150g · Round 20: 270g.

---

## 5. Chế độ chơi

| # | Tên | Thời gian chuẩn bị | Bán tháp | Đặc điểm |
|---|-----|-------------------|---------|---------|
| 0 | **Standard** | 45 giây / round | ✅ | Cân bằng, khuyên dùng |
| 1 | **Hardcore** | 0 giây | ❌ | Xây tháp khi quái đang chạy, +50% thưởng, Quota ×0.4 |
| 2 | **Endless** | 45 giây / round | ✅ | Không kết thúc, sau round 20 quái +9%/round, leaderboard |
| 3 | **Challenge** | 45 giây / round | ✅ | Điều kiện ẩn ngẫu nhiên, thưởng ×2, skin đặc biệt |

---

## 6. Hero

### 6.1 Kael (Pháp sư lửa)
- Passive: Tháp Lửa +15% sát thương
- Skill: **Meteor Shower** — 5 thiên thạch rơi ngẫu nhiên trên đường đi, mỗi cái 120 DMG AoE

### 6.2 Lyria (Cung thủ gió)
- Passive: Tháp Cung +20% tốc bắn
- Skill: **Gale Arrow** — 1 mũi tên xuyên toàn bộ quái trên đường, 80 DMG

> Skill hồi chiêu: mỗi 3 round. Bấm nút **"✨ Kỹ năng"** trong HUD dưới để kích hoạt.

---

## 7. Hệ thống Nation (Phe)

### 7.1 Cơ chế Nation

Khi bắt đầu game (solo hoặc MP lobby), mỗi người chọn **1 trong 3 nation**. Nation quyết định bộ tháp được dùng: 4 tháp cơ bản chia sẻ + 1 tháp độc quyền riêng của phe.

| ID | Tên | Icon | Màu | Tháp có | Tháp độc quyền |
|----|-----|------|-----|---------|---------------|
| 0 | Ironhold | ⚔️ | #d08030 | Cung, Đại Bác, Sét, T.Nhiên | 🎯 Ballista |
| 1 | Glacien | ❄️ | #5ab8f8 | Cung, Băng, Sét, T.Nhiên | 🔮 Băng Đền |
| 2 | Emberon | 🔥 | #ff4400 | Cung, Đại Bác, Lửa, T.Nhiên | 🌋 Magma |

### 7.2 Tháp độc quyền

| ID | Tên | Nation | Giá | DMG | Range | Rate | Hiệu ứng đặc biệt |
|----|-----|--------|-----|-----|-------|------|-------------------|
| 6 | Ballista | Ironhold | 130 | 38 | 110 | 2500ms | Tầm siêu xa, +80% DMG với quái áo giáp |
| 7 | Băng Đền | Glacien | 110 | 3 | 85 | 1000ms | AoE passive: làm chậm 70% TẤT CẢ quái trong tầm |
| 8 | Magma | Emberon | 100 | 25 | 65 | 900ms | Chain lửa đến 3 mục tiêu, chain nhận 60% DMG |

**Băng Đền** không bắn projectile — thay vào đó liên tục apply slow lên mọi kẻ địch trong vùng mỗi 1s. Aura ring nhìn thấy trên tháp.

**Grid tháp** chỉ hiển thị các tháp thuộc nation đã chọn. Nation không thể đổi sau khi game bắt đầu.

---

## 8. Hệ thống Tháp

### 8.1 Danh sách tháp đầy đủ

| # | Tên | Icon | Giá | DMG | Range | Rate | Ghi chú |
|---|-----|------|-----|-----|-------|------|---------|
| 0 | Cung | 🏹 | 50 | 12 | 80 | 800ms | Đơn mục tiêu, tốc nhanh — mọi nation |
| 1 | Đại Bác | 💣 | 100 | 45 | 70 | 2000ms | AoE, reload chậm — Ironhold, Emberon |
| 2 | Băng | ❄️ | 80 | 8 | 75 | 1200ms | Làm chậm quái 75% — Glacien |
| 3 | Sét | ⚡ | 120 | 30 | 85 | 1500ms | Chain 2 mục tiêu — Ironhold, Glacien |
| 4 | Lửa | 🔥 | 90 | 18 | 65 | 1000ms | DoT, diệt đám đông — Emberon |
| 5 | T.Nhiên | 🌿 | 150 | — | — | — | Không bắn, +8 vàng/round — mọi nation |
| 6 | Ballista | 🎯 | 130 | 38 | 110 | 2500ms | Xuyên giáp — **Ironhold độc quyền** |
| 7 | Băng Đền | 🔮 | 110 | 3 | 85 | 1000ms | AoE slow — **Glacien độc quyền** |
| 8 | Magma | 🌋 | 100 | 25 | 65 | 900ms | Chain lửa — **Emberon độc quyền** |

### 8.2 Băng tower buff

Tháp Băng làm chậm mục tiêu **75%** (slow = 0.25 × tốc gốc). Kết hợp với Sét/Lửa để tiêu diệt trong thời gian chậm.

### 8.3 Nâng cấp tháp (5 cấp, chi phí lũy tiến)

Bấm vào tháp đã đặt → hiện panel với thông tin, nút nâng cấp và nút bán.

| Cấp | DMG mult | Range mult | Chi phí nâng cấp | Scale hình |
|-----|---------|-----------|-----------------|-----------|
| 1 | ×1.0 | ×1.0 | — (đặt ban đầu) | ×1.0 |
| 2 | ×1.4 | ×1.15 | `floor(baseCost × 0.5)` | ×1.2 |
| 3 | ×2.1 | ×1.35 | `floor(baseCost × 0.8)` | ×1.45 |
| 4 | ×3.2 | ×1.55 | `floor(baseCost × 1.5)` | ×1.7 |
| 5 | ×5.0 | ×1.8 | `floor(baseCost × 2.5)` | ×2.0 |

**Ví dụ Cung (base 50):** Cấp→2: 25, →3: 40, →4: 75, →5: 125 vàng | Tổng: 315 vàng

**Sell refund:** 60% tổng chi phí (gốc + tất cả lần nâng cấp).
> Không thể bán trong mode Hardcore.

### 8.4 Quyền sở hữu tháp (Tower Ownership)

- Mỗi tháp có `ownerIdx` — chỉ người xây mới **nâng cấp / bán** được.
- Badge màu ở góc tháp biểu thị chủ: P1=tím, P2=xanh dương, P3=xanh lá, P4=đỏ.
- Tower panel hiện `🔒 Tháp của PX` khi không phải chủ sở hữu.

### 8.5 Tower panel UI

- Hiện khi bấm tháp đã đặt; bấm lại → đóng; bấm chỗ khác → đóng.
- Panel hiển thị: icon, tên (+ màu chủ MP), cấp X/5, DMG/Range thực tế
- Nút Nâng cấp: disabled nếu Cấp 5, không đủ vàng, hoặc không phải chủ.
- Nút Bán: ẩn nếu Hardcore hoặc không phải chủ.

### 8.6 Preview tầm bắn

Khi đang chọn tháp (chưa đặt): di chuột / drag ngón tay → hiện vòng tròn tầm bắn màu tháp theo cursor.

### 8.7 Chỉ báo cấp tháp (dots)

- Cấp 2: 2 chấm xanh | Cấp 3: 3 chấm vàng | Cấp 4: 4 chấm cam | Cấp 5: 5 chấm tím

---

## 8. Hệ thống kẻ địch

### 8.1 Quái thường

| ID | Tên | HP | Tốc | Thưởng | Đặc tính |
|----|-----|-----|-----|--------|---------|
| 0 | Shade Crawler | 60 | 1.2 | 8 | — |
| 1 | Swarm Bat | 40 | 1.8 | 6 | Bay (bỏ qua địa hình) |
| 2 | Stone Golem | 180 | 0.7 | 20 | — |
| 3 | Healer Shaman | 80 | 1.0 | 15 | Hồi máu quái xung quanh |
| 4 | Phase Wraith | 100 | 1.3 | 18 | Tàng hình định kỳ |
| 5 | Berserker | 140 | 1.0 | 22 | Tăng tốc khi HP thấp |
| 6 | Behemoth | 400 | 0.5 | 40 | Áo giáp |

### 8.2 Quái Elite (Cổng Đặc Biệt — từ Round 10)

Mỗi map có **1 cổng đặc biệt** xuất hiện từ Round 10. Quái từ cổng này di chuyển theo `elitePath` riêng (không trùng đường thường).

| Map | Tên | Màu | HP mult | Tốc mult | Thưởng mult | Thiết kế |
|-----|-----|-----|---------|---------|------------|---------|
| 0 | Lava Titan | 🔥 #ff5500 | ×1.9 | ×1.3 | ×2.5 | Ellipse body, 6 vết nứt dung nham, mắt phát sáng |
| 1 | Shadow Stalker | 👻 #4a10a0 | ×2.0 | ×1.4 | ×2.2 | Bóng ma tối, 5 xúc tu cong, mắt đôi phát sáng |
| 2 | Tide Colossus | 🌊 #0060c0 | ×2.2 | ×1.1 | ×2.8 | Khối giáp hình chữ nhật, đầu tròn, giọt nước phát sáng |
| 3 | Cinder Warrior | ⚔ #c03000 | ×2.0 | ×1.25 | ×2.4 | Kỵ sĩ giáp, kính mũ bảo hiểm, đường viền giáp |
| 4 | Void Reaper | 💀 #cc0040 | ×2.3 | ×1.2 | ×2.6 | Áo choàng ellipse, lưỡi hái, mắt tím phát sáng |
| 5 | Nexus Horror | 🌀 #6000c0 | ×2.5 | ×1.15 | ×3.0 | Đa giác méo, vòng tròn, 3 mắt |

**Cơ chế:**
- Số quái elite/round: `min(3 + floor((round-10)/3), 8)` — tăng dần, tối đa 8.
- **Round 10 lần đầu:** màn hình rung mạnh (`shake=18`), nhạc aura (`SFX.eliteGate()`), thông báo đỏ đặc biệt `⚠ [TÊN] — CỔNG TỐI THỨC TỈNH!`.
- **Round 11+:** rung nhẹ (`shake=8`), nhạc nhỏ, thông báo ngắn gọn.

### 8.3 Boss (xuất hiện round 5, 10, 15, 20)

| Round | Tên | HP cơ bản | Thưởng |
|-------|-----|-----------|--------|
| 5 | Malachar's Puppet | 800 | 120 |
| 10 | Void Serpent | 1200 | 180 |
| 15 | Iron Colossus | 2000 | 250 |
| 20 | **Malachar** *(final boss)* | 5000 | 600 |

**Scale theo round:** HP × (1 + round\_index × 0.09)

### 8.4 Sự kiện đặc biệt theo round

| Round | Sự kiện | Hiệu ứng |
|-------|---------|---------|
| 3 | ⚡ Xung kích! | Quân số ×1.8, HP ×0.82 |
| 7 | 🌑 Tập kích đêm | Quân số +50%, bản đồ tối (không tăng tốc) |
| 12 | 💚 Máu tái sinh | Quái tự hồi HP từ từ |
| 17 | 🔥 Cuồng phong! | Tất cả loại quái, quân số ×1.6 |

> **Cân bằng chế độ (v5.0):** Tất cả sự kiện chỉ thay đổi HP/quân số — không có spdMult (tốc độ di chuyển luôn bình thường). Mode Hardcore thêm ×1.2 HP và +3 quái/cổng.

### 8.5 Spawn theo stage

| Round | Stage | Loại quái | Số quái/cổng |
|-------|-------|-----------|-------------|
| 1–5 | Early | 0,1 | 8–13 + floor(r) |
| 6–10 | Mid | 0,1,2,3 | 11–16 + floor(r) |
| 11–15 | Late | 0,1,2,3,4,5 | 14–19 + floor(r) |
| 16–20 | End | 0,1,2,3,4,5,6 | 18–22 + floor(r) |

Số cổng hoạt động: `min(1 + floor(round/7), 3)` — tối đa 3 cổng.

### 8.6 Hệ thống sóng (Batch Wave)

Quái không ra từng con mà ra theo **đợt** (như các game tower defense chuẩn):

- **WAVE_SIZE = 10** — mỗi đợt thả tối đa 10 con cùng lúc
- **Stagger nội bộ = 5 frames** (~0.08s) giữa các con trong cùng đợt
- **WAVE_GAP = 180 frames** (~3s) giữa hai đợt liên tiếp
- Đợt đầu tiên xuất hiện sau 30 frames kể từ khi WAVE bắt đầu

**Ví dụ:** Round có 30 quái → 3 đợt × 10 con, cách nhau ~3 giây.  
**Phân phối path:** Tất cả quái trong round được đánh index và gán `pathIdx = i % numPaths` để phân bổ đều qua mọi con đường.

---

## 9. Vòng chơi (Game Loop)

### 9.1 Luồng 1 round

```
[Wave Announce: "ROUND X"] → [Giai đoạn PREP] → [▶ Bắt đầu / Đếm ngược hết] → [Giai đoạn WAVE] → [Quái hết + không còn ai trên sân] → [+Vàng thưởng round] → [Round tiếp]
```

**Thưởng vàng cuối round:** `30 + round × 12` vàng cho tất cả người chơi. Hiển thị popup "+N 💰 Vàng thưởng vòng" fade-up. Trong MP: host broadcast `round_bonus` event để guest đồng bộ vàng.

### 9.2 Giai đoạn PREP (Chuẩn bị)

- Mode Standard/Endless/Challenge: 45 giây đếm ngược.
- Mode Hardcore: bỏ qua hoàn toàn, vào WAVE luôn.
- HUD hiển thị: `⏱ Xs` (giây còn lại) trong `#hud-phase`.
- Nút **"▶ Bắt đầu"** (màu xanh lá, nhấp nháy) cho phép bỏ qua đếm ngược → vào WAVE ngay.
- Trong thời gian PREP: có thể tự do đặt/bán tháp.

### 9.3 Giai đoạn WAVE

- `#hud-phase` hiển thị `⚔️ ×N` (N = số quái còn lại trong queue + trên sân).
- Nút "▶ Bắt đầu" ẩn đi.
- Vẫn có thể đặt tháp (và bán trong Standard/Endless/Challenge).

### 9.4 Kết thúc game

- **Thắng:** Sống sót qua Round 20 mà chưa hết mạng (Standard/Challenge).
- **Thua:** Tổng quái lọt qua đạt 20 (Normal) hoặc 10 (Hard) — mạng về 0.
- Màn hình Win/Lose có nút Chơi lại và Về menu.

---

## 10. HUD & UI

### 10.1 HUD trên

```
[Round X/20] [⏱/⚔️ phase]   [● Gold] [🛡 N Mạng]   [▶ Bắt đầu] [⏸] [🔊]
[Lives bar ─────────────────────────────────── 0/20]
[☁ Thời tiết hiện tại ─────────── +bonus]
```

> Icon tiền là CSS `.gc` (radial-gradient vòng vàng) thay vì emoji 🪙 để tương thích Android cũ.

### 10.2 HUD dưới (landscape mobile optimized)

```
[K Kael] [L Lyria]                               [✨]
[Tháp1][Tháp2][Tháp3][Tháp4][Tháp5] │ [LL1][LL2][LL3]
```

- Hàng 1: Hero selector (chip thu gọn) + nút skill `✨` (icon-only)
- Hàng 2: 5 tháp (nation-specific) + 3 lifeline cùng 1 hàng ngang
- Thiết kế tối ưu cho màn hình ngang điện thoại — `botH = 95px`
- Nation modal trên landscape: 3 nation card hiển thị ngang hàng, có scroll + sticky confirm

### 10.3 Tương tác tháp đã đặt

1. **Bấm tháp** → hiện Tower Panel (góc gần vị trí bấm).
2. **Bấm lại cùng tháp** → đóng panel.
3. **Bấm chỗ khác trên canvas** → đóng panel, bỏ chọn.
4. Tower Panel gồm: icon, tên, cấp X/3, DMG/Range thực tế, nút **⬆ Nâng cấp** (kèm giá), nút **💰 Bán** (kèm số vàng hoàn lại).

### 10.4 Preview tầm bắn khi đặt

Khi chọn tháp từ grid (chưa đặt), di chuột/ngón tay trên bản đồ → hiện vòng tròn tầm bắn màu của tháp đó theo con trỏ.

---

## 11. Mạng Sống (Lives / Leak Quota)

- Mỗi quái lọt qua Cửa Tử → tiêu thụ **1 mạng**. Boss lọt qua tốn **3 mạng**.
- Hết mạng → **Game Over ngay lập tức**.
- **20 mạng** (Standard/Endless/Challenge) · **10 mạng** (Hardcore) — cố định cả ván, **không hồi phục**.
- HUD hiện `🛡 N Mạng` (N = mạng còn lại).
- HUD Quota bar: ô xanh = còn lại, ô đỏ = đã mất — `leakCount / leakQuota`.
- Crystal Tinh Thể đổi màu: 🔵 → 🟠 → 🔴 khi mạng cạn dần.

---

## 12. Thời tiết

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

## 13. Lifeline (Phao cứu sinh)

Ba lifeline mỗi trận, **mỗi chiêu tối đa 2 lần/trận**.

- **Chỉ Host được dùng lifeline** — guests thấy nút nhưng không có hiệu lực.
- Counter hiển thị ngay dưới tên lifeline: `2/2` → `1/2` → `0/2`.
- Khi hết lần dùng: nút mờ đi (opacity 0.3, cursor not-allowed).

| # | Tên | Hiệu ứng |
|---|-----|---------|
| 0 | 🔰 Iron Shield | Tinh Thể được bảo vệ hoàn toàn trong 10 giây |
| 1 | 💥 Napalm | Tiêu diệt toàn bộ quái trên sân |
| 2 | 🌀 Time Warp | Làm chậm 80% tất cả quái trong ~5 giây |

---

## 14. Multiplayer — Kiến trúc Host-Authoritative

### 14.1 Tổng quan

- Tối đa **4 người** / phòng, mã phòng 6 ký tự.
- **Host** chạy toàn bộ game loop (quái, combat, vàng, HP Tinh Thể).
- **Guest** nhận state snapshot từ host ~12Hz (~5 frame/lần ở 60fps) và chỉ render.
- Vàng là **per-player** — mỗi người có pool riêng; HP Tinh Thể là shared.

### 14.2 Tìm phòng (Room Browser)

Thay vì nhập mã thủ công, người chơi có thể dùng **danh sách phòng chờ**:

1. Nhập tên → bấm **"🔍 Xem danh sách phòng chờ"**.
2. Client kết nối WebSocket → gửi `list_rooms` → server trả `rooms_list`.
3. Mỗi phòng hiển thị: mã phòng, tên map, chế độ, số người, 🔒 nếu có mật khẩu.
4. Bấm **"Vào →"** → nếu phòng có mật khẩu, hiện popup nhập mật khẩu.
5. Nút 🔄 làm mới danh sách bất kỳ lúc nào.

Vẫn giữ tùy chọn nhập mã thẳng (kèm field mật khẩu tùy chọn).

### 14.3 Admin password & Tạo phòng

- Nút "Tạo phòng mới" ẩn mặc định, hiện sau khi nhập đúng mật khẩu admin (`BASTION`).
- Host có thể đặt **mật khẩu phòng** (tùy chọn) khi tạo — người vào phải nhập đúng.
- Host có toàn quyền chọn map/mode trong lobby.
- Server validate mật khẩu phòng khi `join`; trả lỗi `Mật khẩu phòng không đúng` nếu sai.

### 14.4 Lobby — Điều kiện bắt đầu

- Host chọn map/mode; guests chọn nation và **bắt buộc bấm "✓ Sẵn sàng"**.
- Nút "🚀 Bắt đầu" chỉ active khi **tất cả guest đã sẵn sàng** (client-side check).
- Server cũng validate: từ chối `start` nếu có guest chưa ready (server-side backup).
- Counter: `⏳ Chờ guests sẵn sàng (0/N)` → `🚀 Bắt đầu (N người)`.

### 14.5 Chọn Nation trong Lobby

- Mỗi player chọn nation độc lập trong lobby (3 nút: ⚔️ Ironhold / ❄️ Glacien / 🔥 Emberon).
- Server lưu `player.nation` và broadcast `room_update` khi đổi.
- Nation của từng người hiện dưới tên trong danh sách player (màu và icon).
- `game_start` gửi `players[].nation` → mỗi client dùng đúng bộ tháp của mình.
- **Chỉ có một phòng per connection**: server từ chối nếu đã ở trong phòng.

### 14.6 Luồng dữ liệu

```
HOST                        SERVER                    GUESTS
  |                            |                         |
  |──── state_sync ───────────>|──── broadcast ─────────>|  (~12Hz)
  |                            |                         |
  |<─── player_input ──────────|<──── relay ─────────────|  (tức thì)
  |                            |                         |
  |──── game_event (game_over)>|──── broadcast ─────────>|  (1 lần)
```

### 14.7 State snapshot (`state_sync`)

Host gửi mỗi 5 frame:
```
{ enemies[], towers[], gold, playerGold[], crystalHP, round, roundTimer,
  gamePhase, leakCount, leakQuota, roundEvent, spawnQueueLen, lifelinesUsed[] }
```

- Enemy có `_id: 'r7_g0_e3'` và `pathIdx` để guest reconcile.
- Tower có `ownerIdx` để guest biết ai sở hữu.
- `playerGold[i]` là vàng của player i; guest thấy `playerGold[mpPlayerIdx]`.
- `lifelinesUsed[]` là mảng số (0–2), không phải boolean.

### 14.8 Guest input relay (`player_input`)

Guest không sửa state trực tiếp — gửi action lên host:

| Action | Data |
|--------|------|
| `place_tower` | `{x, y, typeId}` |
| `sell_tower` | `{x, y}` |
| `upgrade_tower` | `{x, y}` |
| `give_gold` | `{toIdx, amount}` |

> Lifeline bị loại khỏi relay — chỉ Host dùng được trực tiếp.

Host validate (đủ vàng, vị trí hợp lệ, đúng chủ tháp, v.v.) rồi apply.

### 14.9 Per-player gold & donation

- Mỗi player bắt đầu với cùng lượng vàng tùy mode.
- Quái chết → **tất cả players** nhận reward (cộng đồng đều).
- Tháp T.Nhiên → +8 vàng cho riêng **chủ tháp**.
- Nút 💰 (góc HUD) → hiện menu "Cho 50 vàng cho: P2 P3 P4" — gửi `give_gold` action.

### 14.10 Reconnect sau khi mất kết nối

- Khi game bắt đầu: client lưu `{code, name, playerIdx, nationIdx}` vào `localStorage.lb_session`.
- Khi F5 / mất mạng / trang tải lại: toast xuất hiện "Bạn đã ngắt kết nối khỏi phòng [CODE]" + nút **Vào lại**.
- Bấm "Vào lại" → gửi `join` với tên + mã phòng đã lưu.
- Server nhận biết slot bị disconnect (`player.disconnected=true`) và khớp theo tên → gửi `reconnected` với room info.
- Client nhận `reconnected` → `Game.init()` với nation đã lưu, đợi `state_sync` từ host.
- Slot giữ trong 10 phút sau khi disconnect mid-game; sau đó tự xóa.
- Khi game kết thúc bình thường (`win`/`lose`/`quit`): `lb_session` bị xóa, toast không hiện.

### 14.11 Kết thúc game

Host gọi `win()`/`lose()` → broadcast `game_event: {type:'game_over', ...}` → guests hiện modal.

### 14.12 Nút "▶ Bắt đầu" trong multiplayer

- **Host**: thấy và bấm được — kích hoạt wave ngay lập tức.
- **Guest**: nút ẩn — host kiểm soát thời điểm bắt đầu wave.

---

## 15. Audio (Web Audio API)

Toàn bộ âm thanh tổng hợp bằng oscillator — không cần file ngoài.

| Sự kiện | Mô tả |
|---------|-------|
| Đặt tháp | Tone theo loại tháp (tần số khác nhau) |
| Bán tháp | 3 note coin jingle |
| Nâng cấp | Chord ascending |
| Quái chết | Short burst noise |
| Boss xuất hiện | Deep rumble |
| Hero skill | Ascending chord |
| **Cổng Elite (Round 10)** | Deep sine + noise burst + sawtooth fanfare (SFX.eliteGate) |
| **Cổng Elite (Round 11+)** | Sawtooth short + noise nhẹ (SFX.eliteGate(true)) |
| **Vàng thưởng round** | earnGold tone |
| Game over | Descending minor |
| Win | Fanfare |
| UI click | Short tick |
| Nhạc nền menu | Ambient drone |

Nút 🔊/🔇 trên HUD tắt/mở âm thanh.

---

## 16. Luồng màn hình (Navigation)

```
Menu
 ├─ [📖 Hướng dẫn] ──────────────────────→ Game (Tutorial mode, nation=Ironhold)
 ├─ [⚔️ Bắt đầu chiến đấu]
 │    ├─ (Lần đầu) → Tutorial → Map Select
 │    └─ (Đã chơi) → Map Select → Mode Select → Nation Picker → Game
 └─ [👥 Nhiều người chơi] → MP Overlay
      ├─ [🔍 Xem danh sách phòng] → Room Browser → [Vào →] (+ mật khẩu nếu cần) → Lobby
      ├─ [Nhập mã + mật khẩu] → Lobby
      ├─ [Admin: Tạo phòng (+ mật khẩu tùy chọn)] → Lobby
      └─ Lobby (chọn Nation + Ready → Host Start) → Game
           └─ (F5/mất mạng) → Reconnect Toast → [Vào lại] → Game (từ state_sync)
```

---

## 17. Lưu trữ cục bộ

| Key | Giá trị | Mục đích |
|-----|---------|---------|
| `lb_played` | `"1"` | Đánh dấu đã xem tutorial |
| `lb_session` | `{code, name, playerIdx, nationIdx}` | Reconnect sau khi mất kết nối mid-game |

---

## 18. Roadmap (chưa triển khai)

- [ ] Mở khóa Void Nexus sau khi thắng 5 map
- [ ] Leaderboard Endless (score theo round sống được)
- [ ] Challenge mode: điều kiện ẩn ngẫu nhiên thật sự
- [ ] Skin tháp đặc biệt từ Challenge reward
- [ ] Ashfield Ruins: ô núi lửa buff Lửa lên Cấp 4
- [ ] Tidal Docks: thu hẹp bản đồ khi thủy triều dâng (round 10/20/30)
- [ ] Crimson Rift: Rift portal mechanic
- [ ] Berserker: AI tăng tốc khi HP < 30%
- [ ] Phase Wraith: chu kỳ tàng hình thực sự
