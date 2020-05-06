module.exports = [
  {
    id: "close",
    desc: "Close application",
    args: [],
    fn: (app, args) => {
      const { force } = args;
      if (force === true) process.exit(0);
      else app.close();
    }
  },
  {
    id: "help",
    desc: "Print scripts list",
    args: [],
    fn: (app, args) => {
      const command_list = {};

      const module_name = Object.keys(app.modules_manager.modules_map)[0];
      const module = app.modules_manager.modules_map[module_name];

      for (const script of Object.values(
        module.managers.admin_scripts.get_scripts_map()
      )) {
        const { id, desc, args } = script;
        command_list[id] = { desc, args };
      }
      app.logger.log(
        `Module[${module_name}] Commands:\n ` +
          `${JSON.stringify(command_list, null, 2)}`
      );
    }
  },
  {
    id: "net_msg",
    desc: "Enable/Disable network logs",
    args: ["module name", "manager(server) name", "enabled[true/false]"],
    fn: (app, args) => {
      const [module_name, manager_name, enabled] = args;
      const root_module = app.modules_manager.modules_map[module_name];

      const enabled_msg = enabled === true;
      const manager = root_module.managers[manager_name];

      const net_logger = "server" in manager ? manager.server : manager.client;

      net_logger.options = {
        ...net_logger.options,
        print_log: enabled_msg,
        print_info: enabled_msg,
        print_error: enabled_msg,
        print_warn: enabled_msg,
        print_debug: enabled_msg
      };
    }
  }
];
