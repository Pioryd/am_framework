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

function validate_json(object, managers, var_ext_name) {
  const rule =
    managers.admin_server.root_module.config.am_data_rules[var_ext_name];
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(rule);
  const valid = validate(object);
  if (!valid) throw new Error("AJV: " + ajv.errorsText(validate.errors));
}

function data_parse_and_send(
  connection,
  received_data,
  managers,
  var_ext_name
) {
  if (managers.admin_server.DefaultObjectClass == null)
    throw new Error("DefaultObjectClass is not set");

  const { action_id } = received_data;
  const module_data = managers.admin_server.root_module.data;

  const db_objects_list = [];

  for (const value of Object.values(module_data[`${var_ext_name}s_map`]))
    db_objects_list.push(value._data);

  managers.admin_server.send(connection.get_id(), `data_${var_ext_name}`, {
    action_id,
    db_objects_list,
    rules: managers.admin_server.root_module.config.am_data_rules[var_ext_name]
  });
}

function update_parse_and_send(
  connection,
  received_data,
  managers,
  { var_ext_name, create_data, validate }
) {
  if (managers.admin_server.DefaultObjectClass == null)
    throw new Error("DefaultObjectClass is not set");

  const { action, object } = received_data;
  const module_data = managers.admin_server.root_module.data;
  const map = module_data[`${var_ext_name}s_map`];

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
      validate(object, managers, var_ext_name);

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

  managers.admin_server.send(connection.get_id(), `update_${var_ext_name}`, {
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
  process_admin_script: (connection, received_data, managers) => {
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
        managers.admin_server.send(
          connection.get_id(),
          "process_admin_script",
          { json }
        );
      }
    });
  },
  data_admin_script: (connection, received_data, managers) => {
    const { action_id } = received_data;

    managers.database_scripts.database.models["script"].load_all(
      ({ error, results }) => {
        const {
          scripts_manager
        } = managers.admin_server.root_module.application;
        const scripts_list = Object.values(scripts_manager.scripts_map);
        const db_objects_list = [];
        for (let i = 0; i < scripts_list.length; i++) {
          const object = scripts_list[i];
          db_objects_list.push({
            ...object,
            id: "local",
            fn: object.fn.toString()
          });
        }

        for (const result of results) {
          const data = result._doc;
          delete data._id;
          delete data.__v;
          db_objects_list.push(data);
        }

        managers.admin_server.send(connection.get_id(), "data_admin_script", {
          action_id,
          db_objects_list,
          message: error
        });
      }
    );
  },
  data_am_form: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, "am_form");
  },
  data_am_program: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, "am_program");
  },
  data_am_system: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, "am_system");
  },
  data_am_script: (connection, received_data, managers) => {
    data_parse_and_send(connection, received_data, managers, "am_script");
  },
  update_admin_script: (connection, received_data, managers) => {
    const { action, object } = received_data;
    const script_model = managers.database_scripts.database.models["script"];

    const send = message => {
      managers.admin_server.send(connection.get_id(), "update_admin_script", {
        action_id: action.id,
        message
      });
    };

    if (action.type === "new") {
      const new_id = ObjectID().toHexString();
      const new_object = {
        id: new_id,
        type: "type_" + new_id,
        name: "new_" + new_id,
        desc: "",
        args: [],
        fn: `(app, args) => {}`
      };
      script_model.save(new_object, ({ error, results }) =>
        send(`Added id[${object.id}]. Errors[${error}]`)
      );
    } else if (action.type === "remove") {
      script_model.remove(object.id, ({ error, results }) =>
        send(`Removed id[${object.id}]. Errors[${error}]`)
      );
    } else if (action.type === "update") {
      try {
        if (
          ["id", "type", "name", "desc", "args", "fn"].map(value => {
            if (!(value in object))
              throw new Error(`Object doesn't contains key[${value}]`);
          })
        )
          const updated_data = {
            id: object.id,
            type: object.type,
            name: object.name,
            desc: object.desc,
            args: object.args,
            fn: object.fn
          };

        script_model.save(updated_data, ({ error, results }) =>
          send(`Updated id[${object.id}]. Errors[${error}]`)
        );
      } catch (e) {
        send(e.message);
      }
    } else {
      send(`Wrong action type. Id[${action.id}] Type: [${action.type}]`);
    }
  },
  update_am_form: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      var_ext_name: "am_form",
      create_data: id => {
        return { id, name: `new_${id}`, rules: [], scripts: [] };
      },
      validate: validate_json
    });
  },
  update_am_program: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      var_ext_name: "am_program",
      create_data: id => {
        return { id, name: `new_${id}`, rules: [], forms: [] };
      },
      validate: validate_json
    });
  },
  update_am_system: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      var_ext_name: "am_system",
      create_data: id => {
        return { id, name: `new_${id}`, programs: [] };
      },
      validate: validate_json
    });
  },
  update_am_script: (connection, received_data, managers) => {
    update_parse_and_send(connection, received_data, managers, {
      var_ext_name: "am_script",
      create_data: id => {
        return { id, source: `id ${id}\r\nname new_${id}\r\n data\r\n` };
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
