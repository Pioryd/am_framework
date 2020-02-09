const Program = require("./program");

class System {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    if (source.name == null || source.id == null)
      throw "Unable to parse system: " + source;

    this._id = source.id;
    this._name = source.name;
    this._programs = source.programs;

    this._programs_list = [];
    for (const program of this._programs)
      this._programs_list.push(new Program(this._root, program));
  }

  terminate() {
    for (const program of source._programs_list) program.terminate();
  }

  process() {
    for (const program of source._programs_list) program.process();
  }
}

module.exports = System;
