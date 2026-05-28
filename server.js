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
    hasPassword: !!(room.password),
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
          password: msg.password || null,
          players: [{ ws, name: msg.name || 'Player 1', hero: msg.hero || 'Kael', nation: msg.nation || 0, ready: false, disconnected: false }]
        };
        rooms.set(code, room);
        myRoom = room; myCode = code; myIdx = 0;
        ws.send(JSON.stringify({ type: 'created', code, idx: 0, info: roomInfo(room, code) }));
        break;
      }

      // ── Danh sách phòng chờ ─────────────────────────────────
      case 'list_rooms': {
        const list = [];
        rooms.forEach((r, c) => {
          list.push({ code: c, map: r.map, mode: r.mode, hasPassword: !!(r.password), playerCount: r.players.length, started: r.started });
        });
        ws.send(JSON.stringify({ type: 'rooms_list', rooms: list }));
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

        // ── Reconnect: check before password (rejoining player already authenticated) ──
        if (room.started) {
          const dcIdx = room.players.findIndex(p => p.disconnected && p.name === (msg.name || '').trim());
          if (dcIdx >= 0) {
            const slot = room.players[dcIdx];
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

        // ── Password check (lobby join only) ────────────────────
        if (room.password && room.password !== (msg.password || '')) {
          ws.send(JSON.stringify({ type: 'error', msg: 'Mật khẩu phòng không đúng.' }));
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
        if (!myRoom || myIdx < 0 || !myRoom.players[myIdx]) break;
        myRoom.players[myIdx].hero = msg.hero;
        broadcast(myRoom, { type: 'room_update', info: roomInfo(myRoom, myCode) });
        break;
      }

      case 'set_ready': {
        if (!myRoom || myIdx < 0 || !myRoom.players[myIdx]) break;
        myRoom.players[myIdx].ready = msg.ready;
        broadcast(myRoom, { type: 'room_update', info: roomInfo(myRoom, myCode) });
        break;
      }

      // ── Cập nhật nation ─────────────────────────────────────
      case 'set_nation': {
        if (!myRoom || myIdx < 0 || !myRoom.players[myIdx]) break;
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
        // All non-host connected players must be ready
        const notReady = myRoom.players.slice(1).filter(p => !p.disconnected && !p.ready);
        if (notReady.length > 0) {
          ws.send(JSON.stringify({ type: 'error', msg: 'Chờ tất cả người chơi nhấn Sẵn sàng!' }));
          break;
        }
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
        // Track game-over so we can clean up when host disconnects
        if (myIdx === 0 && msg.event?.type === 'game_over') myRoom.gameOver = true;
        broadcast(myRoom, { type: 'game_event', from: myIdx, event: msg.event }, ws);
        break;
      }

      // ── Host-auth: state snapshot → all guests (raw relay — skip re-parse/stringify) ──
      case 'state_sync': {
        if (!myRoom || myIdx !== 0) break;
        // ws v8 receives text frames as Buffer; must convert to string before relaying
        // so browsers receive a TEXT frame (not binary Blob) and JSON.parse succeeds
        const rawStr = raw.toString('utf8');
        myRoom.players.forEach((p, i) => {
          if (i !== 0 && !p.disconnected && p.ws && p.ws.readyState === WebSocket.OPEN)
            p.ws.send(rawStr);
        });
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
      // Host left after game ended → delete the room from the list immediately
      if (myIdx === 0 && myRoom.gameOver) {
        rooms.delete(myCode);
        return;
      }
      const slot = myRoom.players[myIdx];
      if (slot) {
        if (myIdx === 0) {
          // Host left mid-game → cancel the room immediately, kick all guests
          broadcast(myRoom, {
            type: 'game_event',
            from: 0,
            event: { type: 'host_left' }
          }, ws);
          rooms.delete(myCode);
        } else {
          // Guest disconnect: keep slot, allow reconnect for 10 minutes
          slot.disconnected = true;
          slot.dcTime = Date.now();
          slot._dcTimer = setTimeout(() => {
            if (!slot.disconnected) return;
            myRoom.players.splice(myIdx, 1);
            if (myRoom.players.length === 0) rooms.delete(myCode);
          }, 10 * 60 * 1000);
          broadcast(myRoom, {
            type: 'player_disconnected',
            idx: myIdx,
            name: slot.name,
            info: roomInfo(myRoom, myCode)
          });
          broadcast(myRoom, {
            type: 'game_event',
            from: myIdx,
            event: { type: 'guest_disconnected', idx: myIdx, name: slot.name }
          });
        }
      }
    } else {
      // Lobby disconnect: remove the slot (find by ws ref, not stale myIdx)
      const realIdx = myRoom.players.findIndex(p => p.ws === ws);
      if (realIdx >= 0) myRoom.players.splice(realIdx, 1);
      if (myRoom.players.length === 0) {
        rooms.delete(myCode);
      } else {
        myRoom.players.forEach(p => {
          if (!p.disconnected && p.ws && p.ws.readyState === WebSocket.OPEN)
            p.ws.send(JSON.stringify({
              type: 'room_update',
              leftIdx: realIdx,
              info: roomInfo(myRoom, myCode)
            }));
        });
      }
    }
  });
});

httpServer.listen(PORT, () => console.log(`Last Bastion server: http://localhost:${PORT}`));
