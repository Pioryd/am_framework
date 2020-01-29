const logger = require("../../logger").create_logger({
  module_name: "am_framework",
  file_name: __filename
});
const { Util } = require("../../util");
const Scope = require("./scope");
const JS = require("./js");
const Scope_IF = require("./scope_if");
const Scope_WHILE = require("./scope_while");
const Scope_FOR = require("./scope_for");
const Internal = require("./internal");
const Script = require("./script");

function parse(instruction) {
  const instructions_map = {
    scope: parse_instruction_scope,
    internal: parse_instruction_internal,
    js: parse_instruction_js,
    api: parse_instruction_api,
    if: parse_instruction_if,
    while: parse_instruction_while,
    for: parse_instruction_for,
    script: parse_instruction_script
  };

  return instructions_map[instruction.type](instruction);
}

function parse_instruction_scope(instruction) {
  if (instruction.instructions == null || instruction.id == null)
    throw ("Unable to parse_instruction: ", instruction);

  const scope = new Scope();
  scope.id = instruction.id;
  for (const source of instruction.instructions)
    scope._childs.push(parse(source));

  return scope;
}

function parse_instruction_internal(instruction) {
  if (instruction.command == null || instruction.id == null)
    throw ("Unable to parse_instruction_internal: ", instruction);

  const [command, arg] = instruction.command.split(" ");

  const internal = new Internal();
  internal.id = instruction.id;
  internal._command = command;
  internal._arg = arg;

  return internal;
}

function parse_instruction_js(instruction) {
  if (instruction.body == null || instruction.id == null)
    throw ("Unable to parse_instruction_js: ", instruction);

  const js = new JS();
  js.id = instruction.id;
  js._fn = Util.string_to_function(`(script, root){${instruction.body};}`);
  return js;
}

function parse_instruction_if(instruction) {
  if (instruction.conditions == null || instruction.id == null)
    throw ("Unable to parse_instruction_if: ", instruction);

  const scope_if = new Scope_IF();
  scope_if.id = instruction.id;
  for (const [fn_source, instructions_source] of Object.entries(
    instruction.conditions
  )) {
    const childs = [];

    for (const source of instructions_source) childs.push(parse(source));

    scope_if._conditions.push({
      fn: Util.string_to_function(
        `(script, root){return ${fn_source === "" ? "true" : fn_source};}`
      ),
      childs
    });
  }

  return scope_if;
}

function parse_instruction_while(instruction) {
  if (
    instruction.condition == null ||
    instruction.instructions == null ||
    instruction.id == null
  )
    throw ("Unable to parse_instruction_while: ", instruction);

  const scope_while = new Scope_WHILE();
  scope_while.id = instruction.id;
  scope_while._condition = Util.string_to_function(
    `(script, root){return ${
      instruction.condition === "" ? "true" : instruction.condition
    };}`
  );

  for (const source of instruction.instructions)
    scope_while._childs.push(parse(source));

  return scope_while;
}

function parse_instruction_for(instruction) {
  if (
    instruction.condition == null ||
    instruction.instructions == null ||
    instruction.id == null
  )
    throw ("Unable to parse_instruction_for: ", instruction);

  const [
    init_source,
    condition_source,
    increment_source
  ] = instruction.condition.split(";");
  const scope_for = new Scope_FOR();
  scope_for.id = instruction.id;
  if (init_source !== "")
    scope_for._init = Util.string_to_function(
      `(script, root){${init_source};}`
    );
  if (condition_source !== "")
    scope_for._condition = Util.string_to_function(
      `(script, root){return ${condition_source};}`
    );
  if (increment_source !== "")
    scope_for._increment = Util.string_to_function(
      `(script, root){${increment_source};}`
    );

  for (const source of instruction.instructions)
    scope_for._childs.push(parse(source));

  return scope_for;
}

function parse_instruction_script(instruction) {
  if (instruction.name == null || instruction.data == null)
    throw ("Unable to parse_instruction_script: ", instruction);

  const script = new Script();
  script._source = instruction;
  script._name = instruction.name;
  script.data = JSON.parse(JSON.stringify(instruction.data));
  script._root_scope = parse(instruction.root_scope);
  return script;
}

function parse_instruction_api(instruction) {
  // const api_formated_string =
  //   "root.api[" +
  //   instruction.api.replace(".", "][") +
  //   "]" +
  //   "(" +
  //   "script" +
  //   `"${"timeout" in instruction ? instruction.timeout : ""}", ` +
  //   `"${"return" in instruction ? instruction.return : ""}", ` +
  //   instruction.args.toString() +
  //   ")";
  // return Util.string_to_function(`(script, root){${api_formated_string};}`);
}

module.exports = parse;
