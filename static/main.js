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
    var catalogItem = cbConfigCatalogValidate(cbConfig, catalog);
    if (!catalogItem) {
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
      edit = JSON.parse(JSON.stringify(cbConfig[0]));
    }

    function editSubmit() {
      cbConfig[0] = edit;
      edit = null;
    }

    var ClusterConfig = {
      view: function() {
        return m("div", [
          m("h3", "Cluster Config"),
          edit
          ? m(".edit", [
              m("ul", catalogKeys.map((k) => {
                return m("li",
                         m("label", [
                           m("input[type=radio][group=catalogItem]",
                             {selected: k == catalogItem}),
                           m("span", catalog[k].name),
                           m("span", catalog[k].desc),
                         ]));
              })),
              m(".fields", [
                m("label", {forHtml: "nodes"}, [
                  "nodes: ",
                  m("input", {type: "input", name: "nodes",
                              oninput: (e) => {
                                edit.spec.nodes = e.target.value;
                              },
                              value: edit.spec.nodes}),
                ]),
              ]),
              m(".controls", [
                m("button", {onclick: editSubmit}, "submit"),
                m("button", {onclick: () => { edit = null; }}, "cancel"),
              ]),
            ])
          : m(".view", [
              m(".catalogItemName", catalog[catalogItem].name),
              m(".catalogItemDesc", catalog[catalogItem].desc),
              m(".fields", [
                m("label", "nodes: " + cbConfig[0].spec.nodes),
              ]),
              m(".controls", [
                m("button", {onclick: editStart}, "edit"),
              ]),
            ]),
        ]);
      }
    };

    m.mount(el, ClusterConfig);
  }

  // -----------------------------------------------------------

  function cbConfigCatalogValidate(cbConfig, catalog) {
    if (cbConfig.length == 1 &&
        catalog[cbConfig[0].apiVersion] &&
        cbConfig[0].spec &&
        cbConfig[0].spec.nodes > 0) {
      return cbConfig[0].apiVersion;
    }

    return null;
  }
});
