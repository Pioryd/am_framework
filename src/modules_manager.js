const path = require("path");
const { Util } = require("./util.js");
const log = require("simple-node-logger").createSimpleLogger();

class ModulesManager {
  constructor({
    application,
    event_emiter,
    modules_directory,
    events_list,
    disabled_modules
  }) {
    this.application = application;
    this.event_emiter = event_emiter;
    this.events_list = events_list;
    this.modules_directory = modules_directory;
    this.modules_list = {};
    this.event_module_bounds = {};
    this.disabled_modules = disabled_modules;
  }

  add_event(event_name, module_name) {
    if (!(event_name in this.modules_list[module_name])) return;

    if (event_name in this.event_module_bounds[module_name])
      this.remove_event(event_name, module_name);

    this.event_module_bounds[module_name][event_name] = (...args) => {
      this.modules_list[module_name][event_name](...args);
    };
    this.event_emiter.on(
      event_name,
      this.event_module_bounds[module_name][event_name]
    );
  }

  remove_event(event_name, module_name) {
    if (!(event_name in this.modules_list[module_name])) return;
    if (!(event_name in this.event_module_bounds[module_name])) return;

    this.event_emiter.off(
      event_name,
      this.event_module_bounds[module_name][event_name]
    );
    delete this.event_module_bounds[module_name][event_name];
  }

  init_module(module_name) {
    this.event_module_bounds[module_name] = {};
    for (const event_name of this.events_list)
      this.add_event(event_name, module_name);
  }

  terminate_module(module_name) {
    for (const event_name of this.events_list) {
      if (event_name in this.modules_list[module_name])
        this.remove_event(event_name, module_name);
    }
  }

  load_modules() {
    let modules_names = Util.get_directories(this.modules_directory);

    for (const module_name of modules_names) {
      if (this.disabled_modules.includes(module_name)) continue;

      const module_path = path.join(this.modules_directory, module_name);

      if (Util.is_path_exist(module_path)) {
        let fw_module = require(module_path);
        let fw_module_class_name = Object.entries(fw_module)
          .values()
          .next().value[0];
        this.modules_list[module_name] = new fw_module[fw_module_class_name]({
          application: this.application
        });
        this.init_module(module_name);
      } else log.info("Module path does NOT exist: " + module_path);
    }
  }
}

module.exports = { ModulesManager };
