export class Node<T> {
  obj: T;
  left: Node<T> | null;
  right: Node<T> | null;
  parent: Node<T> | null;
  dimension: number;

  constructor(obj: T, dimension: number, parent: Node<T> | null) {
    this.obj = obj;
    this.left = null;
    this.right = null;
    this.parent = parent;
    this.dimension = dimension;
  }
}
