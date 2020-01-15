const mongoose = require("mongoose");
const logger = require("./logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class Database {
  constructor({ url, name, models }) {
    this.connection = null;
    this.url = url;
    this.name = name;
    this.models = models;
  }

  connect(callback = () => {}) {
    const process_callback = db => {
      db.listCollections().toArray((error, collections) => {
        try {
          if (error) logger.error(error);

          for (const model of Object.values(this.models))
            model.setup(this.connection);

          callback(collections);
        } catch (e) {
          console.log(e.stack);
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
          console.log(e.stack);
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
    if (this.connection == null) return;
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
}

module.exports = { Database };
