var mymap = null;
var svgLayer = null;
var htmlLegend = null;
var svg = null;
var NS = null;

var svg_icon_nort = null;
var svg_icon_p_r = null;
var svg_icon_radbox = null;

var svgElementBounds = [ [ 51.43, 7.827 ], [ 51.23, 7.382 ] ];
var popupPanPadding = L.point(45, 50);

var useHash = true;

var stops_to_transl = {};
var transl_cache = {};

var lines_open = [];
var next_lines_open = [];

var stop_open = null;
var next_stop_open = null;

var _mm_prevc = {'x': 0, 'y': 0};
var _mm_currc = {'x': 0, 'y': 0};
var _mm_maxdelta = 30;

var DraggablePopup = DraggablePopupMixin(L.Popup);

function noDrag(popup, elem, cursor = true) {
    if (typeof popup._draggable == "undefined") return;

    let upFn = function() { popup._draggable.enable(); };
    let downFn = function() { popup._draggable.disable(); };

    elem.addEventListener("mouseup", upFn);
    elem.addEventListener("touchend", upFn);
    elem.addEventListener("touchcancel", upFn);
    elem.addEventListener("pointerup", upFn);

    elem.addEventListener("mousedown", downFn);
    elem.addEventListener("touchstart", downFn);
    elem.addEventListener("pointerdown", downFn);

    // elem.addEventListener("selectstart", );

    //if (elem.tagName.toUpperCase() != "A" && !elem.style.cursor) {
    if (cursor && !elem.style.cursor) {
        elem.style.cursor = "auto";
    }
    //}
}

/*
function panAtL(point) {
    //mymap.fitBounds(svgElementBounds);
    let anchorLL = mymap.containerPointToLatLng(point);

    panF = function() { mymap.panTo(anchorLL); };

    if (mymap.getZoom() == 14) {
        panF();
    }
    else {
        mymap.setZoom(14);
        mymap.once("zoomend", panF);
    }
}
*/

function createLineBlob(line, size) {
    svgElem = document.createElementNS(NS, 'svg');
    svgElem.classList.add('lineblob-svg');
    //let bWidth = size * 2 + 8.3;
    //let bHeight = size + 3.8;
    let bWidth = size * 2 + 4.3;
    let bHeight = size + 1.3;
    //let bWidth = size * 2;
    //let bHeight = size;
    //svgElem.setAttributeNS(null, 'viewbox', "0 0 " + bWidth + " " + bHeight);
    svgElem.setAttributeNS(null, 'width', bWidth + 2);
    svgElem.setAttributeNS(null, 'height', bHeight + 2);
    rect = document.createElementNS(NS, 'rect');
    rect.setAttributeNS(null, 'x', 0);
    rect.setAttributeNS(null, 'y', 0);
    _rectR = (line.startsWith("S") && !line.startsWith("SB") && !line.startsWith("SEV")) ? (size / 1.777777) : (size / 7)
    rect.setAttributeNS(null, 'rx', _rectR);
    rect.setAttributeNS(null, 'ry', _rectR);
    rect.setAttributeNS(null, 'width', bWidth);
    rect.setAttributeNS(null, 'height', bHeight);
    rect.style.cssText = "opacity:1;fill-opacity:1;stroke:none;stroke-width:5;stroke-linecap:round;stroke-miterlimit:4;stroke-dasharray:none;stroke-dashoffset:0;stroke-opacity:1";
    rect.style.fill = line in hstNetzplanLines ? hstNetzplanLines[line].bg : "#000";
    text = document.createElementNS(NS, 'text');
    text.setAttributeNS(null, 'x', bWidth / 2);
    text.setAttributeNS(null, 'y', bHeight / 2);
    text.setAttributeNS(null, 'width', bWidth);
    text.setAttributeNS(null, 'height', bHeight);
    text.style.cssText = "dominant-baseline: central;font-style:normal;font-variant:normal;font-weight:bold;font-stretch:normal;line-height:1;font-family:'Fira Sans';text-align:center;letter-spacing:0px;word-spacing:0px;writing-mode:lr-tb;text-anchor:middle;fill-opacity:1;stroke:none;stroke-width:1px;stroke-linecap:butt;stroke-linejoin:miter;stroke-opacity:1";
    text.style["font-size"] = size + "px";
    text.style.fill = line in hstNetzplanLines ? hstNetzplanLines[line].fg : "#fff";
    text.innerHTML = line;
    g = document.createElementNS(NS, 'g');
    g.classList.add("lineblob-g");
    g.appendChild(rect);
    g.appendChild(text);
    svgElem.appendChild(g);
    return svgElem;
}

function updateDepListe(depcontainer, elements) {
    $(depcontainer).children().not(".deps-headercell").remove();
    while (elements.length) {
        depcontainer.appendChild(elements.shift());
    }
}

function updateDepLoading(deps) {
    let elems = [document.createElement('div')];
    elems[0].classList.add("lds-ring");
    elems[0].classList.add("center-in-deps");
    elems[0].innerHTML = "<div></div><div></div><div></div><div></div>";
    updateDepListe(deps, elems);
}

function popupFail(popup, popupDiv, deps, _ajax) {
    let elems = [document.createElement('div'), document.createElement('div')];
    elems[0].innerHTML = "Daten konnten nicht geladen werden.";
    elems[0].classList.add("center-in-deps");
    elems[1].classList.add("center-in-deps");
    var neuladenSpan = document.createElement('span');
    neuladenSpan.innerHTML = "Neu laden";
    neuladenSpan.style["text-decoration"] = "underline";
    neuladenSpan.style.color = "blue";
    neuladenSpan.style.cursor = "pointer";
    neuladenSpan.addEventListener('click', function(e) {
        updateDepLoading(deps);
        popup.update();
        popup._xhr = $.ajax(_ajax);
    });
    elems[1].appendChild(neuladenSpan);
    updateDepListe(deps, elems);
    popup.update();
}

