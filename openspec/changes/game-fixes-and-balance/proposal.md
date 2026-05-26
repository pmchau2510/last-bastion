## Why

Game hiện tại thiếu balance (vàng kiếm được ít, quái quá nhanh, nâng cấp quá đắt khiến người chơi bị stall), đồng thời có nhiều bug nghiêm trọng ở chế độ multiplayer (guest không xây được trụ, đạn không đồng bộ, disconnect không xử lý đúng, fullscreen bị break khi nhập mật khẩu) làm trải nghiệm chơi cùng nhau rất kém.

## What Changes

**Balance:**
- Tăng gold reward khi giết quái +50% (áp dụng toàn bộ enemy kể cả boss, cả 2 chế độ)
- Boss gold reward cao hơn quái thường đáng kể — tăng flat bonus từ +50 lên +150
- Giảm tốc độ di chuyển tất cả quái thường 30% (nhân `spd * 0.7` trong `ENEMIES_DATA`)
- Boss di chuyển chậm hơn quái thường 25% — giảm thêm `spd * 0.75` trên boss entries
- Giảm `UPGRADE_COST_MULTS` 30% (tất cả tier)

**UI Fix:**
- Fix nút "Nâng cấp" không refresh khi vàng thay đổi — gọi lại `updateTowerPanel()` sau mỗi thao tác earn/spend gold khi panel đang mở
- Thay `window.prompt()` nhập mật khẩu phòng bằng custom HTML modal — tránh browser thoát fullscreen

**Multiplayer Fixes:**
- Fix guest xây trụ bị lúc được lúc không: host validate bằng tọa độ gốc từ guest, không re-snap; chuẩn hóa threshold check `onAnyPath` nhất quán giữa guest và host
- Fix visual projectile desync: guest side dùng live enemy position từ prediction cache thay vì snapshot `tx/ty` cố định để đạn bay đúng hướng
- Implement guest disconnect pause: khi guest thoát giữa trận, game pause, hiện overlay "Đang chờ [Tên] kết nối lại..." với nút "Tiếp tục không cần họ" cho host; sau reconnect host bấm resume, guest nhận full state sync tức thì

## Capabilities

### New Capabilities
- `guest-disconnect-pause`: Pause game khi guest disconnect, chờ reconnect, host điều khiển resume
- `custom-password-modal`: Custom HTML modal thay thế `window.prompt()` cho nhập mật khẩu phòng

### Modified Capabilities
_(không có thay đổi spec-level ở openspec/specs/ hiện có)_

## Impact

- `index.html`:
  - `ENEMIES_DATA` (lines ~773–791): spd values, reward values
  - `BOSS_ENEMIES` (lines ~786–791): spd, reward
  - `UPGRADE_COST_MULTS` (line ~753)
  - `damageEnemy()` (line ~2188): baseReward formula
  - `showTowerPanel()` / `updateHUD()` (lines ~3994–4010): upgrade button refresh
  - `draw()` projectile loop: guest projectile target tracking
  - `applyNetState()`: guest reconnect full state apply
  - MP object: disconnect/pause/resume state, overlay UI
  - `joinFromList()`: replace `prompt()` with modal
  - HTML: thêm password modal, thêm disconnect overlay
- `server.js`: broadcast pause/resume events khi player disconnect/reconnect (đã có `player_disconnected`, cần `game_pause`/`game_resume` broadcast)
