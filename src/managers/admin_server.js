const _ = require("lodash");

const logger = require("../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const { Server } = require("./server");

const parse_packet = {
  accept_connection(connection, received_data, managers) {
    const login = received_data.login;
    const password = received_data.password;

    const config = managers.core_admin_server.config;
    if (
      login == null ||
      password == null ||
      config.login.toLowerCase() !== login.toLowerCase() ||
      config.password !== password.toLowerCase()
    ) {
      managers.core_admin_server.handle_error(
        connection,
        received_data,
        managers,
        `Unable to accept connection. Login[${login}] Password[${password}]`
      );
      return false;
    }

    connection.on_close = (connection) => {};
    managers.core_admin_server.send(connection.get_id(), "accept_connection", {
      user_name: login,
      editor_data_config: managers.core_editor.data_config
    });
    return true;
  },
  module_info(connection, received_data, managers) {
    const { root_module } = managers.core_admin_server;
    const modules_map = Object.keys(
      root_module.application.modules_manager.modules_map
    );
    const root_module_name = modules_map[0];

    const json = { root_module_name, modules_map };
    managers.core_admin_server.send(connection.get_id(), "module_info", {
      json
    });
  },
  module_data(connection, received_data, managers) {
    managers.core_admin_server.send(connection.get_id(), "module_data", {
      json: _.cloneDeep(managers.core_admin_server.root_module.data)
    });
  },
  editor_config(connection, received_data, managers) {
    managers.core_admin_server.send(connection.get_id(), "editor_config", {
      data_config: managers.core_editor.data_config
    });
  },
  editor_data(connection, received_data, managers) {
    const { action_id, name } = received_data;

    const callback = (objects_list, message) => {
      managers.core_admin_server.send(
        connection.get_id(),
        `editor_data_${name}`,
        {
          action_id,
          objects_list,
          message
        }
      );
    };

    if (!managers.core_editor.has_action(name, "data")) {
      const message = `Data[${name}] does not support action[${data}].`;
      callback({}, message);
    } else {
      managers.core_editor.get_data(name, callback);
    }
  },
  editor_update(connection, received_data, managers) {
    let { action, object, name, old_id, new_id } = received_data;

    const callback = (object, error) => {
      if (object != null)
        message =
          {
            new: `Added object with id[${object.id}]`,
            remove: `Removed object with id[${object.id}]`,
            update: `Updated object with id[${object.id}]`,
            replace_id: `Replaced old_id[${old_id}] with new_id[${new_id}]`
          }[action.type] ||
          `Wrong action type. Id[${action.id}] Type: [${action.type}]`;

      if (error != null) message = error;

      managers.core_admin_server.send(
        connection.get_id(),
        `editor_update_${name}`,
        {
          action_id: action.id,
          message
        }
      );
    };

    if (!managers.core_editor.has_action(name, "update")) {
      const message = `Data[${name}] does not support action[${data}].`;
      callback(null, message);
    } else {
      managers.core_editor.update_data(
        {
          action,
          object,
          name,
          old_id,
          new_id
        },
        callback
      );
    }
  },
  editor_process(connection, received_data, managers) {
    let { action_id, object, name } = received_data;

    const callback = ({ ret_val, error_data }) => {
      managers.core_admin_server.send(
        connection.get_id(),
        `editor_update_${name}`,
        {
          action_id,
          message: { ret_val, error_data }
        }
      );
    };

    if (!managers.core_editor.has_action(name, "process")) {
      const message = `Data[${name}] does not support action[${data}].`;
      callback({ ret_val: null, error_data: message });
    } else {
      managers.core_editor.process_data({ object, name }, callback);
    }
  }
};

class AdminServer extends Server {
  constructor({ root_module, config }) {
    super({ root_module, config, parse_packet });
  }

  send(connection_id, packet_id, packet_data) {
    super.send(connection_id, "root", { packet_id, packet_data });
  }
}

module.exports = { AdminServer };