function getOldCoordinates(stopid) {
    var stoptext = $('.stoptext[data-stopid="'+stopid+'"]')[0];
    let _latLng = null;
    if (!!stoptext.dataset.oldLatLng) {
        let _a = stoptext.dataset.oldLatLng.split(';');
        _latLng = L.latLng(parseFloat(_a[0]), parseFloat(_a[1]));
    }
    return _latLng;
}

function getLowerCenter(map, padding) {
    let paddedBounds = map.getBounds().pad(padding);
    let center = paddedBounds.getCenter();
    center.lat = paddedBounds.getSouth();
    return center;
}

function updateDeps(popup, popupDiv, deps, stopid) {
    return $.ajax({
        type: "GET",
        url: "https://d3d9.xyz/stops/?stopid=" + stopid,
        headers: {},
        retryLimit : 3,
        success: function(result) {
            let elems = [];
            try {
                let deplist = result;
                let noDepsShown = true;
                let sumH = 0;
                for (var di = 0; di < deplist.length; di++) {
                    let _nr = document.createElement('div');
                    _nr.classList.add("deps-nr");
                    let _ziel = document.createElement('div');
                    _ziel.classList.add("deps-ziel");
                    let _abf = document.createElement('div');
                    _abf.classList.add("deps-abfahrt");

                    let dep = deplist[di];
                    if (dep.linenum.length > 4) {
                        _nr.innerHTML = dep.linenum;
                    } else {
                        let lineblob = createLineBlob(dep.linenum, 22);
                        let lineblob_g = lineblob.firstChild;
                        if (dep.linenum in hstNetzplanLines) {
                            lineblob_g.style.cursor = "pointer";
                            lineblob_g.addEventListener('click', function(cE) {
                                //linesClicked(cE, [dep.linenum], stopid);
                                linesClicked(null, [dep.linenum], stopid);
                            });
                        }
                        _nr.appendChild(lineblob);
                    }

                    _ziel.innerHTML = dep.disp_direction;
                    if (dep.earlytermination) {
                        _ziel.innerHTML += " (!)";
                        _ziel.classList.add("earlyterm");
                        _ziel.dataset.tooltip = "lt. Fahrplan bis " + dep.direction_planned;
                        _ziel.setAttribute("aria-haspopup", true);
                        if (di == 0) _ziel.classList.add("tooltip-bottom");
                    }
                    if (dep.disp_countdown <= 60 || dep.realtime) {
                        let _d = new Date(dep.deptime_planned);
                        let _uhrzString = _d.getHours().toString().padStart(2, '0') + ":" + _d.getMinutes().toString().padStart(2, '0');
                        _abf.dataset.tooltip = "lt. Fahrplan " + _uhrzString;
                        _abf.setAttribute("aria-haspopup", true);
                        if (dep.realtime && !dep.cancelled) {
                            _abf.dataset.tooltip += ", heute " + (dep.delay ? ((dep.delay > 0 ? "+" : "") + dep.delay) : "pünktlich");
                        }
                    }
                    if (dep.disp_countdown <= 0){ 
                        _abf.innerHTML = "sofort";
                        _abf.style["font-size"] = "larger";
                    }
                    else if (dep.disp_countdown <= 60) {
                        _abf.innerHTML = dep.disp_countdown + " <span style='font-size: medium;'>min</span>";
                    }
                    else {
                        let _d = new Date(dep.deptime);
                        _abf.innerHTML = _d.getHours().toString().padStart(2, '0') + ":" + _d.getMinutes().toString().padStart(2, '0');
                    }
                    if (di == 0 && _abf.dataset.tooltip) _abf.classList.add("tooltip-bottom");

                    if (dep.realtime) {
                        if (dep.delay <= 2) {
                            _abf.style.color = "green";
                        }
                        else if (dep.delay <= 6) {
                            _abf.style.color = "#ff6600";
                        }
                        else {
                            _abf.style.color = "red";
                        }
                        if (dep.cancelled) {
                            _abf.style.color = "red";
                            _abf.innerHTML = "f&auml;llt aus";
                            _abf.style["font-size"] = "larger";
                            _ziel.classList.add("deps-ziel-ausfall");
                        }
                    }
                    else {
                        let noRtSymbol = svg_icon_nort.cloneNode(true);
                        _abf.prepend(noRtSymbol);
                        _abf.style.color = "#333333";
                    }
                    elems.push(_nr);
                    elems.push(_ziel);
                    elems.push(_abf);
                    updateDepListe(deps, elems.slice());
                    if (di <= 4) {
                        let _maxH = Math.max(_nr.scrollHeight, _ziel.scrollHeight, _abf.scrollHeight);
                        sumH += _maxH;
                        // 35 und 2: siehe style 1. row, row-gap
                        if (di == 4) {
                            deps.style["height"] = sumH + 35 + 2*(di+1);
                        }
                    }
                    noDepsShown = false;
                    // jetzt serverseitig: if (di >= 4 && dep.disp_countdown > 120) break;
                }
                if (noDepsShown) {
                    elems.push(document.createElement('div'));
                    elems[0].classList.add("center-in-deps");
                    elems[0].style["padding"] = "10px";
                    elems[0].style["font-size"] = "larger";
                    elems[0].innerHTML = "Keine Abfahrten in den n&auml;chsten 24 Stunden";
                    updateDepListe(deps, elems);
                }
            }
            catch(error) {
                console.error(error, result);
                popupFail(popup, popupDiv, deps, this);
                return;
            }
            // updateDepListe(deps, elems);
            // ^ wird nun oben gemacht
            popup.update();
            // console.log(result);
        },
        error: function(jqXHR, textStatus, errorThrown) {
            if (textStatus == 'timeout') {
                this.retryLimit--;
                if (this.retryLimit) {
                    popup._xhr = $.ajax(this);
                    return;
                }            
                return;
            }
            popupFail(popup, popupDiv, deps, this);
            console.error("Daten konnten nicht geladen werden.", jqXHR, textStatus, errorThrown);
        }
    });
}

