const Program = require("./program");

class System {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    if (this._source.id == null)
      throw new Error(`Unable to parse system: ${this._source}`);

    this._programs_list = [];
    for (const name of this._source.programs) {
      let found_source = null;
      for (const source of Object.values(this._root.source.programs)) {
        if (name === source.name) {
          found_source = source;
          break;
        }
      }
      if (found_source === null)
        throw new Error(
          `System id[${this._source.id}] not found program name[${name}]`
        );
      this._programs_list.push(new Program(this._root, found_source));
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

  get_name() {
    return this._source.name;
  }
}

module.exports = System;
