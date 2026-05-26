## ADDED Requirements

### Requirement: State sync object pooling
`getNetState()` SHALL reuse pre-allocated buffer objects khi serialize enemy state thay vì tạo object mới mỗi lần gọi. Buffer SHALL tự grow khi enemy count tăng và SHALL clear excess entries khi count giảm.

#### Scenario: Sync với số enemy ổn định
- **WHEN** host gọi `getNetState()` N lần liên tiếp với cùng số enemies
- **THEN** không có enemy object mới được allocated sau lần gọi đầu tiên (buffer đã đủ kích thước)

#### Scenario: Sync khi enemy count tăng
- **WHEN** số enemies tăng vượt buffer size hiện tại
- **THEN** buffer được mở rộng để chứa đủ và dùng lại từ call tiếp theo

#### Scenario: Sync khi enemy count giảm
- **WHEN** số enemies giảm xuống dưới buffer size
- **THEN** excess buffer entries SHALL được clear (set null hoặc cắt array) để tránh memory leak

### Requirement: Shadow batch rendering
Draw loop SHALL batch tất cả canvas `shadowBlur` operations để tránh per-object GPU state flushes. Objects cần glow SHALL được vẽ trong một pass riêng với `shadowBlur` được set một lần trước pass và reset một lần sau pass.

#### Scenario: Không có objects cần shadow trong frame
- **WHEN** không có tower đang flash và không có elite/boss enemy trong frame
- **THEN** `shadowBlur` SHALL không được set lên giá trị > 0 trong toàn bộ draw call

#### Scenario: Nhiều towers đang flash đồng thời
- **WHEN** N towers có `flash > 0.1` trong cùng một frame
- **THEN** `shadowBlur` SHALL chỉ được gọi tối đa 2 lần (set + reset) cho nhóm tower đó

#### Scenario: Elite enemy và flashing tower trong cùng frame
- **WHEN** có cả elite enemy lẫn flashing tower trong frame
- **THEN** chúng SHALL được vẽ trong cùng shadow batch pass, không tạo thêm context state change

### Requirement: Dirty-flag full sync filtering
Full state sync SHALL chỉ include towers array khi tower state thực sự thay đổi kể từ lần full sync trước (xây mới, bán, upgrade, hoặc góc xoay thay đổi). `challengeMod` SHALL chỉ được gửi một lần. Weather SHALL chỉ được gửi khi giá trị thay đổi.

#### Scenario: Không có tower thay đổi giữa 2 full sync
- **WHEN** không có tower được xây/bán/upgrade trong khoảng 10 ticks
- **THEN** `state.towers` SHALL không có trong full sync payload

#### Scenario: Tower được xây trong window
- **WHEN** ít nhất một tower được xây/bán/upgrade trong 10 ticks qua
- **THEN** `state.towers` SHALL được include trong full sync với dữ liệu mới nhất

#### Scenario: Backup sync mỗi 30 ticks
- **WHEN** đã qua 30 ticks kể từ lần towers được gửi (dù dirty hay không)
- **THEN** `state.towers` SHALL được include như backup để đảm bảo consistency

#### Scenario: challengeMod chỉ gửi một lần
- **WHEN** host đã gửi challengeMod một lần thành công
- **THEN** challengeMod SHALL không còn trong payload của các full sync tiếp theo

### Requirement: Guest path prediction caching
Guest path prediction loop SHALL cache kết quả `ptOnPath()` per enemy. `ptOnPath()` SHALL chỉ được gọi lại khi `en.t` thay đổi vượt ngưỡng `0.0005` kể từ lần tính trước.

#### Scenario: Enemy không di chuyển đủ giữa frames
- **WHEN** `|en.t - en._cachedT| <= 0.0005` cho một enemy
- **THEN** `ptOnPath()` SHALL không được gọi; cached position SHALL được apply

#### Scenario: Enemy di chuyển vượt ngưỡng
- **WHEN** `|en.t - en._cachedT| > 0.0005` cho một enemy
- **THEN** `ptOnPath()` SHALL được gọi và kết quả SHALL được lưu vào `en._cachedPt` và `en._cachedT`

#### Scenario: Enemy mới xuất hiện (không có cache)
- **WHEN** enemy chưa có `_cachedT` (vừa được spawn từ `applyNetState`)
- **THEN** `ptOnPath()` SHALL được gọi và kết quả SHALL được cache

### Requirement: Server raw relay cho state_sync
Server SHALL relay `state_sync` WebSocket frames trực tiếp tới các guests mà không parse và stringify lại JSON payload.

#### Scenario: Host gửi state_sync
- **WHEN** host gửi message `{type: 'state_sync', state: {...}}`
- **THEN** guests SHALL nhận đúng payload đó mà không có transformation
- **THEN** server SHALL không allocate JavaScript objects để parse nội dung `state` field

#### Scenario: Relay chỉ tới guests (không phản hồi về host)
- **WHEN** host (player index 0) gửi `state_sync`
- **THEN** message SHALL được gửi tới tất cả players khác trong room nhưng không gửi lại cho host
