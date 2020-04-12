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
    for (const [module_name, config] of Object.entries(
      this.config.data.app.auto_run_scripts
    )) {
      const module = this.modules_manager.modules_map[module_name];

      const run_module_scripts = () => {
        const model = module.managers.database_scripts.get_model();

        for (const script_data of config) {
          const { name, args } = script_data;
          const arguments_as_list = args;
          const script_name = name;

          const display_result = ({ ret_val, error_data }) => {
            logger.log(
              `Autorun script [${script_name}]` +
                (arguments_as_list != null && arguments_as_list.length > 0
                  ? ` with arguments ${JSON.stringify(arguments_as_list)}`
                  : "") +
                "\nResult:\n" +
                JSON.stringify({ ret_val, error_data }, null, 2)
            );
          };

          try {
            this.scripts_manager.get_scripts_map_async(
              model,
              ({ scripts_map, error }) => {
                this.scripts_manager.run_script({
                  script_name,
                  arguments_as_list,
                  scripts_map,
                  callback: display_result
                });
              }
            );
          } catch (e) {
            logger.error(e, e.stack);
          }
        }
      };

      setTimeout(() => {
        const try_to_execute = () => {
          const { database_scripts } = module.managers;
          if (
            database_scripts.database.is_connected() === true &&
            database_scripts.get_model().model != null &&
            typeof database_scripts.get_model().model.find === "function"
          )
            run_module_scripts();
          else setTimeout(try_to_execute, 10);
        };

        try_to_execute();
      }, 10);
    }
  }
}

module.exports = { Application };
