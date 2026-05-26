## Why

Chế độ nhiều người chơi bị lag đột ngột và không đều do 5 điểm tắc nghẽn kết hợp: GC pressure từ việc tạo hàng nghìn object JS mỗi giây trong `getNetState()`, quá nhiều `shadowBlur` calls trong draw loop, full-sync gửi dữ liệu không thay đổi mỗi 0.3s, guest tính lại path position cho tất cả enemy mỗi frame, và server phải parse+stringify lại payload state sync cho mỗi guest.

## What Changes

- **`getNetState()`**: Reuse object pool thay vì `map()` tạo object mới mỗi 2–3 frame; giảm từ ~3,000 allocations/giây xuống gần 0 để loại bỏ GC pause
- **`drawTower()` / `drawEnemy()` / `drawProjectile()`**: Batch `shadowBlur` — chỉ set một lần trước khi vẽ nhóm objects cần glow, reset về 0 sau cùng; loại bỏ per-object shadow state thrash
- **Full sync delta filtering**: Chỉ include `towers`, `weather`, `challengeMod` trong full sync khi chúng thực sự thay đổi (dirty flags), không phải mỗi 10 ticks vô điều kiện
- **Guest path prediction cache**: Cache kết quả `ptOnPath()` per enemy bằng `_lastPt` + velocity estimate, chỉ recompute khi `en.t` thay đổi đủ ngưỡng (`> 0.001`)
- **Server raw relay cho `state_sync`**: Server không parse JSON của `state_sync` packet, relay raw buffer trực tiếp tới guests để bỏ qua parse+stringify overhead

## Capabilities

### New Capabilities
- `mp-state-sync-optimization`: Tối ưu toàn bộ pipeline sync state từ host đến guest — object pooling, dirty-field filtering, raw relay

### Modified Capabilities
_(không có thay đổi spec-level behavior, chỉ thay đổi implementation)_

## Impact

- `index.html`: `getNetState()`, `applyNetState()`, `drawTower()`, `drawEnemy()`, `drawProjectile()`, `loop()`, guest update path prediction block (~1860–1905)
- `server.js`: `case 'state_sync'` handler — thêm raw relay path
- Không thay đổi giao thức WebSocket hay format message
- Không thay đổi game logic hay behavior nhìn thấy được với người dùng
