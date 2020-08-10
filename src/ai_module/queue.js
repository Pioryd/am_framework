class Queue {
  constructor() {
    this.out_queue = [];
    this.in_queue = [];
  }

  in_push(data) {
    this.in_queue.push(data);
  }

  in_pop() {
    return this.in_queue.shift();
  }

  out_push(data) {
    this.out_queue.push(data);
  }

  out_pop() {
    return this.out_queue.shift();
  }
}

module.exports = Queue;
