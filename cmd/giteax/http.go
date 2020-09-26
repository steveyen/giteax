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

/* Example kick HTTP POST message, after JSON parse...
   m: map[after:72b34dbf9e52188f92641cd50978ee95f4f6df2d
      before:9b6162bfca70315f47157ca9fc1b5ee0dcac6850
      commits:[map[added:[] author:map[email:steve@couchbase.com
      name:steve username:steve]
      committer:map[email:steve@couchbase.com name:steve
      username:steve] id:72b34dbf9e52188f92641cd50978ee95f4f6df2d
      message:Update 'cb-config.yaml' modified:[] removed:[]
      timestamp:2020-09-26T11:02:18-07:00
      url:http://localhost:3000/steve/cluster-1/commit/72b34dbf9e52188f92641cd50978ee95f4f6df2d
      verification:<nil>]]
      compare_url:http://localhost:3000/steve/cluster-1/compare/9b6162bfca70315f47157ca9fc1b5ee0dcac6850...72b34dbf9e52188f92641cd50978ee95f4f6df2d
      head_commit:<nil>
      pusher:map[avatar_url:http://localhost:3000/user/avatar/steve/-1
      created:2020-09-22T18:21:48-07:00 email:steve@couchbase.com
      full_name: id:1 is_admin:true language:en-US
      last_login:2020-09-25T17:44:41-07:00 login:steve username:steve]
      ref:refs/heads/master repository:map[allow_merge_commits:true
      allow_rebase:true allow_rebase_explicit:true
      allow_squash_merge:true archived:false avatar_url:
      clone_url:http://localhost:3000/steve/cluster-1.git
      created_at:2020-09-22T22:02:05-07:00 default_branch:master
      description:a test cluster for testing empty:false fork:false
      forks_count:0 full_name:steve/cluster-1 has_issues:true
      has_projects:true has_pull_requests:true has_wiki:true
      html_url:http://localhost:3000/steve/cluster-1 id:3
      ignore_whitespace_conflicts:false internal:false
      internal_tracker:map[allow_only_contributors_to_track_time:true
      enable_issue_dependencies:true enable_time_tracker:true]
      mirror:false name:cluster-1 open_issues_count:0
      open_pr_counter:0 original_url:
      owner:map[avatar_url:http://localhost:3000/user/avatar/steve/-1
      created:2020-09-22T18:21:48-07:00 email:steve@couchbase.com
      full_name: id:1 is_admin:true language:en-US
      last_login:2020-09-25T17:44:41-07:00 login:steve username:steve]
      parent:<nil> permissions:map[admin:true pull:true push:true]
      private:false release_counter:0 size:39
      ssh_url:steve.yen@localhost:steve/cluster-1.git stars_count:1
      template:false updated_at:2020-09-26T11:02:19-07:00
      watchers_count:1 website:] secret:the-secret
      sender:map[avatar_url:http://localhost:3000/user/avatar/steve/-1
      created:2020-09-22T18:21:48-07:00 email:steve@couchbase.com
      full_name: id:1 is_admin:true language:en-US
      last_login:2020-09-25T17:44:41-07:00 login:steve
      username:steve]]
*/
