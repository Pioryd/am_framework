class ReturnData {
  constructor() {
    this.queues = {};
  }

  insert({ script_id, query_id, value }) {
    if (!(script_id in this.queues)) this.queues[script_id] = [];

    this.queues[script_id].push({ query_id, value });
  }

  pop(script_id) {
    if (!(script_id in this.queues)) return [];

    const current_length = this.queues[script_id].length;
    const pop_array = [];
    for (let i = 0; i < current_length; i++)
      pop_array.push(this.queues[script_id].shift());

    return pop_array;
  }
}

module.exports = ReturnData;
