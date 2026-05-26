## ADDED Requirements

### Requirement: Game pauses when guest disconnects mid-match
Khi một guest (non-host player) mất kết nối trong lúc trận đang diễn ra, game SHALL tự động pause và hiện overlay thông báo trên màn hình của host và các guest còn lại, chờ người chơi đó reconnect hoặc host quyết định tiếp tục.

#### Scenario: Guest disconnect trong wave
- **WHEN** guest bị mất kết nối (WebSocket close) khi game đang ở phase `wave` hoặc `prep`
- **THEN** `Game.paused` SHALL được set `true` trên host
- **THEN** overlay "⏳ Đang chờ [Tên] kết nối lại..." SHALL hiện trên host và các guest còn lại
- **THEN** host SHALL thấy nút "Tiếp tục mà không cần họ"

#### Scenario: Guest reconnect thành công
- **WHEN** guest đã bị disconnect reconnect vào đúng phòng (đúng tên)
- **THEN** host SHALL nhận tín hiệu reconnect thành công
- **THEN** host SHALL thấy nút "▶ Tiếp tục" để resume game
- **THEN** khi host bấm tiếp tục, full `state_sync` SHALL được gửi ngay lập tức tới guest vừa reconnect
- **THEN** `Game.paused` SHALL được set `false`

#### Scenario: Host bấm tiếp tục không cần guest
- **WHEN** host bấm nút "Tiếp tục mà không cần họ" trên overlay
- **THEN** overlay SHALL bị ẩn
- **THEN** `Game.paused` SHALL được set `false`
- **THEN** game SHALL tiếp tục bình thường, slot của guest đó vẫn giữ trạng thái disconnected

#### Scenario: Disconnect ở phase prep hoặc wave
- **WHEN** game đang ở bất kỳ phase nào (prep, wave) và guest disconnect
- **THEN** game SHALL pause ngay lập tức, không advance frame nào thêm trong `update()`

### Requirement: Reconnected guest nhận đúng state hiện tại
Sau khi guest reconnect và host resume, guest SHALL nhận full game state khớp với state của host tại thời điểm resume để không bị lệch tiến trình.

#### Scenario: State sau reconnect khớp host
- **WHEN** host bấm resume sau khi guest reconnect
- **THEN** host SHALL gửi một full `state_sync` (với `full=true`) ngay tức thì trước khi unpause
- **THEN** guest SHALL nhận state này và apply vào game của mình
- **THEN** enemy positions, crystal HP, gold, round số SHALL khớp với host

#### Scenario: Không có data loss trong pause window
- **WHEN** game đang pause chờ guest
- **THEN** không có enemy nào di chuyển, không có projectile nào bay, không có gold nào được earn
- **THEN** khi resume, game tiếp tục từ exact state lúc pause
