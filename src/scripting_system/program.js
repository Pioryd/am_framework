const { RETURN_CODE } = require("./instruction/return_code");
const parse = require("./instruction/parse");
const EventEmitter = require("events");

class Program {
  constructor(root, source) {
    this._id = null;
    this._source = source;
    this._name = "";
    this._rules = [];
    this._signals = [];
    this._events = [];
    this._forms = [];
    this._running_form = {};

    this._parse();
  }

  process(root) {
    this._running_form.process(root);
  }
  _parse() {
    const source = this._source;
    if (source.name == null || source.id == null)
      throw "Unable to parse form: " + source;

    this._id = source.id;
    this._name = source.name;
    this._rules = source.rules;
    this._signals = source.signals;
    this._events = source.events;
    this._forms = source.events;
  }
}

module.exports = Program;
