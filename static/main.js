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
    if (!curr || !curr.itemKey) {
      m.render(el, [
        m("h3", "Cluster Config (not from catalog)"),
        m("pre", jsyaml.dump(cbConfig)),
      ]);

      return;
    }

    curr.cbConfigDict = cbConfigDictFill(curr.cbConfig, catalog);

    var itemKeys = [];
    for (var k in catalog.items) {
      itemKeys.push(k);
    }

    var edit;

    function editStart() {
      edit = JSON.parse(JSON.stringify(curr));
      edit.cbConfigDict = cbConfigDictFill(edit.cbConfig, catalog);

      setTimeout(function() {
        document.getElementById('itemKey-' + curr.itemKey)
          .parentElement.parentElement.parentElement
          .scrollIntoView();
      }, 200);
    }

    function editSubmit() {
      curr = JSON.parse(JSON.stringify(edit));

      curr.cbConfig = cbConfigDictTake(
         curr.cbConfigDict, catalog, curr.itemKey);

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
                {className: "edit-cols index-" + itemKeys.indexOf(edit.itemKey)},
                // List of catalog items as radio buttons.
                m("ul.catalogItems", itemKeys.map((k, i) => {
                  var v = catalog.items[k];
                  return m("li.index-" + i,
                    m("label",
                      m(".labelInput",
                        m("input[type=radio][name=itemKey]",
                          {id: 'itemKey-' + k,
                           value: i,
                           checked: k == edit.itemKey,
                           onchange: (e) => {
                             if (e.target.checked) {
                               edit.itemKey = k;
                               edit.cbConfigDict = cbConfigDictFill(
                                 edit.cbConfig, catalog, k, edit.cbConfigDict);
                             }
                             return true;
                           }})),
                      m(".labelMain",
                        m(".catalogItemName",
                          m.trust(v.name.replace(", with ", ",<br>with "))),
                        m(".catalogItemDesc", v.desc),
                        m("ul.catalogItemDesc",
                          v.descList.map((f) => m("li", f))))));
                })),
                // Matching list of edit panels, one per catalog item,
                // which will be hidden/shown based on the currently
                // selected catalog item.
                m("ul.edit-panels", itemKeys.map((k, i) => {
                  var v = catalog.items[k];
                  var d = edit.cbConfigDict;
                  return m("li.index-" + i,
                    m(".catalogItemName",
                      m.trust(v.name.replace(", with ", ",<br>with "))),
                    m(".descShort", v.descShort),
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
                          var errs = (d[ak].spec[ms] || {}).errs || [];
                          return m('label[for="' + kaks + '"]',
                            {className: (k + ' ' + ak + ' ' + s + ' ' +
                                         (errs.length > 0 ? " errs" : ""))
                                        .replaceAll('.', '_').replaceAll(':', '_').replaceAll('/', '_')},
                            (mspec.label || s) + ": ",
                            m('span.err', errs.join('. ')),
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
                            }),
                            m('.desc', mspec.desc));
                        }));
                      }));
                })),
                m("style",
                  itemKeys.map((k, i) => {
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
              m(".catalogItemName", catalog.items[curr.itemKey].name),
              m(".pane",
                m(".catalogItemDesc", catalog.items[curr.itemKey].desc),
                m("ul.catalogItemDesc",
                  catalog.items[curr.itemKey].descList.map(
                    (f) => m("li", f))),
                m(".fields",
                  Object.keys(catalog.items[curr.itemKey].cbConfigDict).map((ak) =>
                    Object.keys(catalog.items[curr.itemKey].cbConfigDict[ak].spec).map((s) => (
                      !s.startsWith('^') &&
                      m("div",
                        s + ": " + (curr.cbConfigDict &&
                                    curr.cbConfigDict[ak] &&
                                    curr.cbConfigDict[ak].spec &&
                                    curr.cbConfigDict[ak].spec[s]))
                    )))),
                m("pre.raw", JSON.stringify(curr, null, 1))),
              m(".controls",
                m("button.ui.button",
                  {onclick: editStart}, "Modify"))));
      }
    };

    m.mount(el, ClusterConfig);
  }
});
