console.log("xmain start");

$(document).ready(async () => {
  console.log("xmain ready...");

  if (document.getElementById("repo-files-table")) {
    var rt = document.getElementById("repo-topics");
    if (rt) {
      var a = document.querySelector('.repository.file.list .repo-header .repo-title.breadcrumb a');
      if (a) {
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

          fetchBranchFile(a.baseURI, 'master', 'cb-config.yaml', cbConfigYaml => {
             cbConfigFetched(a.baseURI, cbConfigYaml);
          })

          console.log("xmain ready... done");

          return; // Success.
        }
      }
    }
  }

  document.body.className = document.body.className + " x-none";

  // -----------------------------------------------------------

  function fetchBranchFile(baseURI, branch, file, callback) {
    fetch(baseURI + '/raw/branch/' + branch + '/' + file)
    .then(response => response.text())
    .then(callback);
  }

  // -----------------------------------------------------------

  function cbConfigFetched(baseURI, cbConfigYaml) {
    var cbConfig = jsyaml.safeLoadAll(cbConfigYaml);

    fetch('/x/static/catalog.yaml')
    .then(response => response.text())
    .then(catalogYaml => {
      var catalog = jsyaml.safeLoad(catalogYaml);

      var el = document.getElementById("cluster-config");
      if (el) {
        cbConfigCatalogUI(cbConfig, catalog, el);
      }
    });
  }

  // -----------------------------------------------------------

  function cbConfigCatalogUI(cbConfig, catalog, el) {
    var chk = cbConfigCatalogCheck(cbConfig, catalog);
    if (!chk || !chk.catalogKey) {
      m.render(el, [
        m("h3", "Cluster Config (not from catalog)"),
        m("pre", jsyaml.dump(cbConfig)),
      ]);

      return;
    }

    var catalogKeys = [];
    for (var k in catalog) {
      catalogKeys.push(k);
    }

    var edit;

    function editStart() {
      edit = JSON.parse(JSON.stringify(chk));
    }

    function editSubmit() {
      chk = edit;
      edit = null;
    }

    var ClusterConfig = {
      view: function() {
        return m("div", [
          m("h3", "Cluster Config"),
          edit
          ? m(".edit", [
              m("ul", catalogKeys.map((k) => {
                var v = catalog[k];
                return m("li",
                         m("label", [
                           m("input[type=radio][name=catalogKey]",
                             {checked: k == edit.catalogKey}),
                           m("span", v.name),
                           m("div", v.desc),
                           m("ul", v.descFeatures.map((f) => {
                             return m("li", f);
                           })),
                         ]));
              })),
              edit.cbConfig.map((c) => {
                return m(".fields", [
                  m("label[for=nodes]", [
                    "nodes: ",
                    m("input[type=input][id=nodes][name=nodes]", {
                      oninput: (e) => {
                        c.spec.nodes = e.target.value;
                      },
                      value: c.spec.nodes,
                    }),
                  ]),
                ]);
              }),
              m(".controls", [
                m("button", {onclick: editSubmit}, "submit"),
                m("button", {onclick: () => { edit = null; }}, "cancel"),
              ]),
            ])
          : m(".view", [
              m("h3.catalogItemName", catalog[chk.catalogKey].name),
              m(".catalogItemDesc", catalog[chk.catalogKey].desc),
              m("ul.catalogItemDescFeatures",
                catalog[chk.catalogKey].descFeatures.map((f) => {
                  return m("li", f);
                })),
              chk.cbConfig.map((c) => {
                return m(".fields", [
                         m("label", "nodes: " + c.spec.nodes),
                       ]);
              }),
              m(".controls", [
                m("button", {onclick: editStart}, "edit"),
              ])
            ])
        ]);
      }
    };

    m.mount(el, ClusterConfig);
  }

  // -----------------------------------------------------------

  function cbConfigCatalogCheck(cbConfig, catalog) {
    console.log("cbConfigCatalogCheck", cbConfig);

    var rv = {
      catalogKey: null,
      cbConfig: JSON.parse(JSON.stringify(cbConfig)),
    };

    if (!rv.cbConfig || rv.cbConfig.length <= 0) {
      rv.catalogKey = "ez.couchbase.com/v1"
      rv.cbConfig = [{
        apiVersion: "ez.couchbase.com/v1",
        spec: { nodes: 0 },
      }];
    }

    for (var k in catalog) {
      if (rv.catalogKey) { break; }

      v = catalog[k];

      if (Object.keys(v.cbConfig).length != rv.cbConfig.length) {
        continue;
      }

      var matched = 0;

      rv.cbConfig.forEach((c) => {
        if (v.cbConfig[c.apiVersion]) {
          matched += 1;
        }
      });

      if (matched == rv.cbConfig.length) {
        rv.catalogKey = k;
      }
    }

    return rv;
  }
});
