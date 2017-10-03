import _every from 'lodash-es/every';
import _some from 'lodash-es/some';


export function geoRoundCoords(c) {
    return [Math.floor(c[0]), Math.floor(c[1])];
}


export function geoInterp(p1, p2, t) {
    return [p1[0] + (p2[0] - p1[0]) * t,
            p1[1] + (p2[1] - p1[1]) * t];
}


// 2D cross product of OA and OB vectors, i.e. z-component of their 3D cross product.
// Returns a positive value, if OAB makes a counter-clockwise turn,
// negative for clockwise turn, and zero if the points are collinear.
export function geoCross(o, a, b) {
    return (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
}


// http://jsperf.com/id-dist-optimization
export function geoEuclideanDistance(a, b) {
    var x = a[0] - b[0], y = a[1] - b[1];
    return Math.sqrt((x * x) + (y * y));
}


// using WGS84 polar radius (6356752.314245179 m)
// const = 2 * PI * r / 360
export function geoLatToMeters(dLat) {
    return dLat * 110946.257617;
}


// using WGS84 equatorial radius (6378137.0 m)
// const = 2 * PI * r / 360
export function geoLonToMeters(dLon, atLat) {
    return Math.abs(atLat) >= 90 ? 0 :
        dLon * 111319.490793 * Math.abs(Math.cos(atLat * (Math.PI/180)));
}


// using WGS84 polar radius (6356752.314245179 m)
// const = 2 * PI * r / 360
export function geoMetersToLat(m) {
    return m / 110946.257617;
}


// using WGS84 equatorial radius (6378137.0 m)
// const = 2 * PI * r / 360
export function geoMetersToLon(m, atLat) {
    return Math.abs(atLat) >= 90 ? 0 :
        m / 111319.490793 / Math.abs(Math.cos(atLat * (Math.PI/180)));
}


export function geoOffsetToMeters(offset) {
    var equatRadius = 6356752.314245179,
        polarRadius = 6378137.0,
        tileSize = 256;

    return [
        offset[0] * 2 * Math.PI * equatRadius / tileSize,
        -offset[1] * 2 * Math.PI * polarRadius / tileSize
    ];
}


export function geoMetersToOffset(meters) {
    var equatRadius = 6356752.314245179,
        polarRadius = 6378137.0,
        tileSize = 256;

    return [
        meters[0] * tileSize / (2 * Math.PI * equatRadius),
        -meters[1] * tileSize / (2 * Math.PI * polarRadius)
    ];
}


// Equirectangular approximation of spherical distances on Earth
export function geoSphericalDistance(a, b) {
    var x = geoLonToMeters(a[0] - b[0], (a[1] + b[1]) / 2),
        y = geoLatToMeters(a[1] - b[1]);
    return Math.sqrt((x * x) + (y * y));
}


export function geoEdgeEqual(a, b) {
    return (a[0] === b[0] && a[1] === b[1]) ||
        (a[0] === b[1] && a[1] === b[0]);
}


// Return the counterclockwise angle in the range (-pi, pi)
// between the positive X axis and the line intersecting a and b.
export function geoAngle(a, b, projection) {
    a = projection(a.loc);
    b = projection(b.loc);
    return Math.atan2(b[1] - a[1], b[0] - a[0]);
}


// Rotate all points counterclockwise around a pivot point by given angle
export function geoRotate(points, angle, around) {
    return points.map(function(point) {
        var radial = [point[0] - around[0], point[1] - around[1]];
        return [
            radial[0] * Math.cos(angle) - radial[1] * Math.sin(angle) + around[0],
            radial[0] * Math.sin(angle) + radial[1] * Math.cos(angle) + around[1]
        ];
    });
}


// Choose the edge with the minimal distance from `point` to its orthogonal
// projection onto that edge, if such a projection exists, or the distance to
// the closest vertex on that edge. Returns an object with the `index` of the
// chosen edge, the chosen `loc` on that edge, and the `distance` to to it.
export function geoChooseEdge(nodes, point, projection) {
    var dist = geoEuclideanDistance,
        points = nodes.map(function(n) { return projection(n.loc); }),
        min = Infinity,
        idx, loc;

    function dot(p, q) {
        return p[0] * q[0] + p[1] * q[1];
    }

    for (var i = 0; i < points.length - 1; i++) {
        var o = points[i],
            s = [points[i + 1][0] - o[0],
                 points[i + 1][1] - o[1]],
            v = [point[0] - o[0],
                 point[1] - o[1]],
            proj = dot(v, s) / dot(s, s),
            p;

        if (proj < 0) {
            p = o;
        } else if (proj > 1) {
            p = points[i + 1];
        } else {
            p = [o[0] + proj * s[0], o[1] + proj * s[1]];
        }

        var d = dist(p, point);
        if (d < min) {
            min = d;
            idx = i + 1;
            loc = projection.invert(p);
        }
    }

    return {
        index: idx,
        distance: min,
        loc: loc
    };
}


// Return the intersection point of 2 line segments.
// From https://github.com/pgkelley4/line-segments-intersect
// This uses the vector cross product approach described below:
//  http://stackoverflow.com/a/565282/786339
export function geoLineIntersection(a, b) {
    function subtractPoints(point1, point2) {
        return [point1[0] - point2[0], point1[1] - point2[1]];
    }
    function crossProduct(point1, point2) {
        return point1[0] * point2[1] - point1[1] * point2[0];
    }

    var p = [a[0][0], a[0][1]],
        p2 = [a[1][0], a[1][1]],
        q = [b[0][0], b[0][1]],
        q2 = [b[1][0], b[1][1]],
        r = subtractPoints(p2, p),
        s = subtractPoints(q2, q),
        uNumerator = crossProduct(subtractPoints(q, p), r),
        denominator = crossProduct(r, s);

    if (uNumerator && denominator) {
        var u = uNumerator / denominator,
            t = crossProduct(subtractPoints(q, p), s) / denominator;

        if ((t >= 0) && (t <= 1) && (u >= 0) && (u <= 1)) {
            return geoInterp(p, p2, t);
        }
    }

    return null;
}


export function geoPathIntersections(path1, path2) {
    var intersections = [];
    for (var i = 0; i < path1.length - 1; i++) {
        for (var j = 0; j < path2.length - 1; j++) {
            var a = [ path1[i], path1[i+1] ],
                b = [ path2[j], path2[j+1] ],
                hit = geoLineIntersection(a, b);
            if (hit) intersections.push(hit);
        }
    }
    return intersections;
}


// Return whether point is contained in polygon.
//
// `point` should be a 2-item array of coordinates.
// `polygon` should be an array of 2-item arrays of coordinates.
//
// From https://github.com/substack/point-in-polygon.
// ray-casting algorithm based on
// http://www.ecse.rpi.edu/Homepages/wrf/Research/Short_Notes/pnpoly.html
//
export function geoPointInPolygon(point, polygon) {
    var x = point[0],
        y = point[1],
        inside = false;

    for (var i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        var xi = polygon[i][0], yi = polygon[i][1];
        var xj = polygon[j][0], yj = polygon[j][1];

        var intersect = ((yi > y) !== (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }

    return inside;
}


export function geoPolygonContainsPolygon(outer, inner) {
    return _every(inner, function(point) {
        return geoPointInPolygon(point, outer);
    });
}


export function geoPolygonIntersectsPolygon(outer, inner, checkSegments) {
    function testSegments(outer, inner) {
        for (var i = 0; i < outer.length - 1; i++) {
            for (var j = 0; j < inner.length - 1; j++) {
                var a = [ outer[i], outer[i+1] ],
                    b = [ inner[j], inner[j+1] ];
                if (geoLineIntersection(a, b)) return true;
            }
        }
        return false;
    }

    function testPoints(outer, inner) {
        return _some(inner, function(point) {
            return geoPointInPolygon(point, outer);
        });
    }

   return testPoints(outer, inner) || (!!checkSegments && testSegments(outer, inner));
}


export function geoPathLength(path) {
    var length = 0;
    for (var i = 0; i < path.length - 1; i++) {
        length += geoEuclideanDistance(path[i], path[i + 1]);
    }
    return length;
}
