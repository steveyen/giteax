package main

import (
	"flag"
	"fmt"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

var StartTime time.Time

func main() {
	StartTime = time.Now()

	StatsInfo("main.startTime", StartTime.Format(
		"2006-01-02T15:04:05.000-07:00"))

	StatsInfo("main.args", strings.Join(os.Args, " "))

	flag.Parse()

	if *h {
		flag.Usage()
		os.Exit(2)
	}

	var flags []string
	flag.VisitAll(func(f *flag.Flag) {
		flags = append(flags,
			fmt.Sprintf("%s=%v", f.Name, f.Value))
	})

	StatsInfo("main.flags", strings.Join(flags, " "))

	mux := http.NewServeMux()

	HttpMuxInit(mux, *proxyTarget, *staticDir)

	go StatsHistsRun(*statsEvery)

	log.Printf("INFO: main, listen: %s", *listen)

	log.Fatal(http.ListenAndServe(*listen, mux))
}
