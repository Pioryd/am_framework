const Program = require("./program");
const RulesManager = require("./rules_manager");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class System {
  constructor(root, source) {
    this._root = root;
    this._source = source;

    this._running_programs = {};
    this._rules_manager = new RulesManager(
      this._root._event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._rules_manager.parse(this._source.rules);

    this._debug_current_program = null;

    this._root.emit("system_init", this.get_name());
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

    this._run_program(data.name);
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_program(name) {
    this._root.get_source_async({ type: "program", name }, (source) => {
      try {
        const running_program = this._running_programs[name];
        if (running_program != null) {
          if (running_program.get_id() === source.id) return;
          else running_program.terminate();
        }

        this._running_programs[name] = new Program(this._root, source);
      } catch (e) {
        if (this._root.options.debug_enabled)
          logger.debug(
            `Unable to run program name[${name}]. \n${e}\n${e.stack}`
          );
      }
    });
  }

  _terminate_program() {
    this._running_programs[name].terminate();
    delete this._running_programs[name];
    this._root.emit("program_terminated", name);
  }

  _process_actions(actions, value) {
    for (const action of actions) {
      const action_name = Object.keys(action)[0];
      const action_value = action[action_name];

      if (action_name === "program_run") {
        this._run_program(action_value.value);
      } else if (action_name === "program_terminate") {
        this._terminate_program(action_value.value);
      } else {
        throw new Error(
          `Unknown action[${action_name}] of form ID[${this.get_id()}]`
        );
      }

      if (this._root.options.debug_enabled) {
        logger.debug(
          `Action [${action_name}] -> [${JSON.stringify(action_value)}]`
        );
      }
    }
  }
}

module.exports = System;
