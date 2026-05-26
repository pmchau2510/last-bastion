## Context

Game Last Bastion dùng kiến trúc host-authoritative: host chạy toàn bộ game logic, gửi state snapshot cho guests qua WebSocket relay server mỗi 2–3 frame (tức ~30 lần/giây ở 60fps). Phân tích profiling tìm ra 5 bottleneck:

1. `getNetState()` dùng `Array.map()` tạo ~3,000 object JS/giây → GC pauses đột ngột
2. 43 `shadowBlur` calls mỗi draw frame, mỗi call force GPU composite pass riêng
3. Full-sync (mỗi 10 ticks) gửi towers/weather/challengeMod dù không đổi
4. Guest path prediction gọi `ptOnPath()` cho 100 enemies mỗi frame (linear search)
5. Server parse + stringify lại toàn bộ JSON của `state_sync` cho mỗi guest

## Goals / Non-Goals

**Goals:**
- Loại bỏ GC pauses do object allocation trong hot path
- Giảm GPU overhead từ `shadowBlur` thừa trong draw loop
- Giảm kích thước và tần suất full-sync payload
- Giảm CPU guest trong prediction loop
- Giảm server CPU overhead cho relay `state_sync`

**Non-Goals:**
- Thay đổi giao thức WebSocket hay message format
- Thay đổi game logic, balance hay visual fidelity
- Thêm compression (gzip/msgpack) — overhead so sánh với gains là không đáng
- Giảm số lần sync (vẫn giữ 30 syncs/giây cho responsiveness)

## Decisions

### D1: Object Pool cho `getNetState()`

**Quyết định**: Thay vì `enemies.map(en => ({...}))`, reuse một pre-allocated array `_netEnemyBuf[]` của plain objects. Mỗi sync, overwrite properties trực tiếp trên object đã tồn tại, chỉ resize buffer khi enemy count tăng.

**Lý do**: JS GC chủ yếu bị trigger bởi short-lived objects. Nếu ta reuse objects thì GC không có gì để thu dọn, loại bỏ hoàn toàn pause type này. Không cần thay đổi format JSON output vì `JSON.stringify` chỉ đọc properties, không quan tâm object identity.

**Thay thế đã cân nhắc**: Reduce sync frequency (2 → 4 frames) — nhưng làm prediction jerkier. Dùng typed arrays / ArrayBuffer — quá phức tạp và cần thay đổi applyNetState.

### D2: Shadow Batch Draw Pattern

**Quyết định**: Trong `draw()`, tách enemies/towers/projectiles thành 2 passes: pass 1 vẽ tất cả objects **không có** shadow (shadowBlur=0 cho toàn bộ pass), pass 2 vẽ chỉ objects **có** shadow (flashing towers, elite enemies, boss). Set `shadowBlur` một lần trước pass 2, reset một lần sau.

**Lý do**: Mỗi lần thay đổi `shadowBlur` value trên canvas 2D context đều flush và restart GPU pipeline. Batching giảm số context switches từ O(n_objects) xuống O(2).

**Thay thế đã cân nhắc**: Dùng offscreen canvas cho shadow layer — phức tạp hơn và tạo thêm compositing overhead. Bỏ hoàn toàn shadow — làm mất visual quality với elite/boss.

### D3: Dirty-Flag Full Sync Filtering

**Quyết định**: Track `_towersDirty`, `_weatherChanged`, và `_challengeModSent` flags. Full sync chỉ include towers khi `_towersDirty === true` (set khi tower được xây/bán/upgrade/cooldown thay đổi), weather chỉ khi `_weatherChanged`, challengeMod chỉ 1 lần.

**Lý do**: Towers không thay đổi trong phần lớn các ticks. Gửi full tower array (~20 objects × 7 props) mỗi 0.3s là lãng phí bandwidth và serialization time. Weather chỉ đổi mỗi ~5 giây. challengeMod cố định suốt trận.

**Trade-off**: Guests có thể miss tower update nếu host crash ngay sau dirty-clear. Mitigation: vẫn force full towers sync mỗi 30 ticks (5s) như backup.

### D4: Guest Path Prediction Cache

**Quyết định**: Mỗi enemy object giữ `_cachedPt: {x, y}` và `_cachedT: number`. Trong prediction loop, chỉ gọi `ptOnPath()` khi `Math.abs(en.t - en._cachedT) > 0.0005`. Còn lại dùng `_cachedPt` + apply delta velocity ước tính.

**Lý do**: Giữa 2 state sync (~33ms), enemy di chuyển rất ít (spd thường 0.001–0.003 per tick). `_cachedT` gần như không đổi giữa các frame. Cache hit rate ước tính ~90% → tiết kiệm 90 trong 100 ptOnPath calls/frame.

### D5: Server Raw Relay cho `state_sync`

**Quyết định**: Trong `server.js case 'state_sync'`, thay vì `broadcast(room, {type:'state_sync', state:msg.state})` (parse + rebuild + stringify), send raw buffer trực tiếp: `p.ws.send(raw)` với `raw` là original WebSocket frame data.

**Lý do**: `state_sync` là packet lớn nhất (~5-15KB tùy số enemies). Server hiện tại parse JSON, rebuild object, stringify lại cho mỗi guest. Với 3 guests và 30 syncs/giây: 90 parse+stringify operations/giây. Raw relay bỏ hoàn toàn bước này.

**Risk**: Raw relay gửi `{from: 0, type:'state_sync', state:...}` không có `from` field — nhưng `case 'state_sync'` trên client không cần `from`. Cần verify format.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Object pool giữ reference tới data cũ nếu array shrink | Clear excess entries khi `enemies.length < buf.length` |
| Shadow batch tạo z-order artifacts (elite vẽ sau thường) | Giữ enemy render order trong pass 2, chỉ tách shadow flag không tách draw order |
| Dirty flag bị miss nếu có code path build towers ngoài luồng chính | Review tất cả paths set `Game.towers` và ensure flag được set; backup sync mỗi 30 ticks |
| Raw relay có thể gửi duplicate `type` field nếu server đã wrap | Kiểm tra: server hiện dùng `broadcast(room, {type:'state_sync', state:msg.state})` — raw relay gửi nguyên payload host gửi lên (`{type:'state_sync', state:...}`) nên format giống hệt |
| Guest path cache stale sau applyNetState rebuild enemies array | `applyNetState` đã merge vào existing objects via `Object.assign(prev, se)` — `_cachedT` vẫn còn, nhưng `en.t` đã updated → cache miss sẽ xảy ra đúng lúc |

## Migration Plan

Tất cả thay đổi là client-side hoặc server-side internal — không có breaking change với người dùng. Deploy đơn giản: update `index.html` + `server.js`, restart server. Rollback: revert hai file.

## Open Questions

- Cần đo thực tế fps/memory trước và sau để xác nhận impact (dùng Chrome DevTools Performance tab)
- Shadow batch có thể ảnh hưởng tới visual nếu elite enemy cần vẽ shadow **dưới** normal enemy — nếu có, cần giữ render order cẩn thận hơn
