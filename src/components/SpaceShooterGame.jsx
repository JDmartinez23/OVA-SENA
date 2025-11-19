import React, { useState, useEffect, useRef } from 'react';

const SpaceShooterGame = () => {
  const canvasRef = useRef(null);
  const [gameState, setGameState] = useState('menu');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [highScore, setHighScore] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const gameLoopRef = useRef(null);
  const keysRef = useRef({});

  const CANVAS_WIDTH = 800;
  const CANVAS_HEIGHT = 600;
  const PLAYER_SIZE = 32;
  const METEOR_SIZE = 24;
  const BULLET_SIZE = 8;
  const BOSS_SIZE = 80;
  const POWERUP_SIZE = 20;

  const gameRef = useRef({
    player: { 
      x: CANVAS_WIDTH / 2, 
      y: CANVAS_HEIGHT - 80, 
      speed: 5, 
      width: PLAYER_SIZE, 
      height: PLAYER_SIZE,
      weaponType: 'normal',
      shield: false,
      shieldTimer: 0
    },
    bullets: [],
    meteors: [],
    boss: null,
    particles: [],
    floatingTexts: [],
    powerUps: [],
    lastShot: 0,
    meteorSpawnTimer: 0,
    powerUpSpawnTimer: 0,
    bossPhase: 0,
    levelChangeTimer: 0,
    showLevelText: false
  });

  const audioContextRef = useRef(null);

  const playSound = (type) => {
    if (!soundEnabled) return;
    
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      }
      
      const ctx = audioContextRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      
      switch(type) {
        case 'shoot':
          oscillator.frequency.value = 400;
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.1);
          break;
        case 'hit':
          oscillator.frequency.value = 200;
          gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.15);
          break;
        case 'explosion':
          oscillator.type = 'sawtooth';
          oscillator.frequency.value = 100;
          gainNode.gain.setValueAtTime(0.5, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.3);
          break;
        case 'powerup':
          oscillator.frequency.value = 600;
          gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.2);
          break;
        case 'levelup':
          oscillator.frequency.value = 800;
          gainNode.gain.setValueAtTime(0.4, ctx.currentTime);
          gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
          oscillator.start(ctx.currentTime);
          oscillator.stop(ctx.currentTime + 0.4);
          break;
        default:
          break;
      }
    } catch (error) {
      console.log('Audio not supported');
    }
  };

  const getLevelConfig = (lvl) => {
    const configs = {
      1: { meteorSpeed: 2, meteorSpawnRate: 80, hasBoss: false, meteorCount: 1 },
      2: { meteorSpeed: 3, meteorSpawnRate: 60, hasBoss: false, meteorCount: 2 },
      3: { meteorSpeed: 4, meteorSpawnRate: 50, hasBoss: true, meteorCount: 2, bossHealth: 30 },
      4: { meteorSpeed: 5, meteorSpawnRate: 40, hasBoss: true, meteorCount: 3, bossHealth: 50 },
      5: { meteorSpeed: 6, meteorSpawnRate: 30, hasBoss: true, meteorCount: 3, bossHealth: 80 }
    };
    return configs[lvl] || configs[1];
  };

  const createFloatingText = (x, y, text, color) => {
    const game = gameRef.current;
    game.floatingTexts.push({
      x, y,
      text,
      color,
      life: 60,
      vy: -1
    });
  };

  const createParticles = (x, y, color) => {
    const game = gameRef.current;
    for (let i = 0; i < 15; i++) {
      game.particles.push({
        x, y,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 30,
        color
      });
    }
  };

  const initLevel = (lvl) => {
    const game = gameRef.current;
    game.bullets = [];
    game.meteors = [];
    game.particles = [];
    game.floatingTexts = [];
    game.powerUps = [];
    game.meteorSpawnTimer = 0;
    game.powerUpSpawnTimer = 0;
    game.bossPhase = 0;
    game.showLevelText = true;
    game.levelChangeTimer = 180;

    playSound('levelup');

    const config = getLevelConfig(lvl);
    if (config.hasBoss) {
      game.boss = {
        x: CANVAS_WIDTH / 2,
        y: 100,
        width: BOSS_SIZE,
        height: BOSS_SIZE,
        health: config.bossHealth,
        maxHealth: config.bossHealth,
        moveDir: 1,
        shootTimer: 0,
        pattern: 0
      };
    } else {
      game.boss = null;
    }
  };

  const shoot = () => {
    const game = gameRef.current;
    const now = Date.now();
    const shootDelay = game.player.weaponType === 'rapid' ? 100 : 200;
    
    if (now - game.lastShot > shootDelay) {
      playSound('shoot');
      
      if (game.player.weaponType === 'spread') {
        for (let i = -1; i <= 1; i++) {
          game.bullets.push({
            x: game.player.x + i * 10,
            y: game.player.y - 10,
            speed: 8,
            vx: i * 2
          });
        }
      } else {
        game.bullets.push({
          x: game.player.x,
          y: game.player.y - 10,
          speed: 8,
          vx: 0
        });
      }
      game.lastShot = now;
    }
  };

  const spawnPowerUp = (x, y) => {
    const types = ['shield', 'spread', 'rapid', 'health'];
    const type = types[Math.floor(Math.random() * types.length)];
    
    gameRef.current.powerUps.push({
      x, y,
      type,
      speed: 2
    });
  };

  const nextLevel = () => {
    const newLevel = level + 1;
    if (newLevel <= 5) {
      setLevel(newLevel);
      initLevel(newLevel);
    } else {
      setGameState('gameover');
    }
  };

  const update = () => {
    if (gameState !== 'playing') return;

    const game = gameRef.current;
    const config = getLevelConfig(level);

    if (game.levelChangeTimer > 0) {
      game.levelChangeTimer--;
      if (game.levelChangeTimer === 0) {
        game.showLevelText = false;
      }
    }

    if (game.player.shield) {
      game.player.shieldTimer--;
      if (game.player.shieldTimer <= 0) {
        game.player.shield = false;
      }
    }

    if (keysRef.current['ArrowLeft'] && game.player.x > 20) {
      game.player.x -= game.player.speed;
    }
    if (keysRef.current['ArrowRight'] && game.player.x < CANVAS_WIDTH - 20) {
      game.player.x += game.player.speed;
    }
    if (keysRef.current['ArrowUp'] && game.player.y > 20) {
      game.player.y -= game.player.speed;
    }
    if (keysRef.current['ArrowDown'] && game.player.y < CANVAS_HEIGHT - 20) {
      game.player.y += game.player.speed;
    }
    if (keysRef.current[' ']) {
      shoot();
    }

    game.bullets = game.bullets.filter(bullet => {
      bullet.y -= bullet.speed;
      bullet.x += bullet.vx || 0;
      return bullet.y > -10 && bullet.x > 0 && bullet.x < CANVAS_WIDTH;
    });

    game.floatingTexts = game.floatingTexts.filter(t => {
      t.y += t.vy;
      t.life--;
      return t.life > 0;
    });

    game.particles = game.particles.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life--;
      return p.life > 0;
    });

    game.powerUpSpawnTimer++;
    if (game.powerUpSpawnTimer > 600 && !game.boss) {
      game.powerUpSpawnTimer = 0;
      spawnPowerUp(Math.random() * (CANVAS_WIDTH - 40) + 20, -20);
    }

    game.powerUps = game.powerUps.filter(powerUp => {
      powerUp.y += powerUp.speed;
      
      const dx = powerUp.x - game.player.x;
      const dy = powerUp.y - game.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 30) {
        playSound('powerup');
        createFloatingText(powerUp.x, powerUp.y, powerUp.type.toUpperCase(), '#ffd93d');
        
        switch(powerUp.type) {
          case 'shield':
            game.player.shield = true;
            game.player.shieldTimer = 600;
            break;
          case 'spread':
            game.player.weaponType = 'spread';
            setTimeout(() => { 
              if (gameRef.current.player) {
                gameRef.current.player.weaponType = 'normal'; 
              }
            }, 10000);
            break;
          case 'rapid':
            game.player.weaponType = 'rapid';
            setTimeout(() => { 
              if (gameRef.current.player) {
                gameRef.current.player.weaponType = 'normal'; 
              }
            }, 10000);
            break;
          case 'health':
            setLives(l => Math.min(l + 1, 5));
            break;
          default:
            break;
        }
        return false;
      }
      
      return powerUp.y < CANVAS_HEIGHT + 20;
    });

    if (game.boss && game.boss.health > 0) {
      game.boss.x += game.boss.moveDir * 2;
      if (game.boss.x < BOSS_SIZE / 2 || game.boss.x > CANVAS_WIDTH - BOSS_SIZE / 2) {
        game.boss.moveDir *= -1;
      }

      game.boss.shootTimer++;
      if (game.boss.shootTimer > 40) {
        game.boss.shootTimer = 0;
        if (game.boss.pattern === 0) {
          game.meteors.push({
            x: game.boss.x,
            y: game.boss.y + BOSS_SIZE / 2,
            speed: 4,
            vx: 0,
            isBossProjectile: true
          });
        } else {
          for (let i = -1; i <= 1; i++) {
            game.meteors.push({
              x: game.boss.x,
              y: game.boss.y + BOSS_SIZE / 2,
              speed: 4,
              vx: i * 2,
              isBossProjectile: true
            });
          }
        }
        game.boss.pattern = (game.boss.pattern + 1) % 2;
      }

      game.bullets = game.bullets.filter(bullet => {
        if (bullet.x > game.boss.x - BOSS_SIZE / 2 &&
            bullet.x < game.boss.x + BOSS_SIZE / 2 &&
            bullet.y > game.boss.y - BOSS_SIZE / 2 &&
            bullet.y < game.boss.y + BOSS_SIZE / 2) {
          game.boss.health--;
          playSound('hit');
          createParticles(bullet.x, bullet.y, '#ff6b6b');
          createFloatingText(bullet.x, bullet.y, '+10', '#ffd93d');
          setScore(s => s + 10);
          return false;
        }
        return true;
      });

      if (game.boss.health <= 0) {
        playSound('explosion');
        createParticles(game.boss.x, game.boss.y, '#ffd93d');
        createFloatingText(game.boss.x, game.boss.y, '+500', '#ffd93d');
        setScore(s => s + 500);
        
        spawnPowerUp(game.boss.x, game.boss.y);
        
        game.boss = null;
        setTimeout(() => {
          nextLevel();
        }, 1000);
      }
    } else if (!config.hasBoss || (game.boss && game.boss.health <= 0)) {
      game.meteorSpawnTimer++;
      if (game.meteorSpawnTimer > config.meteorSpawnRate) {
        game.meteorSpawnTimer = 0;
        for (let i = 0; i < config.meteorCount; i++) {
          game.meteors.push({
            x: Math.random() * (CANVAS_WIDTH - 40) + 20,
            y: -20,
            speed: config.meteorSpeed,
            vx: (Math.random() - 0.5) * 2
          });
        }
      }
    }

    game.meteors = game.meteors.filter(meteor => {
      meteor.y += meteor.speed;
      meteor.x += meteor.vx || 0;
      
      const dx = meteor.x - game.player.x;
      const dy = meteor.y - game.player.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance < 25) {
        if (game.player.shield) {
          playSound('hit');
          createParticles(meteor.x, meteor.y, '#00d2ff');
          return false;
        } else {
          playSound('explosion');
          createParticles(meteor.x, meteor.y, '#ff4757');
          setLives(l => {
            const newLives = l - 1;
            if (newLives <= 0) {
              setGameState('gameover');
            }
            return newLives;
          });
          return false;
        }
      }

      for (let i = game.bullets.length - 1; i >= 0; i--) {
        const bullet = game.bullets[i];
        const bdx = bullet.x - meteor.x;
        const bdy = bullet.y - meteor.y;
        const bdist = Math.sqrt(bdx * bdx + bdy * bdy);
        
        if (bdist < 20) {
          playSound('hit');
          createParticles(meteor.x, meteor.y, '#6c5ce7');
          createFloatingText(meteor.x, meteor.y, '+10', '#ffd93d');
          game.bullets.splice(i, 1);
          setScore(s => s + 10);
          
          if (Math.random() < 0.1) {
            spawnPowerUp(meteor.x, meteor.y);
          }
          
          return false;
        }
      }

      return meteor.y < CANVAS_HEIGHT + 20;
    });

    if (!config.hasBoss && score > 500 * level) {
      nextLevel();
    }
  };

  const getCharPattern = (char) => {
    const patterns = {
      '0': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
      '1': [[0,1,0],[1,1,0],[0,1,0],[0,1,0],[1,1,1]],
      '2': [[1,1,1],[0,0,1],[1,1,1],[1,0,0],[1,1,1]],
      '3': [[1,1,1],[0,0,1],[1,1,1],[0,0,1],[1,1,1]],
      '4': [[1,0,1],[1,0,1],[1,1,1],[0,0,1],[0,0,1]],
      '5': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
      '6': [[1,1,1],[1,0,0],[1,1,1],[1,0,1],[1,1,1]],
      '7': [[1,1,1],[0,0,1],[0,0,1],[0,0,1],[0,0,1]],
      '8': [[1,1,1],[1,0,1],[1,1,1],[1,0,1],[1,1,1]],
      '9': [[1,1,1],[1,0,1],[1,1,1],[0,0,1],[1,1,1]],
      'A': [[0,1,0],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
      'B': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,1,0]],
      'C': [[1,1,1],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
      'D': [[1,1,0],[1,0,1],[1,0,1],[1,0,1],[1,1,0]],
      'E': [[1,1,1],[1,0,0],[1,1,1],[1,0,0],[1,1,1]],
      'F': [[1,1,1],[1,0,0],[1,1,0],[1,0,0],[1,0,0]],
      'G': [[1,1,1],[1,0,0],[1,0,1],[1,0,1],[1,1,1]],
      'H': [[1,0,1],[1,0,1],[1,1,1],[1,0,1],[1,0,1]],
      'I': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[1,1,1]],
      'L': [[1,0,0],[1,0,0],[1,0,0],[1,0,0],[1,1,1]],
      'N': [[1,0,1],[1,1,1],[1,0,1],[1,0,1],[1,0,1]],
      'O': [[1,1,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
      'P': [[1,1,1],[1,0,1],[1,1,1],[1,0,0],[1,0,0]],
      'R': [[1,1,0],[1,0,1],[1,1,0],[1,0,1],[1,0,1]],
      'S': [[1,1,1],[1,0,0],[1,1,1],[0,0,1],[1,1,1]],
      'T': [[1,1,1],[0,1,0],[0,1,0],[0,1,0],[0,1,0]],
      'U': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[1,1,1]],
      'V': [[1,0,1],[1,0,1],[1,0,1],[1,0,1],[0,1,0]],
      '+': [[0,0,0],[0,1,0],[1,1,1],[0,1,0],[0,0,0]],
      ':': [[0,0,0],[0,1,0],[0,0,0],[0,1,0],[0,0,0]],
      ' ': [[0,0,0],[0,0,0],[0,0,0],[0,0,0],[0,0,0]]
    };
    return patterns[char.toUpperCase()] || patterns[' '];
  };

  const drawPixelText = (ctx, text, x, y, size, color) => {
    ctx.fillStyle = color;
    const chars = text.split('');
    let offsetX = 0;
    
    chars.forEach(char => {
      const patterns = getCharPattern(char);
      patterns.forEach((row, rowIndex) => {
        row.forEach((pixel, colIndex) => {
          if (pixel) {
            ctx.fillRect(x + offsetX + colIndex * size, y + rowIndex * size, size, size);
          }
        });
      });
      offsetX += (patterns[0].length + 1) * size;
    });
  };

  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const game = gameRef.current;

    ctx.fillStyle = '#0a0e27';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 100; i++) {
      const x = (i * 73) % CANVAS_WIDTH;
      const y = (i * 97 + Date.now() * 0.02) % CANVAS_HEIGHT;
      ctx.fillRect(x, y, 2, 2);
    }

    game.particles.forEach(p => {
      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.life / 30;
      ctx.fillRect(p.x - 2, p.y - 2, 4, 4);
    });
    ctx.globalAlpha = 1;

    game.floatingTexts.forEach(t => {
      ctx.globalAlpha = t.life / 60;
      drawPixelText(ctx, t.text, t.x - 15, t.y, 2, t.color);
    });
    ctx.globalAlpha = 1;

    game.powerUps.forEach(powerUp => {
      const colors = {
        shield: '#00d2ff',
        spread: '#ff6b6b',
        rapid: '#ffd93d',
        health: '#2ecc71'
      };
      ctx.fillStyle = colors[powerUp.type];
      ctx.fillRect(powerUp.x - 10, powerUp.y - 10, 20, 20);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(powerUp.x - 6, powerUp.y - 6, 12, 12);
      ctx.fillStyle = colors[powerUp.type];
      ctx.fillRect(powerUp.x - 4, powerUp.y - 4, 8, 8);
    });

    if (game.player.shield) {
      ctx.strokeStyle = '#00d2ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(game.player.x, game.player.y, 25, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = '#00d2ff';
    ctx.fillRect(game.player.x - 8, game.player.y - 12, 16, 24);
    ctx.fillStyle = '#0099cc';
    ctx.fillRect(game.player.x - 12, game.player.y, 8, 8);
    ctx.fillRect(game.player.x + 4, game.player.y, 8, 8);
    
    if (game.player.weaponType === 'spread') {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(game.player.x - 4, game.player.y + 8, 8, 4);
    } else if (game.player.weaponType === 'rapid') {
      ctx.fillStyle = '#ffd93d';
      ctx.fillRect(game.player.x - 4, game.player.y + 8, 8, 4);
    } else {
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(game.player.x - 4, game.player.y + 8, 8, 4);
    }

    ctx.fillStyle = '#ffd93d';
    game.bullets.forEach(bullet => {
      ctx.fillRect(bullet.x - 3, bullet.y - 6, 6, 12);
    });

    game.meteors.forEach(meteor => {
      ctx.fillStyle = meteor.isBossProjectile ? '#e74c3c' : '#8b7355';
      ctx.fillRect(meteor.x - 12, meteor.y - 12, 24, 24);
      ctx.fillStyle = meteor.isBossProjectile ? '#c0392b' : '#6b5344';
      ctx.fillRect(meteor.x - 8, meteor.y - 8, 16, 16);
    });

    if (game.boss && game.boss.health > 0) {
      const boss = game.boss;
      ctx.fillStyle = '#e74c3c';
      ctx.fillRect(boss.x - 40, boss.y - 40, 80, 80);
      ctx.fillStyle = '#c0392b';
      ctx.fillRect(boss.x - 30, boss.y - 30, 60, 60);
      ctx.fillStyle = '#ff6b6b';
      ctx.fillRect(boss.x - 20, boss.y - 20, 40, 40);
      
      const healthPercent = boss.health / boss.maxHealth;
      ctx.fillStyle = '#34495e';
      ctx.fillRect(CANVAS_WIDTH / 2 - 150, 20, 300, 20);
      ctx.fillStyle = healthPercent > 0.5 ? '#2ecc71' : healthPercent > 0.25 ? '#f39c12' : '#e74c3c';
      ctx.fillRect(CANVAS_WIDTH / 2 - 148, 22, 296 * healthPercent, 16);
    }

    drawPixelText(ctx, 'PUNTOS ' + score, 10, 10, 3, '#ffffff');
    drawPixelText(ctx, 'NIVEL ' + level, 10, 35, 3, '#00d2ff');
    drawPixelText(ctx, 'VIDAS', 10, 60, 3, '#ffffff');
    
    ctx.fillStyle = '#ff6b6b';
    for (let i = 0; i < lives; i++) {
      ctx.fillRect(90 + i * 25, 58, 20, 20);
    }

    if (game.player.weaponType !== 'normal') {
      const weaponText = game.player.weaponType === 'spread' ? 'SPREAD' : 'RAPID';
      drawPixelText(ctx, weaponText, 10, 85, 2, '#ffd93d');
    }

    if (game.showLevelText && game.levelChangeTimer > 0) {
      ctx.globalAlpha = Math.min(1, game.levelChangeTimer / 60);
      const text = 'NIVEL ' + level;
      drawPixelText(ctx, text, CANVAS_WIDTH / 2 - 80, CANVAS_HEIGHT / 2 - 20, 6, '#ffd93d');
      ctx.globalAlpha = 1;
    }
  };

  useEffect(() => {
    if (gameState === 'playing') {
      gameLoopRef.current = setInterval(() => {
        update();
        render();
      }, 1000 / 60);
    }
    return () => clearInterval(gameLoopRef.current);
  }, [gameState, level, score, lives]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', ' '].includes(e.key)) {
        e.preventDefault();
      }
      keysRef.current[e.key] = true;
    };

    const handleKeyUp = (e) => {
      keysRef.current[e.key] = false;
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  useEffect(() => {
    if (gameState === 'gameover' && score > highScore) {
      setHighScore(score);
    }
  }, [gameState, score, highScore]);

  const startGame = () => {
    setScore(0);
    setLives(3);
    setLevel(1);
    gameRef.current.player.weaponType = 'normal';
    gameRef.current.player.shield = false;
    initLevel(1);
    setGameState('playing');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-transparent">
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="rounded-lg" /* sin border ni sombra -> quita la línea azul */
      />
      
      {gameState === 'menu' && (
        <div className="absolute flex flex-col items-center gap-4 p-8 rounded-lg pixel-text bg-transparent">
          <h1 className="text-5xl font-bold text-cyan-400 mb-4">BATALLA ESPACIAL</h1>
          <div className="text-white text-lg text-center mb-4">
            <p>⬅️➡️⬆️⬇️ - Mover nave</p>
            <p>ESPACIO - Disparar</p>
            <p className="mt-4 text-cyan-300">Esquiva meteoros y derrota jefes</p>
            <p className="text-yellow-300">Jefes en niveles 3, 4 y 5</p>
            <p className="mt-4 text-green-300">🎁 POWER-UPS:</p>
            <p className="text-sm">🛡️ SHIELD - Escudo protector</p>
            <p className="text-sm">⚡ SPREAD - Disparo triple</p>
            <p className="text-sm">🔥 RAPID - Disparo rápido</p>
            <p className="text-sm">❤️ HEALTH - Vida extra</p>
          </div>
          <button
            onClick={startGame}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-4 px-8 rounded-lg text-2xl transition pixel-text"
          >
            INICIAR JUEGO
          </button>
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="bg-gray-700 hover:bg-gray-600 text-white font-bold py-2 px-4 rounded-lg text-lg transition pixel-text"
          >
            SONIDO: {soundEnabled ? 'ON' : 'OFF'}
          </button>
          {highScore > 0 && (
            <p className="text-yellow-300 text-xl mt-4">
              RECORD: {highScore}
            </p>
          )}
        </div>
      )}

      {gameState === 'gameover' && (
        <div className="absolute flex flex-col items-center gap-4 p-8 rounded-lg pixel-text bg-transparent">
          <h2 className="text-4xl font-bold text-red-400">
            {lives <= 0 ? 'GAME OVER' : 'VICTORIA'}
          </h2>
          <p className="text-white text-2xl">PUNTUACION {score}</p>
          <p className="text-white text-xl">NIVEL {level}</p>
          {score > highScore && (
            <p className="text-yellow-300 text-2xl animate-pulse">
              ¡NUEVO RECORD!
            </p>
          )}
          {highScore > 0 && (
            <p className="text-gray-400 text-lg">
              RECORD: {highScore}
            </p>
          )}
          <button
            onClick={startGame}
            className="bg-cyan-500 hover:bg-cyan-600 text-white font-bold py-3 px-6 rounded-lg text-xl transition pixel-text"
          >
            JUGAR DE NUEVO
          </button>
        </div>
      )}
    </div>
  );
};

export default SpaceShooterGame;