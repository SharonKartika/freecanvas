// Draw arrows for a list of directed connections (edges) between pairs of elements
// connections: array of [fromElement, toElement] pairs
// NOTE: This function clears and recreates all SVG <line> nodes on each call
// (allocation/DOM churn) and reads element sizes/positions per call. For
// better perf consider caching centers/sizes (done here) and reusing <line>
// elements instead of recreating them.
function drawArrowsForConnections(svg, connections) {
    if (!Array.isArray(connections) || connections.length === 0) return;
    // Clear previous lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    // Hardcoded style selector: change this value to switch drawing behavior.
    // Options:
    //  - 'edge'      : draw from edge-to-edge along the center-to-center axis (default)
    //  - 'center'    : draw from center-to-center (legacy behavior)
    //  - 'edgeCurve' : orthogonal routed (L-shaped) arrows that can be smoothed
    const ARROW_STYLE = 'edgeCurve';
    const ORTHOGONAL_SMOOTHNESS = 0.1;
    // Precompute centers and sizes for all involved elements to avoid repeated DOM reads
    const allEls = Array.from(new Set(connections.flat()));
    const centerMap = new Map();
    const sizeMap = new Map();
    for (const el of allEls) {
        const xAttr = parseInt(el.getAttribute('X'), 10) || 0;
        const yAttr = parseInt(el.getAttribute('Y'), 10) || 0;
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        centerMap.set(el, { x: xAttr + w / 2, y: yAttr + h / 2 });
        sizeMap.set(el, { w, h, halfW: w / 2, halfH: h / 2 });
    }
    // Center-to-center (legacy) behavior
    if (ARROW_STYLE === 'center') {
    // Gather all center points from cache to compute bounding box
    const centers = allEls.map(el => centerMap.get(el));
    const xs = centers.map(p => p.x);
    const ys = centers.map(p => p.y);
        const minX = Math.min(...xs) - 20;
        const minY = Math.min(...ys) - 20;
        const maxX = Math.max(...xs) + 20;
        const maxY = Math.max(...ys) + 20;
        const width = maxX - minX;
        const height = maxY - minY;
        // Position and size the SVG overlay to cover all points
        svg.style.left = `${minX}px`;
        svg.style.top = `${minY}px`;
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);
        // Draw each connection as an arrow (center-to-center)
        for (const [fromEl, toEl] of connections) {
            const from = centerMap.get(fromEl);
            const to = centerMap.get(toEl);
            const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
            line.setAttribute('x1', from.x - minX);
            line.setAttribute('y1', from.y - minY);
            line.setAttribute('x2', to.x - minX);
            line.setAttribute('y2', to.y - minY);
            line.setAttribute('stroke', 'black');
            line.setAttribute('stroke-width', '2');
            svg.appendChild(line);
        }
        return;
    }

    // EDGE style (default): compute intersection with element edges along center-to-center axis
    function getEdgePoint(center, el, dirX, dirY) {
        const size = sizeMap.get(el) || { halfW: el.offsetWidth / 2, halfH: el.offsetHeight / 2 };
        const halfW = size.halfW;
        const halfH = size.halfH;
        const dx = dirX;
        const dy = dirY;
        // If centers coincide, just return center
        if (dx === 0 && dy === 0) return { x: center.x, y: center.y };
        // Compute candidate scalars that would reach the vertical and horizontal edges
        const sx = dx === 0 ? Infinity : halfW / Math.abs(dx);
        const sy = dy === 0 ? Infinity : halfH / Math.abs(dy);
        const s = Math.min(sx, sy);
        return { x: center.x + s * dx, y: center.y + s * dy };
    }

    // Helper: return the midpoint coordinate on the named side of an element
    function getEdgeMidpoint(center, el, side) {
        const size = sizeMap.get(el) || { halfW: el.offsetWidth / 2, halfH: el.offsetHeight / 2 };
        const halfW = size.halfW;
        const halfH = size.halfH;
        switch (side) {
            case 'left': return { x: center.x - halfW, y: center.y };
            case 'right': return { x: center.x + halfW, y: center.y };
            case 'top': return { x: center.x, y: center.y - halfH };
            case 'bottom': return { x: center.x, y: center.y + halfH };
            default: return { x: center.x, y: center.y };
        }
    }

    // EDGE-CURVE style: orthogonal (L-shaped) routed paths with optional smoothing
    if (ARROW_STYLE === 'edgeCurve') {
        // Minimum leg length in pixels used to avoid tiny legs that produce
        // visually sharp corners. Tweak to taste.
        const MIN_LEG = 20;
        const paths = [];
        for (const [fromEl, toEl] of connections) {
            const fromCenter = centerMap.get(fromEl) || getCenter(fromEl);
            const toCenter = centerMap.get(toEl) || getCenter(toEl);
            const dx = toCenter.x - fromCenter.x;
            const dy = toCenter.y - fromCenter.y;
            // declare routing variables up-front so overlap shortcuts can assign to them
            let start, end, corner;

            // Degenerate: same center -> draw a short straight line
            if (dx === 0 && dy === 0) {
                const p = { start: fromCenter, end: toCenter, c1: fromCenter, c2: toCenter, corner: null, r: 0 };
                paths.push(p);
                continue;
            }

            // If the two boxes overlap on the perpendicular axis, prefer a straight
            // connector instead of an L-shaped route. For example, when the source
            // is to the right of the target but their vertical spans overlap, draw a
            // straight horizontal line between the source's left edge and the
            // target's right edge.
            const fromSize = sizeMap.get(fromEl) || { halfW: fromEl.offsetWidth / 2, halfH: fromEl.offsetHeight / 2 };
            const toSize = sizeMap.get(toEl) || { halfW: toEl.offsetWidth / 2, halfH: toEl.offsetHeight / 2 };
            const fromLeft = fromCenter.x - fromSize.halfW;
            const fromRight = fromCenter.x + fromSize.halfW;
            const fromTop = fromCenter.y - fromSize.halfH;
            const fromBottom = fromCenter.y + fromSize.halfH;
            const toLeft = toCenter.x - toSize.halfW;
            const toRight = toCenter.x + toSize.halfW;
            const toTop = toCenter.y - toSize.halfH;
            const toBottom = toCenter.y + toSize.halfH;

            const verticalOverlap = (fromTop <= toBottom && fromBottom >= toTop);
            const horizontalOverlap = (fromLeft <= toRight && fromRight >= toLeft);

            if (verticalOverlap && dx !== 0) {
                // Instead of a single straight horizontal line, route H -> V -> H
                // so the connection leaves the source horizontally, travels to a
                // mid x, goes vertically, then finishes horizontally into target.
                if (fromCenter.x > toCenter.x) {
                    // source is to the right -> connect source.left to target.right
                    start = getEdgeMidpoint(fromCenter, fromEl, 'left');
                    end = getEdgeMidpoint(toCenter, toEl, 'right');
                } else {
                    // source is to the left -> connect source.right to target.left
                    start = getEdgeMidpoint(fromCenter, fromEl, 'right');
                    end = getEdgeMidpoint(toCenter, toEl, 'left');
                }
                // Choose a middle x between start and end so we have two corners.
                // If the horizontal separation is very small the H legs become
                // tiny and corners look sharp. To avoid that, push the midX
                // outside the interval by a minimum leg length so each horizontal
                // leg is at least MIN_LEG pixels long.
                const MIN_LEG = 20;
                const totalX = end.x - start.x;
                const dirX = Math.sign(totalX) || 1;
                let midX = start.x + totalX / 2;
                if (Math.abs(totalX) < 2 * MIN_LEG) {
                    // push midX beyond the target in the direction of travel
                    midX = end.x + dirX * MIN_LEG;
                }
                const corner1 = { x: midX, y: start.y };
                const corner2 = { x: midX, y: end.y };
                // legs lengths for smoothing radius
                const legA = Math.abs(corner1.x - start.x);
                const legB = Math.abs(corner2.y - corner1.y);
                const legC = Math.abs(end.x - corner2.x);
                const r = ORTHOGONAL_SMOOTHNESS * Math.min(legA, legB, legC);
                paths.push({ points: [start, corner1, corner2, end], r });
                continue;
            }

            if (horizontalOverlap && dy !== 0) {
                // Instead of a single straight vertical line, route V -> H -> V
                // so the connection leaves the source vertically, travels to a
                // mid y, goes horizontally, then finishes vertically into target.
                if (fromCenter.y > toCenter.y) {
                    // source is below -> connect source.top to target.bottom
                    start = getEdgeMidpoint(fromCenter, fromEl, 'top');
                    end = getEdgeMidpoint(toCenter, toEl, 'bottom');
                } else {
                    // source is above -> connect source.bottom to target.top
                    start = getEdgeMidpoint(fromCenter, fromEl, 'bottom');
                    end = getEdgeMidpoint(toCenter, toEl, 'top');
                }
                // Choose a middle y between start and end so we have two corners.
                // If the vertical separation is very small the V legs become
                // tiny and corners look sharp. To avoid that, push the midY
                // outside the interval by a minimum leg length so each vertical
                // leg is at least MIN_LEG pixels long.
                const MIN_LEG = 20;
                const totalY = end.y - start.y;
                const dirY = Math.sign(totalY) || 1;
                let midY = start.y + totalY / 2;
                if (Math.abs(totalY) < 2 * MIN_LEG) {
                    // push midY beyond the target in the direction of travel
                    midY = end.y + dirY * MIN_LEG;
                }
                const corner1 = { x: start.x, y: midY };
                const corner2 = { x: end.x, y: midY };
                // legs lengths for smoothing radius
                const legA = Math.abs(corner1.y - start.y);
                const legB = Math.abs(corner2.x - corner1.x);
                const legC = Math.abs(end.y - corner2.y);
                const r = ORTHOGONAL_SMOOTHNESS * Math.min(legA, legB, legC);
                paths.push({ points: [start, corner1, corner2, end], r });
                continue;
            }

            // Choose whether to route horizontal-first or vertical-first based on larger delta
            const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
            if (horizontalFirst) {
                const firstDir = dx >= 0 ? 'right' : 'left';
                const secondDir = dy >= 0 ? 'down' : 'up';
                start = getEdgeMidpoint(fromCenter, fromEl, firstDir);
                // Note: when the final move is vertical (down means moving positive y), the
                // arrow should meet the target at its top edge (entering from above), so we
                // choose the opposite vertical side when computing the midpoint on the target.
                end = getEdgeMidpoint(toCenter, toEl, secondDir === 'down' ? 'top' : 'bottom');
                corner = { x: end.x, y: start.y };
            } else {
                const firstDir = dy >= 0 ? 'down' : 'up';
                const secondDir = dx >= 0 ? 'right' : 'left';
                start = getEdgeMidpoint(fromCenter, fromEl, firstDir === 'down' ? 'bottom' : 'top');
                // When the final move is horizontal, we approach the target from the
                // opposite horizontal side (moving right means we approach the target
                // from its left side), so invert the secondDir for the target edge.
                end = getEdgeMidpoint(toCenter, toEl, secondDir === 'right' ? 'left' : 'right');
                corner = { x: start.x, y: end.y };
            }

            // Compute control points for a smooth corner. Limit the smoothing radius
            // by the actual lengths of the two orthogonal legs so control points
            // never overshoot the corner and cause the curve to first go the wrong way.
            let leg1, leg2;
            if (horizontalFirst) {
                // horizontal leg from start -> corner, vertical leg from corner -> end
                leg1 = Math.abs(corner.x - start.x);
                leg2 = Math.abs(end.y - corner.y);
            } else {
                // vertical leg from start -> corner, horizontal leg from corner -> end
                leg1 = Math.abs(corner.y - start.y);
                leg2 = Math.abs(end.x - corner.x);
            }
            const r = ORTHOGONAL_SMOOTHNESS * Math.min(leg1, leg2);

            let c1 = { x: start.x, y: start.y };
            let c2 = { x: end.x, y: end.y };
            if (horizontalFirst) {
                // control1 moves along horizontal from start towards corner
                c1 = { x: start.x + Math.sign(corner.x - start.x) * r, y: start.y };
                // control2 moves along vertical from end towards corner
                c2 = { x: end.x, y: end.y - Math.sign(end.y - corner.y) * r };
            } else {
                // vertical-first
                c1 = { x: start.x, y: start.y + Math.sign(corner.y - start.y) * r };
                c2 = { x: end.x - Math.sign(end.x - corner.x) * r, y: end.y };
            }

            paths.push({ start, c1, c2, end, corner, r });
        }

        // Collect bounding box including control points or polyline points
        const xs = [];
        const ys = [];
        for (const p of paths) {
            if (p.points && Array.isArray(p.points)) {
                for (const pt of p.points) { xs.push(pt.x); ys.push(pt.y); }
                // If this is a 4-point H-V-H or V-H-V and the two middle corners
                // are very close, we'll render a single cubic. Include the cubic
                // control points in bbox so they aren't clipped.
                if (p.points.length === 4) {
                    const a = p.points[1];
                    const b = p.points[2];
                    const midDist = Math.hypot(b.x - a.x, b.y - a.y);
                    if (midDist < 2 * MIN_LEG) {
                        // compute cubic control points aligned with start/end direction
                        const s = p.points[0];
                        const e = p.points[3];
                        if (s.x !== e.x) {
                            const dir = Math.sign(e.x - s.x) || 1;
                            const off = Math.max(MIN_LEG, Math.abs(e.x - s.x) / 2);
                            const cp1 = { x: s.x + dir * off, y: s.y };
                            const cp2 = { x: e.x - dir * off, y: e.y };
                            xs.push(cp1.x, cp2.x); ys.push(cp1.y, cp2.y);
                        } else {
                            const dir = Math.sign(e.y - s.y) || 1;
                            const off = Math.max(MIN_LEG, Math.abs(e.y - s.y) / 2);
                            const cp1 = { x: s.x, y: s.y + dir * off };
                            const cp2 = { x: e.x, y: e.y - dir * off };
                            xs.push(cp1.x, cp2.x); ys.push(cp1.y, cp2.y);
                        }
                    }
                }
                continue;
            }
            // legacy shape
            xs.push(p.start.x, p.c1.x, p.c2.x, p.end.x);
            ys.push(p.start.y, p.c1.y, p.c2.y, p.end.y);
        }
        const minX = Math.min(...xs) - 20;
        const minY = Math.min(...ys) - 20;
        const maxX = Math.max(...xs) + 20;
        const maxY = Math.max(...ys) + 20;
        const width = maxX - minX;
        const height = maxY - minY;
        svg.style.left = `${minX}px`;
        svg.style.top = `${minY}px`;
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        // Helper: build rounded polyline path d attribute for an array of points
        function buildRoundedPath(points, r, minX, minY) {
            if (!points || points.length === 0) return '';
            const n = points.length;
            if (n === 1) return `M ${points[0].x - minX},${points[0].y - minY}`;
            // No rounding if radius is zero or only two points
            if (r <= 0 || n === 2) {
                let d = `M ${points[0].x - minX},${points[0].y - minY}`;
                for (let i = 1; i < n; i++) d += ` L ${points[i].x - minX},${points[i].y - minY}`;
                return d;
            }
            // Precompute truncated corner points
            const corners = [];
            for (let k = 1; k <= n - 2; k++) {
                const prev = points[k - 1];
                const curr = points[k];
                const next = points[k + 1];
                const v1x = curr.x - prev.x; const v1y = curr.y - prev.y;
                const v2x = next.x - curr.x; const v2y = next.y - curr.y;
                const len1 = Math.hypot(v1x, v1y) || 1;
                const len2 = Math.hypot(v2x, v2y) || 1;
                const u1x = v1x / len1; const u1y = v1y / len1;
                const u2x = v2x / len2; const u2y = v2y / len2;
                const r1 = Math.min(r, len1 / 2);
                const r2 = Math.min(r, len2 / 2);
                const p1 = { x: curr.x - u1x * r1, y: curr.y - u1y * r1 };
                const p2 = { x: curr.x + u2x * r2, y: curr.y + u2y * r2 };
                const cross = u1x * u2y - u1y * u2x;
                const sweepFlag = cross > 0 ? 1 : 0;
                corners.push({ p1, p2, radius: Math.min(r1, r2), sweepFlag });
            }

            let d = `M ${points[0].x - minX},${points[0].y - minY}`;
            for (let k = 1; k <= n - 2; k++) {
                const corner = corners[k - 1];
                // line to start of arc
                d += ` L ${corner.p1.x - minX},${corner.p1.y - minY}`;
                // arc to end of arc
                d += ` A ${corner.radius},${corner.radius} 0 0 ${corner.sweepFlag} ${corner.p2.x - minX},${corner.p2.y - minY}`;
            }
            // line to final point
            d += ` L ${points[n - 1].x - minX},${points[n - 1].y - minY}`;
            return d;
        }

        // Draw paths
        for (const p of paths) {
            const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            let d;
            if (p.points && Array.isArray(p.points)) {
                // If this is a 4-point H-V-H or V-H-V and the middle segment is
                // very short, render a single cubic Bezier (S-curve) for a
                // smoother transition instead of two tiny arcs.
                if (p.points.length === 4) {
                    const s = p.points[0];
                    const a = p.points[1];
                    const b = p.points[2];
                    const e = p.points[3];
                    const midDist = Math.hypot(b.x - a.x, b.y - a.y);
                    if (midDist < 2 * MIN_LEG) {
                        // create cubic control points that pull the curve outward
                        if (s.x !== e.x) {
                            const dir = Math.sign(e.x - s.x) || 1;
                            const off = Math.max(MIN_LEG, Math.abs(e.x - s.x) / 2);
                            const cp1 = { x: s.x + dir * off, y: s.y };
                            const cp2 = { x: e.x - dir * off, y: e.y };
                            d = `M ${s.x - minX},${s.y - minY} C ${cp1.x - minX},${cp1.y - minY} ${cp2.x - minX},${cp2.y - minY} ${e.x - minX},${e.y - minY}`;
                        } else {
                            const dir = Math.sign(e.y - s.y) || 1;
                            const off = Math.max(MIN_LEG, Math.abs(e.y - s.y) / 2);
                            const cp1 = { x: s.x, y: s.y + dir * off };
                            const cp2 = { x: e.x, y: e.y - dir * off };
                            d = `M ${s.x - minX},${s.y - minY} C ${cp1.x - minX},${cp1.y - minY} ${cp2.x - minX},${cp2.y - minY} ${e.x - minX},${e.y - minY}`;
                        }
                    } else {
                        d = buildRoundedPath(p.points, p.r || 0, minX, minY);
                    }
                } else {
                    d = buildRoundedPath(p.points, p.r || 0, minX, minY);
                }
            } else if (p.corner && p.r === 0) {
                // Sharp L: two straight segments via the corner
                d = `M ${p.start.x - minX},${p.start.y - minY} L ${p.corner.x - minX},${p.corner.y - minY} L ${p.end.x - minX},${p.end.y - minY}`;
            } else if (p.corner && p.r > 0) {
                // Smooth corner: existing single-corner logic
                const r = p.r;
                const v1x = p.corner.x - p.start.x;
                const v1y = p.corner.y - p.start.y;
                const v2x = p.end.x - p.corner.x;
                const v2y = p.end.y - p.corner.y;
                const u1x = Math.abs(v1x) > Math.abs(v1y) ? Math.sign(v1x) : 0;
                const u1y = Math.abs(v1y) >= Math.abs(v1x) ? Math.sign(v1y) : 0;
                const u2x = Math.abs(v2x) > Math.abs(v2y) ? Math.sign(v2x) : 0;
                const u2y = Math.abs(v2y) >= Math.abs(v2x) ? Math.sign(v2y) : 0;
                const p1 = { x: p.corner.x - u1x * r, y: p.corner.y - u1y * r };
                const p2 = { x: p.corner.x + u2x * r, y: p.corner.y + u2y * r };
                const cross = u1x * u2y - u1y * u2x;
                const sweepFlag = cross > 0 ? 1 : 0;
                d = `M ${p.start.x - minX},${p.start.y - minY} L ${p1.x - minX},${p1.y - minY} A ${r},${r} 0 0 ${sweepFlag} ${p2.x - minX},${p2.y - minY} L ${p.end.x - minX},${p.end.y - minY}`;
            } else {
                // Simple straight line (legacy)
                d = `M ${p.start.x - minX},${p.start.y - minY} L ${p.end.x - minX},${p.end.y - minY}`;
            }
            pathEl.setAttribute('d', d);
            pathEl.setAttribute('stroke', 'black');
            pathEl.setAttribute('stroke-width', '2');
            pathEl.setAttribute('fill', 'none');
            svg.appendChild(pathEl);
        }

        return;
    }

    // Compute start/end points for each connection using element edges (not centers)
    const pts = connections.map(([fromEl, toEl]) => {
        const fromCenter = centerMap.get(fromEl) || getCenter(fromEl);
        const toCenter = centerMap.get(toEl) || getCenter(toEl);
        const dx = toCenter.x - fromCenter.x;
        const dy = toCenter.y - fromCenter.y;
        // Start on the edge of `fromEl` moving toward `toCenter`
        const start = getEdgePoint(fromCenter, fromEl, dx, dy);
        // End on the edge of `toEl` moving toward `fromCenter` (reverse direction)
        const end = getEdgePoint(toCenter, toEl, -dx, -dy);
        return { start, end };
    });

    // Gather all x/y from computed endpoints to compute bounding box
    const xs = pts.flatMap(p => [p.start.x, p.end.x]);
    const ys = pts.flatMap(p => [p.start.y, p.end.y]);
    const minX = Math.min(...xs) - 20;
    const minY = Math.min(...ys) - 20;
    const maxX = Math.max(...xs) + 20;
    const maxY = Math.max(...ys) + 20;
    const width = maxX - minX;
    const height = maxY - minY;
    // Position and size the SVG overlay to cover all connection endpoints
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);

    // Draw each connection as a line between the computed edge points
    for (const { start, end } of pts) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', start.x - minX);
        line.setAttribute('y1', start.y - minY);
        line.setAttribute('x2', end.x - minX);
        line.setAttribute('y2', end.y - minY);
        line.setAttribute('stroke', 'black');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
    }
}

