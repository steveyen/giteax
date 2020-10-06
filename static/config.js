// Functions for handling cbConfig's with catalog metadata, and which
// are implemented be usable in the browser or server-side (e.g.,
// favor using environment-independent vanilla JS).
//
// Example cb-config.yaml file...
//
//   item: ez-learn.couchbase/v1
//   options:
//     - group: ez.couchbase/v1
//       nodes: 1

// -----------------------------------------------------------

function cbConfigInit(cbConfig) {
  cbConfig = JSON.parse(JSON.stringify(cbConfig));

  if (typeof(cbConfig) != "object") {
    return null;
  }

  cbConfig ||= {};

  cbConfig.item ||= "ez-learn.couchbase/v1";

  cbConfig.options ||= [];

  if (cbConfig.options.length <= 0) {
    cbConfig.options.push({});
  }

  if (cbConfig.options.length > 0) {
    var g = cbConfig.options[0];

    g.group ||= "ez.couchbase/v1";
    g.nodes ||= 1;
  }

  return cbConfig;
}

// -----------------------------------------------------------

function cbCatalogCheck(cbConfig, catalog) {
  if (!catalog.items[cbConfig.item]) {
    return null;
  }

  return cbConfig;
}

// -----------------------------------------------------------

// Returns an optionsDict initially populated by cbConfig, but also
// filled in with other default values from the catalog metadata.
function cbConfigOptionsDictFill(cbConfig, catalog, outOpt) {
  var out = outOpt || {}; // Keyed by group.

  if (!outOpt) {
    (cbConfig.options || []).forEach((g) => {
      out[g.group] = Object.assign(out[g.group] || {}, g);
    });
  }

  ((catalog.items[cbConfig.item] || {}).options || [])
    .forEach((g) => {
      out[g.group] ||= {};

      Object.keys(g).forEach((s) => {
        if (!s.startsWith('^')) {
          if (typeof(out[g.group][s]) == "undefined") {
            out[g.group][s] ||= g[s];
          }

          specCheck(out[g.group], s, g);
        }
      });
    });

  return out;
}

// -----------------------------------------------------------

// Retrieves a cbConfig.options from a optionsDict, driven
// from the metadata from a catalog and a itemKey.
function cbConfigOptionsDictTake(optionsDict, catalog, itemKey) {
  var d = {};

  ((catalog.items[itemKey] || {}).options || []).forEach((g) => {
    d[g.group] = Object.assign(d[d.group] || {}, optionsDict[g.group] || {});
  });

  return Object.keys(d).map((group) => {
    var g = JSON.parse(JSON.stringify(d[group]));

    Object.keys(g).forEach((s) => {
      if (s.startsWith('^')) {
        delete g[s];
      }
    });

    g.group ||= group;

    return g;
  })
}

// -----------------------------------------------------------

function cbConfigToCAO(curr, catalog, cao) {
  return cao; // TODO.
}

// -----------------------------------------------------------

var specChecks = {
  range: function(spec, key, meta) {
    var parts = meta.range.split("..");

    var haveInt = checkInt(spec[key]);
    var wantInt = checkInt(parts[0]) || checkint(parts[1]);
    if (wantInt != haveInt) {
      return specErr(spec, key, "invalid type");
    }

    var f = wantInt ? parseInt : (x) => x;

    if (f(spec[key]) < f(parts[0])) {
      return specErr(spec, key, "invalid range: " + meta.range);
    }

    if (f(spec[key]) > f(parts[1])) {
      return specErr(spec, key, "invalid range: " + meta.range);
    }
  },

  mdsSpecMax: function(spec, key, meta) {
    if (!spec[key]) {
      return;
    }

    var mdsSpecMax = parseInt(meta.mdsSpecMax) || 1;

    var nodes = spec[key].split(';');
    if (nodes.length > mdsSpecMax) {
      return specErr(spec, key, "too many additional nodes > " + mdsSpecMax);
    }

    var mdsSpecAllow = Object.fromEntries(
      meta.mdsSpecAllow.split(',').map((s) => [s, true]));

    nodes.forEach((node) => {
      node.split(',').forEach((s) => {
        if (!mdsSpecAllow[s.trim()]) {
          specErr(spec, key, "unknown service: " + s.trim());
        }
      });
    });
  }
}

function specCheck(spec, key, specMeta) {
  var mkey = '^' + key;

  delete spec[mkey];

  Object.keys(specMeta[mkey] || {}).forEach((k) => {
    var checkFun = specChecks[k];
    if (checkFun) {
      checkFun(spec, key, specMeta[mkey]);
    }
  });
}

function specErr(spec, key, msg) {
  var mkey = '^' + key;

  spec[mkey] ||= {};
  spec[mkey].errs ||= [];
  spec[mkey].errs.push(msg);
}

function checkInt(s) {
  return parseInt(s).toString() == s;
}
