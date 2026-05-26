## 1. Balance — Reward, Speed, Upgrade Cost

- [x] 1.1 Trong `ENEMIES_DATA`, nhân `spd` tất cả entries ×0.7 (quái thường chậm hơn 30%)
- [x] 1.2 Trong `BOSS_ENEMIES` của từng map trong `MAPS_DATA`, nhân `spd` ×0.75 (boss chậm hơn thêm 25%)
- [x] 1.3 Trong `ENEMIES_DATA`, nhân `reward` tất cả entries ×1.5 (làm tròn gần nhất)
- [x] 1.4 Trong `BOSS_ENEMIES` của `MAPS_DATA`, nhân `reward` ×1.5 tương tự
- [x] 1.5 Trong `damageEnemy()`, tăng flat boss bonus từ `+50` lên `+150` trong dòng `baseReward = (en.reward||10) + (en.isBoss ? 50 : 0)`
- [x] 1.6 Trong `UPGRADE_COST_MULTS`, nhân tất cả giá trị tier ×0.7 (trừ index 0 = 0), làm tròn 2 chữ số thập phân

## 2. Fix Upgrade Button Refresh

- [x] 2.1 Tách logic update button state từ `showTowerPanel()` thành hàm riêng `updateTowerPanel()` — chỉ cập nhật text và `disabled` state của `tpan-upgrade-btn` dựa trên `selectedPlacedTower` và `myGold` hiện tại; guard nếu `!selectedPlacedTower` thì return sớm
- [x] 2.2 Gọi `updateTowerPanel()` trong `damageEnemy()` sau `this.updateHUD()` (để refresh khi vàng tăng sau kill)
- [x] 2.3 Gọi `updateTowerPanel()` trong `applyNetState()` sau khi cập nhật `playerGold` (dòng `if(s.playerGold)`)
- [x] 2.4 Gọi `updateTowerPanel()` sau khi host nhận gold từ `round_bonus` event
- [ ] 2.5 Test: mở panel khi chưa đủ tiền → kiếm đủ tiền bằng cách kill quái → nút upgrade hiện ngay không cần đóng mở lại

## 3. Custom Password Modal

- [x] 3.1 Thêm HTML modal `<div id="mp-pw-modal" class="hidden">` với: input `type="password" id="mp-pw-input"`, nút "Xác nhận", nút "Huỷ"; style overlay z-index: 9999, centered, dark background
- [x] 3.2 Thêm CSS cho `#mp-pw-modal`: fixed position, full viewport overlay với backdrop, card style nhất quán với modal khác trong game
- [x] 3.3 Trong `joinFromList()`, thay `const pw = prompt(...)` bằng: show modal, lưu `code` vào closure, Confirm callback gọi `_joinWithCode(code, input.value.trim())`, Cancel callback đóng modal
- [x] 3.4 Thêm listener `keydown Enter` trên `#mp-pw-input` để trigger confirm
- [x] 3.5 Thêm listener `keydown Escape` trên document khi modal mở để trigger cancel
- [x] 3.6 Kiểm tra create room UI: nếu có dùng `prompt()` hay native input cho password → thay bằng HTML input nằm trong form (nếu chưa có)
- [ ] 3.7 Test: bật fullscreen → mở danh sách phòng → bấm vào phòng có mật khẩu → fullscreen KHÔNG bị thoát, modal hiện đúng

## 4. Fix Guest Tower Placement

- [x] 4.1 Trong `case 'place_tower'` của `handleInput()`, kiểm tra dòng `onAnyPath(data.x,data.y,paths,Game.elitePaths,20)` — đảm bảo đang truyền `Game.elitePaths` (không phải `undefined`)
- [x] 4.2 Đảm bảo `paths` trong host validation là `Game.paths||[Game.path]` (giống hệt client-side), không bị undefined
- [x] 4.3 Sau khi `Game.towers.push(...)` trong `case 'place_tower'`, thêm `Game.bgDirty = true` để force redraw background với tower mới
- [x] 4.4 Thêm `Game._towersDirty = true` sau khi push tower (để dirty flag cho state sync nếu có từ change `fix-mp-lag`)
- [ ] 4.5 Test: guest xây trụ ở nhiều vị trí khác nhau kể cả gần đường đi elite — tower phải xuất hiện ổn định, không bị "lúc được lúc không"

