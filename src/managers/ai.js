const fs = require("fs");
const path = require("path");
const EventEmitter = require("events");
const _ = require("lodash");

const { create_logger } = require("../logger");
const { Util } = require("../util");

const logger = create_logger({
  module_name: "module_world",
  file_name: __filename
});

const DEFAULT_CONFIG = {
  ai_modules_folder: "ai_modules"
};

class AI {
  constructor({ root_module, config }) {
    this.event_emitter = new EventEmitter();
    this.root_module = root_module;
    this.config = _.merge(DEFAULT_CONFIG, config);

    this._ai_modules_classes = {};

    /** example: this.objects_ai[object_id][module_name] = module_instance */
    this.objects_ai = {};
  }

  initialize() {
    this._load_ai_classes();
  }

  terminate() {
    for (const object_ai of Object.values(this.objects_ai)) {
      for (const module of Object.values(object_ai)) module.terminate();
    }
    this.objects_ai = {};
  }

  poll() {
    for (const [object_id, ai_modules] of Object.entries(this.objects_ai)) {
      const { data } = this.root_module.data.world.objects[object_id];
      const mirror = _.cloneDeep(data);
      for (const module of Object.values(ai_modules)) {
        module.mirror = _.cloneDeep(mirror);
        module.poll();
      }
    }
  }

  add_object(id, modules_names) {
    if (this.objects_ai[id] != null) return;
    this.objects_ai[id] = {};

    if (modules_names != null) this.update_ai_modules(id, modules_names);
  }

  remove_object(id) {
    if (this.objects_ai[id] == null) return;
    for (const module of Object.values(this.objects_ai[id])) module.terminate();
    delete this.objects_ai[id];
  }

  process_ai_api({ object_id, module, api, data }) {
    try {
      const ai_module = this.objects_ai[object_id][module];
      return ai_module.api[api](ai_module, data);
    } catch (e) {
      logger.error(
        "Unable to process ai api. " +
          JSON.stringify({ api, module, object_id, data }, null, 2) +
          `${e}`
      );
    }
  }

  process_world_api(api, data) {
    try {
      const { world } = this.root_module.managers;
      return world.api[api](world, data);
    } catch (e) {
      logger.error(
        "Unable to process world api. " +
          JSON.stringify({ api, data }, null, 2) +
          `${e}`
      );
    }
  }

  update_ai_modules(object_id, modules_names) {
    const remove_not_actual_modules = (object_id, modules_names) => {
      for (const module_name of Object.keys(this.objects_ai[object_id])) {
        if (!modules_names.includes(module_name)) {
          const ai_module = this.objects_ai[object_id][module_name];
          ai_module.terminate();
          delete this.objects_ai[object_id][module_name];
        }
      }
    };
    const add_missing_modules = (object_id, modules_names) => {
      for (const module_name of modules_names) {
        if (this.objects_ai[object_id][module_name] != null) continue;

        const ai_module = new this._ai_modules_classes[module_name](
          this,
          object_id
        );
        this.objects_ai[object_id][module_name] = ai_module;
        ai_module.initialize();
      }
    };

    remove_not_actual_modules(object_id, modules_names);
    add_missing_modules(object_id, modules_names);
  }

  _load_ai_classes() {
    const ai_modules_folder_full_name = path.join(
      this.root_module.application.root_full_name,
      this.config.ai_modules_folder
    );

    if (
      ai_modules_folder_full_name == null ||
      !fs.existsSync(ai_modules_folder_full_name)
    )
      throw new Error(`Not found folder[${ai_modules_folder_full_name}]`);

    const dirs = Util.get_directories(ai_modules_folder_full_name);
    const files = Util.get_files(ai_modules_folder_full_name).map((el) => {
      return el.split(".").slice(0, -1).join(".");
    });

    for (const module_name of [...dirs, ...files]) {
      this._ai_modules_classes[module_name] = require(path.join(
        ai_modules_folder_full_name,
        module_name
      ));
    }
  }
}

module.exports = { AI };
