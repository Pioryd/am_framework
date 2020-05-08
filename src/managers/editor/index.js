const ObjectID = require("bson-objectid");
const Ajv = require("ajv");
const { Util } = require("../../util");
const _ = require("lodash");
const { unflatten } = require("flat");

const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { AML } = require("../../scripting_system").ScriptingSystem;

const default_data_config = require("./default_data_config");

class Editor {
  constructor({ root_module, config }) {
    this.root_module = root_module;
    this.config = config;
    this.data_config = { ...this.config.data_config, ...default_data_config };
  }

  validate(object, name) {
    if (this.data_config[name].validate === "aml") {
      AML.parse(object.id, object.source);
    } else {
      const rule = this.data_config[name].validate;
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(rule);
      const valid = validate(object);
      if (!valid) throw new Error("AJV: " + ajv.errorsText(validate.errors));
    }
  }

  initialize() {
    this.__init_module_data();
  }

  terminate() {}

  poll() {}

  has_action(name, action) {
    return this.data_config[name].actions.includes(action);
  }

  get_data(name, callback) {
    if (!(name in this.data_config)) return;

    if ("db_manager" in this.data_config[name]) {
      this._remote_get_data(name, callback);
    } else {
      this._local_get_data(name, callback);
    }
  }

  update_data({ action, object, name, old_id, new_id }, callback) {
    if (!(name in this.data_config)) return;

    if ("db_manager" in this.data_config[name]) {
      this._remote_update_data(
        { action, object, name, old_id, new_id },
        callback
      );
    } else {
      this._local_update_data(
        { action, object, name, old_id, new_id },
        callback
      );
    }
  }

  process_data({ name, object }, callback) {
    if (!(name in this.data_config)) return;

    if ("db_manager" in this.data_config[name]) {
      _remote_process_data({ name, object }, callback);
    } else {
      this._local_process_data({ name, object }, callback);
    }
  }

  _local_get_data(name, callback) {
    let data = null;
    try {
      eval(`data = Object.values(this.root_module.data.${name})`);
    } catch (e) {}

    callback(data || {});
  }

  _local_update_data({ action, object, name, old_id, new_id }, callback) {
    let error = null;
    let updated_object = null;

    try {
      let data = null;
      eval(`data = this.root_module.data.${name}`);

      const execute = {
        new: () => {
          const new_id = ObjectID().toHexString();
          data[new_id] = {
            ...JSON.parse(JSON.stringify(this.data_config[name].init)),
            id: new_id
          };
          return data[new_id];
        },
        remove: () => {
          delete data[object.id];
          return object;
        },
        update: () => {
          this.validate(object, name);

          data[object.id] = {
            ...data[object.id],
            ...object
          };

          return data[object.id];
        },
        replace_id: () => {
          if (new_id == null || new_id.length < 1)
            throw new Error(`Unable to replace id. Wrong new_id[${new_id}]`);
          if (old_id == null || old_id.length < 1 || data[old_id] == null)
            throw new Error(
              `Unable to replace id. Not found object with id[${old_id}]`
            );

          data[new_id] = data[old_id];
          data[new_id].id = new_id;
          delete data[old_id];

          return data[new_id];
        }
      };

      updated_object = execute[action.type]();
    } catch (e) {
      logger.error(e, e.stack, { action, object, name, old_id, new_id });
      error = e.message;
    }

    callback(updated_object, error);
  }

  _local_process_data({ name, object }, callback) {}

  _remote_get_data(name, callback) {
    const db_manager = this.root_module.managers[
      this.data_config[name].db_manager
    ];
    db_manager.editor_data(callback);
  }

  _remote_update_data({ action, object, name, old_id, new_id }, callback) {
    const db_manager = this.root_module.managers[
      this.data_config[name].db_manager
    ];

    try {
      if (action.type === "new") {
        const new_id = ObjectID().toHexString();
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

  _remote_process_data({ name, object }, callback) {
    const db_manager = this.root_module.managers[
      this.data_config[name].db_manager
    ];

    db_manager.editor_process(object, callback);
  }

  __init_module_data() {
    for (const key of Object.keys(this.data_config)) {
      let unflatten_data = {};
      eval(`unflatten_data = unflatten({"${key}": {}}, { object: true })`);
      this.root_module.data = _.merge(unflatten_data, this.root_module.data);
    }
  }
}

module.exports = { Editor };
