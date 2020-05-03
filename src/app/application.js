const EventEmitter = require("events");
const path = require("path");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Config } = require("../config");
const { ModulesManager } = require("./modules_manager");
const { setup_exit_handlers } = require("./signal_handler");

class Application extends EventEmitter {
  constructor({ root_full_name, config_file_rel_name = "config.json" }) {
    super();
    this.root_full_name = root_full_name;
    this.logger = logger;
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

    this.on_command = () => logger.error("on_command is not set.");
  }

  _init_commands() {
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (data) => {
      try {
        this.on_command({ command: data });
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
}

module.exports = { Application };
