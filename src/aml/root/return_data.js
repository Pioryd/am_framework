class ReturnData {
  constructor() {
    this.queues = {};
  }

  insert({ aml, query_id, value }) {
    const id = this._get_id(aml);
    if (!(id in this.queues)) this.queues[id] = [];

    this.queues[id].push({ query_id, value });
  }

  pop(aml) {
    const id = this._get_id(aml);
    if (!(id in this.queues)) return [];

    const current_length = this.queues[id].length;
    const pop_array = [];
    for (let i = 0; i < current_length; i++)
      pop_array.push(this.queues[id].shift());

    return pop_array;
  }

  _get_id(aml) {
    return aml.script + aml.module + aml.program + aml.system;
  }
}

module.exports = ReturnData;
