console.log("xmain start");

$(document).ready(async () => {
  console.log("xmain ready");

  var rt = document.getElementById("repo-topics");
  var tmpl = document.getElementById("template-cluster-config");
  if (rt && tmpl) {
    el = document.createElement("div");
    el.innerHTML = tmpl.innerHTML;

    rt.parentElement.insertBefore(el, rt.nextSibling);
  }
});
