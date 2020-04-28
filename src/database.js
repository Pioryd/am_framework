const mongoose = require("mongoose");
const logger = require("./logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Database {
  constructor({ url, name, models_schema_list }) {
    this.connection = null;
    this.url = url;
    this.name = name;
    this.models_schema_list = models_schema_list;
    this.models = {};
  }

  connect(callback = () => {}) {
    const process_callback = (db) => {
      db.listCollections().toArray((error, collections) => {
        try {
          if (error) logger.error(error);

          for (const model_schema of this.models_schema_list)
            this.models[model_schema.collection_name] = this.connection.model(
              model_schema.model_name,
              new mongoose.Schema(model_schema.schema_source),
              model_schema.collection_name
            );

          this.__check_collections(collections);
          callback();
        } catch (e) {
          console.log(e, e.stack);
        }
      });
    };

    if (this.connection != null && this.is_connected()) {
      process_callback(this.connection.db);
      return;
    }

    this.connection = mongoose.createConnection(
      this.get_connection_name(),
      {
        useNewUrlParser: true,
        useCreateIndex: true,
        useUnifiedTopology: true
      },
      (error, client) => {
        try {
          if (error) {
            logger.error(error);
            return;
          }

          logger.info("Connected to server:", this.get_connection_name());

          process_callback(client.db);
        } catch (e) {
          console.log(e, e.stack);
        }
      }
    );
  }

  close() {
    if (this.connection == null) return;
    logger.info("Closing connection:", this.get_connection_name());
    this.connection.close();
  }

  get_connection_name() {
    return `${this.url}/${this.name}`;
  }

  is_connecting() {
    if (this.connection == null) return;
    return this.connection.readyState === 2;
  }

  is_connected() {
    if (this.connection == null) return false;
    return this.connection.readyState === 1;
  }

  is_disconnecting() {
    if (this.connection == null) return;
    return this.connection.readyState === 3;
  }

  is_disconnected() {
    if (this.connection == null) return;
    return this.connection.readyState === 0;
  }

  get_ready_state() {
    if (this.connection == null) return;
    return this.connection.readyState;
  }

  __check_collections(collections) {
    for (const model_schema of Object.values(this.models_schema_list)) {
      let found = false;
      for (const collection of collections) {
        if (model_schema.collection_name === collection.name) {
          found = true;
          break;
        }
      }

      if (!found) {
        logger.error(
          "Database does not include collection [" +
            model_schema.collection_name +
            "]. Existed:",
          collections
        );
      }
    }
  }
}

module.exports = { Database };
