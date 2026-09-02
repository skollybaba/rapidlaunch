import { createServer } from "node:http";

const server = createServer((req, res) => {
  const url = req.url ?? "/";
  res.writeHead(200, { "Content-Type": "text/html" });
  res.end(
    `<html><body style="font-family:sans-serif;padding:2rem"><h1>Authorization received</h1><p>Copy the code below, then run:</p><pre>npm run calendar:token</pre><p><strong>CODE:</strong></p><textarea rows="6" cols="80" onclick="this.select()">${url.replace(/^\//, "")}</textarea></body></html>`
  );
});

server.listen(80, () => {
  console.log("Listening on http://localhost  (captures the OAuth code)");
});
