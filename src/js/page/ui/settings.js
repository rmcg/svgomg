import { EventEmitter } from 'events';

import { domReady } from '../utils';
import MaterialSlider from './material-slider';

export default class Settings extends EventEmitter {
  constructor() {
    super();

    this._throttleTimeout = null;

    domReady.then(() => {
      this._pluginInputs = Array.from(
        document.querySelectorAll('.settings .plugins input')
      );
      this._globalInputs = Array.from(
        document.querySelectorAll('.settings .global input')
      );

      // map real range elements to Slider instances
      this._sliderMap = new WeakMap();

      // enhance ranges
      Array.from(
        document.querySelectorAll('.settings input[type=range]')
      ).forEach(el => this._sliderMap.set(el, new MaterialSlider(el)));

      this.container = document.querySelector('.settings');
      this._scroller = document.querySelector('.settings-scroller');

      this.container.addEventListener('change', e => this._onChange(e));
      this.container.addEventListener('input', e => this._onChange(e));
      this._scroller.addEventListener('wheel', e => this._onMouseWheel(e));

      // Stop double-tap text selection.
      // This stops all text selection which is kinda sad.
      // I think this code will bite me.
      this._scroller.addEventListener('mousedown', e => {
        if (e.target.closest('input[type=range]')) return;
        e.preventDefault();
      });
    });
  }

  _onMouseWheel(event) {
    // Prevents bounce effect on desktop.
    // Firefox uses DELTA_LINE on a mouse wheel, ignore it
    if (!event.deltaMode) { // 0 is "pixels"
      event.preventDefault();
      event.currentTarget.scrollTop += event.deltaY;
    }
  }

  _onChange(event) {
    clearTimeout(this._throttleTimeout);

    // throttle range
    if (event.target.type == 'range') {
      this._throttleTimeout = setTimeout(() => this.emit('change'), 150);
    }
    else {
      this.emit('change');
    }
  }

  setSettings(settings) {
    for (const inputEl of this._globalInputs) {
      if (!(inputEl.name in settings)) continue;

      if (inputEl.type == 'checkbox') {
        inputEl.checked = settings[inputEl.name];
      }
      else if (inputEl.type == 'range') {
        this._sliderMap.get(inputEl).value = settings[inputEl.name];
      }
    }

    for (const inputEl of this._pluginInputs) {
      if (!(inputEl.name in settings.plugins)) continue;
      inputEl.checked = settings.plugins[inputEl.name];
    }
  }

  getSettings() {
    // fingerprint is used for cache lookups
    const fingerprint = [];

    const output = {
      plugins: {}
    };

    this._globalInputs.forEach(inputEl => {
      if (inputEl.name != 'gzip' && inputEl.name != 'original') {
        if (inputEl.type == 'checkbox') {
          fingerprint.push(Number(inputEl.checked));
        }
        else {
          fingerprint.push('|' + inputEl.value + '|');
        }
      }

      if (inputEl.type == 'checkbox') {
        output[inputEl.name] = inputEl.checked;
      }
      else {
        output[inputEl.name] = inputEl.value;
      }
    });

    this._pluginInputs.forEach(inputEl => {
      fingerprint.push(Number(inputEl.checked));
      output.plugins[inputEl.name] = inputEl.checked;
    });

    output.fingerprint = fingerprint.join();

    return output;
  }
}
