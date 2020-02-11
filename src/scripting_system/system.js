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

    // TODO
    // For now only one programs works only
    this._current_program =
      this._programs_list.length > 0 ? this._programs_list[0] : null;
  }

  terminate() {
    for (const program of source._programs_list) program.terminate();
  }

  process() {
    this._current_program.process();
  }
}

module.exports = System;
