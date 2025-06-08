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
  const obsImgsRef = useRef([]);
  const bgOffsetRef = useRef(0);
  const speedRef = useRef(400);
  const spawnRef = useRef(0);
  const timeRef = useRef({ start: 0, last: 0 });

  // 預載入背景及障礙圖片
  useEffect(() => {
    const bgSources = ['/1.png', '/2.png', '/3.png', '/4.png'];
    bgImgsRef.current = bgSources.map(src => { const img = new Image(); img.src = src; return img; });
    const obsSources = ['/1.webp', '/2.webp', '/3.webp', '/4.webp', '/5.webp', '/6.webp'];
    obsImgsRef.current = obsSources.map(src => { const img = new Image(); img.src = src; return img; });
  }, []);

  // 畫布自適應
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
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

    // 角色圖片
    const playerImg = new Image();
    playerImg.src = '/run1.webp';

    // 初始化狀態
    playerRef.current = { x: 100, y: H - 290 - 10, width: 200, height: 290, vy: 0, grav: 2000, jumping: false };
    obstaclesRef.current = [];
    spawnRef.current = MIN_DIST + Math.random() * (MAX_DIST - MIN_DIST);
    timeRef.current = { start: performance.now(), last: performance.now() };

    const spawnObstacle = () => {
      const imgArr = obsImgsRef.current;
      const idx = Math.floor(Math.random() * imgArr.length);
      const w = 180;
      const h = 240;
      obstaclesRef.current.push({ x: W, width: w, height: h, y: H - h - 10, img: imgArr[idx] });
    };

    const clearCanvas = () => ctx.clearRect(0, 0, W, H);

    // 背景無縫滾動
    const drawBackground = dt => {
      const imgs = bgImgsRef.current;
      if (!imgs.length) return;
      const totalW = W * imgs.length;
      bgOffsetRef.current = (bgOffsetRef.current + speedRef.current * dt) % totalW;
      const offset = bgOffsetRef.current;
      imgs.forEach((img, idx) => {
        if (img.complete && img.naturalWidth > 0) {
          const x1 = idx * W - offset;
          ctx.drawImage(img, x1, 0, W, H);
          ctx.drawImage(img, x1 + totalW, 0, W, H);
        }
      });
    };

    const drawScene = elapsed => {
      const p = playerRef.current;
      // 角色
      ctx.drawImage(playerImg, p.x, p.y, p.width, p.height);
      // 障礙物
      obstaclesRef.current.forEach(o => {
        if (o.img.complete) ctx.drawImage(o.img, o.x, o.y, o.width, o.height);
      });
      // 時間顯示
      ctx.fillStyle = '#000';
      ctx.font = '24px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(elapsed.toFixed(1) + ' s', W - 20, 40);
    };

    const drawGameOver = elapsed => {
      drawScene(elapsed);
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = '48px sans-serif';
      ctx.fillText(`你撐了 ${elapsed.toFixed(1)} 秒，終究敗在了危機中...`, W / 2, H / 2 - 20);
      ctx.font = '24px sans-serif';
      ctx.fillText('', W / 2, H / 2 + 0);
      ctx.fillText('午餐還沒到手，怎麼可以就這樣放棄！', W / 2, H / 2 + 30);
      ctx.fillText('按下空白鍵，再衝一次！', W / 2, H / 2 + 70);
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
      // 障礙移動及碰撞
      let alive = true;
      obstaclesRef.current.forEach((o, i) => {
        o.x -= speedRef.current * dt;
        // 計算重疊面積
        const overlapX = Math.min(p.x + p.width, o.x + o.width) - Math.max(p.x, o.x);
        const overlapY = Math.min(p.y + p.height, o.y + o.height) - Math.max(p.y, o.y);
        if (overlapX > o.width / 2 && overlapY > o.height / 2) {
          alive = false;
        }
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

  // 標題＆說明遮罩
  const overlayStyle = {
    position: 'fixed', top: 0, left: 0,
    width: '100vw', height: '100vh',
    backgroundImage: "linear-gradient(rgba(0,0,0,0.5),rgba(0,0,0,0.5)), url('/bg1.webp')",
    backgroundSize: 'cover', backgroundPosition: 'center',
    color: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '20px', boxSizing: 'border-box'
  };

  return (
    <>
      <canvas ref={canvasRef} style={{ position: 'fixed', top: 0, left: 0 }} />
      {gameState === 'title' && (
        <div style={overlayStyle}>
          <h1 style={{ fontSize: '64px', margin: '0 0 20px' }}>指南路午間求生指南</h1>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '20px', margin: '10px 0' }}>{`鐘聲響起，所有政大人準備出動…
指南路陷入混戰，只為那一口熱騰騰的便當
準備好了嗎？「按下任意鍵」開始生存模式！`}</p>
        </div>
      )}
      {gameState === 'instructions' && (
        <div style={overlayStyle}>
          <h2 style={{ fontSize: '48px', marginBottom: '24px' }}>遊戲說明</h2>
          <p style={{ whiteSpace: 'pre-wrap', fontSize: '20px', margin: '10px 0' }}>{`中午的指南路總是特別擁擠
腳步要快，眼神要準
為了那一份便當，大家都在跟時間賽跑

只需要「按下空白鍵」
閃過障礙、避開危機，才能一路前進

撐得越久，午餐就離你越近
一個閃神，就只能餓著回教室了……

按下空白鍵，開始你的求生之路！`}</p>
        </div>
      )}
    </>
  );
}