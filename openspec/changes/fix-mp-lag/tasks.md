## 1. Object Pool cho getNetState()

- [x] 1.1 Khởi tạo `_netEnemyBuf = []` và `_netEscortBuf = []` trong `Game` object (cùng chỗ với `_particlePool`)
- [x] 1.2 Thay `enemies.map(en => ({...}))` trong `getNetState()` bằng loop reuse buffer: grow khi thiếu, overwrite props trực tiếp, slice/trim khi thừa
- [x] 1.3 Thay `escorts.map(es => ({...}))` tương tự với `_netEscortBuf`
- [x] 1.4 Thay `projectiles.slice(0,30).map(p => ({...}))` bằng reuse buffer `_netProjBuf` (capped 30)
- [x] 1.5 Verify format JSON output không thay đổi: `JSON.stringify(getNetState())` trước và sau phải giống nhau về structure

## 2. Shadow Batch Rendering

- [x] 2.1 Trong `draw()`, tách vòng lặp `towers.forEach(drawTower)` thành 2 passes: pass 1 towers không flash, pass 2 towers có `flash > 0.1` (set shadowBlur trước pass 2, reset sau)
- [x] 2.2 Trong `draw()`, tách vòng lặp `enemies.forEach(drawEnemy)` thành: pass 1 normal enemies (shadowBlur=0), pass 2 elite + boss enemies (batch shadowBlur)
- [x] 2.3 Đảm bảo `projectiles.forEach(drawProjectile)` không set shadowBlur per-projectile — move shadow setup ra ngoài loop nếu cần
- [ ] 2.4 Test visual: elite enemy vẫn có glow, flashing tower vẫn có flash effect, boss shadow vẫn hiện

## 3. Dirty-Flag Full Sync Filtering

- [x] 3.1 Thêm `_towersDirty = false`, `_fullSyncTowerCounter = 0`, `_challengeModSent = false` vào Game state init và reset
- [x] 3.2 Set `_towersDirty = true` tại tất cả code paths thay đổi `Game.towers`: `placeTower()`, `sellTower()`, `upgradeTower()`, tower `angle` update trong `update()`, `applyNetState()` khi có `s.towers`
- [x] 3.3 Trong `getNetState(full)`, chỉ include `state.towers` khi `_towersDirty || _fullSyncTowerCounter >= 30`; sau khi include, clear flag và reset counter
- [x] 3.4 Trong `getNetState(full)`, chỉ include `state.weather` khi weather thay đổi kể từ lần gửi trước (track `_lastSentWeather`)
- [x] 3.5 Trong `getNetState(full)`, chỉ include `state.challengeMod` khi `!_challengeModSent`; set flag sau khi gửi lần đầu
- [x] 3.6 Trong `applyNetState()`, handle trường hợp `s.towers` không có trong payload (undefined) — không overwrite `Game.towers` nếu field absent

## 4. Guest Path Prediction Cache

- [x] 4.1 Trong guest prediction loop (`update()` block `if(this.isGuestMP)`), wrap `ptOnPath()` call bằng cache check: `if (!en._cachedT || Math.abs(en.t - en._cachedT) > 0.0005)` thì gọi ptOnPath và lưu `en._cachedPt = pt; en._cachedT = en.t`
- [x] 4.2 Khi cache hit, dùng `en._cachedPt` trực tiếp (`en.x = en._cachedPt.x; en.y = en._cachedPt.y`) thay vì tính lại
- [x] 4.3 Đảm bảo `_cachedT` và `_cachedPt` được preserve qua `Object.assign(prev, se)` trong `applyNetState()` (chúng không có trong server payload nên không bị overwrite — verify)

## 5. Server Raw Relay cho state_sync

- [x] 5.1 Trong `server.js`, thay đổi `case 'state_sync'`: thay vì `broadcast(room, {type:'state_sync', state:msg.state}, ws)`, relay raw buffer: loop qua `room.players`, skip host, gọi `p.ws.send(raw)` trực tiếp (với `raw` là original message từ ws.on('message'))
- [x] 5.2 Verify `ws.on('message', raw => ...)` — `raw` là `Buffer` trong ws library; `p.ws.send(Buffer)` là hợp lệ và giữ nguyên binary content
- [x] 5.3 Giữ lại guard: chỉ host (myIdx === 0) mới được gửi state_sync; guests không được phép trigger relay

## 6. Verification

- [ ] 6.1 Chạy multiplayer 2 người, vào round muộn (round 15+) với nhiều enemies, mở Chrome DevTools Performance tab — verify không có GC spikes > 5ms
- [ ] 6.2 Verify guest nhận state sync đúng format: `console.log` một vài state_sync messages trên guest để xác nhận `towers`, `weather`, `challengeMod` chỉ xuất hiện khi cần
- [ ] 6.3 Verify visual không regression: shadow glow trên elite/boss vẫn hiện, tower flash vẫn hoạt động
- [ ] 6.4 Test edge case: build/sell tower → guest thấy thay đổi ngay trong ticks tiếp theo (dirty flag works)
