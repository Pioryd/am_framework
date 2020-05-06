const Program = require("./program");

class System {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    if (this._source.id == null)
      throw new Error("Unable to parse system: " + this._source);

    this._programs_list = [];
    for (const id of this._source.programs) {
      if (!(id in this._root.source.programs))
        throw new Error(`System[${this._source.id}] not found program[${id}]`);
      this._programs_list.push(
        new Program(this._root, this._root.source.programs[id])
      );
    }
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

  get_id() {
    return this._source.id;
  }
}

module.exports = System;
