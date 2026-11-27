// Matching quadratic paths interpolate smoothly without an SVG filter or per-frame JS.
export function oceanRevealFrames(x: number, y: number, radius: number): Keyframe[] {
  const segments = 96;
  const frames = 24;
  return Array.from({ length: frames + 1 }, (_, frame) => {
    const progress = frame / frames;
    const size = (radius + 32) * progress;
    const amplitude = Math.min(26, size * .07) * Math.sin(Math.PI * progress);
    const phase = progress * Math.PI * 2;
    const points = Array.from({ length: segments }, (_, index) => {
      const angle = index / segments * Math.PI * 2;
      const ripple = amplitude * (.7 * Math.sin(angle * 12 - phase) + .3 * Math.sin(angle * 19 + phase * .7));
      return [x + (size + ripple) * Math.cos(angle), y + (size + ripple) * Math.sin(angle)];
    });
    const midpoint = (a: number[], b: number[]) => `${((a[0] + b[0]) / 2).toFixed(2)} ${((a[1] + b[1]) / 2).toFixed(2)}`;
    const path = `M ${midpoint(points[segments - 1], points[0])} ` + points.map((point, index) =>
      `Q ${point[0].toFixed(2)} ${point[1].toFixed(2)} ${midpoint(point, points[(index + 1) % segments])}`,
    ).join(' ') + ' Z';
    return { clipPath: `path('${path}')`, offset: progress };
  });
}
