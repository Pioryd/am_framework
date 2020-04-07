const { Util } = require("../../util");
const Scope = require("./scope");
const JS = require("./js");
const Scope_IF = require("./scope_if");
const Scope_WHILE = require("./scope_while");
const Scope_FOR = require("./scope_for");
const Internal = require("./internal");
const Script = require("./script");
const Api = require("./api");

function parse(form, instruction) {
  const instructions_map = {
    internal: parse_instruction_internal,
    js: parse_instruction_js,
    scope: parse_instruction_scope,
    if: parse_instruction_if,
    while: parse_instruction_while,
    for: parse_instruction_for,
    script: parse_instruction_script,
    api: parse_instruction_api
  };

  let type = instruction.type;
  if (type == null && "root_scope" in instruction) type = "script";

  if (!(type in instructions_map)) {
    throw new Error(
      `Unknown type[${type}].` +
        ` Unable to parse instruction[${JSON.stringify(
          instruction,
          null,
          2
        )}]` +
        ` of form[${form.get_id()}]`
    );
  }

  return instructions_map[type](form, instruction);
}

function parse_instruction_internal(form, instruction) {
  if (instruction.command == null || instruction.id == null)
    throw "Unable to parse_instruction_internal: " + instruction;

  const [command, arg] = instruction.command.split(" ");

  const internal = new Internal();
  internal._id = instruction.id;
  internal._command = command;
  internal._arg = arg;

  return internal;
}

function parse_instruction_js(form, instruction) {
  if (instruction.body == null || instruction.id == null)
    throw "Unable to parse_instruction_js: " + instruction;

  const js = new JS();
  js._id = instruction.id;
  js._fn = Util.string_to_function(`(script, root){${instruction.body};}`);
  return js;
}

function parse_instruction_scope(form, instruction) {
  if (instruction.instructions == null || instruction.id == null)
    throw "Unable to parse_instruction: " + instruction;

  const scope = new Scope();
  scope._id = instruction.id;
  scope._timeout = instruction.timeout;
  for (const source of instruction.instructions)
    scope._childs.push(parse(form, source));

  return scope;
}

function parse_instruction_if(form, instruction) {
  if (instruction.conditions == null || instruction.id == null)
    throw "Unable to parse_instruction_if: " + instruction;

  const scope_if = new Scope_IF();
  scope_if._id = instruction.id;
  scope_if._timeout = instruction.timeout;
  for (const [fn_source, instructions_source] of Object.entries(
    instruction.conditions
  )) {
    const childs = [];

    for (const source of instructions_source) childs.push(parse(form, source));

    scope_if._conditions.push({
      fn: Util.string_to_function(
        `(script, root){return ${fn_source === "" ? "true" : fn_source};}`
      ),
      childs
    });
  }

  return scope_if;
}

function parse_instruction_while(form, instruction) {
  if (
    instruction.condition == null ||
    instruction.instructions == null ||
    instruction.id == null
  )
    throw "Unable to parse_instruction_while: " + instruction;

  const scope_while = new Scope_WHILE();
  scope_while._id = instruction.id;
  scope_while._timeout = instruction.timeout;
  scope_while._condition = Util.string_to_function(
    `(script, root){return ${
      instruction.condition === "" ? "true" : instruction.condition
    };}`
  );

  for (const source of instruction.instructions)
    scope_while._childs.push(parse(form, source));

  return scope_while;
}

function parse_instruction_for(form, instruction) {
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
  scope_for._id = instruction.id;
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
    scope_for._childs.push(parse(form, source));

  return scope_for;
}

function parse_instruction_script(form, instruction) {
  if (instruction.name == null || instruction.id == null)
    throw "Unable to parse_instruction_script: " + instruction;

  let data = instruction.data;
  let root_scope = instruction.root_scope;
  if (data == null || root_scope == null) {
    for (const script_source of form._source.scripts) {
      if (script_source.name === instruction.name) {
        data = script_source.data;
        root_scope = script_source.root_scope;
        break;
      }
    }
  }

  if (data == null || root_scope == null)
    throw "Unable to parse_instruction_script: " + instruction;

  const script = new Script();
  script._id = instruction.id;
  script._root = form._root;
  script._name = instruction.name;
  script._timeout = instruction.timeout;
  script.data = JSON.parse(JSON.stringify(data)); // Can be shared
  script._root_scope = parse(form, root_scope);
  return script;
}

function parse_instruction_api(form, instruction) {
  if (instruction.name == null || instruction.id == null)
    throw "Unable to parse_instruction_api: " + instruction;

  const timeout = instruction.timeout != null ? instruction.timeout : "null";
  const return_data_key = instruction.return != null ? instruction.return : "";
  let args =
    "{" + (instruction.args != null ? instruction.args.toString() : "") + "}";
  let body =
    `const query_id = root.generate_unique_id();` +
    `script.add_return_data(` +
    `  {query_id, timeout: ${timeout}, key: "${return_data_key}"});` +
    `root.api(` +
    `  "${instruction.name}", script._id, query_id, ${timeout}, ${args});`;
  const api = new Api();
  api._id = instruction.id;
  api._fn = Util.string_to_function(`(script, root){${body};}`);
  return api;
}

module.exports = parse;
