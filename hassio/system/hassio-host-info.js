import '@polymer/paper-button/paper-button.js';
import '@polymer/paper-card/paper-card.js';
import { html } from '@polymer/polymer/lib/utils/html-tag.js';
import { PolymerElement } from '@polymer/polymer/polymer-element.js';

import '../../src/components/buttons/ha-call-api-button.js';
import '../../src/util/hass-mixins.js';

class HassioHostInfo extends window.hassMixins.EventsMixin(PolymerElement) {
  static get template() {
    return html`
    <style include="iron-flex ha-style">
      paper-card {
        display: inline-block;
        width: 400px;
        margin-left: 8px;
      }
      .card-content {
        height: 200px;
      }
      @media screen and (max-width: 830px) {
        paper-card {
          margin-top: 8px;
          margin-left: 0;
          width: 100%;
        }
        .card-content {
          height: 100%;
        }
      }
      .info {
        width: 100%;
      }
      .info td:nth-child(2) {
        text-align: right;
      }
      .errors {
        color: var(--google-red-500);
        margin-top: 16px;
      }
      paper-button.info {
        max-width: 50%;
      }
    </style>
    <paper-card>
      <div class="card-content">
        <h2>Host system</h2>
        <table class="info">
          <tbody><tr>
            <td>Hostname</td>
            <td>[[data.hostname]]</td>
          </tr>
          <tr>
            <td>System</td>
            <td>[[data.operating_system]]</td>
          </tr>
          <tr>
            <td>Deployment</td>
            <td>[[data.deployment]]</td>
          </tr>
        </tbody></table>
        <paper-button raised="" on-click="_showHardware" class="info">Show hardware</paper-button>
        <template is="dom-if" if="[[errors]]">
          <div class="errors">Error: [[errors]]</div>
        </template>
      </div>
      <div class="card-actions">
        <template is="dom-if" if="[[computeRebootAvailable(data)]]">
          <ha-call-api-button class="warning" hass="[[hass]]" path="hassio/host/reboot">Reboot</ha-call-api-button>
        </template>
        <template is="dom-if" if="[[computeShutdownAvailable(data)]]">
          <ha-call-api-button class="warning" hass="[[hass]]" path="hassio/host/shutdown">Shutdown</ha-call-api-button>
        </template>
        <template is="dom-if" if="[[computeUpdateAvailable(data)]]">
          <ha-call-api-button hass="[[hass]]" path="hassio/host/update">Update</ha-call-api-button>
        </template>
      </div>
    </paper-card>
`;
  }

  static get properties() {
    return {
      hass: Object,
      data: Object,
      errors: String,
    };
  }

  ready() {
    super.ready();
    this.addEventListener('hass-api-called', ev => this.apiCalled(ev));
  }

  apiCalled(ev) {
    if (ev.detail.success) {
      this.errors = null;
      return;
    }

    var response = ev.detail.response;

    if (typeof response.body === 'object') {
      this.errors = response.body.message || 'Unknown error';
    } else {
      this.errors = response.body;
    }
  }

  computeUpdateAvailable(data) {
    return data.version !== data.last_version;
  }

  computeRebootAvailable(data) {
    return data.features && data.features.includes('reboot');
  }

  computeShutdownAvailable(data) {
    return data.features && data.features.includes('shutdown');
  }

  _showHardware() {
    this.hass.callApi('get', 'hassio/hardware/info')
      .then(
        resp => this._objectToMarkdown(resp.data)
        , () => 'Error getting hardware info'
      ).then((content) => {
        this.fire('hassio-markdown-dialog', {
          title: 'Hardware',
          content: content,
        });
      });
  }

  _objectToMarkdown(obj, indent = '') {
    let data = '';
    Object.keys(obj).forEach((key) => {
      if (typeof obj[key] !== 'object') {
        data += `${indent}- ${key}: ${obj[key]}\n`;
      } else {
        data += `${indent}- ${key}:\n`;
        if (Array.isArray(obj[key])) {
          if (obj[key].length) {
            data += `${indent}    - ` + obj[key].join(`\n${indent}    - `) + '\n';
          }
        } else {
          data += this._objectToMarkdown(obj[key], `    ${indent}`);
        }
      }
    });
    return data;
  }
}

customElements.define('hassio-host-info', HassioHostInfo);
