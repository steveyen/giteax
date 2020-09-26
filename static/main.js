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

        console.log("xmain ready... done");

        return;
      }
    }
  }

  document.body.className = document.body.className + " x-none";

  console.log("xmain ready... done (disabled)");
});
