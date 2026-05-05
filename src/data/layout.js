export const TILE_IDS = ['date', 'clock'];

export const DEFAULT_LAYOUT = { dir: 'h', ratio: 0.5, a: 'date', b: 'clock' };

export function removeLeaf(node, id) {
  if (typeof node === 'string') return node === id ? null : node;
  const a = removeLeaf(node.a, id);
  const b = removeLeaf(node.b, id);
  if (a === null) return b;
  if (b === null) return a;
  return { ...node, a, b };
}

export function insertLeaf(node, targetId, newId, side) {
  if (typeof node === 'string') {
    if (node !== targetId) return node;
    const dir = (side === 'left' || side === 'right') ? 'h' : 'v';
    const [a, b] = (side === 'top' || side === 'left') ? [newId, targetId] : [targetId, newId];
    return { dir, ratio: 0.5, a, b };
  }
  return { ...node, a: insertLeaf(node.a, targetId, newId, side), b: insertLeaf(node.b, targetId, newId, side) };
}

export function moveTile(tree, fromId, toId, side) {
  if (fromId === toId) return tree;
  const removed = removeLeaf(tree, fromId);
  if (!removed || typeof removed === 'string') return tree;
  return insertLeaf(removed, toId, fromId, side);
}

function collectLeaves(node, out = new Set()) {
  if (typeof node === 'string') { out.add(node); return out; }
  collectLeaves(node.a, out);
  collectLeaves(node.b, out);
  return out;
}

export function validateLayout(node) {
  function check(n) {
    if (typeof n === 'string') return TILE_IDS.includes(n);
    if (!n || !['h', 'v'].includes(n.dir) || typeof n.ratio !== 'number') return false;
    return check(n.a) && check(n.b);
  }
  if (!check(node)) return false;
  const leaves = collectLeaves(node);
  return TILE_IDS.every(id => leaves.has(id)) && leaves.size === TILE_IDS.length;
}

export function loadLayout() {
  try {
    const saved = localStorage.getItem('classclock_layout');
    if (saved) {
      const layout = JSON.parse(saved);
      if (validateLayout(layout)) return layout;
    }
  } catch (_) {}
  return JSON.parse(JSON.stringify(DEFAULT_LAYOUT));
}

export function saveLayout(layout) {
  localStorage.setItem('classclock_layout', JSON.stringify(layout));
}
