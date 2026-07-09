# Coolify Server — Proje Deploy Rehberi

> Antigravity ve Claude Code ile üretilen projeleri bu sunucuya nasıl yükleyip yayına alacağın.
> Tüm bilgiler sunucunun **gerçek** durumundan doğrulanmıştır (tarih: 2026-07).

---

## 0. Sunucu Bilgileri (gerçek değerler)

| Öğe | Değer |
|------|-------|
| OS | Ubuntu 26.04 LTS |
| Docker | 29.6.1 ✅ |
| Git | 2.53.0 ✅ |
| Node.js | **YOK** — host'ta kurulu değil (Docker ile çalıştır) |
| Firewall (ufw) | Inactive (port kapama yok) |
| SSH | `hhh@100.70.135.17` · şifre ile |
| Coolify Panel | **http://100.70.135.17:8000** |
| Ağ | **Tailscale/CGNAT** (`100.64.0.0/10` aralığı) |

**Doluluk uyarısı — kullanımda olan portlar (ayıramazsın):**
- `80, 443, 8080` → `coolify-proxy` (Traefik reverse proxy)
- `8000` → Coolify paneli (içeride 8080'e map)
- `6001-6002` → `coolify-realtime`

**Serbest portlar:** `8081` ve sonrası (snake oyunu `8081`'de çalışıyor).

---

## 1. Erişim

### SSH
```bash
ssh hhh@100.70.135.17        # şifre: (senin belirlediğin)
# sudo şifre ister (NOPASSWD kapalı)
sudo docker ps
```

### Coolify Panel (tarayıcı)
```
http://100.70.135.17:8000
```
İlk girişte admin hesabı oluşturursun (veya oluşturduysan giriş yap).

> ⚠️ **Tarayıcı açılmıyorsa:** Sunucu Tailscale ağında. Erişen cihaz da **aynı Tailnet'e** bağlı olmalı. Değilse:
> - Tailscale'e bağlan, **veya**
> - `sudo ufw allow 8000/tcp` ile geçici aç (güvenlik riski), **veya**
> - Coolify'ı gerçek bir domain + HTTPS ile dışarı aç (Section 6).

---

## 2. Deploy Yöntemleri (2 yol)

### Yöntem A — Coolify ile (ÖNERİLEN)
Kodunu bir Git reposuna (GitHub/GitLab/Gitea) itersin, Coolify çeker, build eder, port/domain/HTTPS'i otomatik yönetir. Bu, **Antigravity ve Claude Code çıktıları için ana yol**.

### Yöntem B — Manuel Docker (hızlı, geçici)
Build edip `docker run` ile başlatırsın (snake oyununu böyle yaptık). Domain/HTTPS yok, doğrudan `IP:PORT`. Tek seferlik şeyler için iyi.

---

## 3. Yöntem A: Coolify + Git (adım adım)

### 3.1. Kodu Git'e it
Antigravity/Claude Code projen yerelde hazır. Bir repo oluştur ve it:

```bash
cd projem
git init
git add .
git commit -m "feat: initial commit"
git branch -M main
git remote add origin git@github.com:kullanici/projem.git
git push -u origin main
```

**Önemli:** `.gitignore` ekle — `node_modules/`, `.env`, `dist/`, `build/` dışında kalsın.

### 3.2. Coolify'da kaynak ekle
1. Panel → **+ New Resource** → **Public Repository** (veya GitHub App ile Private).
2. Repo URL veya GitHub bağlantısı seç.
3. Branch: `main`.

### 3.3. Build ayarı
Coolify projeyi otomatik tanır (Nixpacks):
- `package.json` varsa → `npm install` + `npm run build` + `npm start`
- `Dockerfile` varsa → **Dockerfile öncelikli** kullanılır (en garanti yol budur)

> 💡 **Tavsiye:** Her projeye kendi `Dockerfile`'ını koy. Antigravity/Claude Code'a "ürettiğin projeye production Dockerfile ekle" dedirt. Böylece Coolify'da buildpack tahmini yapmaz, senin Dockerfile'ın kesin çalışır.

### 3.4. Port
Coolify container'ın dinlediği portu bilmeli:
- Express: `process.env.PORT || 3000` → Coolify `3000`'i otomatik bulur
- Next.js: `3000`
- **Her zaman `0.0.0.0`'a bind et** — `localhost`/`127.0.0.1` yaparsan dışarıdan erişilemez.

```js
app.listen(process.env.PORT || 3000, '0.0.0.0', ...)
```

### 3.5. Domain + HTTPS (opsiyonel ama önerilen)
1. Servis ayarlarında **Domains** alanına: `projem.senindomain.com`
2. Domain DNS'ini sunucunun **public IP**'sine yönlendir.
3. Coolify Let's Encrypt ile HTTPS'i otomatik kurar (`coolify-proxy` üzerinden).

Artık `http://IP:PORT` yerine `https://projem.senindomain.com` ile erişilir.

### 3.6. Ortam değişkenleri (secrets)
Servis → **Environment Variables**. API key, DB url vb. buraya. **Asla `.env`'i Git'e itme.**

---

## 4. Yöntem B: Manuel Docker (snake örneği gibi)

Host'ta Node yok → her şey Docker. İki yol:

### 4a. Dockerfile ile build + run
```bash
ssh hhh@100.70.135.17
cd ~ && git clone https://github.com/kullanici/projem.git
cd projem
sudo docker build -t projem .
sudo docker run -d --name projem --restart unless-stopped -p 8082:3000 projem
```
URL: **http://100.70.135.17:8082**

### 4b. Hazır imaj (Docker Hub/registry)
```bash
sudo docker run -d --name projem --restart unless-stopped -p 8082:3000 kullanici/projem:latest
```

**Port seçimi:** `8081, 8082, 8083...` serbest. `8080` KULLANMA (coolify-proxy'te).

### Yönetim
```bash
sudo docker logs -f projem        # log
sudo docker restart projem        # yeniden başlat
sudo docker stop projem           # durdur
sudo docker rm -f projem          # sil
```

---

## 5. Proje Tiplerine Göre Şablonlar

### 5.1. Node.js / Express (Claude Code sık üretir)
**Dockerfile:**
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY . .
EXPOSE 3000
CMD ["node", "server.js"]
```
**server.js porta bind:**
```js
app.listen(process.env.PORT || 3000, '0.0.0.0');
```

### 5.2. Next.js
```dockerfile
FROM node:22-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```
> `next.config.js`'te `output: 'standalone'` daha küçük imaj verir.

### 5.3. Statik site (Vite/React/Antigravity UI çıktıları)
Build çıktısı (`dist/`) statiktir. Coolify'da **Static** build pack seç, çıkış klasörü `dist`. Yayın `80`'de olur.

Veya manuel:
```bash
sudo docker run -d --name ui -p 8083:80 \
  -v ~/projem/dist:/usr/share/nginx/html:ro nginx:alpine
```

### 5.4. Python (FastAPI/Flask)
```dockerfile
FROM python:3.13-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 5.5. Full-stack monorepo
Her servis için ayrı `Dockerfile` (örn. `apps/api/Dockerfile`, `apps/web/Dockerfile`). Coolify'da **Multi-service** ya da iki ayrı resource olarak ekle.

---

## 6. Antigravity & Claude Code Özel Notları

Bu iki araç da **yerelde kod üretir** — deploy açısından farkları yoktur. Akış aynı:

```
yerel kod (Antigravity/Claude Code) → Git repo → Coolify çeker → build → yayın
```

**İpuçları:**
- Üretim öncesi AI'a şunu dedirt: *"Bu projeye production-grade Dockerfile + .dockerignore + .gitignore ekle, portu 0.0.0.0'a bind et."*
- `.env.example` ürettip gerçek `.env`'i Git dışı tut.
- Claude Code'a `/security-scan` veya "hardcoded secret var mı kontrol et" dedirt → deploy öncesi.
- Health endpoint ekle (`GET /health` → `{ok:true}`). Coolify bunu readiness probe olarak kullanabilir.

---

## 7. Sık Karşılaşılan Sorunlar

| Belirti | Sebep | Çözüm |
|--------|-------|-------|
| `port is already allocated` | Port dolu (8080 vs.) | Boş port seç (8081+) |
| Site açılıyor ama 502 | Uygulama `localhost`'a bind | `0.0.0.0`'a bind et |
| `node: command not found` | Host'ta Node yok | Docker kullan (her zaman) |
| `sudo: interactive auth required` | Non-interactive sudo denemesi | `ssh -t` ile TTY al, veya `sudo`'ya şifre gir |
| Tarayıcı açılmıyor | Tailscale ağında değil | Tailnet'e bağlan veya domain aç |
| Build fail (npm) | `package-lock` uyumsuz | `npm ci` yerine `npm install`, veya lock'u sil |
| Coolify domain 404 | DNS henüz yayılmadı | DNS TTL bekle, public IP'ye yönlendir |

---

## 8. Referans: Snake Oyunu (çalışan örnek)

Bu sunucuda zaten çalışan örnek:
- **URL:** http://100.70.135.17:8081
- **Yöntem:** B (manuel Docker)
- **Container:** `snake-game` · imaj `snake-web`
- **İç port:** `3000` → **dış port:** `8081`
- **Dosyalar:** `~/snake-web/` (server.js + public/ + Dockerfile)

Yönet:
```bash
ssh hhh@100.70.135.17
sudo docker logs -f snake-game
sudo docker restart snake-game
```

---

## Hızlı Karar Akışı

```
Proje hazır mı?
  → Git'e it
    → Kalıcı + domain istiyorum? → Yöntem A (Coolify + Git)  ✅ önerilen
    → Hızlı/tek seferlik?         → Yöntem B (manuel docker run)
```
