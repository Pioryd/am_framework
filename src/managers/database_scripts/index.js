const DatabaseDynamic = require("../database_dynamic");

const ScriptModel = require("./script_model");

class DatabaseWorldManager extends DatabaseDynamic {
  constructor({ root_module, config }) {
    super({
      root_module,
      config,
      models: { script: new ScriptModel() }
    });
  }

  get_model() {
    return this.database.models["script"];
  }
}

module.exports = DatabaseWorldManager;
