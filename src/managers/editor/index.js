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

  get_data(name) {
    let data = null;
    try {
      eval(`data = this.root_module.data.${name}`);
    } catch (e) {}

    return data || {};
  }

  update_data({ action, object, name, old_id, new_id }) {
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
    return execute[action.type]();
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
