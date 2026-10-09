function getStrokeBox(stroke) {
  if (stroke.boundingBox) return stroke.boundingBox;
  const points = stroke.points || [];
  if (!points.length) return { minX: 0, maxX: 0, minY: 0, maxY: 0, width: 0, height: 0 };

  const padding = (stroke.width || 0) / 2;
  const minX = Math.min(...points.map((point) => point.x)) - padding;
  const maxX = Math.max(...points.map((point) => point.x)) + padding;
  const minY = Math.min(...points.map((point) => point.y)) - padding;
  const maxY = Math.max(...points.map((point) => point.y)) + padding;
  return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
}

export function findHandwrittenEquals(strokes) {
  const recentStrokes = (strokes || []).slice(-8).map((stroke) => ({
    stroke,
    box: getStrokeBox(stroke),
  }));

  for (let right = recentStrokes.length - 1; right >= 1; right -= 1) {
    const lower = recentStrokes[right];
    const lowerWidth = lower.box.width;
    if (lowerWidth < 4 || lowerWidth < lower.box.height * 1.5) continue;

    for (let left = right - 1; left >= 0; left -= 1) {
      const upper = recentStrokes[left];
      const upperWidth = upper.box.width;
      if (upperWidth < 4 || upperWidth < upper.box.height * 1.5) continue;

      const centerDistance = Math.abs(
        (lower.box.minY + lower.box.maxY - upper.box.minY - upper.box.maxY) / 2
      );
      const xOverlap = Math.max(
        0,
        Math.min(lower.box.maxX, upper.box.maxX) - Math.max(upper.box.minX, lower.box.minX)
      );
      const narrowerWidth = Math.min(lowerWidth, upperWidth);

      if (
        centerDistance <= narrowerWidth * 1.5
        && centerDistance >= 0.75
        && xOverlap >= narrowerWidth * 0.2
      ) {
        return [upper.stroke, lower.stroke];
      }
    }
  }

  return null;
}
