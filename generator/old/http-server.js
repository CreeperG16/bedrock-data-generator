const { Server } = require("http");

module.exports = (port) => new Promise((resolve, reject) => {
  const server = new Server((req, res) => {
    let data = "";
    const dataListener = (chunk) => (data += chunk);

    req.on("data", dataListener);
    req.once("end", () => {
      req.off("data", dataListener);
      
      res.write("{}");
      res.end();
      
      server.close();
      resolve(JSON.parse(data));
    });
  });

  server.listen(port);
});
