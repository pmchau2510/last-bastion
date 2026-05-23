# 🏰 Last Bastion — Hướng dẫn chạy

## Chơi đơn (không cần server)
Chỉ cần mở `index.html` bằng Chrome/Safari — chơi được ngay, không cần cài gì.

---

## Chơi nhiều người (cần server)

### Bước 1 — Cài Node.js
Tải về tại: https://nodejs.org (chọn phiên bản LTS)

### Bước 2 — Cài thư viện
Mở terminal/cmd trong thư mục này, gõ:
```
npm install
```

### Bước 3 — Chạy server
```
npm start
```
Server sẽ khởi động tại: http://localhost:3000

### Bước 4 — Chơi cùng bạn bè

**Cùng mạng WiFi:**
- Tìm IP máy bạn (Windows: `ipconfig`, Mac/Linux: `ifconfig`)
- Bạn bè vào: `http://192.168.x.x:3000` (thay bằng IP của bạn)

**Qua internet (miễn phí):**
Dùng Railway.app hoặc Render.com:

#### Deploy lên Railway (miễn phí):
1. Vào https://railway.app → New Project → Deploy from GitHub
2. Upload 3 file: `index.html`, `server.js`, `package.json`
3. Railway tự deploy, cho link dạng `https://xxx.railway.app`
4. Chia link cho bạn bè — vào là chơi được!

#### Deploy lên Render (miễn phí):
1. Vào https://render.com → New Web Service
2. Kết nối GitHub repo có 3 file trên
3. Start command: `node server.js`
4. Deploy xong có link public — chia sẻ là chơi được

---

## Cách chơi nhiều người

1. Người host bấm **"Nhiều người chơi"**
2. Nhập tên → bấm **"Tạo phòng mới"**
3. Sao chép **mã 6 ký tự** chia cho bạn bè
4. Bạn bè vào game → **"Nhiều người chơi"** → nhập mã → Join
5. Host chọn map, chế độ → **Bắt đầu**

Tối đa 4 người/phòng.

---

## File trong project
```
last-bastion/
├── index.html   ← Toàn bộ game (mở thẳng hoặc host)
├── server.js    ← WebSocket server cho multiplayer
├── package.json ← Config Node.js
└── README.md    ← File này
```
