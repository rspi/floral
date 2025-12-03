import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const PORT = process.env.PORT || 4711;
const clients = [];

const watchFiles = (dir) => {
  fs.watch(dir, { recursive: true }, (eventType, filename) => {
    if (filename) {
      const ext = path.extname(filename);
      if ([".html", ".css", ".js"].includes(ext)) {
        console.log(`File changed: ${filename}`);
        sendReload();
      }
    }
  });
};

const sendReload = () => {
  clients.forEach((client) => {
    client.write("data: reload\n\n");
  });
};

const server = http.createServer((req, res) => {
  const filePath = req.url === "/" ? "index.html" : `.${req.url}`;
  const extname = path.extname(filePath);
  let contentType = "text/html";

  switch (extname) {
    case ".js":
      contentType = "text/javascript";
      break;
    case ".css":
      contentType = "text/css";
      break;
  }

  if (req.url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    });
    clients.push(res);
    req.on("close", () => {
      clients.splice(clients.indexOf(res), 1);
    });
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("File not found");
      return;
    }

    if (filePath === "index.html") {
      let contentString = content.toString();
      const userAgent = req.headers["user-agent"];

      if (userAgent && userAgent.includes("Firefox")) {
        contentString = contentString.replace(
          "</head>",
          `<script async src="https://ga.jspm.io/npm:es-module-shims@1.10.0/dist/es-module-shims.js"></script>
           <script type="esms-options">{ "polyfillEnable": ["css-modules"] }</script>
           </head>`,
        );
      }

      const injectedContent = contentString.replace(
        "</body>",
        `<script>
          const eventSource = new EventSource('/events');
          eventSource.onmessage = function(event) {
            if (event.data === 'reload') {
              window.location.reload();
            }
          };
         </script>
         </body>`,
      );
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(injectedContent);
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
});

watchFiles("./");

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
