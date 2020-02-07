const { RETURN_CODE } = require("./instruction/return_code");
const Program = require("./program");

class System {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    this._id = null;
    this._name = "";
    this._programs_list = [];

    this._parse();
  }

  process() {
    for (const program of source._programs_list) program.process(this._root);
  }

  _parse() {
    const sorce = this._source;
    if (source.name == null || source.id == null)
      throw "Unable to parse system: " + source;

    this._id = source.id;
    this._name = source.name;

    for (const program of source._programs)
      this._programs_list = new Program(this._root, program);
  }
}

module.exports = System;
