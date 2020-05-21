const ObjectID = require("bson-objectid");
const Ajv = require("ajv");
const { Util } = require("../../util");
const _ = require("lodash");
const { unflatten } = require("flat");

const { DB } = require("./db");

const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { AML } = require("../../aml");

const default_data_config = require("./default_data_config");

class Editor {
  constructor({ root_module, config }) {
    this.root_module = root_module;
    this.config = config;
    this.data_config = _.merge(default_data_config, this.config.data_config);

    this.db_map = {};
  }

  validate(object, name) {
    if (this.data_config[name].validate === "aml") {
      AML.Script.parse(object.id, object.source);
    } else {
      const rule = this.data_config[name].validate;
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(rule);
      const valid = validate(object);
      if (!valid) throw new Error("AJV: " + ajv.errorsText(validate.errors));
    }
  }

  initialize() {
    this.__init_db();
  }

  terminate() {}

  poll() {}

  has_action(name, action) {
    return this.data_config[name].actions.includes(action);
  }

  get_data(name, callback) {
    if (!(name in this.data_config)) return;

    if ("manager" in this.data_config[name].db_data) {
      this._manager_get_data(name, callback);
    } else {
      this._db_get_data(name, callback);
    }
  }

  update_data({ action, object, name, old_id, new_id }, callback) {
    if (!(name in this.data_config)) return;

    if ("manager" in this.data_config[name].db_data) {
      this._manager_update_data(
        { action, object, name, old_id, new_id },
        callback
      );
    } else {
      this._db_update_data({ action, object, name, old_id, new_id }, callback);
    }
  }

  process_data({ name, object }, callback) {
    if (!(name in this.data_config)) return;

    if ("manager" in this.data_config[name].db_data) {
      this._manager_process_data({ name, object }, callback);
    } else {
      this._db_process_data({ name, object }, callback);
    }
  }

  is_connected() {
    for (const db of Object.values(this.db_map)) {
      if (!db.database.is_connected()) return false;
    }
    return true;
  }

  _db_get_data(name, callback) {
    const { db_data } = this.data_config[name];
    const key = db_data.url + db_data.name;

    this.db_map[key].get_all_async(name, ({ error, results, objects_list }) => {
      if (callback != null) callback(objects_list);
    });
  }

  _db_update_data({ action, object, name, old_id, new_id }, callback) {
    const { db_data } = this.data_config[name];
    const key = db_data.url + db_data.name;

    let error = null;

    try {
      const execute = {
        new: () => {
          const new_id =
            object.id != null && object.id !== ""
              ? object.id
              : ObjectID().toHexString();
          const new_object = {
            ...JSON.parse(JSON.stringify(this.data_config[name].init)),
            id: new_id
          };

          this.db_map[key].update_async(
            name,
            new_object.id,
            new_object,
            ({ error, result }) => {
              callback(new_object, error);
            }
          );
        },
        remove: () => {
          this.db_map[key].remove_async(
            name,
            object.id,
            ({ error, result }) => {
              callback(object, error);
            }
          );
        },
        update: () => {
          this.validate(object, name);

          this.db_map[key].update_async(
            name,
            object.id,
            object,
            ({ error, result }) => {
              callback(object, error);
            }
          );
        },
        replace_id: () => {
          if (new_id == null || new_id.length < 1)
            throw new Error(`Unable to replace id. Wrong new_id[${new_id}]`);
          if (old_id == null || old_id.length < 1)
            throw new Error(
              `Unable to replace id. Not found object with id[${old_id}]`
            );

          this.db_map[key].get_async(
            name,
            old_id,
            ({ error, result, object }) => {
              object = { ...object, id: new_id };
              this.db_map[key].update_async(
                name,
                old_id,
                object,
                ({ error, result }) => {
                  callback(object, error);
                }
              );
            }
          );
        }
      };

      execute[action.type]();
    } catch (e) {
      logger.error(e, e.stack, { action, object, name, old_id, new_id });
      error = e.message;

      callback(object, error);
    }
  }

  _db_process_data({ name, object }, callback) {}

  _manager_get_data(name, callback) {
    const db_manager = this.root_module.managers[
      this.data_config[name].db_data.manager
    ];
    db_manager.editor_data(callback);
  }

  _manager_update_data({ action, object, name, old_id, new_id }, callback) {
    const db_manager = this.root_module.managers[
      this.data_config[name].db_data.manager
    ];

    try {
      if (action.type === "new") {
        const new_id =
          object.id != null && object.id !== ""
            ? object.id
            : ObjectID().toHexString();
        const new_object = {
          id: new_id,
          type: "type_" + new_id,
          desc: "",
          args: [],
          fn: `(app, args) => {}`
        };

        db_manager.editor_update_or_new(new_object.id, new_object, callback);
      } else if (action.type === "remove") {
        db_manager.editor_remove(object.id, callback);
      } else if (action.type === "update") {
        ["id", "type", "desc", "args", "fn"].map((value) => {
          if (!(value in object))
            throw new Error(`Object doesn't contains key[${value}]`);
        });

        const updated_data = {
          id: object.id,
          type: object.type,
          desc: object.desc,
          args: object.args,
          fn: object.fn
        };

        db_manager.editor_update_or_new(
          updated_data.id,
          updated_data,
          callback
        );
      } else if (action.type === "replace_id") {
        if (new_id == null || new_id.length < 1)
          throw new Error(
            `Unable to replace object id. Wrong new_id[${new_id}]`
          );
        if (old_id == null || old_id.length < 1)
          throw new Error(
            `Unable to replace object id. Not found object with id[${old_id}]`
          );

        db_manager.editor_replace_id({ old_id, new_id }, callback);
      } else {
        throw new Error(
          `Wrong action type. Id[${action.id}] Type: [${action.type}]`
        );
      }
    } catch (e) {
      callback({}, e.message);
    }
  }

  _manager_process_data({ name, object }, callback) {
    const db_manager = this.root_module.managers[
      this.data_config[name].db_data.manager
    ];

    db_manager.editor_process(object, callback);
  }

  __init_db() {
    const db_data_map = {};
    for (const [data_name, config] of Object.entries(this.data_config)) {
      if (
        !("db_data" in config) ||
        !("url" in config.db_data) ||
        !("name" in config.db_data)
      )
        continue;

      const db_key = config.db_data.url + config.db_data.name;

      if (!(db_key in db_data_map))
        db_data_map[db_key] = {
          url: config.db_data.url,
          name: config.db_data.name,
          collections: [],
          models_schema_list: []
        };

      const collection_name = data_name;
      if (!db_data_map[db_key].collections.includes(collection_name)) {
        db_data_map[db_key].collections.push(collection_name);
        db_data_map[db_key].models_schema_list.push({
          model_name:
            collection_name.charAt(0).toUpperCase() + collection_name.slice(1),
          collection_name,
          schema_source: {
            id: { type: String, required: true, unique: true, index: true },
            object: { type: Object, required: true }
          }
        });
      }
    }

    for (const [key, db_data] of Object.entries(db_data_map)) {
      this.db_map[key] = new DB(db_data);
      this.db_map[key].database.connect();
    }
  }
}

module.exports = { Editor };
