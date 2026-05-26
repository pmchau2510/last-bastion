## ADDED Requirements

### Requirement: Custom HTML modal thay thế window.prompt() cho nhập mật khẩu phòng
Khi người dùng muốn vào phòng có mật khẩu, game SHALL hiện custom HTML modal để nhập mật khẩu thay vì dùng `window.prompt()` của browser, tránh việc fullscreen bị thoát.

#### Scenario: Vào phòng có mật khẩu khi đang fullscreen
- **WHEN** người dùng đang ở chế độ fullscreen và bấm vào phòng có mật khẩu trong danh sách phòng
- **THEN** fullscreen SHALL không bị thoát
- **THEN** custom modal SHALL xuất hiện overlay lên canvas với input field kiểu password

#### Scenario: Nhập đúng mật khẩu và confirm
- **WHEN** người dùng nhập mật khẩu vào input và bấm "Xác nhận" hoặc nhấn Enter
- **THEN** modal SHALL đóng lại
- **THEN** game SHALL gọi `_joinWithCode(code, password)` với mật khẩu đã nhập

#### Scenario: Huỷ bỏ nhập mật khẩu
- **WHEN** người dùng bấm "Huỷ" hoặc bấm ESC
- **THEN** modal SHALL đóng lại
- **THEN** không có hành động join nào được thực hiện

#### Scenario: Nhập từ bàn phím ảo trên mobile
- **WHEN** người dùng trên thiết bị mobile focus vào input field của modal
- **THEN** input SHALL nhận keyboard input bình thường
- **THEN** mật khẩu SHALL được ẩn bằng ký tự `•` (type="password")

#### Scenario: Modal trên màn hình nhỏ
- **WHEN** modal hiển thị trên màn hình mobile nhỏ
- **THEN** modal SHALL nằm trong viewport, không bị cắt, có thể scroll hoặc center

### Requirement: Input nhập mật khẩu khi tạo phòng cũng dùng HTML input
Khi host tạo phòng và nhập mật khẩu, SHALL dùng HTML input thay vì bất kỳ native dialog nào.

#### Scenario: Tạo phòng với mật khẩu
- **WHEN** host nhập mật khẩu vào ô "Mật khẩu phòng" trong create room UI
- **THEN** input SHALL là HTML `<input type="password">` nằm trong form tạo phòng
- **THEN** giá trị SHALL được gửi cùng `create` message lên server
