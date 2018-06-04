import {PolymerElement, html} from "@polymer/polymer"
import template from "./cork-typeahead.html"

import "@polymer/iron-icon"
import "@ucd-lib/cork-icons"

class CorkTypeahead extends PolymerElement {

  static get properties() {
    return {
      open: {
        type: Boolean,
        value: false
      },
      options : {
        type : Array,
        value : function() {
          return [];
        }
      },

      // ms to delay search
      delay : {
        type : Number,
        value : 100
      },

      searchId : {
        type : Number,
        value : 0
      },

      selectedIndex : {
        type : Number,
        value : -1
      },

      results : {
        type : Array,
        value : function() {
          return [];
        }
      },

      blurTimer : {
        type : Number,
        value : -1
      }
    };
  }

  static get template() {
    return html([template]);
  }

  constructor() {
    super();
    this.hide = this.hide.bind(this);
  }

  connectedCallback() {
    super.connectedCallback();
    window.addEventListener('click', this.hide);
    this._bind();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    window.removeEventListener('click', this.hide);
  }

  _selectOption() {
    var arr = [];
    for( var i = 0; i < this.options.length; i++ ) {
      arr.push(Object.assign({}, this.options[i], {selected: (i === this.selectedIndex)}));
    }

    var optEle = this.shadowRoot.querySelector('.option');
    if( optEle ) {
      var h = optEle.offsetHeight;
      this.$.popup.scrollTop = (this.selectedIndex * h) - h;
    }

    this.options = arr;
  }

  _selectUp() {
    this.selectedIndex--;
    if( this.selectedIndex < 0 ) {
      this.selectedIndex = this.options.length - 1;
    }
    this._selectOption();
  }

  _selectDown() {
    this.selectedIndex++;
    if( this.selectedIndex === this.options.length ) {
      this.selectedIndex = 0;
    }
    this._selectOption();
  }

  _bind() {
    this.input = this.children[0];
    this.input.addEventListener('keyup', this._onKeyUp.bind(this));
    this.input.addEventListener('blur', () => {
      this.blurTimer = setTimeout(() => this.hide(), 150);
    });
  }

  _prevent(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  // override me
  search(value) {
    return new Promise((resolve, reject) => {
      resolve(['Not setup']);
    });
  }

  _searchAsync(value) {
    this._searchDebounce = Polymer.Debouncer.debounce(
      this._searchDebounce,
      Polymer.Async.timeOut.after(this.delay),
      () => {
        this.searchId++;
        var id = this.searchId;

        this.search(value)
          .then((results) => {
            var valueUsed;
            if( !Array.isArray(results) ) {
              valueUsed = results.valueUsed;
              results = results.results;
            }

            if( this.searchId !== id ) return;
            this._renderResults(valueUsed || value, results)
          })
          .catch((e) => console.error(e)); 
      }
    );
  }

  _onKeyUp(e) {
    // enter
    if( e.which === 13 ) {
      this._select(this.selectedIndex);
      return this._prevent(e);
    // up arrow
    } else if( e.which === 38 ) {
      this._selectUp();
      return this._prevent(e);
    // tab or down arrow
    } else if( e.which === 40 ) {
      this._selectDown();
      return this._prevent(e);
    // hide
    } else if ( e.which === 27 ) {
      return this.hide();
    }

    if( !this.input.value ) {
      return this.hide();
    }
    this._searchAsync(this.input.value);
  }

  _renderResults(val, results) {
    if( results.length === 0 ) {
      return this.hide();
    }

    this.show();
    var re = new RegExp('^'+val, 'i');

    this.results = results;
    this.options = results.map((result) => {
      var parts = result.split(re);
      
      if( parts.length > 1 ) {
        return {
          prefix : val,
          completion : parts[1],
          selected : false
        }
      }

      return {
        prefix : '',
        completion : result,
        selected : false
      }
    });

    this.selectedIndex = -1;
    // if( this.options.length > 0 ) {
    //   this.options[0].selected = true;
    // }
  }

  _onOptionClick(e) {
    if( this.blurTimer !== -1 ) {
      clearTimeout(this.blurTimer);
      this.blurTimer = -1;
    }

    var index = parseInt(e.currentTarget.getAttribute('index'));
    this._select(index);
  }

  _select(index) {
    if( this.results.length <= index || index < 0 ) return;

    var payload = {
      detail: {
        value: this.results[index]
      }
    }

    this.dispatchEvent(new CustomEvent('select', payload));
    this.hide();
  }

  hide() {
    this.open = false;
  }

  show() {
    this.open = true;
  }

}

window.customElements.define('cork-typeahead', CorkTypeahead);