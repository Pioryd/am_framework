const Program = require("./program");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class System {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    this._running_programs = {};
    for (const name of this._source.programs)
      this.update({ type: "program", name });

    this._debug_current_program = null;
  }

  terminate() {
    for (const program of Object.values(this._running_programs))
      if (program != null) program.terminate();
    this._running_programs = {};
  }

  process() {
    for (const program of Object.values(this._running_programs)) {
      if (program == null) continue;
      this._debug_current_program = program;
      program.process();
    }
  }

  update(data) {
    if (data.type !== "program") {
      for (const program of Object.values(this._running_programs))
        program.update(data);
      return;
    }

    try {
      const source = this._root.get_source(data);

      const running_program = this._running_programs[data.name];
      if (running_program != null) {
        if (running_program.get_id() === source.id) return;
        else running_program.terminate();
      }

      this._running_programs[data.name] = new Program(this._root, source);
    } catch (e) {
      if (this._root.options.debug_enabled)
        logger.debug(
          `Unable to run program name[${data.name}]. \n${e}\n${e.stack}`
        );
    }
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }
}

module.exports = System;
