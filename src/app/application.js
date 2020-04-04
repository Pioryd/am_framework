const EventEmitter = require("events");
const path = require("path");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Config } = require("../config");
const { ModulesManager } = require("./modules_manager");
const { setup_exit_handlers } = require("./signal_handler");
const ScriptsManager = require("./scripts_manager");

class Application extends EventEmitter {
  constructor({
    root_full_name,
    config_file_rel_name = "config.json",
    scripts_folder_rel_name = "scripts"
  }) {
    super();
    this.logger = logger;
    this.scripts_manager = new ScriptsManager({
      application: this,
      scripts_folder_full_name: path.join(
        root_full_name,
        scripts_folder_rel_name
      )
    });
    this.config = new Config({
      file_full_name: path.join(root_full_name, config_file_rel_name),
      on_update: () => {
        logger.info("config updated");
      }
    });
    this.config.load();

    global.node_modules_path = path.join(
      root_full_name,
      this.config.data.app.node_modules_rel_path
    );

    this.modules_manager = new ModulesManager({
      config: this.config.data,
      event_emitter: this,
      root_path: root_full_name,
      modules_full_name_map: this.config.data.app.modules.map,
      paths_auto_find: this.config.data.app.modules.paths_auto_find,
      disabled_modules: this.config.data.app.modules.disabled
    });
  }

  _init_commands() {
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", data => {
      try {
        this.scripts_manager.run_script({ command: data });
      } catch (e) {
        logger.error(e, e.stack);
      }
    });
  }

  // Should be called only once
  run() {
    this._init_commands();
    this.modules_manager.load_modules();

    setup_exit_handlers(
      () => {
        this.emit("on_force_terminate");
      },
      () => {
        this.emit("on_force_terminate");
      }
    );

    this.emit("on_initialize");

    this.emit("on_run");

    this._auto_run_scripts();
  }

  // Should be called only once
  close() {
    logger.info(
      `Closing in ${this.config.data.app.close_app_delay / 1000} seconds`
    );

    this.config.terminate();

    this.emit("on_terminate");

    setTimeout(() => {
      process.exit(0);
    }, this.config.data.app.close_app_delay);
  }

  _auto_run_scripts() {
    // TODO razem z args
    for (const script_data of this.config.data.app.auto_run_scripts) {
      const { name, args } = script_data;
      const arguments_as_list = args;
      const script_name = name;
      logger.log(
        `Autorun script [${script_name}]` +
          (arguments_as_list != null && arguments_as_list.length > 0
            ? ` with arguments ${JSON.stringify(arguments_as_list)}`
            : "")
      );
      this.scripts_manager.run_script({ script_name, arguments_as_list });
    }
  }
}

module.exports = { Application };
