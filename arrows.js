// Minimal arrows.js - draw center-to-center arrows between elements
(function () {
    // Basic utilities
    function getCenter(el) {
        const x = parseInt(el.getAttribute('X'), 10) || 0;
        const y = parseInt(el.getAttribute('Y'), 10) || 0;
        const w = el.offsetWidth || 0;
        const h = el.offsetHeight || 0;
        return { x: x + w / 2, y: y + h / 2 };
    }

    function createOrGetArrowOverlay(content) {
        let svg = content.querySelector('svg.arrowOverlay');
        if (!svg) {
            svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
            svg.classList.add('arrowOverlay');
            svg.style.position = 'absolute';
            svg.style.pointerEvents = 'none';
            // svg.style.zIndex = '0';
            // Insert as first child so the overlay paints beneath later children
            content.insertBefore(svg, content.firstChild);
        }
        return svg;
    }

    // Compute a point on the boundary of `el` along the direction from `center`.
    // dirX/dirY are the delta from source->target (not necessarily normalized).
    function getEdgePoint(center, el, dirX, dirY) {
        const w = el.offsetWidth || 0;
        const h = el.offsetHeight || 0;
        const halfW = w / 2;
        const halfH = h / 2;
        if (dirX === 0 && dirY === 0) return { x: center.x, y: center.y };
        const len = Math.hypot(dirX, dirY) || 1;
        const nx = dirX / len;
        const ny = dirY / len;
        const sx = nx === 0 ? Infinity : halfW / Math.abs(nx);
        const sy = ny === 0 ? Infinity : halfH / Math.abs(ny);
        const s = Math.min(sx, sy);
        return { x: center.x + nx * s, y: center.y + ny * s };
    }

    // Draw arrows for connections.
    // connections: array of [fromElement, toElement]
    // propsList: optional array of per-connection options, e.g.
    // { style: 'center'|'edge', route: 'straight'|'orthogonal', smoothness: number, strokeWidth: number, stroke: string }
    function drawArrowsForConnections(svg, connections, propsList) {
        if (!svg) return;
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        if (!Array.isArray(connections) || connections.length === 0) return;

        const pairs = [];
        const pts = [];

        for (let i = 0; i < connections.length; i++) {
            const [fromEl, toEl] = connections[i] || [];
            if (!fromEl || !toEl) continue;
            const pFrom = getCenter(fromEl);
            const pTo = getCenter(toEl);
            const dx = pTo.x - pFrom.x;
            const dy = pTo.y - pFrom.y;
            const props = (Array.isArray(propsList) && propsList[i]) || {};
            const anchorStyle = props.style === 'edge' ? 'edge' : 'center';
            const route = props.route || 'straight';
            const smoothness = typeof props.smoothness === 'number' ? props.smoothness : 0.15;
            const strokeWidth = typeof props.strokeWidth === 'number' ? props.strokeWidth : 2;
            const stroke = typeof props.stroke === 'string' && props.stroke ? props.stroke : 'black';

            // Anchors: center or edge intersection along center-line
            const anchorStart = anchorStyle === 'edge' ? getEdgePoint(pFrom, fromEl, dx, dy) : pFrom;
            const anchorEnd = anchorStyle === 'edge' ? getEdgePoint(pTo, toEl, -dx, -dy) : pTo;

            if (route === 'orthogonal') {
                const horizontalFirst = Math.abs(dx) >= Math.abs(dy);
                const MIN_LEG = 20;
                // Build base orthogonal corners from centers
                function computeBaseCorners(a, b, horiz) {
                    if (horiz) {
                        let midX = a.x + (b.x - a.x) / 2;
                        const totalX = b.x - a.x;
                        const dirX = Math.sign(totalX) || 1;
                        if (Math.abs(totalX) < 2 * MIN_LEG) midX = b.x + dirX * MIN_LEG;
                        return [{ x: a.x, y: a.y }, { x: midX, y: a.y }, { x: midX, y: b.y }, { x: b.x, y: b.y }];
                    } else {
                        let midY = a.y + (b.y - a.y) / 2;
                        const totalY = b.y - a.y;
                        const dirY = Math.sign(totalY) || 1;
                        if (Math.abs(totalY) < 2 * MIN_LEG) midY = b.y + dirY * MIN_LEG;
                        return [{ x: a.x, y: a.y }, { x: a.x, y: midY }, { x: b.x, y: midY }, { x: b.x, y: b.y }];
                    }
                }

                const base = computeBaseCorners(pFrom, pTo, horizontalFirst);
                // clip endpoints to edges only if anchorStyle === 'edge', using
                // the direction toward the first/last inner corner.
                const firstInner = base[1];
                const lastInner = base[base.length - 2];
                const s = anchorStyle === 'edge' ? getEdgePoint(pFrom, fromEl, firstInner.x - pFrom.x, firstInner.y - pFrom.y) : pFrom;
                const e = anchorStyle === 'edge' ? getEdgePoint(pTo, toEl, lastInner.x - pTo.x, lastInner.y - pTo.y) : pTo;
                const points = [s, ...base.slice(1, -1), e];
                pairs.push({ points, smoothness, strokeWidth, stroke });
                pts.push(...points);
            } else {
                pairs.push({ start: anchorStart, end: anchorEnd, strokeWidth, stroke });
                pts.push(anchorStart, anchorEnd);
            }
        }
        if (pairs.length === 0) return;

        const xs = pts.map(p => p.x);
        const ys = pts.map(p => p.y);
        const minX = Math.min(...xs) - 20;
        const minY = Math.min(...ys) - 20;
        const maxX = Math.max(...xs) + 20;
        const maxY = Math.max(...ys) + 20;
        const width = Math.max(1, maxX - minX);
        const height = Math.max(1, maxY - minY);

        svg.style.left = `${minX}px`;
        svg.style.top = `${minY}px`;
        svg.style.width = `${width}px`;
        svg.style.height = `${height}px`;
        svg.setAttribute('width', width);
        svg.setAttribute('height', height);

        // Helper: build rounded path for polyline points (supports 2..n points)
        function buildRoundedPath(points, smoothnessVal, minX, minY) {
            if (!points || points.length === 0) return '';
            const n = points.length;
            if (n === 1) return `M ${points[0].x - minX},${points[0].y - minY}`;
            // derive a base radius from available leg lengths
            const legLens = points.slice(1).map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
            const base = Math.min(...legLens) || 0;
            const r = Math.max(0, smoothnessVal) * base;
            if (r <= 0 || n === 2) {
                let d = `M ${points[0].x - minX},${points[0].y - minY}`;
                for (let i = 1; i < n; i++) d += ` L ${points[i].x - minX},${points[i].y - minY}`;
                return d;
            }
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
                d += ` L ${corner.p1.x - minX},${corner.p1.y - minY}`;
                d += ` A ${corner.radius},${corner.radius} 0 0 ${corner.sweepFlag} ${corner.p2.x - minX},${corner.p2.y - minY}`;
            }
            d += ` L ${points[n - 1].x - minX},${points[n - 1].y - minY}`;
            return d;
        }

        for (const item of pairs) {
            if (item.points && Array.isArray(item.points)) {
                const d = buildRoundedPath(item.points, item.smoothness || 0, minX, minY);
                const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
                pathEl.setAttribute('d', d);
                pathEl.setAttribute('stroke', item.stroke || 'black');
                pathEl.setAttribute('stroke-width', String(item.strokeWidth || 2));
                pathEl.setAttribute('fill', 'none');
                svg.appendChild(pathEl);
            } else if (item.start && item.end) {
                const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
                line.setAttribute('x1', item.start.x - minX);
                line.setAttribute('y1', item.start.y - minY);
                line.setAttribute('x2', item.end.x - minX);
                line.setAttribute('y2', item.end.y - minY);
                line.setAttribute('stroke', item.stroke || 'black');
                line.setAttribute('stroke-width', String(item.strokeWidth || 2));
                svg.appendChild(line);
            }
        }

        // TODO: Add optional arrowhead markers (start/end) and expose marker style options.
        // TODO: Support per-connection CSS class for styling via external stylesheets.
    }

    window.ArrowLib = {
        getCenter,
        createOrGetArrowOverlay,
        drawArrowsForConnections
    };
})();
