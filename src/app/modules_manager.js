const path = require("path");
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
    modules_map,
    paths_auto_find,
    disabled_modules
  }) {
    this.config = config;
    this.event_emitter = event_emitter;
    this.root_path = root_path;
    this.modules_map = modules_map;
    this.paths_auto_find = paths_auto_find;
    this.disabled_modules = disabled_modules;
    this.modules_list = {};
    this.event_module_bounds = {};
  }

  add_event(event_name, module_name) {
    if (!(event_name in this.modules_list[module_name])) return;

    if (event_name in this.event_module_bounds[module_name])
      this.remove_event(event_name, module_name);

    this.event_module_bounds[module_name][event_name] = (...args) => {
      this.modules_list[module_name][event_name](...args);
    };
    this.event_emitter.on(
      event_name,
      this.event_module_bounds[module_name][event_name]
    );
  }

  remove_event(event_name, module_name) {
    if (!(event_name in this.modules_list[module_name])) return;
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
      if (event_name in this.modules_list[module_name])
        this.remove_event(event_name, module_name);
    }
  }

  load_modules() {
    for (const modules_path of this.paths_auto_find) {
      let modules_names = Util.get_directories(modules_path);

      for (const module_name of modules_names)
        this.load_module(module_name, modules_path);
    }

    for (const [module_name, module_path] of Object.entries(this.modules_map))
      this.load_module(module_name, module_path);
  }

  load_module(module_name, module_path) {
    if (this.disabled_modules.includes(module_name)) return;

    const module_full_path = path.join(
      this.root_path,
      module_path,
      module_name
    );

    if (Util.is_path_exist(module_full_path)) {
      let fw_module = require(module_full_path);
      let fw_module_class_name = Object.entries(fw_module)
        .values()
        .next().value[0];
      this.modules_list[module_name] = new fw_module[fw_module_class_name]({
        event_emitter: this.event_emitter,
        config: this.config
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
