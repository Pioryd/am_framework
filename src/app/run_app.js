const { Application } = require("./application");

module.exports = {
  run_app: (dir_name) => {
    const application = new Application({
      root_full_name: String(dir_name)
    });

    application.run();
  }
};
