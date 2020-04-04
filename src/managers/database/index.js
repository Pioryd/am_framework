const { create_logger } = require("../../logger");
const { Stopwatch } = require("../../stopwatch");
const { Database } = require("../../database");

const { load_data } = require("./load_data");
const { save_data } = require("./save_data");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class DatabaseManager {
  constructor({
    root_module,
    config,
    db_objects_map,
    initialize_on_success = () => {},
    objects_classes = Objects
  }) {
    this.root_module = root_module;
    this.config = config;
    this.db_objects_map = db_objects_map;
    this.initialize_on_success = initialize_on_success;
    this.objects_classes = objects_classes;

    this.ready = false;
    this.stopwatches_map = { database_save: new Stopwatch(5 * 1000) };

    const models = {};
    for (const [key, value] of Object.entries(db_objects_map))
      models[key] = value.model;

    this.database = new Database({
      url: this.config.url,
      name: this.config.name,
      models
    });
  }

  initialize() {
    load_data({
      step: "connect",
      on_success: () => {
        this.initialize_on_success();
        this.ready = true;
        logger.info("DB is loaded.");
      },
      on_error: () => {
        on_terminate();
      },
      manager: this
    });
  }

  terminate() {
    const close_database = () => {
      setTimeout(() => {
        try {
          this.root_module.managers.database.close();
        } catch (e) {
          logger.error(e, e.stack);
        }
      }, 1000);
    };
    const save_as_not_backup = () => {
      this.root_module.data.settings.backup = false;
      this.db_objects_map.settings.model.save(
        this.root_module.data.settings,
        close_database
      );
    };

    save_data({
      step: "connect",
      on_success: save_as_not_backup,
      manager: this
    });
  }

  poll() {
    if (!this.ready) return;

    if (this.stopwatches_map.database_save.is_elapsed()) {
      logger.info("Auto save to database");

      this.root_module.data.settings.backup = true;
      save_data({ step: "connect", manager: this });

      this.stopwatches_map.database_save.reset();
    }
  }

  close() {
    this.database.close();
  }

  save_backup_state(state) {
    this.database.connect(() => {});
  }
}

module.exports = DatabaseManager;
