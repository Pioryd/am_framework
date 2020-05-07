const stringify = require("json-stringify-safe");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

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
    if (received_data.name === "admin_script") {
      this.editor_data_admin_script(connection, received_data, managers);
      return;
    }

    const { action_id, name } = received_data;

    managers.admin_server.send(connection.get_id(), `editor_data_${name}`, {
      action_id,
      db_objects_list: Object.values(managers.editor.get_data(name)),
      rules: managers.editor.data_config[name].validate
    });
  },
  editor_update(connection, received_data, managers) {
    if (received_data.name === "admin_script") {
      this.editor_update_admin_script(connection, received_data, managers);
      return;
    }
    let { action, object, name, old_id, new_id } = received_data;

    let message = null;
    try {
      object = managers.editor.update_data({
        action,
        object,
        name,
        old_id,
        new_id
      });

      message =
        {
          new: `Added object with id[${object.id}]`,
          remove: `Removed object with id[${object.id}]`,
          update: `Updated object with id[${object.id}]`,
          replace_id: `Replaced old_id[${old_id}] with new_id[${new_id}]`
        }[action.type] ||
        `Wrong action type. Id[${action.id}] Type: [${action.type}]`;
    } catch (e) {
      logger.error(e, e.stack, { action, object, name, old_id, new_id });
      message = e.message;
    }

    managers.admin_server.send(connection.get_id(), `editor_update_${name}`, {
      action_id: action.id,
      message
    });
  },
  editor_process(connection, received_data, managers) {
    if (received_data.name === "admin_script") {
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
    const { action, object, old_id, new_id } = received_data;

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
        desc: "",
        args: [],
        fn: `(app, args) => {}`
      };
      managers.admin_scripts.db.update_async(
        new_object.id,
        new_object,
        ({ error, result, data }) => {
          send(`Added object with id[${new_object.id}]. Errors[${error}]`);
        }
      );
    } else if (action.type === "remove") {
      managers.admin_scripts.db.remove_async(object.id, ({ error, result }) => {
        send(`Removed object with id[${object.id}]. Errors[${error}]`);
      });
    } else if (action.type === "update") {
      try {
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

        managers.admin_scripts.db.update_async(
          updated_data.id,
          updated_data,
          ({ error, result, data }) => {
            send(`Updated object with id[${object.id}]. Errors[${error}]`);
          }
        );
      } catch (e) {
        send(e.message);
      }
    } else if (action.type === "replace_id") {
      try {
        if (new_id == null || new_id.length < 1)
          throw new Error(
            `Unable to replace object id. Wrong new_id[${new_id}]`
          );
        if (old_id == null || old_id.length < 1)
          throw new Error(
            `Unable to replace object id. Not found object with id[${old_id}]`
          );

        managers.admin_scripts.db.get_async(
          old_id,
          ({ error, result, data }) => {
            managers.admin_scripts.db.update_async(
              old_id,
              { ...data, id: new_id },
              ({ error, result, data }) => {
                send(
                  `Replaced object old_id[${old_id}] new_id[${new_id}].` +
                    ` Errors[${error}]`
                );
              }
            );
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
