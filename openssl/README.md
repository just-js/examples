```bash
openssl req -x509 -nodes -days 365 -newkey rsa:2048 -keyout key.pem -out cert.pem -config req.cnf
just tlsServer.js
curl -k -vvv https://127.0.0.1:3000/
just tlsClient.js
```
