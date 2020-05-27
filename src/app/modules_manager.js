const fs = require("fs");
const path = require("path");
const { Util } = require("../util.js");
const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const default_managers = require("../managers");
const { AppModule } = require("./app_module");

const EVENTS_LIST = [
  "on_initialize",
  "on_terminate",
  "on_force_terminate",
  "on_run"
];

class ModulesManager {
  constructor({ config, event_emitter, root_path }) {
    this.config = config;
    this.event_emitter = event_emitter;
    this.root_path = root_path;

    this.managers_path = path.join(root_path, this.config.managers_rel_name);
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
    const map_found_managers = () => {
      const managers_map = {};
      if (fs.existsSync(this.managers_path)) {
        const dirs = Util.get_directories(this.managers_path);
        const files = Util.get_files(this.managers_path).map((el) => {
          return el.split(".").slice(0, -1).join(".");
        });

        for (const manager_name of [...dirs, ...files])
          managers_map[manager_name] = require(path.join(
            this.managers_path,
            manager_name
          ));
      }
      return { ...default_managers, ...managers_map };
    };

    const found_managers_map = map_found_managers();

    for (const [module_name, module_schema] of Object.entries(
      this.config.modules
    )) {
      const app_module = new AppModule({
        event_emitter: this.event_emitter,
        config: module_schema.managers_map,
        data: module_schema.data || {}
      });

      const managers = {};
      for (const [name, config] of Object.entries(module_schema.managers_map)) {
        if (!(name in found_managers_map))
          throw new Error(
            `Manager[${name}] not found in [${Object.keys(
              found_managers_map
            )}].`
          );

        managers[name] = new found_managers_map[name]({
          root_module: app_module,
          config
        });
      }
      app_module.setup_managers({
        managers,
        order: module_schema.managers_order,
        black_list: module_schema.managers_blacklist
      });

      this.modules_map[module_name] = app_module;
      this.init_module(module_name);
    }
  }
}

module.exports = { ModulesManager };
