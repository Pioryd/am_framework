const { create_logger } = require("../../logger");

const logger = create_logger({
  module_name: "am_framework",
  file_name: __filename
});

const { repair_data } = require("./repair_data");

const load_data = ({
  step = "connect",
  error = null,
  results = [],
  on_success = () => {},
  on_error = () => {},
  manager
}) => {
  const check_collections = collections => {
    for (const collection_name of Object.keys(manager.db_objects_map)) {
      let found = false;
      for (const collection of collections) {
        if (collection_name === collection.name) {
          found = true;
          break;
        }
      }

      if (!found) {
        logger.info(
          "Database does not include collection [" +
            collection_name +
            "]. Existed:",
          collections
        );

        load_data({
          step: "check_loaded_data",
          on_success,
          on_error,
          manager
        });

        return;
      }
    }

    load_data({
      step: "connected",
      on_success,
      on_error,
      manager
    });
  };

  const check_loaded_data = () => {
    if (manager.root_module.data.settings.generated === false) return;

    if (manager.root_module.data.settings.backup === true)
      repair_data({ manager });

    if (manager.root_module.data.settings.corrupted === true) return;

    manager.ready =
      manager.root_module.data.settings.generated === true &&
      Object.keys(manager.root_module.data.lands_map).length > 0 &&
      Object.keys(manager.root_module.data.characters_map).length > 0;

    logger.info(`Data is ${manager.ready ? "" : "NOT"} loaded correctly.`);
  };

  const load_db_object = last_step => {
    const create_objects = (results_list, db_object) => {
      const model_load_fn_list = {
        load: () => {
          if (results_list.length <= 0) return;

          if (db_object.object_class == null) {
            manager.root_module.data[db_object.data] = {
              ...results_list[0]._doc
            };
          } else if (db_object.manager != null) {
            manager.root_module.data[
              db_object.data
            ] = new db_object.object_class(
              {
                ...results_list[0]._doc
              },
              manager.root_module.managers[db_object.manager]
            );
          } else {
            manager.root_module.data[
              db_object.data
            ] = new db_object.object_class({
              ...results_list[0]._doc
            });
          }

          delete db_object._id;
          delete db_object.__v;
        },
        load_all: () => {
          for (const result of results_list) {
            let new_object = {};
            if (db_object.object_class == null) {
              new_object = { ...result._doc };
            } else if (db_object.manager != null) {
              new_object = new manager.objects_classes[db_object.object_class](
                { ...result._doc },
                manager.root_module.managers[db_object.manager]
              );
            } else {
              new_object = new manager.objects_classes[db_object.object_class]({
                ...result._doc
              });
            }

            delete new_object._data._id;
            delete new_object._data.__v;
            manager.root_module.data[db_object.data][
              result._doc[db_object.collection_uid]
            ] = new_object;
          }
        }
      };

      model_load_fn_list[db_object.model_load_fn]();
    };

    let db_object = null;
    let collection_name = null;
    let next_db_object = null;
    let next_collection_name = null;

    if (Object.keys(manager.db_objects_map).length === 0) {
      db_object = null;
    } else if (last_step === "") {
      next_collection_name = Object.keys(manager.db_objects_map)[0];
      next_db_object = Object.values(manager.db_objects_map)[0];
    } else {
      collection_name = last_step.split(".")[0];
      db_object = manager.db_objects_map[collection_name];

      const keys = Object.keys(manager.db_objects_map);
      if (keys.indexOf(collection_name) < keys.length - 1) {
        next_collection_name = keys[keys.indexOf(collection_name) + 1];
        next_db_object = manager.db_objects_map[next_collection_name];
      }
    }

    if (db_object != null) create_objects(results, db_object);

    if (next_db_object != null) {
      manager.db_objects_map[next_collection_name].model[
        next_db_object.model_load_fn
      ]((...args) => {
        load_data(
          Object.assign(...args, {
            on_success,
            on_error,
            manager
          })
        );
      });
    } else {
      load_data({
        step: "db_object_loaded",
        on_success,
        on_error,
        manager
      });
    }
  };

  if (!Array.isArray(results)) results = results == null ? [] : [results];

  if (error != null) {
    logger.info("load_data error:", error);
    on_error();
    return;
  }

  if (step === "connect") {
    manager.database.connect(collections => {
      check_collections(collections);
    });
  } else if (step === "connected") {
    load_db_object("");
  } else if (step === "db_object_loaded") {
    check_loaded_data();
    on_success();
    logger.info("Load data from database finished.");
  } else {
    load_db_object(step);
  }
};

module.exports = { load_data };
