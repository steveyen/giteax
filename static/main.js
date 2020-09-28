console.log("xmain start");

$(document).ready(async () => {
  console.log("xmain ready...");

  if (document.getElementById("repo-files-table")) {
    var rt = document.getElementById("repo-topics");
    if (rt) {
      var lb = document.createElement("label");
      lb.className = "x";
      lb.htmlFor = "x-repo-advanced-toggle";
      lb.innerHTML = "Show details / history";
      rt.parentElement.insertBefore(lb, rt.nextSibling);

      var cb = document.createElement("input");
      cb.className = "x";
      cb.id = "x-repo-advanced-toggle";
      cb.name = "x-repo-advanced-toggle";
      cb.type = "checkbox";
      rt.parentElement.insertBefore(cb, rt.nextSibling);

      var tmpl = document.getElementById("template-cluster-info");
      if (tmpl) {
        el = document.createElement("div");
        el.className = "x";
        el.innerHTML = tmpl.innerHTML;

        rt.parentElement.insertBefore(el, rt.nextSibling);

	clusterInfoFetch(clusterInfoRender);

        console.log("xmain ready... done");

        return; // Success.
      }
    }
  }

  document.body.className = document.body.className + " x-none";

  // -----------------------------------------------------------

  function clusterInfoFetch(andThen) {
    var a = document.querySelector('.repository.file.list .repo-header .repo-title.breadcrumb a');
    if (a) {
      fetch(a.baseURI + '/raw/branch/master/cb-config.yaml')
      .then(response => response.text())
      .then(andThen);
    }
  }

  function clusterInfoRender(text) {
    var y = jsyaml.safeLoadAll(text);

    var el = document.getElementById("cluster-config");

    var count = 0;

    var ClusterConfig = {
      view: function() {
        return m("main", [
          m("h3", "Cluster Config"),
          m("pre", JSON.stringify(y)),
          m("button", {onclick: function() {count++}}, count + " clicks"),
        ]);
      }
    };

    m.mount(el, ClusterConfig);
  }
});

