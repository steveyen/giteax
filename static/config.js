// Functions for handling cbConfig's with catalog metadata, and which
// are implemented be usable in the browser or server-side (e.g.,
// favor using vanilla JS).

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

// Returns a 'cbConfigDict' object initially populated
// by cbConfig, but also filled in with other default
// values from the catalog metadata.
function cbConfigDictFill(cbConfig, catalog, catalogKeyOpt, dOpt) {
  var d = dOpt || {}; // Keyed by "apiVersion:kind".

  if (!dOpt) {
    cbConfig.forEach((c) => {
      d[(c.apiVersion || "") + ":" + (c.kind || "")] = c;
    });
  }

  Object.keys(catalog).forEach((ck) => {
    if (catalogKeyOpt && catalogKeyOpt != ck) {
      return;
    }

    var cv = catalog[ck];

    Object.keys(cv.cbConfigDict).forEach((ak) => {
      d[ak] ||= {};
      d[ak].spec ||= {};

      var spec = cv.cbConfigDict[ak].spec;

      Object.keys(spec).forEach((s) => {
        if (!s.startsWith('^')) {
          if (typeof(d[ak].spec[s]) == "undefined") {
            d[ak].spec[s] ||= spec[s];
          }

          specCheck(d[ak].spec, s, spec);
        }
      });
    });
  });

  return d;
}

// -----------------------------------------------------------

// Retrieves a cbConfig from a cbConfigDict, driven
// from the metadata from a catalog and a catalogKey.
function cbConfigDictTake(cbConfigDict, catalog, catalogKey) {
  var d = {};

  Object.keys(catalog[catalogKey].cbConfigDict).forEach((ak) => {
    d[ak] = Object.assign(d[ak] || {}, cbConfigDict[ak] || {});
  });

  return Object.keys(d).map((ak) => {
    var o = JSON.parse(JSON.stringify(d[ak]));

    var akp = ak.split(':');

    o.apiVersion ||= akp[0];
    o.kind ||= akp[1];

    if (o.spec) {
      Object.keys(o.spec).forEach((k) => {
        if (k.startsWith('^')) {
          delete o.spec[k];
        }
      });
    }

    return o;
  })
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
  }
};

function specCheck(spec, key, specCatalog) {
  var mkey = '^' + key;

  delete spec[mkey];

  Object.keys(specCatalog[mkey] || {}).forEach((k) => {
    var check = specChecks[k];
    if (check) {
      check(spec, key, specCatalog[mkey]);
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
