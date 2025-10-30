import * as http from "http";

const options: http.RequestOptions = {
  host: "localhost",
  port: process.env.PORT || 3002,
  path: "/api/health",
  timeout: 2000,
};

const request = http.request(options, (res: http.IncomingMessage) => {
  console.log(`STATUS: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on("error", (err: Error) => {
  console.log("ERROR", err);
  process.exit(1);
});

request.end();
