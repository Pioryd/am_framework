const fs = require("fs");
const path = require("path");
const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Util } = require("../../util");
const default_scripts_list = require("./default_scripts_list");
const { DB } = require("./db");

class AdminScripts {
  constructor({ root_module, config }) {
    this.root_module = root_module;
    this.config = config;

    this.db = new DB({ root_module, config });

    this.scripts_folder_full_name = path.join(
      this.root_module.application.root_full_name,
      this.config.scripts_rel_name
    );
    this.default_scripts_map = {};
    this.file_scripts_map = {};
    this.db_scripts_map = {};
  }

  initialize() {
    this.root_module.application.on_command = (args) => this.run_script(args);

    this.db.database.connect(() => {
      this.reload_scripts(() => {
        this._auto_run_scripts();
      });
    });
  }

  terminate() {}

  poll() {}

  get_scripts_map() {
    return {
      ...this.default_scripts_map,
      ...this.file_scripts_map,
      ...this.db_scripts_map
    };
  }

  reload_scripts(callback) {
    this.reload_default_scripts();
    this.reload_file_scripts();
    this.reload_db_scripts_async(callback);
  }

  reload_default_scripts() {
    this.default_scripts_map = {};
    for (const script of default_scripts_list) {
      this.default_scripts_map[script.name] = {
        ...script,
        id: "local",
        type: "local"
      };
    }
  }

  reload_file_scripts() {
    const scripts_names_list = Util.get_files(this.scripts_folder_full_name);

    for (const name of scripts_names_list) {
      const script_body = fs.readFileSync(
        path.join(this.scripts_folder_full_name, name),
        "utf8",
        (err) => {
          if (err) throw err;
        }
      );

      let script = null;
      let scripts_list = null;
      // script_body -> "script = {...}" or "scripts_list = [...]"
      eval(script_body);

      this.file_scripts_map = {};
      if (script != null) this.file_scripts_map[script.name] = script;
      if (scripts_list != null)
        for (const _script of scripts_list)
          this.file_scripts_map[_script.name] = _script;

      for (const [key, script] of Object.entries(this.file_scripts_map)) {
        this.file_scripts_map[key] = {
          ...script,
          id: "local",
          type: "local",
          fn: script.fn.toString()
        };
      }
    }
  }

  reload_db_scripts_async(callback) {
    this.db.get_all_async(({ error, results, scripts_list }) => {
      this.db_scripts_map = {};
      for (const data of scripts_list) this.db_scripts_map[data.name] = data;

      if (callback != null) callback();
    });
  }

  run_script({
    script_fn_as_string,
    command,
    script_name,
    arguments_as_string,
    arguments_as_list,
    scripts_map = {},
    callback
  }) {
    const parse = function (command) {
      if (command == null || command === "") command = "help";
      const command_end_index = command.indexOf(" ");
      let script_name = "";
      let arguments_as_string = "";

      if (command_end_index != -1) {
        script_name = command.substr(0, command_end_index);
        arguments_as_string = command.substr(command_end_index).trim();
      } else {
        script_name = command;
      }
      return { script_name, arguments_as_string };
    };

    let ret_val = null;
    let error_data = null;
    try {
      if (command == null) command = "";
      if (script_name == null) script_name = "";
      if (arguments_as_string == null) arguments_as_string = "";
      if (!Array.isArray(arguments_as_list)) arguments_as_list = [];

      if (command != "") {
        command = command.trim();
        const parsed = parse(command);
        script_name = parsed.script_name;
        arguments_as_string = parsed.arguments_as_string;
      }

      if (arguments_as_list.length === 0)
        arguments_as_list = Util.command_args_to_array(arguments_as_string);

      scripts_map = {
        ...scripts_map,
        ...this.get_scripts_map()
      };

      let script_fn = null;
      if (script_fn_as_string != null)
        script_fn = Util.string_to_function(script_fn_as_string);
      else if ([";", "}"].includes(command.slice(-1)))
        script_fn = Util.string_to_function(`(app, args)=>{${command}}`);
      else if (script_name in scripts_map)
        script_fn = scripts_map[script_name].fn;
      else
        throw new Error(
          `Unable to parse command$[${command}] or script[${script_name}]`
        );

      ret_val = script_fn(this.root_module.application, arguments_as_list);
    } catch (e) {
      error_data = { error: e.message, stack: e.stack };
    }

    if (callback != null) callback({ ret_val, error_data });
  }

  _auto_run_scripts() {
    const run_module_scripts = () => {
      for (const script_data of this.config.auto_run_scripts) {
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
          this.run_script({
            script_name,
            arguments_as_list,
            scripts_map: this.scripts_map,
            callback: display_result
          });
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    };

    setTimeout(() => {
      const try_to_execute = () => {
        if (
          this.db.database.is_connected() === true &&
          this.db.database.models.script != null &&
          typeof this.db.database.models.script.find === "function"
        )
          run_module_scripts();
        else setTimeout(try_to_execute, 10);
      };

      try_to_execute();
    }, 10);
  }
}

module.exports = { AdminScripts };
