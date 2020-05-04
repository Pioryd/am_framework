const ObjectID = require("bson-objectid");

const { create_logger } = require("../logger");
const { Database } = require("../database");
const { Stopwatch } = require("../stopwatch");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const MODELS_SCHEMA_LIST = [
  {
    model_name: "Backup",
    collection_name: "backup",
    schema_source: {
      id: { type: String, required: true, unique: true, index: true },
      data: { type: Object, required: true },
      create: { type: String, required: true }
    }
  }
];

class Backup {
  constructor({ root_module, config }) {
    this.root_module = root_module;
    this.config = config;

    this.database = new Database({
      url: this.config.url,
      name: this.config.name,
      models_schema_list: MODELS_SCHEMA_LIST
    });

    this.stop_watch = new Stopwatch(this.config.interval * 1000);
    this.restored = false;
    this.auto_backup = true;
  }

  initialize() {
    this.database.connect(() => {
      this.restore();
    });
  }

  terminate() {
    this.auto_backup = false;
    this.backup(null, () => {
      this.database.close();
    });
  }

  poll() {
    if (!this.restored || !this.auto_backup || !this.stop_watch.is_elapsed())
      return;
    this.backup("auto_backup");
    this.stop_watch.reset();
  }

  backup(id = null, callback = null) {
    const backup_data = {
      id: id || ObjectID().toHexString(),
      data: this._get_data(),
      create: new Date().toISOString()
    };

    this.database.models.backup.updateOne(
      { id: backup_data.id },
      { ...backup_data },
      { upsert: true },
      (error, raw) => {
        try {
          if (error) throw new Error(error);
          if (callback) callback();
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    );

    this.clear();
  }

  restore(callback = null) {
    this.database.models.backup.find(
      {},
      { id: 1, create: 1, _id: 0 },
      (error, results) => {
        if (error) logger.trace(error);
        else {
          let latest_backup = null;

          if (results == null || results.length === 0) {
            logger.info("No data to restore.");
            this.restored = true;
            return;
          }

          for (const result of results) {
            const { id, create } = result._doc;

            if (
              latest_backup == null ||
              Date.parse(create) > Date.parse(latest_backup.create)
            )
              latest_backup = { id, create };
          }

          this.database.models.backup.findOne(
            { id: latest_backup.id },
            { data: 1, _id: 0 },
            (error, result) => {
              if (error) logger.trace(error);
              else {
                try {
                  if (error) throw new Error(error);
                  this._set_data(result._doc.data);
                  this.backup();
                  this.restored = true;
                  if (callback) callback();
                  logger.info("Data restored.");
                } catch (e) {
                  logger.error(e, e.stack);
                }
              }
            }
          );
        }
      }
    );
  }

  clear(limit = null) {
    limit = limit || this.config.archive_limit;

    this.database.models.backup.find(
      {},
      { id: 1, create: 1, _id: 0 },
      (error, results) => {
        if (error) logger.trace(error);
        else {
          if (results == null || results.length <= limit) return;

          results.sort(function (a, b) {
            const parsed = {
              a: Date.parse(a._doc.create),
              b: Date.parse(b._doc.create)
            };

            if (parsed.a < parsed.b) return -1;
            if (parsed.a > parsed.b) return 1;
            return 0;
          });

          const ids_to_remove = [];
          for (let i = 0; i < results.length - limit; i++)
            ids_to_remove.push(results[i]._doc.id);

          this.database.models.backup.deleteMany(
            {
              id: { $in: [...ids_to_remove] }
            },
            (error, results) => {
              if (error) logger.trace(error);
            }
          );
        }
      }
    );
  }

  _get_data() {
    return this.root_module.data[this.config.object_name];
  }

  _set_data(data) {
    this.root_module.data[this.config.object_name] = data;
  }
}

module.exports = { Backup };
