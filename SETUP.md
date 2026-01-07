# Radio Stream Setup Guide

This documents how to set up the YouTube radio stream on a fresh VM.

## Prerequisites

- Ubuntu 24.04 (or similar)
- Node.js 18+ and npm
- ffmpeg with libx264 and aac support
- pm2 (`npm install -g pm2`)

## 1. Build nginx with RTMP module

The standard nginx package doesn't include RTMP support. We need to compile from source.

### Install build dependencies

```bash
sudo apt update
sudo apt install -y build-essential libpcre3 libpcre3-dev zlib1g zlib1g-dev libssl-dev libgd-dev
```

### Download nginx and rtmp module

```bash
cd ~
wget http://nginx.org/download/nginx-1.24.0.tar.gz
tar -xzf nginx-1.24.0.tar.gz
git clone https://github.com/arut/nginx-rtmp-module.git
```

### Compile nginx with RTMP

```bash
cd nginx-1.24.0
./configure --with-http_ssl_module --add-module=/home/$USER/nginx-rtmp-module
make
sudo make install
```

This installs to `/usr/local/nginx/`.

### Disable system nginx (if installed)

```bash
# Stop and disable the apt-installed nginx to avoid conflicts
sudo systemctl stop nginx
sudo systemctl disable nginx
```

### Configure nginx for RTMP

Edit `/usr/local/nginx/conf/nginx.conf` and add the rtmp block at the end (outside the http block):

```nginx
rtmp {
    server {
        listen 1935;
        application live {
            live on;
            record off;
            idle_streams on;
            sync 1ms;
            wait_key on;
        }
    }
}
```

### Test the config

```bash
sudo /usr/local/nginx/sbin/nginx -t
```

### Start nginx manually

```bash
sudo /usr/local/nginx/sbin/nginx
```

### (Optional) Create systemd service for custom nginx

To avoid manual starts after reboot, create `/etc/systemd/system/nginx-rtmp.service`:

```ini
[Unit]
Description=nginx with RTMP module
After=network-online.target
Wants=network-online.target

[Service]
Type=forking
PIDFile=/usr/local/nginx/logs/nginx.pid
ExecStartPre=/usr/local/nginx/sbin/nginx -t
ExecStart=/usr/local/nginx/sbin/nginx
ExecReload=/usr/local/nginx/sbin/nginx -s reload
ExecStop=/usr/local/nginx/sbin/nginx -s quit
PrivateTmp=true

[Install]
WantedBy=multi-user.target
```

Then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable nginx-rtmp
sudo systemctl start nginx-rtmp
```

## 2. Set up the radio-stream project

### Clone the repo

```bash
cd ~
git clone <your-repo-url> radio-stream
cd radio-stream/scripts
npm install
```

### Configure environment

```bash
cp .env.example .env
nano .env  # Add your YOUTUBE_STREAM_KEY
```

### Add audio files

Place your mp3 files in `~/radio-stream/audio/` organized by folders:
- `CC_1_Files/`
- `CC_2_Files/`
- `CC_3_Files/`
- `LDT_Files/`
- `POLO_Files/`
- `LOFI_Files/`
- `NETRUNNER_Files/`

### Add testcard video

Place `testcard.mp4` in the scripts folder. This is the looping background video for the stream.

### Create initial txt files

```bash
cd ~/radio-stream/scripts
echo "Starting..." > title.txt
echo "" > description.txt
```

## 3. Start the stream

### Start with pm2

```bash
cd ~/radio-stream/scripts

# Start playlist pusher first (feeds audio to local RTMP)
pm2 start playlist-pusher.js

# Then start the stream to YouTube
pm2 start multi-audio-stream.js

# Save pm2 config for auto-restart
pm2 save
pm2 startup  # Follow the instructions it prints
```

### Verify it's working

```bash
pm2 logs
```

You should see:
- `[Persistent FFmpeg]` logs from playlist-pusher
- `[Song]` logs showing tracks being streamed
- `[Streamer]` logs from multi-audio-stream showing YouTube upload

## 4. After VM reboot

If you didn't set up the systemd service for nginx-rtmp:

```bash
# Stop system nginx if it auto-started
sudo systemctl stop nginx

# Start custom nginx with RTMP
sudo /usr/local/nginx/sbin/nginx

# pm2 should auto-restart if you ran pm2 startup, otherwise:
cd ~/radio-stream/scripts
pm2 start playlist-pusher.js
pm2 start multi-audio-stream.js
```

## Architecture Overview

```
┌─────────────────────┐
│   Audio Files       │
│  ~/radio-stream/    │
│      audio/         │
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│  playlist-pusher.js │  Shuffles playlist, streams audio
│  (pm2 managed)      │  Writes title.txt & description.txt
└─────────┬───────────┘
          │ ffmpeg → mpegts
          ▼
┌─────────────────────┐
│  nginx-rtmp         │  Local RTMP server
│  localhost:1935     │  rtmp://localhost/live/stream
└─────────┬───────────┘
          │
          ▼
┌─────────────────────┐
│ multi-audio-stream  │  Adds video overlay, glitch effects
│  (pm2 managed)      │  Reads title.txt & description.txt
└─────────┬───────────┘
          │ ffmpeg → flv
          ▼
┌─────────────────────┐
│  YouTube RTMP       │
│  rtmp://a.rtmp.     │
│  youtube.com/live2  │
└─────────────────────┘
```

## Troubleshooting

### Stream not starting
- Check nginx is running: `ps aux | grep nginx`
- Check pm2 status: `pm2 status`
- Check logs: `pm2 logs`

### Audio gaps or glitches
- The named pipe `audio_pipe` may need recreation:
  ```bash
  rm audio_pipe
  mkfifo audio_pipe
  pm2 restart playlist-pusher
  ```

### YouTube stream health warnings
- This is usually fine - the glitch effects cause variable bitrate
- If persistent, check `pm2 logs multi-audio-stream` for errors