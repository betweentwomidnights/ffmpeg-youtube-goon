require('dotenv').config();
const { spawn } = require('child_process');

const YOUTUBE_RTMP_URL = process.env.YOUTUBE_RTMP_URL || 'rtmp://a.rtmp.youtube.com/live2';
const YOUTUBE_STREAM_KEY = process.env.YOUTUBE_STREAM_KEY;
const LOCAL_RTMP_URL = process.env.LOCAL_RTMP_URL || 'rtmp://localhost/live/stream';

if (!YOUTUBE_STREAM_KEY) {
  console.error('ERROR: YOUTUBE_STREAM_KEY not set in .env file');
  process.exit(1);
}

console.log('Starting seamless forever streamer...');

function startForeverStreamer() {
  const filterComplex = `
[1:v]scale=640:360,format=yuv420p,split=3[bg][chromatic][datamosh];

[chromatic]split=3[r][g][b];
[r]lutrgb=g=0:b=0,crop=iw:ih:x='2*sin(t*0.3)':y=0[r_shift];
[g]lutrgb=r=0:b=0,crop=iw:ih:x='-1*sin(t*0.3)':y=0[g_shift];
[b]lutrgb=r=0:g=0[b_shift];
[r_shift][g_shift]blend=all_mode=addition[rg];
[rg][b_shift]blend=all_mode=addition[chroma_aberration];

[datamosh]crop=w=iw-20:h=ih:x='mod(t*5,20)':y=0,
tblend=all_mode=difference:c0_opacity=0.3:enable='between(mod(t\\,8)\\,0\\,0.5)',
noise=alls=20:allf=t+u:enable='between(mod(t\\,6)\\,0\\,1.5)',
crop=iw:ih:y='if(gte(mod(t\\,3)\\,2.7)\\,random(1)*10\\,0)'[glitched];

[bg][chroma_aberration]blend=all_mode=multiply:c0_opacity=0.7[base];
[base][glitched]overlay=enable='lt(mod(t\\,5)\\,4.5)':shortest=1,

lutrgb=r='negval':g='negval':b='negval':enable='between(mod(t\\,10)\\,0\\,0.3)',
hflip=enable='between(mod(t\\,15)\\,0\\,0.5)',
vflip=enable='between(mod(t\\,23)\\,0\\,0.2)',

eq=brightness='0.3+0.4*sin(t*0.1)':contrast='0.8+0.4*random(1)':saturation='0.5+0.5*sin(t*0.2)',
hue=h='360*random(1)':s='0.5+0.5*sin(t*0.15)':enable='between(mod(t\\,20)\\,0\\,1)',

geq=lum='if(mod(Y\\,4)\\,lum(X\\,Y)\\,16)':enable='between(mod(t\\,7)\\,0\\,0.5)',

rgbashift=rh=3:gh=-2:bh=4,

lagfun=decay=0.95:planes=7:enable='between(mod(t\\,11)\\,0\\,3)',

drawbox=x='iw*random(1)':y='ih*random(1)':w='20+random(1)*50':h='10+random(1)*30':color=black@0.8:t=fill:enable='between(mod(t\\,4)\\,0\\,0.3)',

eq=gamma='1.0+0.3*sin(t/10800)',

curves=preset=vintage:enable='between(mod(t\\,43200)\\,0\\,21600)',

drawtext=text='DAY %{eif\\:n/30/86400\\:d}':x=w-tw-20:y=h-40:fontsize=18:fontcolor=yellow:box=1:boxcolor=black@0.5,

drawtext=text='TRACKING ERROR':x='(w-tw)/2':y='h*0.4':fontsize=40:fontcolor=red:alpha='0.8*between(mod(t\\,13)\\,0\\,0.4)',
drawtext=text='LIVE %{eif\\:n/30/3600\\:d}\\:%{eif\\:mod(n/30/60,60)\\:d\\:2}\\:%{eif\\:mod(n/30,60)\\:d\\:2}\\.%{eif\\:mod(n,30)*100/30\\:d\\:2}':x=w-tw-20:y=20:fontsize=24:fontcolor=white:box=1:boxcolor=black@0.5:enable='lt(mod(t\\,2)\\,1)',
drawtext=textfile='title.txt':reload=1:x=20:y=H-80:fontsize=30:fontcolor=white:box=1:boxcolor=black@0.5,
drawtext=textfile='description.txt':reload=1:x=20:y=H-50:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.5
[outv]
`.replace(/\n/g, '').replace(/\s+/g, ' ').trim();

  const ffmpeg = spawn('ffmpeg', [
    '-probesize', '32M',
    '-analyzeduration', '32M',
    '-fflags', '+genpts+discardcorrupt+igndts',
    '-i', LOCAL_RTMP_URL,
    '-re',
    '-f', 'lavfi',
    '-i', 'movie=testcard.mp4,loop=loop=-1:size=1:start=0,setpts=N/FRAME_RATE/TB',
    '-filter_complex', filterComplex,
    '-r', '30',
    '-max_interleave_delta', '0',
    '-map', '[outv]',
    '-map', '0:a:0',
    '-af', 'asetpts=N/SR/TB,aresample=async=1:first_pts=0',
    '-b:v', '750k',
    '-maxrate', '750k', 
    '-bufsize', '3000k',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '160k',
    '-copyinkf',
    '-flags', '+global_header',
    '-g', '60', '-keyint_min', '30',
    '-s', '640x360',
    '-avoid_negative_ts', 'make_zero',
    '-async', '1',
    '-threads', '1',
    '-vsync', 'cfr',
    '-copytb', '0',
    '-flvflags', 'no_duration_filesize',
    '-f', 'flv',
    `${YOUTUBE_RTMP_URL}/${YOUTUBE_STREAM_KEY}?live=1&reconnect=1&reconnect_streamed=1&reconnect_delay_max=2`
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.log(`[Streamer] ${data.toString().trim()}`);
  });

  ffmpeg.on('close', (code) => {
    console.error(`[Streamer] exited with code ${code}`);
    process.exit(1);
  });
}

startForeverStreamer();