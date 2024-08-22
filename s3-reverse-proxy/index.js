const express = require("express");
const httpProxy = require("http-proxy");
const app = express();
const PORT = 8000;

const BASE_PATH = "http://192.168.29.40:9000/vercel/__output";

const proxy = httpProxy.createProxy();

app.use((req, res) => {
  const hostname = req.hostname;
  const subdomain = hostname.split(".")[0];

  const resolvesTo = `${BASE_PATH}/${subdomain}`;


  proxy.web(req, res, { target: resolvesTo, changeOrigin: true });
});


proxy.on('proxyReq', (proxyReq,req,res) => {
    const path = req.url 
    if(path === '/') 
        proxyReq.path += 'index.html'
})
app.listen(PORT, () => console.log(`Reverse proxy running on port ${PORT}`));
