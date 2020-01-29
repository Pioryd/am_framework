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

function parse(root, instruction) {
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

  return instructions_map[instruction.type](root, instruction);
}

function parse_instruction_scope(root, instruction) {
  if (instruction.instructions == null || instruction.id == null)
    throw "Unable to parse_instruction: " + instruction;

  const scope = new Scope();
  scope.id = instruction.id;
  scope._timeout = instruction.timeout;
  for (const source of instruction.instructions)
    scope._childs.push(parse(root, source));

  return scope;
}

function parse_instruction_internal(root, instruction) {
  if (instruction.command == null || instruction.id == null)
    throw "Unable to parse_instruction_internal: " + instruction;

  const [command, arg] = instruction.command.split(" ");

  const internal = new Internal();
  internal.id = instruction.id;
  internal._timeout = instruction.timeout;
  internal._command = command;
  internal._arg = arg;

  return internal;
}

function parse_instruction_js(root, instruction) {
  if (instruction.body == null || instruction.id == null)
    throw "Unable to parse_instruction_js: " + instruction;

  const js = new JS();
  js.id = instruction.id;
  js._timeout = instruction.timeout;
  js._fn = Util.string_to_function(`(script, root){${instruction.body};}`);
  return js;
}

function parse_instruction_if(root, instruction) {
  if (instruction.conditions == null || instruction.id == null)
    throw "Unable to parse_instruction_if: " + instruction;

  const scope_if = new Scope_IF();
  scope_if.id = instruction.id;
  scope_if._timeout = instruction.timeout;
  for (const [fn_source, instructions_source] of Object.entries(
    instruction.conditions
  )) {
    const childs = [];

    for (const source of instructions_source) childs.push(parse(root, source));

    scope_if._conditions.push({
      fn: Util.string_to_function(
        `(script, root){return ${fn_source === "" ? "true" : fn_source};}`
      ),
      childs
    });
  }

  return scope_if;
}

function parse_instruction_while(root, instruction) {
  if (
    instruction.condition == null ||
    instruction.instructions == null ||
    instruction.id == null
  )
    throw "Unable to parse_instruction_while: " + instruction;

  const scope_while = new Scope_WHILE();
  scope_while.id = instruction.id;
  scope_while._timeout = instruction.timeout;
  scope_while._condition = Util.string_to_function(
    `(script, root){return ${
      instruction.condition === "" ? "true" : instruction.condition
    };}`
  );

  for (const source of instruction.instructions)
    scope_while._childs.push(parse(root, source));

  return scope_while;
}

function parse_instruction_for(root, instruction) {
  if (
    instruction.condition == null ||
    instruction.instructions == null ||
    instruction.id == null
  )
    throw "Unable to parse_instruction_for: " + instruction;

  const [
    init_source,
    condition_source,
    increment_source
  ] = instruction.condition.split(";");
  const scope_for = new Scope_FOR();
  scope_for.id = instruction.id;
  scope_for._timeout = instruction.timeout;
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
    scope_for._childs.push(parse(root, source));

  return scope_for;
}

function parse_instruction_script(root, instruction) {
  if (
    instruction.name == null ||
    (instruction.id == null &&
      (instruction.data == null || instruction.root_scope == null))
  )
    throw "Unable to parse_instruction_script: " + instruction;

  let data = instruction.data;
  let root_scope = instruction.root_scope;
  if (data == null || root_scope == null) {
    const script_source = root.scripts[instruction.name];
    data = script_source.data;
    root_scope = script_source.root_scope;
  }

  const script = new Script();
  script._source = instruction;
  script._name = instruction.name;
  script._timeout = instruction.timeout;
  script.data = JSON.parse(JSON.stringify(data));
  script._root_scope = parse(root, root_scope);
  return script;
}

function parse_instruction_api(root, instruction) {
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
