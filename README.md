# hst-svg-netzplan

Live unter <https://d3d9.github.io/hst-svg-netzplan/>.

Weitere Details/Planungen folgen.

## Datenabruf

Aktuell wird eine Anfrage an einen lokalen Server siehe <https://gist.github.com/d3d9/c2c796b44220eaf70eeaf876b2f6e100> gemacht.

Zukünftig sollte dies besser anders geschehen, bestenfalls ohne Umweg direkt mit Anfrage bei der VRR-EFA aus dem Browser heraus, hierzu ist u. a. die Situation bzgl. CORS und einem virtuellen Verzeichnis extra für diesen Anwendungsfall zu klären.

## Datenformat in der svg

### Attribute

- __data-stopid__
  - Haltestellen-ID. Inhalt: IFOPT (z. B. "de:05914:2007")

- __data-lineid__
  - Liniennummern. Inhalt: Semikolonseparierte Liste relevanter Liniennummern (z. B. "514" oder "514;543")

- __data-only-lineid__
  - Inhalt wie data-lineid.
  - Verwendung nur bei Bedarf, um zu unterscheiden, dass dieses Objekt nicht für alle im fachlich übergeordneten Objekt angegebenen Linien gilt.  
  Beispielsweise eine aufgeteilte __Haltestelle__, die auf ihren unterschiedlichen Haltestellen-Rects jeweils die relevanten Liniennummern angegeben hat, damit nicht _alle_ Liniennummern, die beim stoptext angegeben sind, gelten.

### Objekte

- __Haltestelle__
  - Objektarten:
    - __Rect__, __Circle__ <small>(Haltestellenblobb)</small>
    - __Gruppe__ <small>(Falls Haltestellenblobb in sich Arrows usw. hat - bei __Bahnhofsicons__ dazu noch __class=bficon__ auf der __Unter__-gruppe und __class=bfback__ auf dem dazugehörigen Hintergrundcircle!)</small>
    - __Path__ <small>(Verbindungslinie)</small>
    - Wichtig: __Path__ gibt es auch als Haltestellenblobb in Gruppe (Stadtmitte)
  - __class=stop__
  - Datenattribute:
    - __data-stopid__
    - _data-only-lineid (nur bei Bedarf!)_

- __Haltestellenname__
  - Objektart: __Text__ <small>(Haltestellentext - nur exakt 1 pro "echter" ganzer Haltestelle!)</small>
  - __class=stoptext__
  - Datenattribute:
    - __data-stopid__
    - __data-lineid__

- __Linienverlauf__
  - Objektart: __Path__, __Gruppe__ <small>(falls unsichtbarer Path nötig ist, bei gestrichelten Linien -- dann werden beide Paths zusammengefasst zur Gruppe, die Class & Attribut bekommt - ist aber teilweise noch nicht so gemacht.)</small>
  - __class=route__
  - Datenattribute:
    - __data-lineid__

- __Linienverlaufsmarker__
  - Objektart: __Text__, __Gruppe__ <small>(bei Bahnen)</small>
  - __class=linetext__
  - Datenattribute:
    - __data-lineid__

- __Linienendstellenmarker__
  - Objektart: __Gruppe__ <small>(enthält rect und text)</small>
  - __class=lineblob__
  - Datenattribute:
    - __data-lineid__
    - <small>_data-stopid der jeweiligen Endstelle? -- erstmal unwichtig_</small>

- __Informationstexte__
  - Objektart: __Text__, __Path__ <small>(Verbindungslinien)</small>, __Gruppe__ <small>(Pfeile 530-539/536-538)</small>, __Rect__ <small>(z. B. Infoboxen, tempor&auml;r bis es eine "St&ouml;rungsinfo"-Klasse inkl. eigenem Popup usw. gibt)</small>
  - __class=infotext__
  - Datenattribute:
    - __data-lineid__
    - <small>_data-stopid der jeweiligen Haltestelle, falls vorhanden? -- erstmal unwichtig_</small>

- __Point of Interest (innerhalb der Kartenansicht)__
  - Objektart: __Gruppe__, ...
  - __class=poi__
  - Datenattribute:
    - __data-lineeid__
    - weitere später...

- __Point of Interest (in der Tabelle)__ -- Todo. Soll zum POI springen
- __Haltestellenreferenz (bspw. in der POI-Tabelle)__ -- Todo. Soll zur Haltestelle springen


__Code, um die originale svg kleiner zu machen:__  
siehe <https://gist.github.com/d3d9/c2c796b44220eaf70eeaf876b2f6e100#file-svg-reduzieren-js>.