// Utility: get the center of a movable element
function getCenter(el) {
    const x = parseInt(el.getAttribute('X'), 10) || 0;
    const y = parseInt(el.getAttribute('Y'), 10) || 0;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    return {
        x: x + w / 2,
        y: y + h / 2
    };
}

// Create or get the SVG overlay for a given .cameraViewContent
function createOrGetArrowOverlay(content) {
    let svg = content.querySelector('svg.arrowOverlay');
    if (!svg) {
        svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        svg.classList.add('arrowOverlay');
        svg.style.position = 'absolute';
        svg.style.pointerEvents = 'none';
        svg.style.zIndex = '10';
        content.appendChild(svg);
    }
    return svg;
}

// Draw an arrow between two elements in a given SVG overlay
function drawArrowBetweenElements(svg, el1, el2) {
    // Clear previous lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const p1 = getCenter(el1);
    const p2 = getCenter(el2);
    // Calculate bounding box for the SVG overlay
    const minX = Math.min(p1.x, p2.x) - 20;
    const minY = Math.min(p1.y, p2.y) - 20;
    const maxX = Math.max(p1.x, p2.x) + 20;
    const maxY = Math.max(p1.y, p2.y) + 20;
    const width = maxX - minX;
    const height = maxY - minY;
    // Position and size the SVG overlay to cover both points
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    // Draw a line between the two centers, relative to the SVG's origin
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', p1.x - minX);
    line.setAttribute('y1', p1.y - minY);
    line.setAttribute('x2', p2.x - minX);
    line.setAttribute('y2', p2.y - minY);
    line.setAttribute('stroke', 'black');
    line.setAttribute('stroke-width', '2');
    svg.appendChild(line);
}

