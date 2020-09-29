console.log("xmain start");

$(document).ready(async () => {
  console.log("xmain ready...");

  // If we're on the right repo file list page, in the right state,
  // then hide the repo file list behind a checkbox / toggle, and then
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

  // Fall-thru on errors to disabling the UI 'x' extensions.

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

  // Populate the UI for cbConfig viewing & editing into the el.
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
          ? m(".edit", // When in edit mode.
              m("div",
                {className: "edit-panes index-" + catalogKeys.indexOf(edit.catalogKey)},
                // List of catalog items.
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
                // Matching list of edit panels, one per catalog item.
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
                              m('span.err',
                                ((d[ak].spec['^' + s] || {}).errs || []).join('. ')),
                              m('input[type=input]', {
                                id: kaks,
                                oninput: (e) => {
                                  d[ak].spec[s] = e.target.value;

                                  specCheck(d[ak].spec, s, v.cbConfigDict[ak].spec);
                                },
                                value: d[ak].spec[s] || "",
                                placeholder: v.cbConfigDict[ak].spec['^' + s] &&
                                             v.cbConfigDict[ak].spec['^' + s].prompt
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

          // When in view mode.
          : m(".view", (function(v) { return [
              m(".catalogItemName", v.name),
              m(".pane",
                m(".catalogItemDesc", v.desc),
                m("ul.catalogItemDesc",
                  v.descList.map((f) => m("li", f))),
                m(".fields",
                  Object.keys(v.cbConfigDict).map((ak) =>
                    Object.keys(v.cbConfigDict[ak].spec).map((s) => (
                      !s.startsWith('^') &&
                      m("div",
                        s + ": " + (chk.cbConfigDict &&
                                    chk.cbConfigDict[ak] &&
                                    chk.cbConfigDict[ak].spec &&
                                    chk.cbConfigDict[ak].spec[s]))
                    ))))),
              m(".controls",
                m("button.ui.button",
                  {onclick: editStart}, "Modify"))
            ]})(catalog[chk.catalogKey])));
      }
    };

    m.mount(el, ClusterConfig);
  }
});
