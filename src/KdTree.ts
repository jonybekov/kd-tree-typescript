import { BinaryHeap } from "@/BinaryHeap";
import { Node } from "@/Node";

export class KdTree<T> {
  private root: Node<T> | null = null;
  private dimensions: string[];
  private metric: (a: T, b: T) => number;

  constructor(
    points: T[] | Node<T>,
    metric: (a: T, b: T) => number,
    dimensions: string[]
  ) {
    this.metric = metric;
    this.dimensions = dimensions;

    if (!Array.isArray(points)) {
      this.loadTree(points);
    } else {
      this.root = this.buildTree(points, 0, null);
    }
  }

  private buildTree(
    points: T[],
    depth: number,
    parent: Node<T> | null
  ): Node<T> | null {
    const dim = depth % this.dimensions.length;

    if (points.length === 0) {
      return null;
    }
    if (points.length === 1) {
      return new Node(points[0], dim, parent);
    }

    points.sort(
      (a, b) =>
        (a as any)[this.dimensions[dim]] - (b as any)[this.dimensions[dim]]
    );

    const median = Math.floor(points.length / 2);
    const node = new Node(points[median], dim, parent);
    node.left = this.buildTree(points.slice(0, median), depth + 1, node);
    node.right = this.buildTree(points.slice(median + 1), depth + 1, node);

    return node;
  }

  private loadTree(data: Node<T>): void {
    this.root = data;

    const restoreParent = (root: Node<T>): void => {
      if (root.left) {
        root.left.parent = root;
        restoreParent(root.left);
      }

      if (root.right) {
        root.right.parent = root;
        restoreParent(root.right);
      }
    };

    restoreParent(this.root);
  }

  toJSON(src: Node<T> | null = this.root): Node<T> | null {
    if (!src) return null;
    const dest = new Node(src.obj, src.dimension, null);
    if (src.left) dest.left = this.toJSON(src.left);
    if (src.right) dest.right = this.toJSON(src.right);
    return dest;
  }

  insert(point: T): void {
    const innerSearch = (
      node: Node<T> | null,
      parent: Node<T> | null
    ): Node<T> | null => {
      if (node === null) {
        return parent;
      }

      const dimension = this.dimensions[node.dimension];
      if ((point as any)[dimension] < (node.obj as any)[dimension]) {
        return innerSearch(node.left, node);
      } else {
        return innerSearch(node.right, node);
      }
    };

    const insertPosition = innerSearch(this.root, null);

    if (insertPosition === null) {
      this.root = new Node(point, 0, null);
      return;
    }

    const newNode = new Node(
      point,
      (insertPosition.dimension + 1) % this.dimensions.length,
      insertPosition
    );
    const dimension = this.dimensions[insertPosition.dimension];

    if ((point as any)[dimension] < (insertPosition.obj as any)[dimension]) {
      insertPosition.left = newNode;
    } else {
      insertPosition.right = newNode;
    }
  }

