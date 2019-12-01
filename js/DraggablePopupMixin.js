/**
Copyright (c) 2015 The University of Reading
All rights reserved.

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions
are met:
1. Redistributions of source code must retain the above copyright
   notice, this list of conditions and the following disclaimer.
2. Redistributions in binary form must reproduce the above copyright
   notice, this list of conditions and the following disclaimer in the
   documentation and/or other materials provided with the distribution.
3. The name of the author may not be used to endorse or promote products
   derived from this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE AUTHOR ``AS IS'' AND ANY EXPRESS OR
IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY DIRECT, INDIRECT,
INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT
NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE,
DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY
THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
(INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

/**
 * Makes {@link L.Popup} draggable and proxies all {@link L.Draggable} events.
 * https://raw.githubusercontent.com/Reading-eScience-Centre/leaflet-coverage/master/src/popups/DraggablePopupMixin.js
 * slightly modified for use in hst-svg-netzplan.
 * 
 * @example
 * let DraggablePopup = DraggablePopupMixin(L.Popup)
 * let popup = new DraggablePopup().setContent('I am draggable!')
 * 
 * @param {class} base The base class.
 * @return {class} The base class with DraggablePopupMixin.
 */
function DraggablePopupMixin (base) {
  return class extends base {
    constructor (options={}, source) {
      options.className = options.className ? (options.className + " leaflet-popup-draggable")  : 'leaflet-popup-draggable'
      super(options, source)
    }
    
    onAdd (map) {
      super.onAdd(map)
      this._draggable = new L.Draggable(this._container, this._wrapper)
      this._draggable.enable()
      this._draggable.once('drag', e => { this._container.classList.add("no-tip") })
      this._draggable.on('drag', e => {
        // Popup.setContent() resets to the pre-drag position and doesn't use L.DomUtil.setPosition
        // the code below works around that
        let pos = L.DomUtil.getPosition(this._wrapper.parentNode)
        let latlng = map.layerPointToLatLng(pos)
        this.setLatLng(latlng)
        this.fire('drag', e)
      })
      this._draggable.on('dragstart predrag dragend', e => this.fire(e.type, e))
    }
    
    onRemove (map) {
      if (!!this._draggable) this._draggable.disable()
      super.onRemove(map)
    }
  }
}
