const { create_logger } = require("../../logger");
const { Database } = require("../../database");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

class DB {
  constructor({ url, name, models_schema_list }) {
    this.database = new Database({
      url,
      name,
      models_schema_list
    });
  }

  get_all_async(collection_name, callback) {
    this.database.models[collection_name].find(
      {},
      { id: 1, object: 1, _id: 0 },
      (error, results) => {
        try {
          const objects_list = [];
          if (error) {
            logger.trace(error);
          } else {
            for (const result of results) objects_list.push(result._doc.object);
          }
          callback({ error, results, objects_list });
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    );
  }

  get_async(collection_name, id, callback) {
    this.database.models[collection_name].findOne(
      { id },
      { id: 1, object: 1, _id: 0 },
      (error, result) => {
        try {
          let object = {};
          if (error) logger.trace(error);
          else object = result._doc.object;

          if (callback) callback({ error, result, object });
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    );
  }

  remove_async(collection_name, id, callback) {
    this.database.models[collection_name].deleteMany(
      { id },
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

  update_async(collection_name, id, object, callback) {
    this.database.models[collection_name].updateOne(
      { id: id || object.id },
      { id: object.id, object },
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
