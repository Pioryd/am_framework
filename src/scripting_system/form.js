const { RETURN_CODE } = require("./instruction/return_code");
const parse = require("./instruction/parse");

class Form {
  constructor(source) {
    this.id = null;
    this._source = source;
    this._name = "";
    this._rules = [];
    this._signals = [];
    this._events = [];
    this._running_scripts = {};

    this._parse();
  }

  process(root) {
    return { return_code: RETURN_CODE.PROCESSED };
  }

  _run_script(name) {
    if (name in this._running_scripts) return;

    const script = Object.entries(this._source.scripts)[name];
    if (script == null) throw "Unable to run script: " + name;

    this._running_scripts[name] = parse(script);

    // on_run_script
  }

  _parse() {
    const source = this._source;
    if (source.name == null || source.id == null)
      throw "Unable to parse form: " + source;

    this.id = source.id;
    this._name = source.name;
    this._rules = source.rules;
    this._signals = source.signals;
    this._events = source.events;
  }
}

module.exports = Form;