function stopClicked(e, stopid) {
    var stoptext = $('.stoptext[data-stopid="'+stopid+'"]')[0];
    /*
    let point = $("#svg2")[0].createSVGPoint();
    // console.log(stoptext.getBBox());
    point.x = stoptext.getBBox().x + stoptext.getBBox().width / 2;
    point.y = stoptext.getBBox().y + stoptext.getBBox().height / 2;
    // console.log(point);
    let target = point.matrixTransform(stoptext.getCTM());
    // console.log(stoptext.getScreenCTM());
    // console.log(point.matrixTransform(stoptext.getScreenCTM()));
    // console.log(stoptext.getCTM());
    // console.log(target);
    let coords = mymap.layerPointToLatLng(target);
    // console.log(coords);
    */

    popupDiv = document.createElement('div');
    titleSpan = document.createElement('span');
    titleSpan.innerHTML = "Haltestelleninformationen<br/>" + hstNetzplanStops[stopid].name;
    titleSpan.classList.add("popupheader");
    popupDiv.appendChild(titleSpan);
    popupDiv.insertAdjacentHTML('beforeend', "<hr style='margin-top: 0.1em; margin-bottom: 0.1em;' />");

    var deps = document.createElement('div');
    deps.classList.add("deps-container-grid");
    let _l = document.createElement('span');
    _l.classList.add("deps-headercell");
    _l.innerHTML = "Linie";
    deps.appendChild(_l);
    _z = _l.cloneNode();
    _z.innerHTML = "Ziel";
    _z.style["text-align"] = "unset";
    deps.appendChild(_z);
    _a = _l.cloneNode();
    _a.innerHTML = "Abfahrt";
    deps.appendChild(_a);

    updateDepLoading(deps);

    popupDiv.appendChild(deps);

    let liniennummern = (typeof stoptext.dataset.lineid == "undefined" || stoptext.dataset.lineid == "") ? [] : stoptext.dataset.lineid.split(";");
    // liniennummern.sort();
    popupDiv.insertAdjacentHTML('beforeend', "<hr style='margin-top: 0.1em; margin-bottom: 0.2em;' />");
    var wrapperDiv = document.createElement('div');
    wrapperDiv.style.cssText = "display: flex; white-space: pre; flex-flow: row nowrap; justify-content: center; font-size: large;";
    var linienSpan = document.createElement('span');
    linienSpan.innerHTML = "Linie" + (liniennummern.length == 1 ? "" : "n") + ": ";
    wrapperDiv.appendChild(linienSpan);
    var linenrFlex = document.createElement('div');
    linenrFlex.classList.add("linenr-flex");
    let noLinesShown = true;
    liniennummern.forEach(function(liniennr) {
        noLinesShown = false;
        let lineblob = createLineBlob(liniennr, 15);
        lineblob.firstChild.style.cursor = "pointer";
        lineblob.firstChild.addEventListener('click', function(cE) {
            //linesClicked(cE, [liniennr], stopid);
            // temporär. später zum filtern verwenden
            linesClicked(null, [liniennr], stopid);
        });
        linenrFlex.appendChild(lineblob);
    });
    if (noLinesShown) {
        linenrFlex.insertAdjacentHTML('beforeend', "keine");
    }
    wrapperDiv.appendChild(linenrFlex);
    popupDiv.appendChild(wrapperDiv);
    popupDiv.insertAdjacentHTML('beforeend', "<hr style='margin-top: 0.1em; margin-bottom: 0.1em;' />");

    var bottomFlex = document.createElement('div');
    bottomFlex.classList.add("bottom-flex");

    var bottomFlexButtons = document.createElement('div');
    bottomFlexButtons.classList.add('bottom-buttons');

    var popup;

    var bottomAktualisieren = document.createElement('span');
    bottomAktualisieren.innerHTML = "Aktualisieren";
    bottomAktualisieren.addEventListener('click', function(e) {
        popup._xhr.abort();
        updateDepLoading(deps);
        popup.update();
        popup._xhr = updateDeps(popup, popupDiv, deps, stopid);
    });
    bottomFlexButtons.appendChild(bottomAktualisieren);

    var bottomLinienHervorheben = document.createElement('span');
    bottomLinienHervorheben.innerHTML = "Linien hervorheben";
    bottomLinienHervorheben.addEventListener('click', function(e) {
        linesClicked(null, liniennummern, stopid);
    });
    bottomFlexButtons.appendChild(bottomLinienHervorheben);

    if (hstNetzplanStops[stopid].umgebung) {
        var bottomUmgebungsplan = document.createElement('a');
        bottomUmgebungsplan.innerHTML = "Umgebungsplan";
        bottomUmgebungsplan.href = hstNetzplanStops[stopid].umgebung;
        bottomUmgebungsplan.target = "_blank";
        bottomFlexButtons.appendChild(bottomUmgebungsplan);
    }

    var bottomFlexIcons = document.createElement('div');
    bottomFlexIcons.classList.add('bottom-icons');

    if (hstNetzplanStops[stopid].p_r) {
        bottomFlexIcons.appendChild(svg_icon_p_r.cloneNode(true));
    }
    if (hstNetzplanStops[stopid].radbox) {
        bottomFlexIcons.appendChild(svg_icon_radbox.cloneNode(true));
    }

    bottomFlex.appendChild(bottomFlexButtons);
    bottomFlex.appendChild(bottomFlexIcons);
    popupDiv.appendChild(bottomFlex);

    next_lines_open = [];
    next_stop_open = stopid;

    let _latLng = null;
    let _hasTip = true;
    if (e == null) {
        _latLng = getOldCoordinates(stopid);
        if (!_latLng) {
            _latLng = getLowerCenter(mymap, -0.4);
            _hasTip = false;
        }
    }
    else {
        if (!!e._savedLatLng) {
            _latLng = e._savedLatLng;
        }
        else {
            console.warn("no e._savedLatLng here");
            _latLng = mymap.mouseEventToLatLng(e);
        }
        stoptext.dataset.oldLatLng = _latLng.lat + ';' + _latLng.lng;
    }

    popup = new DraggablePopup({'autoPanPadding': popupPanPadding, 'className': "popup-line" + (_hasTip ? "" : " no-tip")}, svgLayer).setLatLng(_latLng).setContent(popupDiv).openOn(mymap);
    noDrag(popup, titleSpan);
    noDrag(popup, deps);
    noDrag(popup, linienSpan);
    noDrag(popup, linenrFlex);
    for (var i = 0; i < bottomFlexButtons.children.length; i++) {
        noDrag(popup, bottomFlexButtons.children[i], false);
    }
    for (var i = 0; i < bottomFlexIcons.children.length; i++) {
        noDrag(popup, bottomFlexIcons.children[i]);
    }
    popup._xhr = updateDeps(popup, popupDiv, deps, stopid);
}

