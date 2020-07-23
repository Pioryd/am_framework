const RulesManager = require("./rules_manager");
const Module = require("./module");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Program {
  constructor(root, source, parent) {
    if (parent == null) throw new Error("Parent is null.");

    this._root = root;
    this._source = source;
    this._parent = parent;

    this._running_modules = {};
    this._rules_manager = new RulesManager(
      this._root._event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._rules_manager.parse(this._source.rules);

    this._root.emit("program_initialize", this.get_name());
  }

  terminate() {
    for (const module of Object.values(this._running_modules))
      module.terminate();
    this._running_modules = {};
    this._rules_manager.terminate();
    this._root.emit("program_terminate", this.get_name());
  }

  process() {
    for (const module of Object.values(this._running_modules)) {
      this._debug_current_module = module;
      module.process();
    }
    this._root.emit("program_process", this.get_name());
  }

  update() {
    const aml_modules_ids = Object.keys(
      this._root.data.aml[this._parent.get_id()][this.get_id()]
    );

    for (const { name, running_module } of Object.entries(
      this._running_modules
    )) {
      if (!aml_modules_ids.includes(running_module.get_id())) {
        this._terminate_module(name);
        this._run_module(name);
      } else {
        running_module.update();
      }
    }
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_module(name) {
    if (name in this._running_modules) return;

    this._root.get_source_async(
      {
        type: "module",
        name,
        id: Object.keys(
          this._root.data.aml[this._parent.get_id()][this.get_id()]
        )
      },
      (source) => {
        try {
          this._running_modules[name] = new Module(this._root, source, this);
        } catch (e) {
          if (this._root.options.debug_enabled)
            logger.debug(
              `Unable to run module name[${name}]. \n${e}\n${e.stack}`
            );
        }
      }
    );
  }

  _terminate_module(name) {
    const module = this._running_modules[name];
    if (module == null) return;

    module.terminate();
    delete this._running_modules[name];
  }

  _process_actions(actions, value) {
    for (const action of actions) {
      const action_name = Object.keys(action)[0];
      const action_value = action[action_name];

      if (action_name === "module_initialize") {
        this._run_module(action_value.value);
      } else if (action_name === "module_terminate") {
        this._terminate_module(action_value.value);
      } else {
        throw new Error(
          `Unknown action[${action_name}] of program id[${this.get_id()}]`
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

module.exports = Program;
