package main

import (
	"encoding/json"
	"html/template"
	"io/ioutil"
	"net/http"
)

func HttpMuxInit(mux *http.ServeMux) {
	mux.Handle("/static/",
		http.StripPrefix("/static/",
			http.FileServer(http.Dir(*staticDir))))

	mux.HandleFunc("/kick", HttpHandleKick)
}

// ------------------------------------------------

func HttpHandleKick(w http.ResponseWriter, r *http.Request) {
	StatsNumInc("http.Kick")

	var err error

	if r.Method == "POST" {
		StatsNumInc("http.Kick.post")

		var b []byte

		b, err = ioutil.ReadAll(r.Body)
		if err != nil {
			var m map[string]interface{}

			err = json.Unmarshal(b, &m)
			if err == nil {
			}
		}

		if err == nil {
			StatsNumInc("http.Kick.post.ok")
		} else {
			StatsNumInc("http.Kick.post.err")
		}
	}

	if err == nil {
		StatsNumInc("http.Kick.ok")
	} else {
		StatsNumInc("http.Kick.err")
	}

	w.Header().Set("Content-Type", "text/html")

	data := map[string]interface{}{}

	template.Must(template.ParseFiles(
		*staticDir+"/kick.html.tmpl")).Execute(w, data)
}