## 5. Fix Projectile Visual Desync trên Guest

- [x] 5.1 Trong `applyNetState()`, sau khi rebuild `Game.enemies`, tạo lookup bằng `Game.enemies.find()` để link targetEnemy reference
- [x] 5.2 Khi rebuild `Game.projectiles` từ `s.projectiles`, với mỗi projectile, tìm enemy gần nhất trong radius 40px; nếu tìm thấy, gán `targetEnemy = found`; nếu không, giữ `targetEnemy: null`
- [x] 5.3 Draw loop projectile dùng `p.targetEnemy?.x ?? p.tx` — đã có sẵn trong `drawProjectile` (line `p.targetEnemy?.y||p.ty`)
- [ ] 5.4 Test: mở DevTools → chơi 2 người → quan sát tab guest: đạn phải bay theo đúng quái đang di chuyển, không "bắn vào chỗ trống"

## 6. Guest Disconnect Pause & Resume

- [x] 6.1 Trong `applyRemoteEvent()`, thêm `case 'guest_disconnected'`: set `Game.paused = true`, lưu `Game._waitingForPlayer`, gọi `showDisconnectOverlay()`
- [x] 6.2 Tạo hàm `showDisconnectOverlay(name)` + `hideDisconnectOverlay()` + `resumeFromDisconnect()` + `skipDisconnectedPlayer()` trong MP object
- [x] 6.3 Thêm HTML `<div id="disconnect-overlay" class="hidden">` với style overlay z-index: 150, semi-transparent, centered text
- [x] 6.4 Trong host: khi nhận `room_update` với player reconnected → hiện nút "▶ Tiếp tục"
- [x] 6.5 Handler nút "▶ Tiếp tục" (host): force full sync, unpause, hide overlay, broadcast `game_resume`
- [x] 6.6 Trong `applyRemoteEvent()`, thêm `case 'game_resume'`: set `Game.paused = false`, hide overlay
- [x] 6.7 Handler nút "Tiếp tục mà không cần họ": unpause, hide overlay, broadcast `game_resume`
- [x] 6.8 Trong `server.js`, khi guest close connection, broadcast `game_event: {type:'guest_disconnected'}` tới room
- [x] 6.9 Stop state_sync broadcast khi `Game.paused = true` trong `loop()`
- [ ] 6.10 Test: 2 người chơi → guest đóng tab → host thấy overlay pause → mở tab lại → reconnect → host thấy "đã kết nối lại" → bấm tiếp tục → cả 2 tiếp tục game đồng bộ

## 7. Kiểm Tra Tổng Thể

- [ ] 7.1 Solo mode: verify quái chậm hơn rõ rệt, vàng kiếm được nhiều hơn, upgrade rẻ hơn; game vẫn winnable round 20
- [ ] 7.2 Multiplayer: host xây trụ bình thường; guest xây trụ tất cả vị trí hợp lệ đều thành công
- [ ] 7.3 Multiplayer: quan sát guest screen — đạn từ tháp bay theo hướng đúng vào quái
- [ ] 7.4 Multiplayer: upgrade button hiện/ẩn tức thì khi vàng thay đổi, không cần close-reopen panel
- [ ] 7.5 Fullscreen + password: bật fullscreen → vào phòng mật khẩu → fullscreen giữ nguyên, modal hiện đẹp
- [ ] 7.6 Disconnect flow: chạy full test case từ task 6.10
- [ ] 7.7 Regression check: solo mode, challenge mode, tất cả maps — không có lỗi console, game hoàn thành được round 20
