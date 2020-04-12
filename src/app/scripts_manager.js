const fs = require("fs");
const path = require("path");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Util } = require("../util");
const default_scripts_list = require("./default_scripts_list");

class ScriptsManager {
  constructor({ application, scripts_folder_full_name }) {
    this.application = application;
    this.scripts_folder_full_name = scripts_folder_full_name;
    this.scripts_map = {};

    this._initialize();
  }

  run_script(args) {
    let ret_val = null;
    let error_data = null;

    try {
      ret_val = this._run_script(args);
    } catch (e) {
      error_data = { error: e.message, stack: e.stack };
    }

    if (args.callback != null) args.callback({ ret_val, error_data });
  }

  _run_script({
    script_fn_as_string,
    command,
    script_name,
    arguments_as_string,
    arguments_as_list
  }) {
    const parse = function(command) {
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

    let script_fn = null;
    if (script_fn_as_string != null)
      script_fn = Util.string_to_function(script_fn_as_string);
    else if ([";", "}"].includes(command.slice(-1)))
      script_fn = Util.string_to_function(`(app, args)=>{${command}}`);
    else if (script_name in this.scripts_map)
      script_fn = this.scripts_map[script_name].fn;
    else
      throw new Error(
        `Unable to parse command$[${command}] or script[${script_name}]`
      );

    return script_fn(this.application, arguments_as_list);
  }

  _initialize() {
    const scripts_names_list = Util.get_files(this.scripts_folder_full_name);

    for (const script of default_scripts_list)
      this.scripts_map[script.name] = script;

    for (const name of scripts_names_list) {
      const script_body = fs.readFileSync(
        path.join(this.scripts_folder_full_name, name),
        "utf8",
        err => {
          if (err) throw err;
        }
      );

      let script = null;
      let scripts_list = null;
      // script_body -> "script = {...}" or "scripts_list = [...]"
      eval(script_body);

      if (script != null) this.scripts_map[script.name] = script;
      if (scripts_list != null)
        for (const _script of scripts_list)
          this.scripts_map[_script.name] = _script;
    }
  }
}

module.exports = ScriptsManager;