function highlightStop(stopid) {
    var stoptext = $('.stoptext[data-stopid="'+stopid+'"]')[0];
    stoptext.classList.add('stoptext-popup-open');
    for (var i = 0; i < stoptext.childNodes.length; i++) {
        stoptext.childNodes[i].classList.add('stoptext-popup-open');
    }

    $('.stop[data-stopid="'+stopid+'"]').each(function(i, obj) {
        let nodeToClone = obj;
        let prependTo = obj.parentNode;
        if (obj.tagName.toUpperCase() == "G") {
            if (obj.getAttribute("transform")) prependTo = obj;
            for (var i = 0; i < obj.childNodes.length; i++) {
                // beim bearbeiten beachten: z. B. (g -> hauptobjekt, (g -> nebenobjekte)); nebenobjekte sind z. b. das innere des bahn logos oder die linienendepunkte.
                if (typeof obj.childNodes[i].tagName != "undefined" && obj.childNodes[i].tagName.toUpperCase() != "G") {
                    nodeToClone = obj.childNodes[i];
                    break;
                }
            }
        }
        let newNode = nodeToClone.cloneNode();
        newNode.id += "-backdrop";
        newNode.dataset.stopid = stopid;
        newNode.style = "";
        while(newNode.classList.length) { newNode.classList.remove(newNode.classList[0]); }
        newNode.classList.add('stop-backdrop-popup-open');
        newNode.classList.add('animate-flicker');
        prependTo.prepend(newNode);
    });
}

function highlightLines(lines) {
    if (lines.some(l => !(l in stops_to_transl))) { console.warn("can't highlight/transl for:", lines); return; }

    Array.prototype.forEach.call(svg.querySelectorAll('.route, .linetext, .lineblob, .infotext'), obj => {
        _thatLines = obj.dataset.lineid.split(";");
        if (!(lines.some(l => _thatLines.includes(l)))) {
            obj.classList.add("transl");
            return;
        }
    });

    if (lines in transl_cache) {
        transl_cache[lines].forEach(obj => obj.classList.add("transl"));
    }
    else {
        stoplists = [];
        lines.forEach(l => { stoplists.push([...stops_to_transl[l]]); });
        // https://stackoverflow.com/a/51874332
        let to_transl = stoplists.reduce((a, b) => a.filter(c => b.includes(c)));
        to_transl.forEach(obj => obj.classList.add("transl"));
        transl_cache[lines] = to_transl;
    }
}

