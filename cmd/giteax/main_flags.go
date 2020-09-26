package main

import "flag"
import "time"

var (
	h = flag.Bool("h", false, "print help/usage and exit")

	listen = flag.String("listen", ":8090",
		"[addr]:port for giteax's web UI / REST API")

	proxyTarget = flag.String("proxyTarget", "http://127.0.0.1:3000",
		"URL for the gitea server which will be proxied")

	staticDir = flag.String("staticDir", "static",
		"path to the 'static' resources directory")

	statsEvery = flag.Duration("statsEvery",
		20*time.Second,
		"duration or interval between grabbing another sample of stats")
)
