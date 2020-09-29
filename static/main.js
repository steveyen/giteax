console.log("xmain start");

$(document).ready(async () => {
  console.log("xmain ready...");

  // If we're on the right repo file list page, in the right state,
  // hide the repo file list behind a checkbox / toggle, and then
  // load the cluster-config UI panel.
  if (document.getElementById("repo-files-table")) {
    var rt = document.getElementById("repo-topics");
    if (rt) {
      var a = document.querySelector(
        '.repository.file.list .repo-header .repo-title.breadcrumb a');
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

          fetchBranchFile(a.baseURI,
            'master', 'cb-config.yaml', cbConfigYaml => {
              onCbConfigFetched(a.baseURI, cbConfigYaml);
            });

          console.log("xmain ready... done");

          return; // Success.
        }
      }
    }
  }

  // Fall-thru on errors to disabling 'x' extensions.

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

    chk.cbConfigDict = cbConfigDictFill(chk.cbConfig, catalog);

    var catalogKeys = [];
    for (var k in catalog) {
      catalogKeys.push(k);
    }

    var edit;

    function editStart() {
      edit = JSON.parse(JSON.stringify(chk));
      edit.cbConfigDict = cbConfigDictFill(edit.cbConfig, catalog);
    }

    function editSubmit() {
      chk = JSON.parse(JSON.stringify(edit));

      chk.cbConfig = cbConfigDictTake(
         chk.cbConfigDict, catalog, chk.catalogKey);

      chk.cbConfigDict = cbConfigDictFill(chk.cbConfig, catalog);

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
                  var d = edit.cbConfigDict;
                  return m("li.index-" + i,
                    m(".catalogItemName", v.name),
                      Object.keys(v.cbConfigDict).map((ak) => {
                        return m(".fields",
                          Object.keys(v.cbConfigDict[ak].spec).map((s) => {
                            if (s.startsWith('^')) {
                              return;
                            }
                            var kaks = k + ":" + ak + ":" + s;
                            return m('label[for="' + kaks + '"]',
                              s + ": ",
                              m('input[type=input]', {
                                id: kaks,
                                oninput: (e) => {
                                  d[ak].spec[s] = e.target.value;
                                },
                                value: d[ak].spec[s] || "",
                              }));
                          }));
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
          : m(".view", (function(v) { return [
              m(".catalogItemName", v.name),
              m(".pane",
                m(".catalogItemDesc", v.desc),
                m("ul.catalogItemDesc",
                  v.descList.map((f) => m("li", f))),
                m(".fields",
                  Object.keys(v.cbConfigDict).map((ak) =>
                    Object.keys(v.cbConfigDict[ak].spec).map((s) => {
                      if (s.startsWith('^')) {
                        return;
                      }
                      return m("div",
                        s + ": " + (chk.cbConfigDict &&
                                    chk.cbConfigDict[ak] &&
                                    chk.cbConfigDict[ak].spec &&
                                    chk.cbConfigDict[ak].spec[s]));
                    })))),
              m(".controls",
                m("button.ui.button",
                  {onclick: editStart}, "Modify"))
            ]})(catalog[chk.catalogKey])));
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

// -----------------------------------------------------------

// Returns a 'cbConfigDict' object initially popullated
// by cbConfig, but also filled in with other default
// values from the catalog.
function cbConfigDictFill(cbConfig, catalog) {
  var d = {}; // Keyed by "apiVersion:kind".

  cbConfig.forEach((c) => {
    d[(c.apiVersion || "") + ":" + (c.kind || "")] = c;
  });

  Object.keys(catalog).forEach((ck) => {
    var cv = catalog[ck];

    Object.keys(cv.cbConfigDict).forEach((ak) => {
      d[ak] ||= {};
      d[ak].spec ||= {};

      var spec = cv.cbConfigDict[ak].spec;

      Object.keys(spec).forEach((s) => {
        if (!s.startsWith('^') &&
            typeof(d[ak].spec[s]) == "undefined") {
          d[ak].spec[s] ||= spec[s];
        }
      });
    });
  });

  return d;
}

// Retrieves a cbConfig from a cbConfigDict, driven
// from the metadata from a catalog and a catalogKey.
function cbConfigDictTake(cbConfigDict, catalog, catalogKey) {
  var d = {};

  Object.keys(catalog[catalogKey].cbConfigDict).forEach((ak) => {
    d[ak] = Object.assign(d[ak] || {}, cbConfigDict[ak] || {});
  })

  return Object.keys(d).map((ak) => {
    var o = JSON.parse(JSON.stringify(d[ak]));

    var akp = ak.split(':');

    o.apiVersion ||= akp[0];
    o.kind ||= akp[1];

    return o;
  })

  return rv;
}
