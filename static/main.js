console.log("xmain start");

Object.assign(window, CBConfig);

$(document).ready(async () => {
  console.log("xmain ready...");

  var ff = document.querySelector(".ui.container .fork-flag");
  if (ff && ff.innerText.indexOf("generated from") < 0) {
    ff.style.display = "block";
  }

  // If we're on the right repo file list page, in the right state,
  // then hide the repo file list behind a checkbox / toggle, and then
  // load the cluster-config UI panel.
  //
  // Example baseURI == "http://localhost:8090/steve/cluster-2".
  var href = window.location.href;
  var hrefParts = href.split('/');
  if (hrefParts.length >= 5 &&
      hrefParts.length <= 6) {
    var csEl = document.getElementById("xClusterStatus");
    if (csEl) {
      csEl.addEventListener("click",
        () => clusterStatusUI(window.location.pathname, csEl));
    }

    var rt = document.getElementById("repo-files-table") &&
             document.getElementById("repo-topics");
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
        var el = document.createElement("div");
        el.className = "x";
        el.innerHTML = tmpl.innerHTML;

        rt.parentElement.insertBefore(el, rt.nextSibling);

        fetchBranchFile(href,
          'master', 'cb-config.yaml', cbConfigYaml => {
            onCbConfigFetched(cbConfigYaml);
          });

        console.log("xmain ready... done");

        return; // Success.
      }
    }
  }

  // Else if we're on the file edit page in /x/initFile mode...
  var pathname = window.location.pathname;
  if (pathname.startsWith("/x/initFile/")) {
    var form = document.querySelector(".ui.container .ui.edit.form");
    if (form) {
      form.action = pathname.slice("/x/initFile".length);

      var t = document.getElementById("xInitFile");
      if (t) {
        function updateEditor() {
          if (window.codeEditors &&
              window.codeEditors.length > 0 &&
              window.codeEditors[0].setValue) {
            window.codeEditors[0].setValue(t.innerHTML);

            console.log("xmain ready... xInitFile done");

            return;
          }

          setTimeout(updateEditor, 100);
        }

        setTimeout(updateEditor, 300);
      }
    }
  }

  if (pathname == "/repo/create") {
    var rt = document.getElementById("repo_template");
    var cb = document.querySelector('.repository.new.repo form.ui.form .ui.checkbox input.hidden[name=git_content][type=checkbox]');
    if (cb && rt && !rt.value) {
      // NOTE: This needs repo id, not repo name.
      var repo_template_id = "1";

      rt.value = repo_template_id;

      cb.checked = true;

      console.log("xmain ready... repo/create default template id: " + repo_template_id);
    }
  }

  // Fall-thru on errors to disabling the UI 'x' extensions.

  document.body.className = document.body.className + " x-none";

  console.log("xmain ready... skipped");

  // -----------------------------------------------------------

  function fetchBranchFile(baseURI, branch, file, callback) {
    fetch(baseURI + '/raw/branch/' + branch + '/' + file)
    .then(response => response.text())
    .then(callback);
  }

  // -----------------------------------------------------------

  function onCbConfigFetched(cbConfigYaml) {
    var cbConfig = {};

    if (cbConfigYaml &&
        cbConfigYaml.length > 0 &&
        !cbConfigYaml.startsWith("<!DOCTYPE html>")) {
      cbConfig = jsyaml.safeLoad(cbConfigYaml);
    }

    fetch('/x/static/catalog.yaml')
    .then(response => response.text())
    .then(catalogYaml => {
      var catalog = jsyaml.safeLoad(catalogYaml);

      fetch('/x/static/gen-cluster.yaml')
      .then(response => response.text())
      .then(templateYaml => {
        var template = jsyaml.safeLoadAll(templateYaml);

        var el = document.getElementById("cluster-config");
        if (el) {
          cbConfigUI(cbConfig, catalog, template, el);
        };
      });
    });
  }

  // -----------------------------------------------------------

  // Populate the el with UI for cbConfig viewing & editing.
  function cbConfigUI(cbConfig, catalog, template, el) {
    var curr = cbConfigInit(cbConfig);

    curr = cbCatalogCheck(curr, catalog);
    if (!curr || !curr.item) {
      m.render(el,
        m("h3", "Cluster Config (not from catalog)"),
        m("pre", jsyaml.dump(curr)));

      return;
    }

    curr.optionsDict = cbConfigOptionsDictFill(curr, catalog);

    var itemKeys = Object.keys(catalog.items);

    var edit;

    function editStart() {
      edit = JSON.parse(JSON.stringify(curr));

      edit.optionsDict = cbConfigOptionsDictFill(edit, catalog);

      setTimeout(function() {
        document.getElementById('itemKey-' + curr.item)
          .parentElement.parentElement.parentElement
          .scrollIntoView();
      }, 200);
    }

    function editHasErrors(edit) {
      for (const g of (catalog.items[edit.item] || {}).options) {
        var dg = edit.optionsDict[g.group] || {};
        for (var s of Object.keys(g)) {
          if (s.startsWith('^') || s == "group") {
            continue;
          }
          if ((dg['^' + s] || {}).errs) {
            return true;
          }
        }
      }
      return false;
    }

    function editSubmit() {
      var next = JSON.parse(JSON.stringify(edit));

      next.options = cbConfigOptionsDictTake(
         next.optionsDict, catalog, next.item);

      delete next.optionsDict;

      var f = document.createElement("form");

      f.style = "display: none;";
      f.method = "get";
      f.action = "/x/initFile" + window.location.pathname + "/_edit/master/cb-config.yaml";
      f.innerHTML =
        document.querySelector('input[name=_csrf]').outerHTML +
        '<textarea name="xInitFile">' + jsyaml.safeDump(next) + '</textarea>';

      document.body.appendChild(f);

      f.submit();
    }

    var ClusterConfig = {
      view: function() {
        return m("div",
          edit
          ? m(".edit", // When in edit mode.
              m("h3", "Cluster Config (edit)"),
              m("div",
                {className: "edit-cols index-" + itemKeys.indexOf(edit.item)},

                // List of catalog items as radio buttons.
                m("ul.catalogItems", itemKeys.map((k, i) => {
                  var v = catalog.items[k];

                  return m("li.index-" + i,
                    m("label",
                      m(".labelInput",
                        m("input[type=radio][name=itemKey]",
                          {id: 'itemKey-' + k,
                           value: i,
                           checked: k == edit.item,
                           onchange: (e) => {
                             if (e.target.checked) {
                               edit.item = k;
                               edit.optionsDict = cbConfigOptionsDictFill(
                                 edit, catalog, edit.optionsDict);
                             }
                             return true;
                           }})),
                      m(".labelMain",
                        m(".catalogItemName",
                          m.trust(v.name.replace(", with ", ",<br>with "))),
                        m(".catalogItemDesc", v.desc),
                        m("ul.catalogItemDesc",
                          v.descList.map((f) => m("li", f))),
                        m(".catalogItemKey", k))));
                })),

                // Matching list of edit panels, one per catalog item,
                // which will be hidden/shown based on the currently
                // selected catalog item.
                m("ul.edit-panels", itemKeys.map((k, i) => {
                  var v = catalog.items[k];
                  var d = edit.optionsDict;

                  return m("li.index-" + i,
                    m(".catalogItemName",
                      m.trust(v.name.replace(", with ", ",<br>with "))),

                    m(".descShort", v.descShort),

                    v.options.map((g) => {
                      d[g.group] ||= {};

                      var dg = d[g.group];

                      return m(".fields",
                        Object.keys(g).map((s) => {
                          if (s.startsWith('^') || s == "group") {
                            return;
                          }

                          var ms = '^' + s;
                          var mspec = g[ms] || {};
                          var kgs = k + ":" + g.group + ":" + s;
                          var errs = (dg[ms] || {}).errs || [];
                          var type = typeof(g[s]) == "boolean" ? "checkbox" : "input";

                          return m('label[for="' + kgs + '"]',
                            {className: (k + ' ' + g.group + ' ' + s + ' ' +
                                         (errs.length > 0 ? " errs" : ""))
                                        .replaceAll('.', '_').replaceAll(':', '_').replaceAll('/', '_')},
                            (mspec.label || s) + ": ",
                            m('span.err', errs.join('. ')),
                            m('input[type=' + type + ']', {
                              id: kgs,
                              className: s,
                              oninput: (e) => {
                                if (e.target.type == "checkbox") {
                                  dg[s] = e.target.checked;
                                } else {
                                  dg[s] = e.target.value;
                                }

                                specCheck(dg, s, g);
                              },
                              checked: dg[s],
                              value: dg[s] || "",
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
                  {onclick: editSubmit, disabled: editHasErrors(edit)},
		  "Configure Next Step"),
                m("button.ui.button.red",
                  {onclick: () => { edit = null; }}, "Cancel")))

          // When in view mode.
          : m(".view",
              m("h3", "Cluster Config"),
              m(".catalogItemName", catalog.items[curr.item].name),
              m(".catalogItemKey", curr.item),
              m(".pane",
                m(".catalogItemDesc", catalog.items[curr.item].desc),
                m("ul.catalogItemDesc",
                  catalog.items[curr.item].descList.map(
                    (f) => m("li", f))),
                m("table.fields",
                  catalog.items[curr.item].options.map((g) =>
                    Object.keys(g).map((s) => (
                      !s.startsWith('^') && s != "group") &&
                      m("tr",
                        m("td.field", s + ":"),
                        m("td.label", (g['^' + s] || {}).label),
                        m("td.value",
                          curr.optionsDict &&
                          curr.optionsDict[g.group] &&
                          curr.optionsDict[g.group][s]))))),
                m(".gen-cluster",
                  m("input[type=checkbox]", {id: "showGenCluster"}),
                  m("label[for=showGenCluster]", "Show generated-cluster.yaml"),
                  m("pre.gen-cluster",
                    genTemplateYaml(curr, catalog, template)),
                  m("pre.usage",
                    "Example generated-cluster.yaml usage...\n\n",
                    "  To create a cluster:\n",
                    "    kubectl create -f generated-cluster.yaml\n\n",
                    "  To update a cluster:\n",
                    "    kubectl replace -f generated-cluster.yaml\n"))),
              m(".controls",
                m("button.ui.button",
                  {onclick: editStart}, "Modify Config"))));
      }
    };

    m.mount(el, ClusterConfig);
  }

  // -----------------------------------------------------------

  function genTemplateYaml(curr, catalog, template) {
     var path = window.location.pathname;

     var sha = (document.querySelector(
       ".repository .commit-list .sha .shortsha") || {})
       .innerText || "";

     return cbConfigGen(curr, catalog, template, path, sha)
       .map((v) => jsyaml.dump(v)).join("\n---\n");
  }

  // -----------------------------------------------------------

  // Populate the el with UI for cbConfig viewing & editing.
  function clusterStatusUI(pathname, csEl) {
    var active = document.querySelector(
      ".ui.tabs.container .ui.tabular.navbar .item.active");
    if (active) {
      active.className = active.className.replace("active", "");
    }

    csEl.className += " active";

    var uc = document.querySelector(".repository > .ui.container");
    if (uc) {
      if (pathname.split('/').length > 3) {
        pathname = pathname.split('/').slice(0, 3).join('/');
      }

      uc.innerHTML = "loading cluster status: " + pathname;

      fetch("/x/cluster/status" + pathname)
      .then(response => response.json())
      .then((data) => {
        console.log(data);

        var ClusterStatus = {
          view: function() {
            return m("div",
              m("pre", JSON.stringify(data)));
          }
        };

        m.mount(uc, ClusterStatus);
      });
    }
  }
});