  remove(point: T): void {
    const nodeSearch = (node: Node<T> | null): Node<T> | null => {
      if (node === null) {
        return null;
      }

      if (node.obj === point) {
        return node;
      }

      const dimension = this.dimensions[node.dimension];

      if ((point as any)[dimension] < (node.obj as any)[dimension]) {
        return nodeSearch(node.left);
      } else {
        return nodeSearch(node.right);
      }
    };

    const removeNode = (node: Node<T>): void => {
      const findMin = (node: Node<T> | null, dim: number): Node<T> | null => {
        if (node === null) {
          return null;
        }

        const dimension = this.dimensions[dim];

        if (node.dimension === dim) {
          if (node.left !== null) {
            return findMin(node.left, dim);
          }
          return node;
        }

        const own = (node.obj as any)[dimension];
        const left = findMin(node.left, dim);
        const right = findMin(node.right, dim);
        let min: Node<T> | null = node;

        if (left !== null && (left.obj as any)[dimension] < own) {
          min = left;
        }
        if (
          right !== null &&
          (right.obj as any)[dimension] < (min.obj as any)[dimension]
        ) {
          min = right;
        }
        return min;
      };

      if (node.left === null && node.right === null) {
        if (node.parent === null) {
          this.root = null;
          return;
        }

        const pDimension = this.dimensions[node.parent.dimension];

        if (
          (node.obj as any)[pDimension] < (node.parent.obj as any)[pDimension]
        ) {
          node.parent.left = null;
        } else {
          node.parent.right = null;
        }
        return;
      }

      if (node.right !== null) {
        const nextNode = findMin(node.right, node.dimension);
        if (nextNode) {
          const nextObj = nextNode.obj;
          removeNode(nextNode);
          node.obj = nextObj;
        }
      } else {
        const nextNode = findMin(node.left, node.dimension);
        if (nextNode) {
          const nextObj = nextNode.obj;
          removeNode(nextNode);
          node.right = node.left;
          node.left = null;
          node.obj = nextObj;
        }
      }
    };

    const node = nodeSearch(this.root);

    if (node === null) {
      return;
    }

    removeNode(node);
  }

  nearest(point: T, maxNodes: number, maxDistance?: number): [T, number][] {
    const bestNodes = new BinaryHeap<[Node<T>, number]>(e => -e[1]);

    const nearestSearch = (node: Node<T>): void => {
      const dimension = this.dimensions[node.dimension];
      const ownDistance = this.metric(point, node.obj);
      const linearPoint: { [key: string]: any } = {};

      for (let i = 0; i < this.dimensions.length; i += 1) {
        if (i === node.dimension) {
          linearPoint[this.dimensions[i]] = (point as any)[this.dimensions[i]];
        } else {
          linearPoint[this.dimensions[i]] = (node.obj as any)[
            this.dimensions[i]
          ];
        }
      }

      const linearDistance = this.metric(linearPoint as T, node.obj);

      const saveNode = (node: Node<T>, distance: number): void => {
        bestNodes.push([node, distance]);
        if (bestNodes.size() > maxNodes) {
          bestNodes.pop();
        }
      };

      if (node.right === null && node.left === null) {
        if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
          saveNode(node, ownDistance);
        }
        return;
      }

      let bestChild: Node<T> | null;
      if (node.right === null) {
        bestChild = node.left;
      } else if (node.left === null) {
        bestChild = node.right;
      } else {
        if ((point as any)[dimension] < (node.obj as any)[dimension]) {
          bestChild = node.left;
        } else {
          bestChild = node.right;
        }
      }

      if (bestChild) nearestSearch(bestChild);

      if (bestNodes.size() < maxNodes || ownDistance < bestNodes.peek()[1]) {
        saveNode(node, ownDistance);
      }

      if (
        bestNodes.size() < maxNodes ||
        Math.abs(linearDistance) < bestNodes.peek()[1]
      ) {
        const otherChild = bestChild === node.left ? node.right : node.left;
        if (otherChild !== null) {
          nearestSearch(otherChild);
        }
      }
    };

    if (maxDistance) {
      for (let i = 0; i < maxNodes; i += 1) {
        bestNodes.push([null as unknown as Node<T>, maxDistance]);
      }
    }

    if (this.root) nearestSearch(this.root);

    const result: [T, number][] = [];

    for (let i = 0; i < Math.min(maxNodes, bestNodes.content.length); i += 1) {
      if (bestNodes.content[i][0]) {
        result.push([bestNodes.content[i][0].obj, bestNodes.content[i][1]]);
      }
    }
    return result;
  }

  balanceFactor(): number {
    const height = (node: Node<T> | null): number => {
      if (node === null) {
        return 0;
      }
      return Math.max(height(node.left), height(node.right)) + 1;
    };

    const count = (node: Node<T> | null): number => {
      if (node === null) {
        return 0;
      }
      return count(node.left) + count(node.right) + 1;
    };

    return height(this.root) / (Math.log(count(this.root)) / Math.log(2));
  }
}
