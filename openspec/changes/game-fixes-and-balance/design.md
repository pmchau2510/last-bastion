## Context

Last Bastion là game tower defense single-page app (index.html + server.js WebSocket relay). Game logic chạy hoàn toàn trên client; multiplayer dùng kiến trúc host-authoritative — host tính toán mọi thứ, sync state về guest. Các vấn đề cần fix thuộc 3 nhóm: (1) balance số liệu, (2) UI refresh bug, (3) multiplayer protocol/behavior.

**Dữ liệu liên quan:**
- `ENEMIES_DATA[id]` — mảng static định nghĩa `spd`, `reward` cho quái thường
- `BOSS_ENEMIES` trong `MAPS_DATA[mapId]` — boss riêng mỗi map, cũng có `spd`, `reward`
- `UPGRADE_COST_MULTS = [0, 0.8, 2.5, 7.0, 18.0]` — multiplier theo level
- `damageEnemy()` tính: `baseReward = (en.reward||10) + (en.isBoss ? 50 : 0)`, rồi `reward = Math.round(baseReward * rewardMult * 0.65)`
- `showTowerPanel()` set `upgradeBtn.disabled = (myGold < upCost)` một lần duy nhất khi mở panel
- `joinFromList()` dùng `window.prompt()` — gây exit fullscreen trên Chrome/Safari

## Goals / Non-Goals

**Goals:**
- Balance: tăng reward, giảm speed, giảm upgrade cost với số liệu cụ thể đã xác định
- Fix upgrade button refresh real-time khi vàng thay đổi
- Custom password modal không làm exit fullscreen
- Fix guest tower placement: server-side validation khớp client-side preview
- Fix projectile visual desync trên guest
- Implement pause/resume flow khi guest disconnect

**Non-Goals:**
- Thay đổi UI layout tổng thể
- Thêm chế độ chơi mới
- Sửa balance theo từng map riêng biệt (áp dụng đồng nhất)

## Decisions

### D1: Balance — nhân spd và reward trực tiếp trên data constants

**Quyết định**: Sửa `ENEMIES_DATA` giảm `spd` tất cả entries ×0.7; sửa boss entries (trong `MAPS_DATA`) giảm spd thêm ×0.75. Sửa `reward` tất cả enemy ×1.5. Tăng boss flat bonus từ `+50` → `+150` trong `damageEnemy()`. Sửa `UPGRADE_COST_MULTS` ×0.7 mỗi tier.

**Lý do**: Thay đổi trực tiếp trên data — không cần thêm runtime multiplier, không ảnh hưởng code path nào khác, dễ review.

**Không làm**: Thêm `BALANCE_MULTIPLIER` constant — quá mức cần thiết cho adjustment đơn giản.

### D2: Upgrade button — refresh qua `updateTowerPanel()` call

**Quyết định**: Tạo hàm `updateTowerPanel()` (tách từ logic button trong `showTowerPanel()`) — chỉ update button state/text dựa trên gold hiện tại. Gọi `updateTowerPanel()` trong mọi chỗ gold thay đổi: `damageEnemy()`, `applyNetState()` (khi nhận gold update), guest `playerGold` update.

**Lý do**: Bug hiện tại là `showTowerPanel()` snapshot gold tại thời điểm mở panel. Khi vàng thay đổi, panel không biết. `updateTowerPanel()` tái dùng logic có sẵn, chỉ thêm trigger points.

### D3: Password modal — custom `<div>` overlay

**Quyết định**: Thêm `<div id="mp-pw-modal">` với `<input type="password">`, Confirm + Cancel buttons. `joinFromList()` khi `hasPassword` sẽ show modal thay vì `prompt()`. Callback confirm gọi `_joinWithCode(code, pw)`.

**Lý do**: `window.prompt()` là synchronous native dialog, trên Chrome/Safari nó exit fullscreen API trước khi show. Custom modal nằm trong DOM, không trigger exit fullscreen. Cũng cho phép style nhất quán với UI game.

**Chi tiết**: Modal dùng `document.getElementById('mp-pw-modal').classList.remove('hidden')`, capture Enter key. Đặt Z-index cao hơn game canvas (z-index: 200).

