package main

import "flag"
import "time"

var (
	h = flag.Bool("h", false, "print help/usage and exit")

	listen = flag.String("listen", ":8090",
		"[addr]:port for giteax's web UI / REST API")

	staticDir = flag.String("staticDir", "static",
		"path to the 'static' resources directory")

	statsEvery = flag.Duration("statsEvery",
		20*time.Second,
		"duration or interval between grabbing another sample of stats")
)
