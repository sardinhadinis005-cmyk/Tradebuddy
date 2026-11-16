export const ease = p => p * p * (3 - 2 * p);
const clamp = p => Math.max(0, Math.min(1, p));
function curve(parts) {
  const points = [];
  for (const [a, b, c, d] of parts) {
    for (let j = 0; j < 44; j++) {
      const t = j / 44, u = 1 - t;
      points.push([0, 1].map(k => u ** 3 * a[k] + 3 * u * u * t * b[k] + 3 * u * t * t * c[k] + t ** 3 * d[k]));
    }
  }
  points.push(parts.at(-1)[3]);
  return points;
}
const compact = [
  curve([[[53,28],[49,42],[47,48],[70,62]],[[70,62],[75,66],[71,72],[55,85]]]),
  curve([[[137,28],[140,50],[139,56],[119,69]],[[119,69],[100,82],[71,102],[54,114]],[[54,114],[81,147],[118,143],[133,120]],[[133,120],[139,111],[135,106],[130,102]]]),
];
const expanded = [
  curve([[[78,138],[78,110],[78,65],[78,45]],[[78,45],[66,45],[43,45],[32,45]],[[32,45],[55,45],[97,45],[119,45]],[[119,45],[134,45],[142,40],[143,29]]]),
  curve([[[28,124],[49,112],[92,88],[116,74]],[[116,74],[137,81],[149,96],[138,115]],[[138,115],[129,133],[109,134],[88,134]]]),
];
const joins = [
  curve([[compact[0].at(-1),[110,80],[136,139],[78,138]]]),
  curve([[compact[1].at(-1),[111,49],[8,62],[28,124]]]),
];
function distances(points) {
  const result = [0];
  for (let i = 1; i < points.length; i++) result.push(result.at(-1) + Math.hypot(points[i][0] - points[i-1][0], points[i][1] - points[i-1][1]));
  return result;
}
const routes = compact.map((points, i) => {
  const route = [...points, ...joins[i].slice(1), ...expanded[i].slice(1)];
  return { points: route, distances: distances(route), startLength: distances(points).at(-1), endLength: distances(expanded[i]).at(-1) };
});
function windowPoints(route, progress) {
  const total = route.distances.at(-1);
  const head = route.startLength + progress * (total - route.startLength);
  const tail = progress * (total - route.endLength);
  let index = 0;
  return Array.from({ length: 180 }, (_, j) => {
    const s = tail + (head - tail) * j / 179;
    while (index < route.points.length - 2 && route.distances[index + 1] < s) index++;
    const t = (s - route.distances[index]) / Math.max(1e-9, route.distances[index + 1] - route.distances[index]);
    return [0, 1].map(k => route.points[index][k] + t * (route.points[index + 1][k] - route.points[index][k]));
  });
}
const path = (points, close = false) => 'M' + points.map(p => p.map(n => n.toFixed(3)).join(',')).join('L') + (close ? 'Z' : '');
function band(points) {
  const left = [], right = [];
  points.forEach((p, i) => {
    const previous = points[Math.max(0, i - 1)], next = points[Math.min(179, i + 1)];
    const dx = next[0] - previous[0], dy = next[1] - previous[1], norm = Math.max(1e-9, Math.hypot(dx, dy));
    const taper = i < 166 ? 1 : 1 - .84 * (i - 166) / 13;
    const width = 19.375 / 2 * taper;
    const ox = -dy / norm * width, oy = dx / norm * width;
    left.push([p[0] + ox, p[1] + oy]); right.push([p[0] - ox, p[1] - oy]);
  });
  return { outline: path(points), body: path([...left, ...right.reverse()], true), tip: points.at(-1) };
}
export function ribbonFrame(progress) {
  const p = clamp(progress);
  return routes.map((route, i) => band(windowPoints(route, ease(i === 0 ? p : clamp((p - .06) / .94)))));
}
// Same 85ms / 34ms frame timing as the approved GIF: a 2.5x slower release in either direction.
export function advanceRibbon(progress, target, elapsed) {
  let p = clamp(progress), remaining = Math.max(0, elapsed);
  const direction = target > p ? 1 : -1;
  while (remaining > 0 && Math.abs(target - p) > 1e-10) {
    const slow = direction > 0 ? p < 18 / 42 - 1e-10 : p > 24 / 42 + 1e-10;
    const rate = 1 / (42 * (slow ? 85 : 34));
    const boundary = slow ? (direction > 0 ? 18 / 42 : 24 / 42) : target;
    const travel = Math.min(Math.abs(target - p), Math.abs(boundary - p));
    const used = Math.min(remaining, travel / rate);
    p = clamp(p + direction * used * rate); remaining -= used;
    if (used < 1e-9) break;
  }
  return Math.abs(p - target) < 1e-9 ? target : p;
}
