const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { findAudioFiles, updateNowPlaying, getTrackMetadata } = require('./playlist-manager');

const AUDIO_DIR = path.join(process.env.HOME, 'radio-stream', 'audio');
const LOCAL_RTMP_URL = 'rtmp://localhost/live/stream';
const PIPE_NAME = 'audio_pipe';
const NOW_PLAYING_UPDATE_DELAY_MS = 15000; // 15 seconds

const weightedTracks = {
  '/home/azureuser/radio-stream/audio/LDT_Files/poompkins.mp3': 2,
  '/home/azureuser/radio-stream/audio/LDT_Files/ldt_7.mp3': 2,
  '/home/azureuser/radio-stream/audio/CC_3_Files/cc3_6.mp3': 2,
};

const specialTracks = [
  '/home/azureuser/radio-stream/audio/POLO_Files/infinitepolo4.mp3',
  '/home/azureuser/radio-stream/audio/LOFI_Files/lofi_daze.mp3',
];

let audioFiles = [];

function findInitialAudioFiles(dir) {
  let audioFiles = [];
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      audioFiles = audioFiles.concat(findInitialAudioFiles(filePath));
    } else if (path.extname(filePath).toLowerCase() === '.mp3') {
      audioFiles.push(filePath);
    }
  }
  return audioFiles;
}

function watchAudioFolder() {
  console.log('👀 Watching audio folder for changes...');
  const watcher = chokidar.watch(AUDIO_DIR, {
    ignored: /(^|[\/\\])\../, 
    persistent: true,
    ignoreInitial: false,
    depth: 5,
  });

  watcher
    .on('add', filePath => {
      if (filePath.endsWith('.mp3')) {
        console.log(`➕ File added: ${filePath}`);
        audioFiles.push(filePath);
      }
    })
    .on('unlink', filePath => {
      if (filePath.endsWith('.mp3')) {
        console.log(`➖ File removed: ${filePath}`);
        audioFiles = audioFiles.filter(f => f !== filePath);
      }
    });
}

async function startRadio() {
  if (!fs.existsSync(PIPE_NAME)) {
    console.log('🛠️ Creating named pipe...');
    require('child_process').execSync(`mkfifo ${PIPE_NAME}`);
  }

  console.log('🎥 Starting persistent ffmpeg process...');
  const ffmpeg = spawn('ffmpeg', [
    '-re',
    '-fflags', '+genpts+flush_packets',
    '-f', 'mpegts',
    '-i', PIPE_NAME,
    '-c:a', 'aac',
    '-b:a', '160k',
    '-avoid_negative_ts', 'make_zero',
    '-max_interleave_delta', '0',
    '-f', 'flv',
    
    LOCAL_RTMP_URL
  ]);

  ffmpeg.stderr.on('data', (data) => {
    console.log(`[Persistent FFmpeg] ${data.toString().trim()}`);
  });

  ffmpeg.on('close', (code) => {
    console.error(`[Persistent FFmpeg] exited with code ${code}`);
    process.exit(1);
  });

  watchAudioFolder();
  audioFiles = findInitialAudioFiles(AUDIO_DIR);

  while (true) {
    if (audioFiles.length === 0) {
      console.warn('⚠️ No audio files available! Waiting...');
      await new Promise(resolve => setTimeout(resolve, 10000));
      continue;
    }

    let weightedAudioFiles = weightedShuffleSmart(audioFiles, weightedTracks);
    weightedAudioFiles = maybePruneSpecialTracks(weightedAudioFiles);

    console.log('🎶 Playlist ready:');
    weightedAudioFiles.forEach((file, index) => {
      console.log(`${index + 1}. ${path.basename(file)}`);
    });

    for (const filePath of weightedAudioFiles) {
      if (!fs.existsSync(filePath)) {
        console.warn(`❌ File missing, skipping: ${filePath}`);
        continue;
      }

      console.log(`🎵 Streaming ${filePath}...`);

      const trackInfo = getTrackMetadata(filePath);
      const streamPromise = streamSingleTrack(filePath);

      await new Promise(resolve => setTimeout(resolve, NOW_PLAYING_UPDATE_DELAY_MS));

      updateNowPlaying(trackInfo);
      updateTitleAndDescriptionFiles(trackInfo);

      await streamPromise;
    }
  }
}

function weightedShuffleSmart(files, weightedTracks) {
  let weightedList = [];

  for (const filePath of files) {
    weightedList.push(filePath); // base
    if (weightedTracks[filePath]) {
      for (let i = 1; i < weightedTracks[filePath]; i++) {
        weightedList.push(filePath);
      }
    }
  }

  for (let i = weightedList.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [weightedList[i], weightedList[j]] = [weightedList[j], weightedList[i]];
  }

  const finalList = [];
  const lastSeen = {};

  for (let i = 0; i < weightedList.length; i++) {
    const track = weightedList[i];
    const lastIndex = lastSeen[track];
    if (lastIndex == null || (finalList.length - lastIndex) > 3) {
      finalList.push(track);
      lastSeen[track] = finalList.length - 1;
    } else {
      weightedList.push(track);
    }
  }

  return finalList;
}

function maybePruneSpecialTracks(playlist) {
  return playlist.filter((filePath) => {
    if (specialTracks.includes(filePath)) {
      const chance = Math.random();
      if (chance < 0.1) {
        console.log(`🌟 Keeping special track: ${path.basename(filePath)}`);
        return true; // keep it
      } else {
        console.log(`🌙 Removing special track this round: ${path.basename(filePath)}`);
        return false; // remove it
      }
    }
    return true; // keep normal tracks
  });
}

function ensurePipeExists() {
  if (!fs.existsSync(PIPE_NAME)) {
    console.warn('⚠️ Pipe disappeared, recreating...');
    try {
      require('child_process').execSync(`mkfifo ${PIPE_NAME}`);
      console.log('✅ Recreated named pipe.');
    } catch (err) {
      console.error('❌ Failed to recreate pipe:', err);
    }
  }
}

function streamSingleTrack(filePath) {
  return new Promise((resolve) => {
    ensurePipeExists();
    const songProcess = spawn('ffmpeg', [
      '-y',
      '-re',
      '-fflags', '+genpts',
      '-i', filePath,
      '-avoid_negative_ts', 'make_zero',
      '-fflags', '+discardcorrupt',
      '-f', 'mpegts',
      PIPE_NAME
    ]);

    songProcess.stderr.on('data', (data) => {
      console.log(`[Song] ${data.toString().trim()}`);
    });

    songProcess.on('close', (code) => {
      console.log(`[Song] finished with code ${code}`);
      resolve();
    });
  });
}

function updateTitleAndDescriptionFiles(trackInfo) {
  const safeTitle = sanitizeForDrawtext(trackInfo.title);
  const safeSeries = sanitizeForDrawtext(trackInfo.series);
  const safeDescription = trackInfo.description ? sanitizeForDrawtext(trackInfo.description) : '';

  let displayTitle = safeTitle;
  if (trackInfo.season && trackInfo.episode) {
    displayTitle = `${safeSeries} S${trackInfo.season}E${trackInfo.episode}`;
  }

  fs.writeFileSync('title.txt', displayTitle);
  fs.writeFileSync('description.txt', safeDescription);
}

function sanitizeForDrawtext(text) {
  if (!text) return 'Unknown';
  return text
    .replace(/\\/g, '')
    .replace(/'/g, '')
    .replace(/"/g, '')
    .replace(/:/g, ' - ')
    .replace(/\//g, '-')
    .replace(/[&%{}[\]<>]/g, '')
    .replace(/\n/g, ' ')
    .trim();
}

startRadio().catch(console.error);
