const { Util } = require("../../../util");
const Scope = require("./scope");
const JS = require("./js");
const Scope_IF = require("./scope_if");
const Scope_WHILE = require("./scope_while");
const Scope_FOR = require("./scope_for");
const Internal = require("./internal");
const Api = require("./api");

function parse_instruction(script, instruction) {
  const instructions_map = {
    internal: parse_instruction_internal,
    js: parse_instruction_js,
    scope: parse_instruction_scope,
    if: parse_instruction_if,
    while: parse_instruction_while,
    for: parse_instruction_for,
    api: parse_instruction_api
  };

  let type = instruction.type;

  if (!(type in instructions_map)) {
    throw new Error(
      `Unknown type[${type}].` +
        ` Unable to parse instruction[${JSON.stringify(
          instruction,
          null,
          2
        )}]` +
        ` of script name:[${script.get_name()}] ID:[${script.get_id()}]`
    );
  }

  return instructions_map[type](script, instruction);
}

function parse_instruction_internal(script, instruction) {
  if (instruction.command == null || instruction.id == null)
    throw new Error("Unable to parse_instruction_internal: " + instruction);

  const [command, arg] = instruction.command.split(" ");

  return new Internal({ id: instruction.id, command, arg });
}

function parse_instruction_js(script, instruction) {
  if (instruction.body == null || instruction.id == null)
    throw new Error("Unable to parse_instruction_js: " + instruction);

  return new JS({
    id: instruction.id,
    fn: Util.string_to_function(`(script, root){${instruction.body};}`)
  });
}

function parse_instruction_scope(script, instruction) {
  if (instruction.instructions == null || instruction.id == null)
    throw new Error("Unable to parse_instruction: " + instruction);

  const initialization_data = { id: instruction.id, childs: [] };

  for (const source of instruction.instructions)
    initialization_data.childs.push(parse_instruction(script, source));

  return new Scope(initialization_data);
}

function parse_instruction_if(script, instruction) {
  if (instruction.conditions == null || instruction.id == null)
    throw new Error("Unable to parse_instruction_if: " + instruction);

  const initialization_data = { id: instruction.id, conditions: [] };

  for (const [fn_source, instructions_source] of Object.entries(
    instruction.conditions
  )) {
    const childs = [];
    for (const source of instructions_source)
      childs.push(parse_instruction(script, source));

    initialization_data.conditions.push({
      fn: Util.string_to_function(
        `(script, root){return ${fn_source === "" ? "true" : fn_source};}`
      ),
      childs
    });
  }

  return new Scope_IF(initialization_data);
}

function parse_instruction_while(script, instruction) {
  if (
    instruction.condition == null ||
    instruction.instructions == null ||
    instruction.id == null
  )
    throw new Error("Unable to parse_instruction_while: " + instruction);

  const initialization_data = { id: instruction.id, childs: [] };

  initialization_data.condition = Util.string_to_function(
    `(script, root){return ${
      instruction.condition === "" ? "true" : instruction.condition
    };}`
  );

  for (const source of instruction.instructions)
    initialization_data.childs.push(parse_instruction(script, source));

  return new Scope_WHILE(initialization_data);
}

function parse_instruction_for(script, instruction) {
  if (
    instruction.condition == null ||
    instruction.instructions == null ||
    instruction.id == null
  )
    throw new Error("Unable to parse_instruction_for: " + instruction);

  const [
    init_source,
    condition_source,
    increment_source
  ] = instruction.condition.split(";");

  const initialization_data = { id: instruction.id, childs: [] };

  if (init_source !== "")
    initialization_data.init = Util.string_to_function(
      `(script, root){${init_source};}`
    );
  if (condition_source !== "")
    initialization_data.condition = Util.string_to_function(
      `(script, root){return ${condition_source};}`
    );
  if (increment_source !== "")
    initialization_data.increment = Util.string_to_function(
      `(script, root){${increment_source};}`
    );

  for (const source of instruction.instructions)
    initialization_data.childs.push(parse_instruction(script, source));

  return new Scope_FOR(initialization_data);
}

function parse_instruction_api(script, instruction) {
  if (instruction.api == null || instruction.id == null)
    throw new Error("Unable to parse_instruction_api: " + instruction);

  const timeout = instruction.timeout != null ? instruction.timeout : "null";
  const return_data_key = instruction.return != null ? instruction.return : "";
  let args =
    "{" + (instruction.args != null ? instruction.args.toString() : "") + "}";
  let body =
    `const query_id = root.generate_unique_id();` +
    `script.add_return_data(` +
    `  {query_id, timeout: ${timeout}, key: "${return_data_key}"});` +
    `root.process_api(` +
    `  "${instruction.api}", script.get_id(), query_id, ${timeout}, ${args});`;

  return new Api({
    id: instruction.id,
    fn: Util.string_to_function(`(script, root){${body}}`)
  });
}

module.exports = parse_instruction;
