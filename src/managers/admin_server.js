const ServerManager = require("./server");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { AML } = require("../scripting_system").ScriptingSystem;
const ObjectID = require("bson-objectid");
const Ajv = require("ajv");

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
    const json = { "Module name": "?", "Connected count": "?" };
    managers.admin_server.send(connection.get_id(), "module_info", { json });
  },
  module_data: (connection, received_data, managers) => {
    // TODO custom additional data
    const json = managers.admin_server.root_module.data;
    managers.admin_server.send(connection.get_id(), "module_data", { json });
  },
  process_script: (connection, received_data, managers) => {
    const { script } = received_data;
    const command = "script";
    const commands_map =
      managers.admin_server.root_module.application._commands_map;

    if (!(command in commands_map)) {
      logger.error("Command does not exist:", command, "with args:", args);
      return false;
    }

    logger.log(
      `Executing command[${command}] with arg[${
        script.length >= 10 ? `${script.substr(0, 10)}...` : script
      }]`
    );
    commands_map[command](script);
  },
  scripts_list: (connection, received_data, managers) => {
    const app = managers.admin_server.root_module.application;

    const scripts_list = Object.keys(app.scripts_manager.scripts_map);

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
