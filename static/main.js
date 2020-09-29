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

    var curr = cbCatalogCheck(cbConfig, catalog);
    if (!curr || !curr.catalogKey) {
      m.render(el, [
        m("h3", "Cluster Config (not from catalog)"),
        m("pre", jsyaml.dump(cbConfig)),
      ]);

      return;
    }

    curr.cbConfigDict = cbConfigDictFill(curr.cbConfig, catalog);

    var catalogKeys = [];
    for (var k in catalog) {
      catalogKeys.push(k);
    }

    var edit;

    function editStart() {
      edit = JSON.parse(JSON.stringify(curr));
      edit.cbConfigDict = cbConfigDictFill(edit.cbConfig, catalog);

      setTimeout(function() {
        document.getElementById('catalogKey-' + curr.catalogKey)
          .scrollIntoView();
      }, 200);
    }

    function editSubmit() {
      curr = JSON.parse(JSON.stringify(edit));

      curr.cbConfig = cbConfigDictTake(
         curr.cbConfigDict, catalog, curr.catalogKey);

      curr.cbConfigDict = cbConfigDictFill(curr.cbConfig, catalog);

      edit = null;
    }

    var ClusterConfig = {
      view: function() {
        return m("div",
          m("h3", "Cluster Config"),
          edit
          ? m(".edit", // When in edit mode.
              m("div",
                {className: "edit-cols index-" + catalogKeys.indexOf(edit.catalogKey)},
                // List of catalog items as radio buttons.
                m("ul.catalogItems", catalogKeys.map((k, i) => {
                  var v = catalog[k];
                  return m("li.index-" + i,
                    m("label",
                      m(".labelInput",
                        m("input[type=radio][name=catalogKey]",
                          {id: 'catalogKey-' + k,
                           value: i,
                           checked: k == edit.catalogKey,
                           onchange: (e) => {
                             if (e.target.checked) {
                               edit.catalogKey = k;
                               edit.cbConfigDict = cbConfigDictFill(
                                 edit.cbConfig, catalog, k, edit.cbConfigDict);
                             }
                             return true;
                           }})),
                      m(".labelMain",
                        m(".catalogItemName", v.name),
                        m(".catalogItemDesc", v.desc),
                        m("ul.catalogItemDesc",
                          v.descList.map((f) => m("li", f))))));
                })),
                // Matching list of edit panels, one per catalog item,
                // which will be hidden/shown based on the currently
                // selected catalog item.
                m("ul.edit-panels", catalogKeys.map((k, i) => {
                  var v = catalog[k];
                  var d = edit.cbConfigDict;
                  return m("li.index-" + i,
                    m(".catalogItemName",
                      m.trust(v.name.replace(", with ", ",<br>with "))),
                    Object.keys(v.cbConfigDict).map((ak) => {
                      return m(".fields",
                        Object.keys(v.cbConfigDict[ak].spec).map((s) => {
                          if (s.startsWith('^')) {
                            return;
                          }
                          var ms = '^' + s;
                          var mspec = v.cbConfigDict[ak].spec[ms] || {};
                          var type = typeof(v.cbConfigDict[ak].spec[s]) == "boolean" ? "checkbox" : "input";
                          var kaks = k + ":" + ak + ":" + s;
                          return m('label[for="' + kaks + '"]',
                            (mspec.label || s) + ": ",
                            m('span.err',
                              ((d[ak].spec[ms] || {}).errs || []).join('. ')),
                            m('input[type=' + type + ']', {
                              id: kaks,
                              className: s,
                              oninput: (e) => {
                                if (e.target.type == "checkbox") {
                                  d[ak].spec[s] = e.target.checked;
                                } else {
                                  d[ak].spec[s] = e.target.value;
                                }

                                specCheck(d[ak].spec, s, v.cbConfigDict[ak].spec);
                              },
                              checked: d[ak].spec[s],
                              value: d[ak].spec[s] || "",
                              placeholder: mspec.placeholder || "",
                            }),
                            m('.desc', mspec.desc ||
                              (mspec.placeholder && ("Example: " + mspec.placeholder))));
                        }));
                      }));
                })),
                m("style",
                  catalogKeys.map((k, i) => {
                    return ".x .cluster-config .edit .edit-cols.index-" + i +
                           " > ul.catalogItems li.index-" + i +
                           " { background-color: #f4f4f4; }" +
                           ".x .cluster-config .edit .edit-cols.index-" + i +
                           " > ul.edit-panels li.index-" + i +
                           " { display: block; }";
                  }).join(" "))),
              m(".controls",
                m("button.ui.button.green",
                  {onclick: editSubmit}, "Submit"),
                m("button.ui.button.red",
                  {onclick: () => { edit = null; }}, "Cancel")))

          // When in view mode.
          : m(".view",
              m(".catalogItemName", catalog[curr.catalogKey].name),
              m(".pane",
                m(".catalogItemDesc", catalog[curr.catalogKey].desc),
                m("ul.catalogItemDesc",
                  catalog[curr.catalogKey].descList.map(
                    (f) => m("li", f))),
                m(".fields",
                  Object.keys(catalog[curr.catalogKey].cbConfigDict).map((ak) =>
                    Object.keys(catalog[curr.catalogKey].cbConfigDict[ak].spec).map((s) => (
                      !s.startsWith('^') &&
                      m("div",
                        s + ": " + (curr.cbConfigDict &&
                                    curr.cbConfigDict[ak] &&
                                    curr.cbConfigDict[ak].spec &&
                                    curr.cbConfigDict[ak].spec[s]))
                    ))))),
              m(".controls",
                m("button.ui.button",
                  {onclick: editStart}, "Modify"))));
      }
    };

    m.mount(el, ClusterConfig);
  }
});