### D4: Guest tower placement — coordinate precision fix

**Quyết định**: Vấn đề là guest gửi tọa độ pixel từ `mouseX/mouseY` — đây là tọa độ đã được snap bởi client-side check. Host nhận `data.x, data.y` và chạy lại `onAnyPath()` + `tooClose` check với cùng threshold. Bug xảy ra khi guest dùng `this.paths||[this.path]` nhưng host cũng phải dùng chính xác `Game.paths||[Game.path]` và `Game.elitePaths` — kiểm tra host handler đang dùng `Game.elitePaths` đúng chưa. Nếu thiếu `Game.elitePaths` trong host validation → pass sai.

**Fix**: Đảm bảo `case 'place_tower'` trong `handleInput()` (server-side host logic) truyền `Game.elitePaths` vào `onAnyPath()` giống hệt client-side check. Thêm `_bgDirty = true` sau khi place để force redraw.

### D5: Projectile visual desync — track enemy reference on guest

**Quyết định**: Hiện tại khi guest nhận `state.projectiles`, mỗi projectile có `tx/ty` là snapshot position của enemy tại thời điểm host serialize. Guest đặt `targetEnemy: null` nên projectile di chuyển đến tọa độ cố định đó, không theo enemy di chuyển.

**Fix**: Trong `applyNetState()`, sau khi rebuild `Game.enemies`, với mỗi projectile trong `s.projectiles`, tìm enemy gần nhất với `tx/ty` trong enemy list mới rebuilt và gán `targetEnemy` reference. Threshold lookup: enemy có `Math.hypot(en.x-p.tx, en.y-p.ty) < 30` → gán làm target. Nếu không tìm thấy, giữ `tx/ty` như cũ (enemy đã chết hoặc đang lúc transition).

### D6: Guest disconnect pause — new MP state + server event

**Quyết định**:

*Server side*: Khi `case 'close'` của guest, đã có `broadcast player_disconnected`. Thêm broadcast `{type: 'game_event', event: {type: 'guest_disconnected', idx: myIdx, name: slot.name}}` về host để host xử lý pause logic.

*Host side*: Khi nhận `guest_disconnected` event: set `Game.paused = true`, lưu `Game._waitingForPlayer = {idx, name}`, show overlay "⏳ Đang chờ [Tên] kết nối lại..." với nút "Tiếp tục mà không cần họ" (cho host). Khi reconnect xảy ra (server gửi `room_update` với `disconnected: false`), host nhận signal → force full `state_sync` ngay lập tức, sau đó host thấy nút "▶ Tiếp tục" để resume.

*Guest reconnect*: Khi guest reconnect và nhận full `state_sync`, apply state bình thường. Host cần bấm resume (hoặc sau 3s auto-resume nếu host không interact) để un-pause.

**Lý do**: Pause ở host side đảm bảo game state đóng băng, guest nhận snapshot consistent khi reconnect. Không cần server lưu state — host đã có full game state.

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Balance thay đổi spd/reward ảnh hưởng wave difficulty cân bằng được không | Chỉ adjust constant, có thể fine-tune nếu quá dễ; các round event multipliers vẫn hoạt động |
| `updateTowerPanel()` gọi quá nhiều lần làm chậm | Chỉ update khi `selectedPlacedTower` != null — guard check đầu hàm |
| Custom modal bị che bởi UI khác | Set z-index: 9999, same level as win/lose modal |
| Projectile target lookup sai khi 2 enemy ở gần nhau | Threshold 30px đủ hẹp; worst case visual artifact nhỏ, không ảnh hưởng gameplay |
| Guest disconnect pause làm game bị kẹt nếu guest không reconnect | Host có nút "Tiếp tục không cần họ" — un-pause và remove waiting state |
| Balance nerf quái quá mạnh làm game quá dễ | Có thể tăng số lượng spawn hoặc HP để compensate; scope của task này chỉ là speed + reward |

## Migration Plan

Tất cả thay đổi client-side trong index.html và minor server.js. Không có schema migration, không có breaking change với data format. Deploy: replace file, reload browser.
