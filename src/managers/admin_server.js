const stringify = require("json-stringify-safe");
const ObjectID = require("bson-objectid");
const Ajv = require("ajv");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { AML } = require("../scripting_system").ScriptingSystem;
const { Server } = require("./server");

const parse_packet = {
  accept_connection(connection, received_data, managers) {
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

    connection.on_close = (connection) => {};
    managers.admin_server.send(connection.get_id(), "accept_connection", {
      user_name: login
    });
    return true;
  },
  module_info(connection, received_data, managers) {
    const { root_module } = managers.admin_server;
    const modules_map = Object.keys(
      root_module.application.modules_manager.modules_map
    );
    const root_module_name = modules_map[0];

    const json = { root_module_name, modules_map };
    managers.admin_server.send(connection.get_id(), "module_info", { json });
  },
  module_data(connection, received_data, managers) {
    const json = JSON.parse(stringify(managers.admin_server.root_module.data));
    managers.admin_server.send(connection.get_id(), "module_data", { json });
  },
  editor_data(connection, received_data, managers) {
    if (received_data.type === "admin_script") {
      this.editor_data_admin_script(connection, received_data, managers);
      return;
    }

    const { action_id, type } = received_data;
    const module_data = managers.admin_server.root_module.data;

    if (!(type in module_data)) module_data[type] = {};

    managers.admin_server.send(connection.get_id(), `editor_data_${type}`, {
      action_id,
      db_objects_list: Object.values(module_data[type]),
      rules: managers.admin_server.config.validate_rules[type]
    });
  },
  editor_update(connection, received_data, managers) {
    if (received_data.type === "admin_script") {
      this.editor_update_admin_script(connection, received_data, managers);
      return;
    }

    const validate_json = (object, managers, var_ext_name) => {
      const rule = managers.admin_server.config.validate_rules[var_ext_name];
      const ajv = new Ajv({ allErrors: true });
      const validate = ajv.compile(rule);
      const valid = validate(object);
      if (!valid) throw new Error("AJV: " + ajv.errorsText(validate.errors));
    };

    const editor_fn = {
      am_form: {
        create_data: (id) => {
          return { id, name: `new_${id}`, rules: [], scripts: [] };
        },
        validate: validate_json
      },
      am_program: {
        create_data: (id) => {
          return { id, name: `new_${id}`, rules: [], forms: [] };
        },
        validate: validate_json
      },
      am_system: {
        create_data: (id) => {
          return { id, name: `new_${id}`, programs: [] };
        },
        validate: validate_json
      },
      am_script: {
        create_data: (id) => {
          return { id, source: `id ${id}\r\nname new_${id}\r\n data\r\n` };
        },
        validate: (object) => AML.parse(object.source)
      }
    };

    const { action, object, type } = received_data;
    const module_data = managers.admin_server.root_module.data;

    if (!(type in module_data)) module_data[type] = {};

    let message = "Unknown";

    if (action.type === "new") {
      const new_id = ObjectID().toHexString();
      module_data[type][new_id] = editor_fn[type].create_data(new_id);
      message = `Added id[${new_id}]`;
    } else if (action.type === "remove") {
      delete module_data[type][object.id];
      message = `Removed id[${object.id}]`;
    } else if (action.type === "update") {
      try {
        editor_fn[type].validate(object, managers, type);

        // "id: map[id].id" to be sure id wont be override
        module_data[type][object.id] = {
          ...module_data[type][object.id],
          ...object,
          id: module_data[type][object.id].id
        };
        message = `Updated id[${object.id}]`;
      } catch (e) {
        logger.error(e, e.stack);
        message = e.message;
      }
    } else {
      message = `Wrong action type. Id[${action.id}] Type: [${action.type}]`;
    }

    managers.admin_server.send(connection.get_id(), `editor_update_${type}`, {
      action_id: action.id,
      message
    });
  },
  editor_process(connection, received_data, managers) {
    if (received_data.type === "admin_script") {
      this.editor_process_admin_script(connection, received_data, managers);
      return;
    }
  },
  editor_process_admin_script(connection, received_data, managers) {
    const { action_id, object } = received_data;
    const { scripts_manager } = managers.admin_server.root_module.application;

    scripts_manager.run_script({
      script_fn_as_string: object.fn,
      callback: ({ ret_val, error_data }) => {
        try {
          managers.admin_server.send(
            connection.get_id(),
            "editor_process_admin_script",
            { action_id, message: { ret_val, error_data } }
          );
        } catch (e) {
          logger.error(e, e.stack);
        }
      }
    });
  },
  editor_data_admin_script(connection, received_data, managers) {
    const { action_id } = received_data;

    managers.admin_scripts.reload_scripts(() => {
      managers.admin_server.send(
        connection.get_id(),
        "editor_data_admin_script",
        {
          action_id,
          db_objects_list: Object.values(
            managers.admin_scripts.get_scripts_map()
          ),
          message: null
        }
      );
    });
  },
  editor_update_admin_script(connection, received_data, managers) {
    const { action, object } = received_data;

    const send = (message) => {
      try {
        managers.admin_server.send(
          connection.get_id(),
          "editor_update_admin_script",
          {
            action_id: action.id,
            message
          }
        );
      } catch (e) {
        logger.error(e, e.stack);
      }
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
      managers.admin_scripts.db.update_async(
        new_object,
        ({ error, result, data }) => {
          send(`Added id[${new_object.id}]. Errors[${error}]`);
        }
      );
    } else if (action.type === "remove") {
      managers.admin_scripts.db.remove_async(object.id, ({ error, result }) => {
        send(`Removed id[${object.id}]. Errors[${error}]`);
      });
    } else if (action.type === "update") {
      try {
        ["id", "type", "name", "desc", "args", "fn"].map((value) => {
          if (!(value in object))
            throw new Error(`Object doesn't contains key[${value}]`);
        });

        const updated_data = {
          id: object.id,
          type: object.type,
          name: object.name,
          desc: object.desc,
          args: object.args,
          fn: object.fn
        };

        managers.admin_scripts.db.update_async(
          updated_data,
          ({ error, result, data }) => {
            send(`Updated id[${object.id}]. Errors[${error}]`);
          }
        );
      } catch (e) {
        send(e.message);
      }
    } else {
      send(`Wrong action type. Id[${action.id}] Type: [${action.type}]`);
    }
  }
};

class AdminServer extends Server {
  constructor({ root_module, config, DefaultObjectClass }) {
    super({ root_module, config, parse_packet, DefaultObjectClass });
  }

  send(connection_id, packet_id, packet_data) {
    super.send(connection_id, "root", { packet_id, packet_data });
  }
}

module.exports = { AdminServer };
