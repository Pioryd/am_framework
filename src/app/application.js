const EventEmitter = require("events");
const path = require("path");
const fs = require("fs");
const logger = require("../logger").create_logger({
  module_name: "app_server_preview",
  file_name: __filename
});
const { Util } = require("../util");
const { Config } = require("../config");
const { ModulesManager } = require("./modules_manager");
const { setup_exit_handlers } = require("./signal_handler");

class Application extends EventEmitter {
  constructor({
    root_full_name,
    config_file_rel_name = "config.json",
    scripts_folder_rel_name = "scripts",
    command_map
  }) {
    super();
    this.config = new Config({
      file_full_name: path.join(root_full_name, config_file_rel_name),
      on_update: () => {
        logger.info("config updated");
      }
    });
    this.config.load();
    this.scripts_folder_full_name = path.join(
      root_full_name,
      scripts_folder_rel_name
    );

    global.node_modules_path = path.join(
      root_full_name,
      this.config.data.app.node_modules_rel_path
    );

    this.modules_manager = new ModulesManager({
      config: this.config.data,
      event_emitter: this,
      root_path: root_full_name,
      modules_map: this.config.data.app.modules.map,
      paths_auto_find: this.config.data.app.modules.paths_auto_find,
      disabled_modules: this.config.data.app.modules.disabled
    });

    this._commands_map = {
      close: (force = false) => {
        if (!force) this.close();
        else process.exit(0);
      },
      help: () => {
        logger.log("Commands list:", Object.keys(this._commands_map));
      },
      script: argument => {
        const modules = this.modules_manager.modules_list;
        const app = this;

        try {
          const args_count = argument.split(" ").length;
          if (args_count === 1 && argument.slice(-1) !== ";") {
            argument = fs.readFileSync(
              `${path.join(
                root_full_name,
                scripts_folder_rel_name
              )}/${argument}.js`,
              "utf8",
              err => {
                if (err) throw err;
              }
            );
          }

          const script = Util.string_to_function(
            `(modules, app)=>{${argument}}`
          );
          script(modules, app);
        } catch (e) {
          logger.error(e, e.stack);
        }
      },
      ...command_map
    };
  }

  _init_commands() {
    process.stdin.resume();
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", data => {
      try {
        data = data.trim();
        if (data === "") data = "help";
        const command_end_index = data.indexOf(" ");
        let command = "";
        let argument = "";
        if (command_end_index != -1) {
          command = data.substr(0, command_end_index);
          argument = data.substr(command_end_index);
        } else {
          command = data;
        }

        argument = argument.trim();

        if (!(command in this._commands_map)) {
          logger.info(`Unknown command: ${command}`);
          return;
        }

        logger.info(`Process command: ${command}`);
        this._commands_map[command](argument);
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

  get_scripts_list() {
    try {
      const scripts_list = Util.get_files(this.scripts_folder_full_name);
      for (let i = 0; i < scripts_list.length; i++)
        scripts_list[i] = scripts_list[i].replace(/\.[^/.]+$/, "");
      return scripts_list;
    } catch (e) {
      logger.error(e);
      return [];
    }
  }

  _auto_run_scripts() {
    for (const name of this.config.data.app.auto_run_scripts) {
      logger.log(`Run script [${name}]`);
      this._commands_map["script"](name);
    }
  }
}

module.exports = { Application };
