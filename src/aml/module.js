const { RETURN_CODE } = require("./script/instruction/return_code");
const Script = require("./script");

const RulesManager = require("./rules_manager");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Module {
  constructor(root, source, parent) {
    if (parent == null) throw new Error("Parent is null.");

    this._root = root;
    this._source = source;
    this._parent = parent;

    this._running_scripts = {};
    this._debug_current_module = null;

    this._rules_manager = new RulesManager(
      this._root._event_emitter,
      (...args) => {
        this._process_actions(...args);
      }
    );
    this._rules_manager.parse(this._source.rules);

    this._root.emit("module_initialize", this.get_name());
  }

  terminate() {
    for (const script of Object.values(this._running_scripts))
      this._terminate_script(script.get_name());
    this._running_scripts = {};
    this._rules_manager.terminate();
    this._root.emit("module_terminate", this.get_name());
  }

  process() {
    for (const script of Object.values(this._running_scripts)) {
      const return_value = script.process();

      if (return_value.return_code === RETURN_CODE.PROCESSED)
        this._terminate_script(script.get_name());
    }

    this._root.emit("module_process", this.get_name());

    return { return_code: RETURN_CODE.PROCESSED };
  }

  update() {
    const aml_scripts_ids = Object.keys(
      this._root.data.aml[this._parent._parent.get_id()][this._parent.get_id()][
        this.get_id()
      ]
    );

    for (const { name, running_script } of Object.entries(
      this._running_scripts
    )) {
      if (!aml_scripts_ids.includes(running_script.get_id())) {
        this._terminate_script(name);
        this._run_script(name);
      }
    }
  }

  get_id() {
    return this._source.id;
  }

  get_name() {
    return this._source.name;
  }

  _run_script(name) {
    if (name in this._running_scripts) return;

    this._root.get_source_async(
      {
        type: "script",
        name,
        id: Object.keys(
          this._root.data.aml[this._parent._parent.get_id()][
            this._parent.get_id()
          ][this.get_id()]
        )
      },
      (source) => {
        try {
          this._running_scripts[name] = new Script(this._root, source, this);
        } catch (e) {
          if (this._root.options.debug_enabled)
            logger.debug(
              `Unable to run script name[${name}]. \n${e}\n${e.stack}`
            );
        }
      }
    );
  }

  _terminate_script(name) {
    const script = this._running_scripts[name];
    if (script == null) return;

    script.terminate();
    delete this._running_scripts[name];
  }

  _process_actions(actions, value) {
    for (const action of actions) {
      const action_name = Object.keys(action)[0];
      const action_value = action[action_name];

      if (action_name === "script_initialize") {
        this._run_script(action_value.value);
      } else if (action_name === "script_terminate") {
        this._terminate_script(action_value.value);
      } else {
        throw new Error(
          `Unknown action[${action_name}] of module ID[${this.get_id()}]`
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

module.exports = Module;
