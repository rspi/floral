const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
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
      const injectedContent = content.toString().replace(
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

