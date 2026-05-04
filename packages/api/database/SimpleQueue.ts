type AsyncTask = () => Promise<any>;

export default class SimpleQueue {
  public queue: AsyncTask[] = [];
  public isProcessing = false;

  // Add a task to the queue
  enqueue(task: AsyncTask) {
    return new Promise<void>((resolve, reject) => {
      this.queue.push(() => task().then(resolve).catch(reject));
      void this.processQueue();
    });
  }

  async wait() {
    return new Promise<void>((resolve) => {
      this.queue.push(() => {
        resolve();
        return Promise.resolve();
      });
      void this.processQueue();
    });
  }

  // Process tasks in the queue one by one
  async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    while (this.queue.length > 0) {
      const task = this.queue.shift() as AsyncTask;
      await task();
    }

    this.isProcessing = false;
  }
}
