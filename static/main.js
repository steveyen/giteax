console.log("xmain start");

$(document).ready(async () => {
  console.log("xmain ready...");

  // If we're on the right repo file list page, in the right state,
  // hide the repo file list behind a checkbox / toggle, and then
  // load the cluster-config UI panel.
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
             onCbConfigFetched(a.baseURI, cbConfigYaml);
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

  function onCbConfigFetched(baseURI, cbConfigYaml) {
    var cbConfig = jsyaml.safeLoadAll(cbConfigYaml);

    fetch('/x/static/catalog.yaml')
    .then(response => response.text())
    .then(catalogYaml => {
      var catalog = jsyaml.safeLoad(catalogYaml);

      var el = document.getElementById("cluster-config");
      if (el) {
        cbConfigUI(cbConfig, catalog, el);
      }
    });
  }

  // -----------------------------------------------------------

  function cbConfigUI(cbConfig, catalog, el) {
    console.log("cbCatalogCheck", cbConfig, catalog);

    var chk = cbCatalogCheck(cbConfig, catalog);
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
        return m("div",
          m("h3", "Cluster Config"),
          edit
          ? m(".edit",
              m("div",
                {className: "edit-panes index-" + catalogKeys.indexOf(edit.catalogKey)},
                m("ul.catalogItems", catalogKeys.map((k, i) => {
                  var v = catalog[k];
                  return m("li.index-" + i,
                           m("label",
                             m(".catalogItemName",
                               m("input[type=radio][name=catalogKey]",
                                 {value: i,
                                  checked: k == edit.catalogKey,
                                  onchange: (e) => {
                                    if (e.target.checked) {
                                      edit.catalogKey = k;
                                    }
                                    return true;
                                  }}),
                               v.name),
                             m(".catalogItemDesc", v.desc),
                             m("ul.catalogItemDesc",
                               v.descList.map((f) => m("li", f)))));
                })),
                m("ul.edit-panels", catalogKeys.map((k, i) => {
                  var v = catalog[k];

                  return m("li.index-" + i,
                           m(".catalogItemName", v.name),
                           edit.cbConfig.map((c) => {
                             return m(".fields",
                               m("label[for=nodes]",
                                 "nodes: ",
                                 m("input[type=input][id=nodes][name=nodes]", {
                                   oninput: (e) => {
                                     c.spec.nodes = e.target.value;
                                   },
                                   value: c.spec.nodes,
                                 })));
                           }));
                })),
                m("style",
                  catalogKeys.map((k, i) => {
                    return ".x .cluster-config .edit .edit-panes.index-" + i +
                           " > ul.catalogItems li.index-" + i +
                           " { background-color: #f4f4f4; }" +
                           ".x .cluster-config .edit .edit-panes.index-" + i +
                           " > ul.edit-panels li.index-" + i +
                           " { display: block; }";
                  }).join(" "))),
              m(".controls",
                m("button.ui.button.green",
                  {onclick: editSubmit}, "Submit"),
                m("button.ui.button.red",
                  {onclick: () => { edit = null; }}, "Cancel")))
          : m(".view",
              m(".catalogItemName", catalog[chk.catalogKey].name),
              m(".pane",
                m(".catalogItemDesc", catalog[chk.catalogKey].desc),
                m("ul.catalogItemDesc",
                  catalog[chk.catalogKey].descList.map((f) => {
                    return m("li", f);
                  })),
                chk.cbConfig.map((c) =>
                  m(".fields",
                    m("label", "nodes: " + c.spec.nodes)))),
              m(".controls",
                m("button.ui.button",
                  {onclick: editStart}, "Modify"))))
      }
    };

    m.mount(el, ClusterConfig);
  }
});

// -----------------------------------------------------------

function cbCatalogCheck(cbConfig, catalog) {
  var rv = {
    // Represents the best matching catalog item for the cbConfig.
    catalogKey: null,

    // The cleaned up, processed version of the cbConfig,
    // perhaps with default value initializeds and/or
    // perhaps with error / hint validation messages.
    cbConfig: JSON.parse(JSON.stringify(cbConfig)),
  };

  if (!rv.cbConfig || rv.cbConfig.length <= 0) {
    // First time creation case.
    rv.cbConfig = [{
      apiVersion: "ez.couchbase.com/v1",
      spec: { nodes: 0 },
    }];
  }

  var matchedLast = 0; // The matched # from last match.

  for (var catalogKey in catalog) {
    var catalogItem = catalog[catalogKey];

    var matched = 0;
    var unknown = 0;

    rv.cbConfig.forEach((c) => {
      if (catalogItem.cbConfigDict[(c.apiVersion || "") + ":" +
                                   (c.kind || "")]) {
        // TODO. Check the fields of c.

        matched += 1;

        return;
      }

      unknown += 1;
    });

    if (matchedLast < matched && unknown <= 0) {
      rv.catalogKey = catalogKey;

      matchedLast = matched;
    }
  }

  return rv;
}
