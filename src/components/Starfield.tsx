import { useEffect, useRef } from 'react';

interface StarfieldProps {
  count: number;
  nebulaVisible: boolean;
}

export function Starfield({ count, nebulaVisible }: StarfieldProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const draw = () => {
      const ratio = window.devicePixelRatio || 1;
      canvas.width = Math.floor(canvas.clientWidth * ratio);
      canvas.height = Math.floor(canvas.clientHeight * ratio);
      ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
      const width = canvas.clientWidth;
      const height = canvas.clientHeight;
      ctx.clearRect(0, 0, width, height);

      if (nebulaVisible) {
        const nebulae = [
          { x: width * 0.2, y: height * 0.34, r: 360, hue: 205, a: 0.07 },
          { x: width * 0.78, y: height * 0.62, r: 430, hue: 288, a: 0.045 },
          { x: width * 0.5, y: height * 0.18, r: 310, hue: 178, a: 0.035 },
        ];
        for (const nebula of nebulae) {
          const gradient = ctx.createRadialGradient(nebula.x, nebula.y, 0, nebula.x, nebula.y, nebula.r);
          gradient.addColorStop(0, `hsla(${nebula.hue}, 90%, 55%, ${nebula.a})`);
          gradient.addColorStop(0.5, `hsla(${nebula.hue}, 80%, 30%, ${nebula.a * 0.35})`);
          gradient.addColorStop(1, 'transparent');
          ctx.fillStyle = gradient;
          ctx.fillRect(0, 0, width, height);
        }
      }

      for (let i = 0; i < count; i += 1) {
        const x = Math.random() * width;
        const y = Math.random() * height;
        const radius = Math.random() * 1.2;
        const alpha = 0.15 + Math.random() * 0.6;
        const cold = Math.random() > 0.72;
        ctx.beginPath();
        ctx.fillStyle = cold ? `rgba(155,190,255,${alpha})` : `rgba(235,245,255,${alpha})`;
        ctx.arc(x, y, radius, 0, Math.PI * 2);
        ctx.fill();
      }
    };

    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [count, nebulaVisible]);

  return <canvas ref={canvasRef} className="starfield" aria-hidden="true" />;
}