function linesClicked(e, lines, stopid, prevlines) {
    var pContent = document.createElement('div');

    let titleSpan = document.createElement('span');
    titleSpan.innerHTML = "Linieninformationen";
    titleSpan.classList.add("popupheader");
    pContent.appendChild(titleSpan);
    // pContent.insertAdjacentHTML('beforeend', "<br/>Linie" + (lines.length > 1 ? "n" : "") + ": ");
    pContent.insertAdjacentHTML('beforeend', "<hr style='margin-top: 0.1em; margin-bottom: 0.1em;' />");

    let blobs = {};
    lines.forEach(l => {
        blobs[l] = createLineBlob(l, 22);
        blobs[l].style.verticalAlign = "middle";
    });

    let lineinfoTop = document.createElement('div');
    lineinfoTop.classList.add("lineinfo-top-container");
    let _added = false;

    lines.forEach(l => {
        let linediv = document.createElement('div');
        linediv.classList.add("lineinfo-container");

        linediv.insertAdjacentHTML('beforeend', "<span style='font-weight: bold'>Linie </span>");
        let newBlob = blobs[l].cloneNode(true);
        if (lines.length > 1) {
            newBlob.firstChild.style.cursor = "pointer";
            newBlob.firstChild.addEventListener('click', function(cE) {
                linesClicked(e, [l], stopid, lines);
            });
        }
        linediv.appendChild(newBlob);

        if (l in hstNetzplanLines) {
            if (!!hstNetzplanLines[l].info) {
                linediv.appendChild(document.createElement('br'));
                let infoLink = document.createElement('a');
                infoLink.innerHTML = "Informationen & Neuerungen";
                infoLink.href = hstNetzplanLines[l].info;
                infoLink.target = "_blank";
                linediv.appendChild(infoLink);
            }
            if (!!hstNetzplanLines[l].pdf) {
                linediv.appendChild(document.createElement('br'));
                let pdfLink = document.createElement('a');
                pdfLink.innerHTML = "PDF-Fahrplan herunterladen";
                pdfLink.href = hstNetzplanLines[l].pdf;
                pdfLink.target = "_blank";
                linediv.appendChild(pdfLink);
            }
        }

        lineinfoTop.appendChild(linediv);
        lineinfoTop.insertAdjacentHTML('beforeend', "<hr style='margin-top: 0.1em; margin-bottom: 0.1em;' />");
        _added = true;
    });
    if (_added) lineinfoTop.removeChild(lineinfoTop.lastChild);

    pContent.appendChild(lineinfoTop);
    pContent.insertAdjacentHTML('beforeend', "<hr style='margin-top: 0.1em; margin-bottom: 0.1em;' />");

    var bottomFlex = document.createElement('div');
    bottomFlex.classList.add("bottom-flex");

    var bottomFlexButtons = document.createElement('div');
    bottomFlexButtons.classList.add('bottom-buttons');


    if (!!prevlines && prevlines.length) {
        var bottomZurueck = document.createElement('span');
        bottomZurueck.innerHTML = "zur&uuml;ck";
        bottomZurueck.addEventListener('click', function(cE) {
            linesClicked(e, prevlines, stopid);
        });
        bottomFlexButtons.appendChild(bottomZurueck);
    }
    else if (!!stopid) {
        var bottomZurueck = document.createElement('span');
        bottomZurueck.innerHTML = "zur&uuml;ck";
        bottomZurueck.addEventListener('click', function(e) {
            stopClicked(null, stopid);
        });
        bottomFlexButtons.appendChild(bottomZurueck);
    }

    var bottomFlexIcons = document.createElement('div');
    bottomFlexIcons.classList.add('bottom-icons');
    bottomFlex.appendChild(bottomFlexButtons);
    bottomFlex.appendChild(bottomFlexIcons);
    pContent.appendChild(bottomFlex);

    next_lines_open = lines;
    let _hasTip = !((e == null) || (typeof stopid != "undefined"));
    let _latLng = null;
    if (e == null) {
        if (!!stopid) {
            _latLng = getOldCoordinates(stopid);
        }
        if (!_latLng) {
            _latLng = getLowerCenter(mymap, -0.4);
        }
    }
    else {
        if (!!e._savedLatLng) {
            _latLng = e._savedLatLng;
        }
        else {
            console.warn("no e._savedLatLng");
            _latLng = mymap.mouseEventToLatLng(e);
        }
    }
    popup = new DraggablePopup({'autoPanPadding': popupPanPadding, 'className': "popup-line" + (_hasTip ? "" : " no-tip")}, svgLayer).setLatLng(_latLng).setContent(pContent).openOn(mymap);
    noDrag(popup, titleSpan);
    noDrag(popup, lineinfoTop);
    for (var i = 0; i < bottomFlexButtons.children.length; i++) {
        noDrag(popup, bottomFlexButtons.children[i], false);
    }
    for (var i = 0; i < bottomFlexIcons.children.length; i++) {
        noDrag(popup, bottomFlexIcons.children[i]);
    }
}

function deltaMoves(obj) {
    obj.addEventListener('mousedown', function(e) { _mm_prevc = {'x': e.pageX, 'y': e.pageY }; });
    obj.addEventListener('mouseup', function(e) { _mm_currc = {'x': e.pageX, 'y': e.pageY }; });
    obj.addEventListener('click', function(e) {
        if (Math.hypot((_mm_prevc.x-_mm_currc.x), (_mm_prevc.y-_mm_currc.y)) > _mm_maxdelta) {
            e.stopImmediatePropagation();
        }
    });
}

