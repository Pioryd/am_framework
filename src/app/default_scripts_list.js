module.exports = [
  {
    name: "close",
    desc: "Close application",
    args: [],
    fn: (app, args) => {
      const { force } = args;
      if (force === true) process.exit(0);
      else app.close();
    }
  },
  {
    name: "help",
    desc: "Print scripts list",
    args: [],
    fn: (app, args) => {
      const command_list = {};
      for (const script of Object.values(app.scripts_manager.scripts_map)) {
        const { name, desc, args } = script;
        command_list[name] = { desc, args };
      }
      app.logger.log("Commands:", JSON.stringify(command_list, null, 2));
    }
  },
  {
    name: "net_msg",
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
