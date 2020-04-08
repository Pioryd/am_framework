const stringify = require("json-stringify-safe");
const ObjectID = require("bson-objectid");
const Ajv = require("ajv");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { AML } = require("../scripting_system").ScriptingSystem;
const ServerManager = require("./server");

function validate_json(rule, object) {
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(rule);
  const valid = validate(object);
  if (!valid) throw new Error("AJV: " + ajv.errorsText(validate.errors));
}

const parse_packet = {
  accept_connection: (connection, received_data, managers) => {
    const login = received_data.login;
    const password = received_data.password;

    const config = managers.admin_server.config;
    if (
      login == null ||
      password == null ||
      config.login.toLowerCase() !== login.toLowerCase() ||
      config.password !== password.toLowerCase()
    ) {
      managers.admin_server.handle_error(
        connection,
        received_data,
        managers,
        `Unable to accept connection. Login[${login}] Password[${password}]`
      );
      return false;
    }

    connection.on_close = connection => {};
    managers.admin_server.send(connection.get_id(), "accept_connection", {
      user_name: login
    });
    return true;
  },
  module_info: (connection, received_data, managers) => {
    const { root_module } = managers.admin_server;
    const modules_map = Object.keys(
      root_module.application.modules_manager.modules_map
    );
    const root_module_name = modules_map[0];

    const json = { root_module_name, modules_map };
    managers.admin_server.send(connection.get_id(), "module_info", { json });
  },
  module_data: (connection, received_data, managers) => {
    const json = JSON.parse(stringify(managers.admin_server.root_module.data));
    managers.admin_server.send(connection.get_id(), "module_data", { json });
  },
  process_script: (connection, received_data, managers) => {
    const {
      action_id,
      command,
      script_name,
      arguments_as_string
    } = received_data;
    const { scripts_manager } = managers.admin_server.root_module.application;

    let ret_val = null;
    let error_data = null;

    try {
      if (command != null) ret_val = scripts_manager.run_script({ command });
      else if (script_name != null)
        ret_val = scripts_manager.run_script({
          script_name,
          arguments_as_string
        });
      else
        throw new Error(
          `Wrong scripts data[${{ command, script_name, arguments_as_string }}]`
        );
    } catch (e) {
      error_data = { error: e.message, stack: e.stack };
    }

    if (ret_val != null) {
      managers.admin_server.send(connection.get_id(), "process_script", {
        json: { action_id, ret_val }
      });
    } else if (error_data != null) {
      managers.admin_server.send(connection.get_id(), "process_script", {
        json: { action_id, ...error_data }
      });
    }
  },
  scripts_list: (connection, received_data, managers) => {
    const app = managers.admin_server.root_module.application;

    const scripts_list = [];
    for (const script of Object.values(app.scripts_manager.scripts_map)) {
      const { name, desc, args } = script;
      scripts_list.push({ name, desc, args });
    }

    managers.admin_server.send(connection.get_id(), "scripts_list", {
      scripts_list
    });
  },
  data_am_form: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id } = received_data;
    const module_data = managers.admin_server.root_module.data;

    const list = [];

    for (const value of Object.values(module_data.am_forms_map))
      list.push(value._data);

    managers.admin_server.send(connection.get_id(), "data_am_form", {
      action_id,
      list,
      rules: managers.admin_server.root_module.config.am_data_rules.form
    });
  },
  data_am_program: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id } = received_data;
    const module_data = managers.admin_server.root_module.data;

    const list = [];

    for (const value of Object.values(module_data.am_programs_map))
      list.push(value._data);

    managers.admin_server.send(connection.get_id(), "data_am_program", {
      action_id,
      list,
      rules: managers.admin_server.root_module.config.am_data_rules.program
    });
  },
  data_am_system: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id } = received_data;
    const module_data = managers.admin_server.root_module.data;

    const list = [];

    for (const value of Object.values(module_data.am_systems_map))
      list.push(value._data);

    managers.admin_server.send(connection.get_id(), "data_am_system", {
      action_id,
      list,
      rules: managers.admin_server.root_module.config.am_data_rules.system
    });
  },
  data_am_script: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id } = received_data;
    const module_data = managers.admin_server.root_module.data;

    const list = [];

    for (const value of Object.values(module_data.am_scripts_map))
      list.push(value._data);

    managers.admin_server.send(connection.get_id(), "data_am_script", {
      action_id,
      list,
      rules: managers.admin_server.root_module.config.am_data_rules.system
    });
  },
  update_am_form: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id, id, object } = received_data;
    const module_data = managers.admin_server.root_module.data;
    const map = module_data.am_forms_map;

    let message = "Unknown";

    if (id === "") {
      const id = ObjectID().toHexString();
      map[id] = new managers.admin_server.DefaultObjectClass({
        name: "new_" + id,
        id,
        rules: [],
        scripts: []
      });
      message = `Added id[${id}]`;
    } else if (!(id in map)) {
      message = `Wrong id[${id}]`;
    } else if (object == null) {
      delete map[id];
      message = `Removed id[${id}]`;
    } else {
      try {
        validate_json(
          managers.admin_server.root_module.config.am_data_rules.form,
          object
        );

        // "id: map[id].get_id()" to be sure id wont be override
        map[id]._data = { ...map[id]._data, ...object, id: map[id].get_id() };
        message = `Updated id[${id}]`;
      } catch (e) {
        logger.error(e);
        message = e.message;
      }
    }

    managers.admin_server.send(connection.get_id(), "update_am_form", {
      action_id,
      message
    });
  },
  update_am_program: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id, id, object } = received_data;
    const module_data = managers.admin_server.root_module.data;
    const map = module_data.am_programs_map;

    let message = "Unknown";

    if (id === "") {
      const id = ObjectID().toHexString();
      map[id] = new managers.admin_server.DefaultObjectClass({
        name: "new_" + id,
        id,
        rules: [],
        forms: []
      });
      message = `Added id[${id}]`;
    } else if (!(id in map)) {
      message = `Wrong id[${id}]`;
    } else if (object == null) {
      delete map[id];
      message = `Removed id[${id}]`;
    } else {
      try {
        validate_json(
          managers.admin_server.root_module.config.am_data_rules.program,
          object
        );

        // "id: map[id].get_id()" to be sure id wont be override
        map[id]._data = { ...map[id]._data, ...object, id: map[id].get_id() };
        message = `Updated id[${id}]`;
      } catch (e) {
        logger.error(e);
        message = e.message;
      }
    }

    managers.admin_server.send(connection.get_id(), "update_am_program", {
      action_id,
      message
    });
  },
  update_am_system: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id, id, object } = received_data;
    const module_data = managers.admin_server.root_module.data;
    const map = module_data.am_systems_map;

    let message = "Unknown";

    if (id === "") {
      const id = ObjectID().toHexString();
      map[id] = new managers.admin_server.DefaultObjectClass({
        name: "new_" + id,
        id,
        programs: []
      });
      message = `Added id[${id}]`;
    } else if (!(id in map)) {
      message = `Wrong id[${id}]`;
    } else if (object == null) {
      delete map[id];
      message = `Removed id[${id}]`;
    } else {
      try {
        validate_json(
          managers.admin_server.root_module.config.am_data_rules.system,
          object
        );

        // "id: map[id].get_id()" to be sure id wont be override
        map[id]._data = { ...map[id]._data, ...object, id: map[id].get_id() };
        message = `Updated id[${id}]`;
      } catch (e) {
        logger.error(e);
        message = e.message;
      }
    }

    managers.admin_server.send(connection.get_id(), "update_am_system", {
      action_id,
      message
    });
  },
  update_am_script: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id, id, object } = received_data;
    const module_data = managers.admin_server.root_module.data;
    const map = module_data.am_scripts_map;

    let message = "Unknown";

    if (id === "") {
      const id = ObjectID().toHexString();
      map[id] = new managers.admin_server.DefaultObjectClass({
        id,
        source: `id ${id}\r\nname new_${id}\r\n data\r\n`
      });
      message = `Added id[${id}]`;
    } else if (!(id in map)) {
      message = `Wrong id[${id}]`;
    } else if (object == null) {
      delete map[id];
      message = `Removed id[${id}]`;
    } else {
      try {
        AML.parse(object);

        // "id: map[id].get_id()" to be sure id wont be override
        map[id]._data = {
          ...map[id]._data,
          source: object,
          id: map[id].get_id()
        };
        message = `Updated id[${id}]`;
      } catch (e) {
        logger.error(e);
        message = e.message;
      }
    }

    managers.admin_server.send(connection.get_id(), "update_am_script", {
      action_id,
      message
    });
  }
};

/**
 * Need managers:
 *  - admin_server
 *  - virtual_world_server
 */
class AdminServerManager extends ServerManager {
  constructor({ root_module, config, DefaultObjectClass }) {
    super({ root_module, config, parse_packet, DefaultObjectClass });
  }
}

module.exports = AdminServerManager;
