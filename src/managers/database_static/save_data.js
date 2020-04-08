const { create_logger } = require("../../logger");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const save_data = ({
  step = "connect",
  error = null,
  results = [],
  on_success = () => {},
  on_error = () => {},
  manager
}) => {
  const save_db_object = last_step => {
    let db_object = null;
    let collection_name = null;

    if (Object.keys(manager.db_objects_map).length === 0) {
      db_object = null;
    } else if (last_step === "") {
      collection_name = Object.keys(manager.db_objects_map)[0];
      db_object = Object.values(manager.db_objects_map)[0];
    } else {
      last_collection_name = last_step.split(".")[0];

      const keys = Object.keys(manager.db_objects_map);
      if (keys.indexOf(last_collection_name) < keys.length - 1) {
        collection_name = keys[keys.indexOf(last_collection_name) + 1];
        db_object = manager.db_objects_map[collection_name];
      }
    }

    if (db_object != null) {
      manager.db_objects_map[collection_name].model[db_object.model_save_fn](
        manager.root_module.data[manager.db_objects_map[collection_name].data],
        (...args) => {
          save_data(
            Object.assign(...args, {
              on_success,
              on_error,
              manager
            })
          );
        }
      );
    } else {
      save_data({
        step: "db_object_loaded",
        on_success,
        on_error,
        manager
      });
    }
  };

  if (error != null) {
    logger.error(error);
    on_error();
    return;
  }

  if (step === "connect") {
    manager.database.connect(() => {
      save_data({
        step: "connected",
        on_success,
        on_error,
        manager
      });
    });
  } else if (step === "connected") {
    save_db_object("");
  } else if (step === "db_object_loaded") {
    on_success();
    //console.log("saved");
  } else {
    save_db_object(step);
  }
};

module.exports = { save_data };