function prepareSvg(svg, NS) {
    deltaMoves($('#_hst-logo')[0]);
    $('#_hst-logo').click(function(e){ window.open('http://www.strassenbahn-hagen.de/', '_blank'); e.stopPropagation(); });
    $('#_hst-logo').css("cursor", "pointer");

    let _stoptextLines = {};
    let _allStoptext = svg.querySelectorAll('.stoptext');
    let _allStop = svg.querySelectorAll('.stop');

    $('.closepopup').each(function(i, obj) {
        deltaMoves(obj);
        obj.addEventListener('click', function(e) {
            mymap.closePopup();
            htmlLegend.close();
        });
    });

    $('.stop, .stoptext').each(function(i, obj) {
        deltaMoves(obj);
        obj.addEventListener('click', function(e) {
            e.stopPropagation();
            htmlLegend.close();
            e._savedLatLng = mymap.mouseEventToLatLng(e);
            stopClicked(e, obj.dataset.stopid);
        });
        if (obj.classList.contains("stoptext")) _stoptextLines[obj.dataset.stopid] = obj.dataset.lineid.split(";");
    });

    $('.route, .linetext, .lineblob, .infotext').each(function(i, obj) {
        deltaMoves(obj);
        obj.addEventListener('click', function(e) {
            e.stopPropagation();
            htmlLegend.close();
            e._savedLatLng = mymap.mouseEventToLatLng(e);
            linesClicked(e, obj.dataset.lineid.split(";"));
        });

        if (!obj.dataset.lineid) { return true; }
        let lines = obj.dataset.lineid.split(";");
        lines.forEach(line => {
            if (!(line in stops_to_transl)) {
                stops_to_transl[line] = new Set();
                Array.prototype.forEach.call(_allStoptext, obj => {
                    if (!_stoptextLines[obj.dataset.stopid].includes(line)) {
                        stops_to_transl[line].add(obj);
                    }
                });
                Array.prototype.forEach.call(_allStop, obj => {
                    if (!!obj.dataset.onlyLineid) {
                        let _onlyLines = obj.dataset.onlyLineid.split(";");
                        if (!_onlyLines.includes(line)) {
                            stops_to_transl[line].add(obj);
                        }
                        return;
                    }
                    if (obj.tagName.toUpperCase() == "PATH") {
                        if ($('.stop[data-stopid="'+obj.dataset.stopid+'"]').not('.stop[data-only-lineid]').length == 2) {
                            // Normal weiter machen.
                            // Damit Linien wie bei Loxbaum oder Schwenke ausgeblendet sind (else)
                            // , aber so etwas wie Gwbpk. Kückelh. ganz normal behandelt wird.
                        }
                        else {
                            stops_to_transl[line].add(obj);
                            return;
                        }
                    }
                    if (!_stoptextLines[obj.dataset.stopid].includes(line)) {
                        stops_to_transl[line].add(obj);
                        return;
                    }
                });
            }
        });
    });
}

function createIcons() {
    svg_icon_nort = document.createElementNS(NS, 'svg');
    svg_icon_nort.style["z-index"] = "unset !important";
    svg_icon_nort.style["margin-right"] = "3px";
    svg_icon_nort.style["vertical-align"] = "middle";
    svg_icon_nort.style.overflow = "visible";
    svg_icon_nort.setAttributeNS(null, 'viewBox', "0 0 6.59 7.1314");
    svg_icon_nort.setAttributeNS(null, 'width', 12);
    svg_icon_nort.setAttributeNS(null, 'height', 12);
    svg_icon_nort.innerHTML = '<title>keine Echtzeitdaten</title><g transform="translate(-174.73 -71.829)"><circle transform="rotate(-39.917)" cx="86.11" cy="170.56" r=".70993" fill="#808080"/><path d="m176.88 74.403c0.4143 0.4952 0.60221 1.4245 6e-3 2.2152" fill="none" stroke="#808080" stroke-dashoffset="2.3992" stroke-linecap="round" stroke-linejoin="round"/><path transform="rotate(-39.917)" d="m89.538 170.56a3.4275 3.4275 0 0 1-2.5404 3.3107" fill="none" stroke="#808080" stroke-dashoffset="2.3992" stroke-linecap="round" stroke-linejoin="round"/><path transform="rotate(-39.917)" d="m91.142 170.56a5.0311 5.0311 0 0 1-3.729 4.8597" fill="none" stroke="#808080" stroke-dashoffset="2.3992" stroke-linecap="round" stroke-linejoin="round"/><path d="m175.74 73.011 4.57 4.647" fill="none" stroke="#f00" stroke-linecap="round" stroke-width="2"/></g></svg>';

    svg_icon_p_r = document.createElementNS(NS, 'svg');
    svg_icon_p_r.setAttributeNS(null, 'viewBox', "0 0 420 310");
    svg_icon_p_r.setAttributeNS(null, 'height', 25);
    svg_icon_p_r.innerHTML = '<title>Park & Ride</title><g><path inkscape:connector-curvature="0" id="path19965" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none" d="m 167.63067,141.54153 25.8997,0 1e-5,-25.16992 26.00567,0.1392 0.0423,25.03072 25.8661,0 0,27.11064 -25.8661,0 -0.0732,24.95042 -26.00803,-0.12502 0.0333,-24.8254 -25.8997,0 0,-27.11064 z"/><path inkscape:connector-curvature="0" id="path19064" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none" d="m 5.512072,48.727788 408.444538,0 c 0,-21.395279 -13.41734,-40.3549618 -34.17485,-44.6477827 l -340.094842,0 C 18.118605,8.0937678 5.512072,27.384364 5.512072,48.727788 z"/><path inkscape:connector-curvature="0" id="path19953" style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none" d="m 5.3958333,261.4762 408.4445367,0 c 0,21.39527 -13.41734,40.35496 -34.17485,44.64778 l -340.094841,0 C 18.002366,302.11021 5.3958333,282.81962 5.3958333,261.4762 z"/><path style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none" d="M 75.28125 59.65625 C 64.147271 59.725711 51.392608 60.344106 40.15625 60.40625 L 11.59375 60.40625 L 11.59375 249.15625 L 40.15625 249.15625 L 40.15625 175.90625 L 91.25 175.90625 C 167.83233 159.69982 152.91903 67.948175 92.875 60.375 C 88.056204 59.767218 81.961637 59.614573 75.28125 59.65625 z M 40.15625 88.34375 L 88.375 88.34375 C 119.30205 99.387283 123.75144 132.89055 90.84375 147.53125 L 40.15625 147.53125 L 40.15625 88.34375 z " id="path20852"/><path style="fill:#000000;fill-opacity:1;fill-rule:evenodd;stroke:none" d="M 276.5625 60.5 L 276.5625 249.4375 L 305.25 249.53125 L 305.25 168.28125 L 341.28125 168.28125 L 380.9375 249.4375 L 414.53125 249.4375 L 372.40625 166.4375 C 418.36245 148.44411 424.15934 77.011747 361.71875 60.71875 L 305.25 60.71875 L 305.25 60.5 L 276.5625 60.5 z M 305.25 86.8125 L 355.78125 86.8125 C 390.55581 97.308098 384.96281 130.8609 357.3125 142.78125 L 305.25 142.78125 L 305.25 86.8125 z " id="path22626"/></g>';

    svg_icon_radbox = document.createElementNS(NS, 'svg');
    svg_icon_radbox.setAttributeNS(null, 'viewBox', "0 0 146.64 123.42");
    svg_icon_radbox.setAttributeNS(null, 'height', 25);
    svg_icon_radbox.innerHTML = '<title>"DeinRadschloss"-Fahrradbox</title><g transform="translate(-1.5186 -172.55)" fill="none" stroke="#000"><circle cx="33.986" cy="269.98" r="22.015" stroke-linejoin="round" stroke-width="7.9375"/><circle cx="115.69" cy="269.98" r="22.015" stroke-linejoin="round" stroke-width="7.9375"/><g stroke-linecap="round" stroke-width="7.9375"><path d="m34.067 270 14.699-48.527c0.84185-3.1418 3.6657-4.6474 6.917-4.6474h8.8624"/><path d="m82.672 270 14.699-48.527"/><path d="m87.751 220.61h19.67"/></g><path d="m47.252 230.98h47.122l22.156 40.421h-38.368z" stroke-linejoin="round" stroke-width="7.9375"/><path d="m8.2148 218.72 66.624-38.541 66.624 38.39" stroke-linecap="round" stroke-width="13.229"/></g>';
}

