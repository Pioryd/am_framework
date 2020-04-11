const path = require("path");
const Schema = require("mongoose").Schema;
const { create_logger } = require("../../logger");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

// Must be given [model_name] and [field_name] to prevent add "s" to
// collections names
const schema = {
  model_name: "Script",
  field_name: "script",
  schema_source: {
    id: { type: String, required: true, unique: true, index: true },
    type: { type: String, required: true },
    name: { type: String, required: true },
    desc: { type: String, required: true },
    args: { type: [String], required: true },
    source: { type: String, required: true }
  }
};

class Script {
  constructor() {
    this.model_name = schema.model_name;
    this.field_name = schema.field_name;
    this.schema_source = schema.schema_source;
    this.connection = {};
    this.model = {};
  }

  setup(connection) {
    this.connection = connection;

    this.model = this.connection.model(
      this.model_name,
      new Schema(this.schema_source),
      this.field_name
    );
  }

  save(objects, callback, index = 0) {
    if (!Array.isArray(objects)) objects = [objects];

    if (index < objects.length && objects.length > 0) {
      const object = objects[index];
      index++;

      if (object == null) {
        callback({
          step: this.model.collection.name + ".save"
        });
        return;
      }

      this.model.updateOne(
        { id: object.id },
        { ...object },
        { upsert: true },
        (error, raw) => {
          try {
            if (error) callback({ error: error, results: raw });
            else this.save(classes_instances, callback, index);
          } catch (e) {
            logger.error(e, e.stack);
          }
        }
      );
      return;
    }

    callback({});
  }

  remove(id, callback) {
    this.model.deleteOne({ id: id }, error => {
      try {
        callback({ error: error });
      } catch (e) {
        logger.error(e, e.stack);
      }
    });
  }

  load(id, callback) {
    this.model.findOne({ id: id }, (error, result) => {
      try {
        callback({ error: error, results: result });
      } catch (e) {
        logger.error(e, e.stack);
      }
    });
  }

  load_all(callback) {
    this.model.find(null, (error, result) => {
      try {
        callback({ error: error, results: result });
      } catch (e) {
        logger.error(e, e.stack);
      }
    });
  }
}

module.exports = Script;
