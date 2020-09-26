package main

import (
	"encoding/json"
	"html/template"
	"io/ioutil"
	"log"
	"net/http"
	"net/http/httputil"
	"net/url"
)

func HttpMuxInit(mux *http.ServeMux, proxyTarget, staticDir string) {
	proxyTargetURL, err := url.Parse(proxyTarget)
	if err != nil {
		log.Fatal(err)
	}

	mux.Handle("/x/static/",
		http.StripPrefix("/x/static/",
			http.FileServer(http.Dir(staticDir))))

	mux.HandleFunc("/x/kick", HttpHandleKick)

	mux.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		director := func(req *http.Request) {
			req.URL.Scheme = proxyTargetURL.Scheme
			req.URL.Host = proxyTargetURL.Host
		}

		proxy := &httputil.ReverseProxy{
			Director: director,
		}

		proxy.ServeHTTP(w, r)
	})
}

// ------------------------------------------------

func HttpHandleKick(w http.ResponseWriter, r *http.Request) {
	StatsNumInc("http.Kick")

	log.Printf("kick, r: %+v", r)

	var err error

	if r.Method == "POST" {
		StatsNumInc("http.Kick.post")

		var b []byte

		b, err = ioutil.ReadAll(r.Body)
		if err == nil {
			var m map[string]interface{}

			err = json.Unmarshal(b, &m)
			if err == nil {
				log.Printf("kick, m: %+v", m)
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