// Draw arrows between three elements, forming a triangle
function drawArrowsBetweenThreeElements(svg, el1, el2, el3) {
    // Clear previous lines
    while (svg.firstChild) svg.removeChild(svg.firstChild);
    const p1 = getCenter(el1);
    const p2 = getCenter(el2);
    const p3 = getCenter(el3);
    // Calculate bounding box for the SVG overlay
    const minX = Math.min(p1.x, p2.x, p3.x) - 20;
    const minY = Math.min(p1.y, p2.y, p3.y) - 20;
    const maxX = Math.max(p1.x, p2.x, p3.x) + 20;
    const maxY = Math.max(p1.y, p2.y, p3.y) + 20;
    const width = maxX - minX;
    const height = maxY - minY;
    // Position and size the SVG overlay to cover all points
    svg.style.left = `${minX}px`;
    svg.style.top = `${minY}px`;
    svg.style.width = `${width}px`;
    svg.style.height = `${height}px`;
    svg.setAttribute('width', width);
    svg.setAttribute('height', height);
    // Draw three lines (arrows) between the three centers
    const pairs = [
        [p1, p2],
        [p2, p3],
        [p3, p1]
    ];
    for (const [start, end] of pairs) {
        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', start.x - minX);
        line.setAttribute('y1', start.y - minY);
        line.setAttribute('x2', end.x - minX);
        line.setAttribute('y2', end.y - minY);
        line.setAttribute('stroke', 'black');
        line.setAttribute('stroke-width', '2');
        svg.appendChild(line);
    }
}

// Export functions for use in main.js
window.ArrowLib = {
    getCenter,
    createOrGetArrowOverlay,
    drawArrowBetweenElements,
    drawArrowsBetweenThreeElements,
    drawArrowsForConnections,
    // (configuration setters removed; change ARROW_STYLE / ORTHOGONAL_SMOOTHNESS
    // inside this file directly for now)
};

// Expose to window for dynamic usage
// window.setupArrowUpdates = setupArrowUpdates;
// window.updateArrows = updateArrows;
