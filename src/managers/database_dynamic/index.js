const { create_logger } = require("../../logger");
const { Database } = require("../../database");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class DatabaseDynamicManager {
  constructor({ root_module, config, models }) {
    this.root_module = root_module;
    this.config = config;
    this.models = models;

    this.database = new Database({
      url: this.config.url,
      name: this.config.name,
      models: this.models
    });
  }

  initialize() {
    this.database.connect(collections => {
      this.__check_collections(collections);
    });
  }

  terminate() {
    this.root_module.managers.database.close();
  }

  poll() {}

  close() {
    this.database.close();
  }

  save_backup_state(state) {
    this.database.connect(() => {});
  }

  __check_collections(collections) {
    for (const model of Object.values(this.models)) {
      let found = false;
      for (const collection of collections) {
        if (model.field_name === collection.name) {
          found = true;
          break;
        }
      }

      if (!found) {
        // throw new Error(
        console.log(
          "Database does not include collection [" +
            model.field_name +
            "]. Existed:",
          collections
        );
      }
    }
  }
}

module.exports = DatabaseDynamicManager;