document.addEventListener('DOMContentLoaded', function() {
    svg = document.getElementById('svg2'),
    NS = svg.getAttribute('xmlns');

    mymap = L.map('mapcontainer', {
        center: [51.35, 7.5],
        zoom: 12,
        minZoom: 10,
        maxZoom: 16,
        maxBoundsViscosity: 0.8,
        maxBounds: L.latLngBounds(svgElementBounds).pad(0.2),
        zoomSnap: 0,
        closePopupOnClick: false,
        attributionControl: false,
        tapTolerance: 1
    });
    mymap.spin(true);

    prepareSvg(svg, NS);
    createIcons();

    svg.parentNode.removeChild(svg);
    svgLayer = new L.svgOverlay(svg, svgElementBounds, { "interactive": true });
    svgLayer.addTo(mymap);

    var miniMap = new L.Control.MiniMap(new L.ImageOverlay("./images/thumb.png", svgLayer.getBounds()), {
        position:'bottomright',
        autoToggleDisplay: true,
        toggleDisplay: true,
        thumbnailBounds: svgLayer.getBounds(),
        width: 180,
        height: 130,
        //centerFixed: svgLayer.getBounds().getCenter(),
        zoomLevelFixed: 9
        //zoomLevelOffset: -5
    });
    miniMap.addTo(mymap);

    htmlLegend = L.control.htmllegend({
        legends: [{
            name: 'Informationen',
            layer: null,
            elements: [{
                label: null,
                html: ('<h2>Der interaktive Netzplan der Hagener Straßenbahn!</h2><br/><br/>'
                     + 'Erkunden Sie das Netz und besorgen Sie sich die Infos, die Sie brauchen.<br/>'
                     + 'Nahezu alle Objekte auf dem Plan sind anklickbar: die Haltestellen, Liniennummern und -strecken, sowie Texte.'
                     // + '<br/><emph>Probieren Sie es aus!</emph>'
                     + '<hr/><img src="./images/screenshot-click.png"/><br/>'
                     + 'Im Fenster mit Linieninformationen finden Sie einen Link zu unserer Website mit den aktuellsten Hinweisen zu der entsprechenden Linie, z.B. den Änderungen zum letzten Fahrplanwechsel, und einen interaktiven Linienfahrplan.'
                     + '<hr/>Beim Klick auf eine Haltestelle oder ihren Namen erhalten Sie die nächsten Abfahrten ab dieser Haltestelle angezeigt, sowie eine Angabe aller Linien, die dort halten.<br/>'
                     + '<img src="./images/screenshot-stop.png"/><br/>'
                     + 'Bei Klick/Ber&uuml;hrung der Abfahrtsangabe wird die Uhrzeit sowie ggf. auch die Versp&auml;tung dargestellt.<br/>'
                     // + 'Bei Klick auf "Linien hervorheben" werden alle Linien, die diese Haltestelle bedienen, hervorgehoben, so erkennen Sie schnell die dortigen Direktverbindungen.<br/>'
                     // + '[Sie können sich ebenfalls einen Aushang wie von der echten Haltestelle gewohnt im PDF-Format ausdrucken.] Bei großen Haltestellen finden Sie hier auch die Haltestellenumgebungspläne im PDF-Format. Ebenfalls sind im Fenster die Liniennummern anklickbar (siehe Abschnitt hierunter).<br/>[Screenshot Linie angeklickt (einzeln)]<br/>'
                     + '<hr/>Auf <a target="_blank" href="https://www.strassenbahn-hagen.de/fahrplaene-strecken/liniennetzplaene-tag-und-nachtnetz.html">dieser</a> Seite k&ouml;nnen Sie sich die Netzpl&auml;ne im PDF-Format herunterladen.<br/>'
                     + 'Unter <a target="_blank" href="https://www.xn--mehr-fr-hagen-1ob.de/">mehr-f&uuml;r-hagen.de</a> gibt es weitere Informationen zum neuen Netz der HST.<br/>'
                     + '<br/><hr/><small>Programmierung: <a target="_blank" href="https://d3d9.xyz/">Kevin Arutyunyan</a> | <a target="_blank" href="https://github.com/d3d9/hst-svg-netzplan">Projektseite</a></small>'
                     + '<br/><small>Netzplan: Simon Schreckenberg | <a target="_blank" href="https://www.strassenbahn-hagen.de/">Hagener Straßenbahn AG</a></small><br/><br/>'
                ),
                style: null
            }]
        }],
        position: 'topright',
        collapseSimple: false,
        collapsedOnInit: window.innerWidth < 1200,
        defaultOpacity: 0.7,
        visibleIcon: 'icon icon-eye',
        hiddenIcon: 'icon icon-eye-slash'
    });
    htmlLegend.close = function() {
        let header = this._container.firstChild.firstChild;
        L.DomUtil.addClass(header, 'closed');
    };
    htmlLegend.open = function() {
        let header = this._container.firstChild.firstChild;
        if (L.DomUtil.hasClass(header, 'closed')) {
            L.DomUtil.removeClass(header, 'closed');
        }
    }
    mymap.addControl(htmlLegend);

    let boxmessage = mymap._container.dataset.msg;
    if (!!boxmessage) {
        let msgbox = L.control.messagebox().addTo(mymap);
        msgbox.show(boxmessage);
    }

    let zentrierenIconHTML = '<svg style="width: 100%; height: 100%;" width="3.0606mm" height="3.0857mm" version="1.1" viewBox="0 0 3.0606 3.0857" xmlns="http://www.w3.org/2000/svg"><g transform="translate(2.5226 .68005)"><path transform="rotate(45 -1.5702 .27236)" d="m-0.9393 0.27236-0.94636 0.54638v-0.54638-0.54638l0.47318 0.27319z"/><rect transform="rotate(45)" x="-2.1831" y="1.1066" width="1.2988" height=".39255" rx=".19628" ry=".19628"/><g transform="matrix(-1 0 0 1 -1.9846 0)"><path transform="rotate(45 -1.5702 .27236)" d="m-0.9393 0.27236-0.94636 0.54638v-0.54638-0.54638l0.47318 0.27319z"/><rect transform="rotate(45)" x="-2.1831" y="1.1066" width="1.2988" height=".39255" rx=".19628" ry=".19628"/></g><g transform="matrix(1 0 0 -1 0 1.7256)"><path transform="rotate(45 -1.5702 .27236)" d="m-0.9393 0.27236-0.94636 0.54638v-0.54638-0.54638l0.47318 0.27319z"/><rect transform="rotate(45)" x="-2.1831" y="1.1066" width="1.2988" height=".39255" rx=".19628" ry=".19628"/></g><g transform="rotate(180 -.99231 .86278)"><path transform="rotate(45 -1.5702 .27236)" d="m-0.9393 0.27236-0.94636 0.54638v-0.54638-0.54638l0.47318 0.27319z"/><rect transform="rotate(45)" x="-2.1831" y="1.1066" width="1.2988" height=".39255" rx=".19628" ry=".19628"/></g></g></svg>';
    L.easyButton(zentrierenIconHTML, function(btn, map){
        map.fitBounds(svgElementBounds);
    }).addTo(mymap);

    mymap.on('popupopen', function(pE) {
        if (next_lines_open.length > 0) {
            if (useHash) window.location.hash = "line:" + next_lines_open.join(";");

            highlightLines(next_lines_open);

            lines_open = next_lines_open;
            next_lines_open = [];
        }
        if (!!next_stop_open) {
            if (useHash) window.location.hash = "stop:" + next_stop_open;

            highlightStop(next_stop_open);

            stop_open = next_stop_open;
            next_stop_open = null;
        }
    });

    mymap.on('popupclose', function(pE) {
        if (lines_open.length > 0) {
            if (lines_open.length == next_lines_open.length && lines_open.every(l => (next_lines_open.includes(l)))) {
                next_lines_open = [];
            }
            else {
                lines_open = [];

                $('.transl').removeClass('transl');

                if (useHash) window.location.hash = "";
            }
        }
        if (!!stop_open) {
            // abort wird jetzt immer gemacht; ist aber nur im unteren else noetig wenn man das popup nur "verschiebt" und nicht neu macht (todo?).
            pE.popup._xhr.abort();
            if (stop_open == next_stop_open) {
                next_stop_open = null;
            }
            else {
                var stoptext = $('.stoptext[data-stopid="'+stop_open+'"]')[0];
                stoptext.classList.remove('stoptext-popup-open');
                for (var i = 0; i < stoptext.childNodes.length; i++) {
                    stoptext.childNodes[i].classList.remove('stoptext-popup-open');
                }

                $('.stop-backdrop-popup-open[data-stopid="'+stop_open+'"]').remove();

                stop_open = null;
                if (useHash) window.location.hash = "";
            }
        }
    });

    mymap.once('zoomend moveend', function() {
        mymap.spin(false);
        svg.style.display = "unset";

        if (useHash && window.location.hash) {
            if (window.location.hash.startsWith("#stop:")) {
                stopClicked(null, window.location.hash.replace("#stop:", ""));
            }
            else if (window.location.hash.startsWith("#line:")) {
                linesClicked(null, window.location.hash.replace("#line:", "").split(";"));
            }
        }
    });
    mymap.fitBounds(svgElementBounds);

}, false);
