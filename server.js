const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

// ── HTTP server (serve index.html) ──────────────────────────
const httpServer = http.createServer((req, res) => {
  if (req.url === '/' || req.url === '/index.html') {
    const file = path.join(__dirname, 'index.html');
    fs.readFile(file, (err, data) => {
      if (err) { res.writeHead(404); res.end('Not found'); return; }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(data);
    });
  } else {
    res.writeHead(404); res.end();
  }
});

// ── WebSocket server ─────────────────────────────────────────
const wss = new WebSocket.Server({ server: httpServer });

// rooms: { code: { host, map, mode, players: [{ ws, name, hero, ready }] } }
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(c) ? genCode() : c;
}

function broadcast(room, msg, excludeWs = null) {
  room.players.forEach(p => {
    if (p.ws !== excludeWs && p.ws.readyState === WebSocket.OPEN)
      p.ws.send(JSON.stringify(msg));
  });
}

function roomInfo(room, code) {
  return {
    code,
    map: room.map,
    mode: room.mode,
    players: room.players.map((p, i) => ({
      idx: i,
      name: p.name,
      hero: p.hero,
      ready: p.ready,
      isHost: i === 0
    }))
  };
}

wss.on('connection', ws => {
  let myRoom = null;
  let myCode = null;
  let myIdx  = -1;

  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch { return; }

    switch (msg.type) {

      // ── Tạo phòng ──────────────────────────────────────────
      case 'create': {
        const code = genCode();
        const room = {
          host: ws,
          map: msg.map ?? 0,
          mode: msg.mode ?? 0,
          started: false,
          players: [{ ws, name: msg.name || 'Player 1', hero: msg.hero || 'Kael', ready: false }]
        };
        rooms.set(code, room);
        myRoom = room; myCode = code; myIdx = 0;
        ws.send(JSON.stringify({ type: 'created', code, info: roomInfo(room, code) }));
        break;
      }

      // ── Vào phòng ──────────────────────────────────────────
      case 'join': {
        const code = (msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { ws.send(JSON.stringify({ type: 'error', msg: 'Không tìm thấy phòng.' })); break; }
        if (room.started) { ws.send(JSON.stringify({ type: 'error', msg: 'Trận đã bắt đầu.' })); break; }
        if (room.players.length >= 4) { ws.send(JSON.stringify({ type: 'error', msg: 'Phòng đã đầy (tối đa 4 người).' })); break; }
        myIdx = room.players.length;
        room.players.push({ ws, name: msg.name || `Player ${myIdx+1}`, hero: msg.hero || 'Kael', ready: false });
        myRoom = room; myCode = code;
        ws.send(JSON.stringify({ type: 'joined', code, idx: myIdx, info: roomInfo(room, code) }));
        broadcast(room, { type: 'room_update', info: roomInfo(room, code) }, ws);
        break;
      }

      // ── Cập nhật hero / ready ───────────────────────────────
      case 'set_hero': {
        if (!myRoom || myIdx < 0) break;
        myRoom.players[myIdx].hero = msg.hero;
        broadcast(myRoom, { type: 'room_update', info: roomInfo(myRoom, myCode) });
        break;
      }

      case 'set_ready': {
        if (!myRoom || myIdx < 0) break;
        myRoom.players[myIdx].ready = msg.ready;
        broadcast(myRoom, { type: 'room_update', info: roomInfo(myRoom, myCode) });
        break;
      }

      // ── Host đổi map/mode ───────────────────────────────────
      case 'set_map': {
        if (!myRoom || myIdx !== 0) break;
        myRoom.map = msg.map;
        broadcast(myRoom, { type: 'room_update', info: roomInfo(myRoom, myCode) });
        break;
      }

      case 'set_mode': {
        if (!myRoom || myIdx !== 0) break;
        myRoom.mode = msg.mode;
        broadcast(myRoom, { type: 'room_update', info: roomInfo(myRoom, myCode) });
        break;
      }

      // ── Host bắt đầu game ───────────────────────────────────
      case 'start': {
        if (!myRoom || myIdx !== 0) break;
        myRoom.started = true;
        // Gửi cho tất cả kể cả host
        myRoom.players.forEach((p, i) => {
          if (p.ws.readyState === WebSocket.OPEN)
            p.ws.send(JSON.stringify({
              type: 'game_start',
              map: myRoom.map,
              mode: myRoom.mode,
              playerIdx: i,
              totalPlayers: myRoom.players.length,
              players: myRoom.players.map(pl => ({ name: pl.name, hero: pl.hero }))
            }));
        });
        break;
      }

      // ── Game events (đặt tháp, quái chết, v.v.) ────────────
      // Chỉ broadcast lại cho người khác trong phòng
      case 'game_event': {
        if (!myRoom) break;
        broadcast(myRoom, { type: 'game_event', from: myIdx, event: msg.event }, ws);
        break;
      }

      // ── Chat nhanh ──────────────────────────────────────────
      case 'chat': {
        if (!myRoom) break;
        const player = myRoom.players[myIdx];
        broadcast(myRoom, {
          type: 'chat',
          from: player?.name || 'Unknown',
          idx: myIdx,
          text: (msg.text || '').slice(0, 80)
        });
        break;
      }

      // ── Ping / Pong ─────────────────────────────────────────
      case 'ping': ws.send(JSON.stringify({ type: 'pong' })); break;
    }
  });

  ws.on('close', () => {
    if (!myRoom || myIdx < 0) return;
    myRoom.players.splice(myIdx, 1);
    if (myRoom.players.length === 0) {
      rooms.delete(myCode);
    } else {
      // Cập nhật lại idx
      myRoom.players.forEach((p, i) => {
        if (p.ws.readyState === WebSocket.OPEN)
          p.ws.send(JSON.stringify({
            type: myRoom.started ? 'player_left' : 'room_update',
            leftIdx: myIdx,
            info: roomInfo(myRoom, myCode)
          }));
      });
    }
  });
});

httpServer.listen(PORT, () => console.log(`Last Bastion server: http://localhost:${PORT}`));
