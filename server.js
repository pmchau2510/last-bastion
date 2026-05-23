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

// rooms: { code: { host, map, mode, started, players: [{ ws, name, hero, nation, ready, disconnected, dcTime }] } }
const rooms = new Map();

function genCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let c = '';
  for (let i = 0; i < 6; i++) c += chars[Math.floor(Math.random() * chars.length)];
  return rooms.has(c) ? genCode() : c;
}

function broadcast(room, msg, excludeWs = null) {
  room.players.forEach(p => {
    if (p.ws !== excludeWs && !p.disconnected && p.ws && p.ws.readyState === WebSocket.OPEN)
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
      nation: p.nation || 0,
      ready: p.ready,
      isHost: i === 0,
      disconnected: p.disconnected || false
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
        // one room per connection
        if (myRoom) {
          ws.send(JSON.stringify({ type: 'error', msg: 'Bạn đã ở trong một phòng rồi.' }));
          break;
        }
        const code = genCode();
        const room = {
          host: ws,
          map: msg.map ?? 0,
          mode: msg.mode ?? 0,
          started: false,
          players: [{ ws, name: msg.name || 'Player 1', hero: msg.hero || 'Kael', nation: msg.nation || 0, ready: false, disconnected: false }]
        };
        rooms.set(code, room);
        myRoom = room; myCode = code; myIdx = 0;
        ws.send(JSON.stringify({ type: 'created', code, idx: 0, info: roomInfo(room, code) }));
        break;
      }

      // ── Vào phòng / Reconnect ──────────────────────────────
      case 'join': {
        // one room per connection (skip if this is a reconnect attempt)
        if (myRoom) {
          ws.send(JSON.stringify({ type: 'error', msg: 'Bạn đã ở trong một phòng rồi.' }));
          break;
        }
        const code = (msg.code || '').toUpperCase().trim();
        const room = rooms.get(code);
        if (!room) { ws.send(JSON.stringify({ type: 'error', msg: 'Không tìm thấy phòng.' })); break; }

        // ── Reconnect: check if a disconnected slot matches this name ──
        if (room.started) {
          const dcIdx = room.players.findIndex(p => p.disconnected && p.name === (msg.name || '').trim());
          if (dcIdx >= 0) {
            const slot = room.players[dcIdx];
            // Clear reconnect cleanup timer if set
            if (slot._dcTimer) { clearTimeout(slot._dcTimer); delete slot._dcTimer; }
            slot.ws = ws;
            slot.disconnected = false;
            myRoom = room; myCode = code; myIdx = dcIdx;
            ws.send(JSON.stringify({
              type: 'reconnected',
              code,
              idx: dcIdx,
              info: roomInfo(room, code)
            }));
            broadcast(room, { type: 'room_update', info: roomInfo(room, code) }, ws);
            break;
          }
          ws.send(JSON.stringify({ type: 'error', msg: 'Trận đã bắt đầu.' }));
          break;
        }

        if (room.players.length >= 4) { ws.send(JSON.stringify({ type: 'error', msg: 'Phòng đã đầy (tối đa 4 người).' })); break; }
        myIdx = room.players.length;
        room.players.push({ ws, name: msg.name || `Player ${myIdx+1}`, hero: msg.hero || 'Kael', nation: msg.nation || 0, ready: false, disconnected: false });
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

      // ── Cập nhật nation ─────────────────────────────────────
      case 'set_nation': {
        if (!myRoom || myIdx < 0) break;
        myRoom.players[myIdx].nation = msg.nation || 0;
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
          if (!p.disconnected && p.ws && p.ws.readyState === WebSocket.OPEN)
            p.ws.send(JSON.stringify({
              type: 'game_start',
              map: myRoom.map,
              mode: myRoom.mode,
              playerIdx: i,
              totalPlayers: myRoom.players.length,
              players: myRoom.players.map(pl => ({ name: pl.name, hero: pl.hero, nation: pl.nation || 0 }))
            }));
        });
        break;
      }

      // ── Game events ──────────────────────────────────────────
      case 'game_event': {
        if (!myRoom) break;
        broadcast(myRoom, { type: 'game_event', from: myIdx, event: msg.event }, ws);
        break;
      }

      // ── Host-auth: state snapshot → all guests ──────────────
      case 'state_sync': {
        if (!myRoom || myIdx !== 0) break;
        broadcast(myRoom, { type: 'state_sync', state: msg.state }, ws);
        break;
      }

      // ── Host-auth: guest input → host only ──────────────────
      case 'player_input': {
        if (!myRoom) break;
        const hostP = myRoom.players[0];
        if (hostP && hostP.ws !== ws && !hostP.disconnected && hostP.ws.readyState === WebSocket.OPEN)
          hostP.ws.send(JSON.stringify({ type: 'player_input', from: myIdx, action: msg.action, data: msg.data }));
        break;
      }

      // ── Chat ────────────────────────────────────────────────
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

    if (myRoom.started) {
      // Mid-game disconnect: keep the slot, mark disconnected
      const slot = myRoom.players[myIdx];
      if (slot) {
        slot.disconnected = true;
        slot.dcTime = Date.now();
        // Cleanup after 10 minutes if not reconnected
        slot._dcTimer = setTimeout(() => {
          if (!slot.disconnected) return; // already reconnected
          myRoom.players.splice(myIdx, 1);
          if (myRoom.players.length === 0) rooms.delete(myCode);
        }, 10 * 60 * 1000);
        broadcast(myRoom, {
          type: 'player_disconnected',
          idx: myIdx,
          name: slot.name,
          info: roomInfo(myRoom, myCode)
        });
      }
    } else {
      // Lobby disconnect: remove the slot
      myRoom.players.splice(myIdx, 1);
      if (myRoom.players.length === 0) {
        rooms.delete(myCode);
      } else {
        myRoom.players.forEach(p => {
          if (!p.disconnected && p.ws && p.ws.readyState === WebSocket.OPEN)
            p.ws.send(JSON.stringify({
              type: 'room_update',
              leftIdx: myIdx,
              info: roomInfo(myRoom, myCode)
            }));
        });
      }
    }
  });
});

httpServer.listen(PORT, () => console.log(`Last Bastion server: http://localhost:${PORT}`));
