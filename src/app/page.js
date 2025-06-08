'use client';

import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const canvasRef = useRef(null);
  const frameRef = useRef(null);
  const [gameState, setGameState] = useState('title');

  // 角色與障礙引用
  const playerRef = useRef({});
  const obstaclesRef = useRef([]);
  const bgImgsRef = useRef([]);
  const bgOffsetRef = useRef(0);
  const speedRef = useRef(400);
  const spawnRef = useRef(0);
  const timeRef = useRef({ start: 0, last: 0 });

  // 預載入背景圖片 1~4.png
  useEffect(() => {
    const sources = ['/1.png', '/2.png', '/3.png', '/4.png'];
    bgImgsRef.current = sources.map(src => {
      const img = new Image();
      img.src = src;
      return img;
    });
  }, []);

  // 畫布自適應
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  // 遊戲主邏輯
  useEffect(() => {
    if (gameState !== 'playing') return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const W = canvas.width;
    const H = canvas.height;
    const MIN_DIST = 800;
    const MAX_DIST = 1500;

    // 角色圖
    const playerImg = new Image();
    playerImg.src = '/run1.webp';

    // 初始化狀態
    playerRef.current = { x: 100, y: H - 290 - 10, width: 200, height: 290, vy: 0, grav: 2000, jumping: false };
    obstaclesRef.current = [];
    spawnRef.current = MIN_DIST + Math.random() * (MAX_DIST - MIN_DIST);
    timeRef.current = { start: performance.now(), last: performance.now() };

    const spawnObstacle = () => {
      obstaclesRef.current.push({ x: W, width: 150, height: 200, y: H - 200 - 10 });
    };

    const clearCanvas = () => ctx.clearRect(0, 0, W, H);

        // 精確無縫背景滾動
    const drawBackground = dt => {
      const imgs = bgImgsRef.current;
      if (!imgs.length) return;
      const totalW = W * imgs.length;
      // 更新偏移並限在 [0, totalW)
      bgOffsetRef.current = (bgOffsetRef.current + speedRef.current * dt) % totalW;
      const offset = bgOffsetRef.current;
      // 繪製每張圖
      imgs.forEach((img, idx) => {
        if (img.complete && img.naturalWidth > 0) {
          const baseX = idx * W - offset;
          // 主畫面
          ctx.drawImage(img, baseX, 0, W, H);
          // 如需補齊右側
          ctx.drawImage(img, baseX + totalW, 0, W, H);
        }
      });
    };

    const drawScene = elapsed => {
      const p = playerRef.current;
      // 背景
      // (already drawn in loop)
      // 角色
      ctx.drawImage(playerImg, p.x, p.y, p.width, p.height);
      // 障礙物
      ctx.fillStyle = 'skyblue';
      obstaclesRef.current.forEach(o => ctx.fillRect(o.x, o.y, o.width, o.height));
      // 時間顯示
      ctx.fillStyle = '#000';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(elapsed.toFixed(1) + ' s', W - 20, 40);
    };

    const drawGameOver = elapsed => {
      drawScene(elapsed);
      ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff'; ctx.font = '48px sans-serif'; ctx.textAlign = 'center';
      ctx.fillText(`你跑了 ${elapsed.toFixed(1)} 秒`, W / 2, H / 2 - 20);
      ctx.font = '32px sans-serif'; ctx.fillText('按空白鍵開始', W / 2, H / 2 + 30);
    };

    const loop = ts => {
      const dt = (ts - timeRef.current.last) / 1000;
      timeRef.current.last = ts;
      clearCanvas();
      drawBackground(dt);
      const elapsed = (ts - timeRef.current.start) / 1000;
      const p = playerRef.current;
      // 跳躍機制
      if (p.jumping) {
        p.vy += p.grav * dt;
        p.y += p.vy * dt;
        if (p.y >= H - p.height - 10) {
          p.y = H - p.height - 10;
          p.jumping = false;
          p.vy = 0;
        }
      }
      // 生成障礙
      spawnRef.current -= speedRef.current * dt;
      if (spawnRef.current <= 0) {
        spawnObstacle();
        spawnRef.current = MIN_DIST + Math.random() * (MAX_DIST - MIN_DIST);
      }
      // 障礙移動 & 碰撞
      let alive = true;
      obstaclesRef.current.forEach((o, i) => {
        o.x -= speedRef.current * dt;
        if (o.x < p.x + p.width && o.x + o.width > p.x && p.y < o.y + o.height && p.y + p.height > o.y) alive = false;
        if (o.x + o.width < 0) obstaclesRef.current.splice(i, 1);
      });
      if (alive) {
        drawScene(elapsed);
        frameRef.current = requestAnimationFrame(loop);
      } else {
        drawGameOver(elapsed);
        cancelAnimationFrame(frameRef.current);
        setGameState('over');
      }
    };

    frameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameRef.current);
  }, [gameState]);

  // 處理鍵盤
  useEffect(() => {
    const handler = e => {
      if (gameState === 'title') setGameState('instructions');
      else if (gameState === 'instructions' && e.code === 'Space') setGameState('playing');
      else if (gameState === 'playing' && e.code === 'Space') {
        const p = playerRef.current;
        if (!p.jumping) { p.jumping = true; p.vy = -1500; }
      } else if (gameState === 'over' && e.code === 'Space') setGameState('playing');
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [gameState]);

  // 標題＆說明遮罩樣式
  const overlayStyle = {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    backgroundImage: "linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url('/bg1.webp')",
    backgroundSize: 'cover', backgroundPosition: 'center',
    color: '#fff', display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', boxSizing: 'border-box'
  };

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0 }} />
      {gameState === 'title' && (
        <div style={overlayStyle}>
          <h1 style={{ fontSize: '64px', margin: '0 0 20px' }}>指南路午間求生指南</h1>
          <p style={{ fontSize: '20px' }}>鐘聲響起，所有政大人準備出動…</p>
          <p style={{ fontSize: '20px' }}>指南路陷入混戰，只為那一口熱騰騰的便當</p>
          <p style={{ fontSize: '20px' }}>你準備好了嗎？按任意鍵開始生存模式！</p>

        </div>
      )}
      {gameState === 'instructions' && (
        <div style={overlayStyle}>
          <h2 style={{ fontSize: '48px', marginBottom: '20px' }}>遊戲說明</h2>
          <p style={{ fontSize: '24px', margin: '10px 0' }}>按空白鍵開始</p>
        </div>
      )}
    </>
  );
}
