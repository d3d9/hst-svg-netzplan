function svgValidate() {
    let ignoreClasses = ["transl", "leaflet-drag-target", "stop-backdrop-popup-open", "animate-flicker", "stoptext-popup-open", "fil0", "fil1", "deps-container-grid", "deps-headercell", "deps-nr", "deps-ziel", "deps-abfahrt", "lineblob-svg", "lineblob-g", "linenr-flex", "bottom-flex", "bottom-buttons", "bottom-icons", "lds-ring", "center-in-deps"];
    let knownClasses = {
        "stop": ["rect", "g", "path"],
        "stoptext": ["text"],
        "route": ["path"],
        "linetext": ["text", "g"],
        "lineblob": ["g"],
        "infotext": ["text", "path", "g", "rect"],
        "bficon": ["g"]
    };
    let ignoreTagnamesOnlyLineid = ["path"];
    let knownData = {
        "lineid": ["stoptext",
                   "route", "linetext", "lineblob", "infotext"],
        "stopid": ["stoptext", "stop", /* noch nicht verwendet: */ "lineblob", "infotext"],
        "onlyLineid": ["stop"]
    };
    let ignoreData = ["oldLatLng"];

    console.log("closing any open popups . . .");
    mymap.closePopup();

    allElems = $(svg).find("*");

    console.info("looking for unknown classes");
    var found_classes = new Set();
    elems_with_class = [];
    allElems.each(function(i, obj) {
        if (obj.classList.length > 0) {
            obj.classList.forEach(function(_c){
                if (!ignoreClasses.includes(_c)) {
                    found_classes.add(_c);
                    if (!(_c in knownClasses) && !_c.startsWith("_gen")) {
                        console.log("unknown class '"+ _c + "' on object", obj);
                    }
                    else {
                        if (elems_with_class.indexOf(obj) == -1) {
                            elems_with_class.push(obj);
                        }
                    }
                }
            });
        }
    });
    // console.info("all found classes: ", found_classes);

    console.info("looking for not matching class<->tagName");
    elems_with_class.forEach(function(obj) {
        if (obj.classList.length > 0) {
            obj.classList.forEach(function(_c){
                if (_c in knownClasses && !knownClasses[_c].includes(obj.tagName)) {
                    console.log("not matching tagName '" + obj.tagName + "' together with class '"+ _c + "' on object", obj);
                }
            });
        }
    });

    console.info("looking for class=stop without data-stopid");
    $('.stop:not([data-stopid])').each(function(i, obj) {console.log("class=stop and no data-stopid on object", obj)});

    console.info("looking for class=stoptext without data-stopid or data-lineid");
    $('.stoptext:not([data-stopid])').each(function(i, obj) {console.log("class=stoptext and no data-stopid on object", obj)});
    $('.stoptext:not([data-lineid])').each(function(i, obj) {console.log("class=stoptext and no data-lineid on object", obj)});

    console.info("looking for class=route without data-lineid");
    $('.route:not([data-lineid])').each(function(i, obj) {console.log("class=route and no data-lineid on object", obj)});

    console.info("looking for class=linetext without data-lineid");
    $('.linetext:not([data-lineid])').each(function(i, obj) {console.log("class=linetext and no data-lineid on object", obj)});

    console.info("looking for class=lineblob without data-lineid");
    $('.lineblob:not([data-lineid])').each(function(i, obj) {console.log("class=lineblob and no data-lineid on object", obj)});

    console.info("looking for class=infotext without data-lineid");
    $('.infotext:not([data-lineid])').each(function(i, obj) {console.log("class=infotext and no data-lineid on object", obj)});

    console.info("looking for unknown data attributes or data attributes with not matching class");
    $("*").filter(function(i, obj) {
        for (var _k in obj.dataset) { return true; }
        return false;
    }).each(function(i, obj){
        for (var i in obj.dataset) {
            if (ignoreData.includes(i)) { continue; }
            if (!(i in knownData)) {
                console.log("unknown dataset attribute '" + i + "' for object", obj);
            }
            else {
                if (!knownData[i].some(function(_tClass) { return obj.classList.contains(_tClass); })) {
                    console.log("object ", obj, " with data attribute '" + i + "' does not match any of the classes in ", knownData[i]);
                }
            }
        }
    });

    console.info("looking for stopids used at more than 1 stoptext");
    var found_stoptext_stopids = {};
    $('.stoptext[data-stopid]').each(function(i, obj) {
        if (obj.dataset.stopid in found_stoptext_stopids) {
            console.log("stopid '" + obj.dataset.stopid + "' already found at stoptext objects:", found_stoptext_stopids[obj.dataset.stopid]);
            found_stoptext_stopids[obj.dataset.stopid].push(obj);
        }
        else {
            found_stoptext_stopids[obj.dataset.stopid] = [obj];
        }
    });

    console.info("looking for unknown stopids in data-stopid");
    allIFOPTs = Object.keys(hstNetzplanStops);
    $('[data-stopid]').each(function(i, obj) {
        if (!allIFOPTs.includes(obj.dataset.stopid)) {
            console.log("unknown IFOPT " + obj.dataset.stopid + " for ", obj);
        }
    });

    console.info("looking for unknown line numbers in data-lineid");
    $('[data-lineid]').each(function(i, obj) {
        let liniennummern = (typeof obj.dataset.lineid == "undefined" || obj.dataset.lineid == "") ? [] : obj.dataset.lineid.split(";");
        liniennummern.forEach(function(value) {
            if (!(value in hstNetzplanLines)) {
                console.log("unknown line number " + value + " for ", obj);
            }
        });
    });

    console.info("stopids that do not appear in data-stopid at any stoptext:");
    let _foundSet = new Set(Object.keys(found_stoptext_stopids));
    let _targetSet = new Set(allIFOPTs);
    console.log(new Set([..._targetSet].filter(x => !_foundSet.has(x))));


    var found_stop_stopids = {};
    $('.stop[data-stopid]').each(function(i, obj) {
        if (ignoreTagnamesOnlyLineid.includes(obj.tagName)) {
            return;
        }
        if (obj.dataset.stopid in found_stop_stopids) {
            found_stop_stopids[obj.dataset.stopid].push(obj);
        }
        else {
            found_stop_stopids[obj.dataset.stopid] = [obj];
        }
    });

    console.info("stopids that do not appear in data-stopid at any stop:");
    let _foundStopSet = new Set(Object.keys(found_stop_stopids));
    console.log(new Set([..._targetSet].filter(x => !_foundStopSet.has(x))));

    console.info("looking for stops that should have data-only-lineid but do not or that do not have matching values for their stoptexts' data-lineid");
    for (var stopid in found_stop_stopids) {
        if (found_stop_stopids[stopid].length > 1) {
            let all_only = [];
            let _c_stops = [];
            let _c_stoptext = $('.stoptext[data-stopid="'+stopid+'"]')[0];
            let target_all_only = _c_stoptext.dataset.lineid;
            found_stop_stopids[stopid].forEach(function(obj) {
                // noch nötig?:
                if (ignoreTagnamesOnlyLineid.includes(obj.tagName)) {
                    return;
                }
                _c_stops.push(obj);
                if(!obj.dataset.onlyLineid) {
                    console.log("no data-only-lineid for stop ", obj);
                }
                else {
                    all_only.push(obj.dataset.onlyLineid);
                }
            });
            let sorted_all_only = new Set(all_only.join(";").split(";"));
            let sorted_target = new Set(target_all_only.split(";"));
            if (!(Array.from(sorted_all_only).sort().join(";") == Array.from(sorted_target).sort().join(";"))) {
                console.log("stop data-only-lineid values do not match data-lineid for stoptext ", _c_stoptext, "relevant stop objects: ", _c_stops);
            }
        }
    }
}
