import ws from "k6/ws";
import { check, sleep } from "k6";
import { Trend, Counter } from "k6/metrics";

const connectLatency = new Trend("ws_connect_ms");
const msgLatency = new Trend("ws_msg_receive_ms");
const successCount = new Counter("ws_successful_connections");

export const options = {
  stages: [
    { duration: "20s", target: 500 },
    { duration: "20s", target: 2000 },
    { duration: "20s", target: 5000 },
    { duration: "30s", target: 5000 },
    { duration: "10s", target: 0 },
  ],
};

export default function () {
  const lobbyId = `load-test-lobby-${__VU}`;
  const url = `wss://api.customguess.com/ws?username=user${__VU}&lobbyId=${lobbyId}&playerId=player${__VU}`;

  const start = Date.now();

  const res = ws.connect(url, {}, function (socket) {
    connectLatency.add(Date.now() - start);
    successCount.add(1);

    const msgStart = Date.now();

    socket.on("message", () => {
      msgLatency.add(Date.now() - msgStart);
      socket.close();
    });

    socket.setTimeout(() => socket.close(), 5000);
  });

  check(res, { "connected successfully": (r) => r && r.status === 101 });
  sleep(40);
}
