# 🐍 Snake

İki versiyonlu klasik Snake oyunu.

## Versiyonlar

### `snake-web/` — Tarayıcı (Web)
Express.js sunucu + HTML Canvas. Docker desteği var.

```bash
cd snake-web
npm install
npm start          # http://localhost:3000
```

Docker ile:
```bash
cd snake-web
docker build -t snake-web .
docker run -p 3000:3000 snake-web
```

**Kontroller:** Ok tuşları / WASD · `Space` duraklat · `R` yeniden başlat

### `game.js` — Terminal (CLI)
Node.js ile terminalde oynanan versiyon.

```bash
node game.js
```

## Dosyalar
- `snake-web/` — web versiyonu (server.js, public/, Dockerfile)
- `game.js` — terminal versiyonu
- `DEPLOY.md` — deploy talimatları

## Lisans
MIT
