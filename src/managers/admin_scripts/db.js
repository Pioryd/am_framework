const { create_logger } = require("../../logger");
const { Database } = require("../../database");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const MODELS_SCHEMA_LIST = [
  {
    model_name: "Script",
    collection_name: "script",
    schema_source: {
      id: { type: String, required: true, unique: true, index: true },
      type: { type: String, required: true },
      name: { type: String, required: true },
      desc: { type: String, required: true },
      args: { type: [String], required: true },
      fn: { type: String, required: true }
    }
  }
];

class DB {
  constructor({ root_module, config }) {
    this.root_module = root_module;
    this.config = config;

    this.database = new Database({
      url: this.config.url,
      name: this.config.name,
      models_schema_list: MODELS_SCHEMA_LIST
    });
  }

  get_all_async(callback) {
    this.database.models.script.find(
      {},
      { id: 1, type: 1, desc: 1, args: 1, fn: 1, _id: 0 },
      (error, results) => {
        try {
          const scripts_list = [];
          if (error) {
            logger.trace(error);
          } else {
            for (const result of results) {
              const data = result._doc;
              delete data.__v;
              scripts_list.push(data);
            }
          }

          callback({ error, results, scripts_list });
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    );
  }

  get_async(id, callback) {
    this.database.models.script.findOne(
      { id },
      { id: 1, type: 1, desc: 1, args: 1, fn: 1, _id: 0 },
      (error, result) => {
        try {
          let data = {};
          if (error) {
            logger.trace(error);
          } else {
            data = result._doc;
            delete data.__v;
          }

          if (callback) callback({ error, result, data });
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    );
  }

  remove_async(id, callback) {
    this.database.models.script.deleteMany({ id }, (error, result) => {
      try {
        if (error) logger.trace(error);
        if (callback) callback({ error, result });
      } catch (e) {
        logger.error(e, e.stack);
      }
    });
  }

  update_async(data, callback) {
    this.database.models.script.updateOne(
      { id: data.id },
      { ...data },
      { upsert: true },
      (error, result) => {
        try {
          if (error) logger.trace(error);
          if (callback) callback({ error, result });
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    );
  }
}

module.exports = { DB };
