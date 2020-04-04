const path = require("path");
const Ajv = require("ajv");
const { Util } = require("../util.js");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const EVENTS_LIST = [
  "on_initialize",
  "on_terminate",
  "on_force_terminate",
  "on_run"
];

class ModulesManager {
  constructor({
    config,
    event_emitter,
    root_path,
    modules_full_name_map,
    paths_auto_find,
    disabled_modules
  }) {
    this.config = config;
    this.event_emitter = event_emitter;
    this.root_path = root_path;
    this.modules_full_name_map = modules_full_name_map;
    this.paths_auto_find = paths_auto_find;
    this.disabled_modules = disabled_modules;
    this.modules_map = {};
    this.event_module_bounds = {};
  }

  add_event(event_name, module_name) {
    if (!(event_name in this.modules_map[module_name])) return;

    if (event_name in this.event_module_bounds[module_name])
      this.remove_event(event_name, module_name);

    this.event_module_bounds[module_name][event_name] = (...args) => {
      this.modules_map[module_name][event_name](...args);
    };
    this.event_emitter.on(
      event_name,
      this.event_module_bounds[module_name][event_name]
    );
  }

  remove_event(event_name, module_name) {
    if (!(event_name in this.modules_map[module_name])) return;
    if (!(event_name in this.event_module_bounds[module_name])) return;

    this.event_emitter.off(
      event_name,
      this.event_module_bounds[module_name][event_name]
    );
    delete this.event_module_bounds[module_name][event_name];
  }

  init_module(module_name) {
    this.event_module_bounds[module_name] = {};
    for (const event_name of EVENTS_LIST)
      this.add_event(event_name, module_name);
  }

  terminate_module(module_name) {
    for (const event_name of EVENTS_LIST) {
      if (event_name in this.modules_map[module_name])
        this.remove_event(event_name, module_name);
    }
  }

  load_modules() {
    for (const modules_path of this.paths_auto_find) {
      let modules_names = Util.get_directories(modules_path);

      for (const module_name of modules_names)
        this.load_module(module_name, modules_path);
    }

    for (const [module_name, module_path] of Object.entries(
      this.modules_full_name_map
    ))
      this.load_module(module_name, module_path);
  }

  load_module(module_name, module_path) {
    const valid_config = (config_data, config_schema_file_full_name) => {
      const config_schema = Util.read_from_json(config_schema_file_full_name);
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(config_schema);
      const valid = validate(config_data);
      if (!valid)
        throw new Error(
          `Fail to load config[${module_name}]: Invalid: ${ajv.errorsText(
            validate.errors
          )}`
        );
    };
    if (this.disabled_modules.includes(module_name)) return;

    const module_full_path = path.join(
      this.root_path,
      module_path,
      module_name
    );

    const module_config_schema_full_name = path.join(
      module_full_path,
      "config.json"
    );

    if (Util.is_path_exist(module_full_path)) {
      let fw_module = require(module_full_path);
      let fw_module_class_name = Object.entries(fw_module)
        .values()
        .next().value[0];
      const module_config = this.config[module_name];
      valid_config(module_config, module_config_schema_full_name);
      this.modules_map[module_name] = new fw_module[fw_module_class_name]({
        event_emitter: this.event_emitter,
        config: module_config
      });
      this.init_module(module_name);
    } else {
      logger.info(
        "Module path does NOT exist: " +
          module_path +
          ", Full path: " +
          module_full_path
      );
    }
  }
}

module.exports = { ModulesManager };
