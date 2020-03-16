class Validator {
  constructor(rules) {
    this.rules = rules;
  }

  validate(object) {
    this._validate_object(this.rules, object);
  }

  _check_allowed_values(data_rule, data_object) {
    if ("disallowed_values" in data_rule.value)
      if (data_rule.value["disallowed_values"].includes(data_object.value))
        throw new Error(
          `Object[${JSON.stringify(data_object)}] with of rule key` +
            `[${data_rule.full_key}] contains disallowed value. ` +
            `[disallowed_values]`
        );

    if ("allowed_values" in data_rule.value) {
      if (!data_rule.value["allowed_values"].includes(data_object.value))
        throw new Error(
          `Object[${JSON.stringify(data_object)}] with of rule key` +
            `[${data_rule.full_key}] contains disallowed value. ` +
            `[allowed_values]`
        );
    }
  }

  _validate_object(rules, object, parent_key = "") {
    for (const [key, value] of Object.entries(rules)) {
      const data_rule = { key, value, full_key: parent_key + ":" + key };

      // Same rules for all types
      if ("required" in data_rule.value && data_rule.value["required"] === true)
        if (!(key in object))
          throw new Error(
            `Object with key[${key}}] is required.` +
              ` Rule key [${data_rule.full_key}]`
          );
    }

    for (const [key, value] of Object.entries(object)) {
      // Check if rules contains object key
      if (!Object.keys(rules).includes(key))
        throw new Error(
          `Rule[${parent_key}] doesn't contains object key[${key}].`
        );

      const data_rule = {
        key,
        value: rules[key],
        full_key: parent_key + ":" + key
      };
      const data_object = { key, value };

      // Validate data of child object
      this["_validate_data_object_" + data_rule.value.type](
        data_rule,
        data_object
      );
    }
  }

  _validate_data_object_string(data_rule, data_object) {
    if (
      !(typeof data_object.value === "string") &&
      !(data_object.value instanceof String)
    )
      throw new Error(
        `Value of object[${JSON.stringify(
          data_object
        )}] must be type[string]. Rule key[${data_rule.full_key}].`
      );

    if (
      ("empty" in data_rule.value && data_rule.value["empty"] === false) ||
      ("object_empty" in data_rule.value &&
        data_rule.value["object_empty"] === false)
    )
      if (data_object.value === "")
        throw new Error(
          `Value of object[${JSON.stringify(
            data_object
          )}] cannot be empty. of key[${data_rule.full_key}].`
        );

    this._check_allowed_values(data_rule, data_object);
  }

  _validate_data_object_number(data_rule, data_object) {
    if (isNaN(data_object.value))
      throw new Error(
        `Value of object[${JSON.stringify(
          data_object
        )}] must be type[number]. Rule key[${data_rule.full_key}].`
      );

    this._check_allowed_values(data_rule, data_object);
  }

  _validate_data_object_boolean(data_rule, data_object) {
    if (typeof data_object.value !== "boolean")
      throw new Error(
        `Value of object[${JSON.stringify(
          data_object
        )}] must be type[boolean]. Rule key[${data_rule.full_key}].`
      );

    this._check_allowed_values(data_rule, data_object);
  }

  _validate_data_object_array(data_rule, data_object) {
    if ("empty" in data_rule.value && data_rule.value["empty"] === false)
      if (data_object.value.length === 0)
        throw new Error(`Value of key[${data_rule.full_key}] cannot be empty.`);

    if (!("object_type" in data_rule.value))
      throw new Error(
        `Rule with key[${data_rule.full_key}] must have field[object_type].`
      );

    const supported_types = ["string", "number", "boolean", "object"];
    if (!supported_types.includes(data_rule.value["object_type"]))
      throw new Error(
        `Field[object_type] of rule key[${data_rule.full_key}]` +
          ` must be one of types[${supported_types}].`
      );

    // Handle array elements

    if (data_rule.value["object_type"] !== "object") {
      for (const data_object_array_value of data_object.value) {
        this["_validate_data_object_" + data_rule.value["object_type"]](
          data_rule,
          {
            key: data_rule.key,
            value: data_object_array_value
          }
        );
      }
    } else {
      // object_rules
      if (!("object_rules" in data_rule.value))
        throw new Error(
          `key[${data_rule.full_key}] must have field[object_rules].`
        );

      for (const array_object of data_object.value) {
        // object_type
        if (!(typeof array_object === "object"))
          throw new Error(
            `Object value of key[${data_rule.full_key}] must be type[object].`
          );

        // check if object have correct format
        if (Object.keys(array_object).length !== 1) {
          throw new Error(
            `Wrong array object format (empty).` +
              ` Correct is {"key": {value_1: "data...", (n)}}.` +
              ` Rule key[${data_rule.full_key}].`
          );
        }

        // split object key/value
        const array_object_key = Object.keys(array_object)[0];
        const array_object_value = Object.values(array_object)[0];

        // object_empty
        if (
          "object_empty" in data_rule.value &&
          data_rule.value["object_empty"] === false
        )
          if (Object.keys(array_object_value).length === 0)
            throw new Error(
              `Object of array object[${array_object_key}] ` +
                `of rule key[${data_rule.full_key}] cannot be empty.`
            );

        if (Object.keys(data_rule.value["object_rules"]).length === 0) return;

        // check if "object_rules" contains array object key
        if (
          !Object.keys(data_rule.value["object_rules"]).includes(
            array_object_key
          )
        )
          throw new Error(
            `Rules with key[${data_rule.full_key}] doesn't contains ` +
              `array object with key[${array_object_key}]`
          );

        this._validate_object(
          data_rule.value["object_rules"][array_object_key],
          array_object[array_object_key],
          data_rule.full_key
        );
      }
    }
  }
}

module.exports = Validator;
