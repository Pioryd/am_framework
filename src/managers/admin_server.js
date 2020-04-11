const stringify = require("json-stringify-safe");
const ObjectID = require("bson-objectid");
const Ajv = require("ajv");
const { Database } = require("../database");

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

function data_parse_and_send(
  connection,
  received_data,
  managers,
  { packet_ext_name, data_name, rule_name }
) {
  if (managers.admin_server.DefaultObjectClass == null)
    throw new Error("DefaultObjectClass is not set");

  const { action_id } = received_data;
  const module_data = managers.admin_server.root_module.data;

  const db_objects_list = [];

  for (const value of Object.values(module_data[data_name]))
    db_objects_list.push(value._data);

  managers.admin_server.send(connection.get_id(), `data_${packet_ext_name}`, {
    action_id,
    db_objects_list,
    rules: managers.admin_server.root_module.config.am_data_rules[rule_name]
  });
}

function update_parse_and_send(
  connection,
  received_data,
  managers,
  { packet_ext_name, data_name, create_data, validate }
) {
  if (managers.admin_server.DefaultObjectClass == null)
    throw new Error("DefaultObjectClass is not set");

  const { action, object } = received_data;
  const module_data = managers.admin_server.root_module.data;
  const map = module_data[data_name];

  let message = "Unknown";

  if (action.type === "new") {
    const new_id = ObjectID().toHexString();
    map[new_id] = new managers.admin_server.DefaultObjectClass(
      create_data(new_id)
    );
    message = `Added id[${new_id}]`;
  } else if (action.type === "remove") {
    delete map[object.id];
    message = `Removed id[${object.id}]`;
  } else if (action.type === "update") {
    try {
      validate(object);

      // "id: map[id].get_id()" to be sure id wont be override
      map[object.id]._data = {
        ...map[object.id]._data,
        ...object,
        id: map[object.id].get_id()
      };
      message = `Updated id[${object.id}]`;
    } catch (e) {
      logger.error(e);
      message = e.message;
    }
  } else {
    message = `Wrong action type. Id[${action.id}] Type: [${action.type}]`;
  }

  managers.admin_server.send(connection.get_id(), `update_${packet_ext_name}`, {
    action_id: action.id,
    message
  });
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
  scripts_process: (connection, received_data, managers) => {
    const {
      action_id,
      command,
      script_name,
      arguments_as_string
    } = received_data;
    const { scripts_manager } = managers.admin_server.root_module.application;

    scripts_manager.run_script({
      command,
      script_name,
      arguments_as_string,
      callback: ({ ret_val, error_data }) => {
        let json = {};
        if (ret_val != null) json = { action_id, ret_val };
        else if (error_data != null) json = { action_id, ...error_data };
        else json = { action_id };
        managers.admin_server.send(connection.get_id(), "scripts_process", {
          json
        });
      }
    });
  },
  scripts_data: (connection, received_data, managers) => {
    const { scripts_manager } = managers.admin_server.root_module.application;
    const scripts_data = scripts_manager.get_scripts_data();

    managers.admin_server.send(connection.get_id(), "scripts_data", {
      scripts_data
    });
  },
  scripts_update: (connection, received_data, managers) => {
    if (managers.admin_server.DefaultObjectClass == null)
      throw new Error("DefaultObjectClass is not set");

    const { action_id, id, object } = received_data;
    const module_data = managers.admin_server.root_module.data;
    const map = module_data.admin_scripts_map;

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

    managers.admin_server.send(connection.get_id(), "scripts_update", {
      action_id,
      message
    });
  },
  data_am_form: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_form",
      data_name: "am_forms_map",
      rule_name: "form"
    });
  },
  data_am_program: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_program",
      data_name: "am_programs_map",
      rule_name: "program"
    });
  },
  data_am_system: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_system",
      data_name: "am_systems_map",
      rule_name: "system"
    });
  },
  data_am_script: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_script",
      data_name: "am_scripts_map",
      rule_name: "script"
    });
  },
  update_am_form: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_form",
      data_name: "am_forms_map",
      create_data: new_id => {
        return {
          name: "new_" + new_id,
          id: new_id,
          rules: [],
          scripts: []
        };
      },
      validate: object => {
        validate_json(
          managers.admin_server.root_module.config.am_data_rules.form,
          object
        );
      }
    });
  },
  update_am_program: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_program",
      data_name: "am_programs_map",
      create_data: id => {
        return {
          name: "new_" + id,
          id,
          rules: [],
          forms: []
        };
      },
      validate: object => {
        validate_json(
          managers.admin_server.root_module.config.am_data_rules.program,
          object
        );
      }
    });
  },
  update_am_system: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_system",
      data_name: "am_systems_map",
      create_data: id => {
        return {
          name: "new_" + id,
          id,
          programs: []
        };
      },
      validate: object => {
        validate_json(
          managers.admin_server.root_module.config.am_data_rules.system,
          object
        );
      }
    });
  },
  update_am_script: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      packet_ext_name: "am_script",
      data_name: "am_scripts_map",
      create_data: id => {
        return {
          id: id,
          source: `id ${id}\r\nname new_${id}\r\n data\r\n`
        };
      },
      validate: object => AML.parse(object.source)
    });
  }
};

class AdminServerManager extends ServerManager {
  constructor({ root_module, config, DefaultObjectClass }) {
    super({ root_module, config, parse_packet, DefaultObjectClass });
  }
}

module.exports = AdminServerManager;
