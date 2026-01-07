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

const getPolyfillScripts = (req) => {
  const userAgent = req.headers["user-agent"];
  if (userAgent && userAgent.includes("Firefox")) {
    return `<script async src="https://ga.jspm.io/npm:es-module-shims@1.10.0/dist/es-module-shims.js"></script>
           <script type="esms-options">{ "polyfillEnable": ["css-modules"] }</script>`;
  }
  return "";
};

const handleEvents = (req, res) => {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });
  clients.push(res);
  req.on("close", () => {
    clients.splice(clients.indexOf(res), 1);
  });
};

const handleBlank = (req, res) => {
  const polyfillScripts = getPolyfillScripts(req);

  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(`
    ${polyfillScripts}
    <script type="module" src="./components/index.js"></script>
    <link rel="stylesheet" href="variables.css" />`);
};

const serveFile = (req, res, filePath) => {
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

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404);
      res.end("File not found");
      return;
    }

    if (filePath === "index.html") {
      let contentString = content.toString();
      const polyfillScripts = getPolyfillScripts(req);

      if (polyfillScripts) {
        contentString = contentString.replace(
          "</head>",
          `${polyfillScripts}</head>`,
        );
      }

      const injectedContent = contentString.replace(
        "</head>",
        `<script>
          const eventSource = new EventSource('/events');
          eventSource.onmessage = function(event) {
            if (event.data === 'reload') {
              window.location.reload();
            }
          };
         </script>
         </head>`,
      );
      res.writeHead(200, { "Content-Type": "text/html" });
      res.end(injectedContent);
    } else {
      res.writeHead(200, { "Content-Type": contentType });
      res.end(content);
    }
  });
};

const requestHandler = (req, res) => {
  switch (req.url) {
    case "/":
      serveFile(req, res, "index.html");
      break;
    case "/events":
      handleEvents(req, res);
      break;
    case "/blank":
      handleBlank(req, res);
      break;
    default:
      serveFile(req, res, `.${req.url}`);
      break;
  }
};

const server = http.createServer(requestHandler);

watchFiles("./");

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
