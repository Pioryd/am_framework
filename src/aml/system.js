const Program = require("./program");

class System {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    this.programs = {};

    for (const name of this._source.programs) {
      this.programs[name] = new Program(
        this._root,
        this._root.get_source("program", name)
      );
    }
  }

  terminate() {
    for (const program of Object.values(this.programs)) program.terminate();
    this.programs = {};
  }

  process() {
    for (const program of Object.values(this.programs)) program.process();
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }
}

module.exports = System;
