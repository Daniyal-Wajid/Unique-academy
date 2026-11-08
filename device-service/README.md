# ZKTeco device service

Phase 3 will add a local Python service using `pyzk` to talk to the academy MB460/ID over TCP/IP on port 4370.

## Device (do not publish the LAN IP)

- Model: MB460/ID
- Serial: AF6P210960179
- MAC: 00:17:61:11:9e:86
- Protocol: TCP/IP
- Port: 4370

IP address and communication password come from environment variables, not source code.

The service will stay on the academy Windows PC. Port 4370 must not be exposed to the public internet.

Do not delete attendance logs from the device automatically.
